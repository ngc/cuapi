from django.db import models, transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.postgres.search import (
    SearchQuery,
    SearchRank,
    SearchVector,
    TrigramSimilarity,
    SearchVectorField,
)
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)


class CourseDetails(models.Model):
    registration_term = models.CharField(max_length=100)
    crn = models.CharField(max_length=100)
    subject_code = models.CharField(max_length=100)
    long_title = models.CharField(max_length=100)
    short_title = models.CharField(max_length=100)
    course_description = models.TextField()
    course_credit_value = models.FloatField()
    schedule_type = models.CharField(max_length=100)
    registration_status = models.CharField(max_length=100)
    global_id = models.CharField(max_length=100)
    related_offering = models.CharField(max_length=100)
    section_key = models.CharField(max_length=100)
    section_information = models.JSONField()
    meeting_details = models.JSONField()

    def __str__(self):
        return str(self.long_title)

    def is_lecture(self):
        lecture_aliases = [
            "Lecture",
            "Seminar",
            "Studio",
            "Comprehensive",
            "Practicum",
            "Other",
            "Workshop",
            "PhD Thesis",
            "Masters Thesis",
            "Directed Studies",
            "Honours Essay",
            "Problem Analysis",
        ]
        return self.schedule_type in lecture_aliases

    def is_tutorial(self):
        return not self.is_lecture()

    class Meta:
        unique_together = ("crn", "registration_term")


class CourseSection(models.Model):
    registration_term = models.CharField(max_length=100)
    related_offering = models.CharField(max_length=100)
    section_key = models.CharField(max_length=100)
    tutorials = models.ManyToManyField(
        CourseDetails, related_name="tutorial_course_details"
    )
    lectures = models.ManyToManyField(
        CourseDetails, related_name="lecture_course_details"
    )

    description = models.TextField()

    # Fields we'll query on
    long_title = models.CharField(max_length=100)
    short_title = models.CharField(max_length=100)
    subject_code = models.CharField(max_length=100)

    class Meta:
        unique_together = ("registration_term", "related_offering", "section_key")


class Offering(models.Model):
    related_offering = models.CharField(max_length=100)
    registration_term = models.CharField(max_length=100)
    sections = models.ManyToManyField("CourseSection")

    description = models.TextField()

    # Fields we'll query on
    long_title = models.CharField(max_length=100)
    short_title = models.CharField(max_length=100)

    search_vector = SearchVectorField(null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # check if search_vector is None
        if self.search_vector is None:
            offering = Offering.objects.get(pk=self.pk)
            offering.search_vector = SearchVector(
                SearchVector("related_offering", weight="A")
                + SearchVector("long_title", weight="C")
            )
            offering.save()

    class Meta:
        unique_together = ("related_offering", "registration_term")


def search_offerings(query):
    search_query = SearchQuery(query, search_type="websearch")
    related_offering_vector = SearchVector("related_offering", weight="A")
    long_title_vector = SearchVector("long_title", weight="C")

    search_rank = SearchRank(related_offering_vector + long_title_vector, search_query)

    similarity = TrigramSimilarity("related_offering", query) + TrigramSimilarity(
        "long_title", query
    )

    results = (
        Offering.objects.annotate(
            search=related_offering_vector + long_title_vector,
            rank=search_rank,
            similarity=similarity,
        )
        .filter(Q(search=search_query) | Q(similarity__gt=0.3))
        .order_by("-rank", "-similarity")
    )

    return results


"""
Recievers
"""

import logging
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import CourseSection, Offering, CourseDetails

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CourseSection)
def update_offering(sender, instance, created, **kwargs):
    logger.debug(f"CourseSection post_save triggered for {instance}")
    with transaction.atomic():
        offering, created = Offering.objects.get_or_create(
            related_offering=instance.related_offering,
            registration_term=instance.registration_term,
            defaults={
                "long_title": instance.long_title,
                "short_title": instance.short_title,
                "description": instance.description,
            },
        )
        if created:
            logger.debug(f"Created new Offering: {offering}")
        else:
            logger.debug(f"Found existing Offering: {offering}")

        if not offering.sections.filter(id=instance.id).exists():
            offering.sections.add(instance)
            logger.debug(f"Added CourseSection {instance} to Offering {offering}")


@receiver(post_delete, sender=CourseSection)
def delete_offering(sender, instance, **kwargs):
    logger.debug(f"CourseSection post_delete triggered for {instance}")
    with transaction.atomic():
        offering = Offering.objects.filter(
            related_offering=instance.related_offering,
            registration_term=instance.registration_term,
        ).first()
        if offering:
            offering.sections.remove(instance)
            logger.debug(f"Removed CourseSection {instance} from Offering {offering}")
            if offering.sections.count() == 0:
                offering.delete()
                logger.debug(
                    f"Deleted Offering {offering} because it has no more sections"
                )


@receiver(post_save, sender=CourseDetails)
def update_course_section(sender, instance, created, **kwargs):
    logger.debug(f"CourseDetails post_save triggered for {instance}")
    with transaction.atomic():
        course_section, created = CourseSection.objects.get_or_create(
            registration_term=instance.registration_term,
            related_offering=instance.related_offering,
            section_key=instance.section_key,
            defaults={
                "long_title": instance.long_title,
                "short_title": instance.short_title,
                "subject_code": instance.subject_code,
                "description": instance.course_description,
            },
        )
        if created:
            logger.debug(f"Created new CourseSection: {course_section}")
        else:
            logger.debug(f"Found existing CourseSection: {course_section}")

        if instance.is_lecture():
            if not course_section.lectures.filter(id=instance.id).exists():
                course_section.lectures.add(instance)
                logger.debug(
                    f"Added lecture {instance} to CourseSection {course_section}"
                )
        else:
            if not course_section.tutorials.filter(id=instance.id).exists():
                course_section.tutorials.add(instance)
                logger.debug(
                    f"Added tutorial {instance} to CourseSection {course_section}"
                )


@receiver(post_delete, sender=CourseDetails)
def delete_course_section(sender, instance, **kwargs):
    logger.debug(f"CourseDetails post_delete triggered for {instance}")
    with transaction.atomic():
        course_section = CourseSection.objects.filter(
            registration_term=instance.registration_term,
            related_offering=instance.related_offering,
            section_key=instance.section_key,
        ).first()
        if course_section:
            if instance.is_lecture():
                course_section.lectures.remove(instance)
                logger.debug(
                    f"Removed lecture {instance} from CourseSection {course_section}"
                )
            else:
                course_section.tutorials.remove(instance)
                logger.debug(
                    f"Removed tutorial {instance} from CourseSection {course_section}"
                )
            if (
                course_section.lectures.count() == 0
                and course_section.tutorials.count() == 0
            ):
                course_section.delete()
                logger.debug(
                    f"Deleted CourseSection {course_section} because it has no more lectures or tutorials"
                )
