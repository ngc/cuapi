from itertools import count
from django.contrib import admin
from .models import CourseDetails, CourseSection, Offering


# Register your models here.
class CourseDetailsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "registration_term",
        "crn",
        "subject_code",
        "long_title",
        "short_title",
        "related_offering",
        "section_key",
    )
    search_fields = (
        "registration_term",
        "crn",
        "subject_code",
        "long_title",
        "short_title",
        "course_description",
        "course_credit_value",
        "schedule_type",
        "registration_status",
        "global_id",
        "related_offering",
        "section_key",
        "section_information",
        "meeting_details",
    )


class CourseSectionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "registration_term",
        "related_offering",
        "section_key",
    )
    search_fields = (
        "registration_term",
        "related_offering",
        "section_key",
    )

    def tutorials_count(self, obj):
        return obj.tutorials.count()

    def lectures_count(self, obj):
        return obj.lectures.count()

    tutorials_count.short_description = "Number of Tutorials"
    lectures_count.short_description = "Number of Lectures"


admin.site.register(CourseDetails, CourseDetailsAdmin)
admin.site.register(CourseSection, CourseSectionAdmin)


class OfferingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "related_offering",
        "registration_term",
    )
    search_fields = (
        "related_offering",
        "registration_term",
    )

    def sections_count(self, obj):
        return obj.sections.count()

    sections_count.short_description = "Number of Sections"


admin.site.register(Offering, OfferingAdmin)
