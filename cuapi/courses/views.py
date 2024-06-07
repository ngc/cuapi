import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .ga import SectionScheduler
from .models import CourseDetails, CourseSection, Offering, search_offerings
from django.core import serializers
from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict


class CourseSectionEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, CourseSection):
            # Convert the CourseSection object to a dictionary
            return model_to_dict(obj)
        return super().default(obj)


class OfferingJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, CourseDetails):
            return model_to_dict(obj, exclude=["id", "search_vector"])
        elif isinstance(obj, CourseSection):
            return model_to_dict(obj, exclude=["id", "search_vector"])
        elif isinstance(obj, Offering):
            return model_to_dict(obj, exclude=["id", "search_vector"])
        return super().default(obj)


@csrf_exempt
def health_check(request):
    return JsonResponse({"message": "ok"}, status=200)


@csrf_exempt
def add_course_details(request):
    if request.method == "POST":
        # Log the request body for debugging

        data = json.loads(request.body)
        data = data["course_details"]
        print(json.dumps(data, indent=4))

        # Create a new CourseDetails object
        course_details = CourseDetails(
            registration_term=data["registration_term"],
            crn=data["CRN"],
            subject_code=data["subject_code"],
            long_title=data["long_title"],
            short_title=data["short_title"],
            course_credit_value=data["course_credit_value"],
            schedule_type=data["schedule_type"],
            registration_status=data["registration_status"],
            global_id=data["global_id"],
            related_offering=data["related_offering"],
            section_key=data["section_key"],
            section_information=data["section_information"],
            meeting_details=data["meeting_details"],
            course_description=data["course_description"],
        )

        # Save the CourseDetails object
        course_details.save()

        return JsonResponse(
            {"message": "Course details added successfully"}, status=200
        )


@csrf_exempt
# query offerings uses a url parameter to query the database for offerings
def query_offerings(request, term, query):
    if request.method == "GET":
        # Query the database for offerings that match the query
        offerings: list[Offering] = search_offerings(query)
        # Filter the offerings by term
        offerings = offerings.filter(registration_term=term)

        # Serialize the offerings to JSON
        data = json.dumps(list(map(model_to_dict, offerings)), cls=OfferingJSONEncoder)

        # jsonify the data and return it as a response
        return_data = json.loads(data)

        return JsonResponse(return_data, safe=False)


@csrf_exempt
def schedule_offerings(request):
    param_values = request.GET.getlist("param")
    # param values is a list of Offering id strings
    # we need to convert them to integers
    ids = list(map(int, param_values))
    offerings = Offering.objects.filter(id__in=ids)

    scheduler = SectionScheduler(offerings)
    schedules = scheduler.run()

    # Serialize the schedules to JSON
    data = json.dumps(schedules, cls=CourseSectionEncoder)

    # jsonify the data and return it as a response
    return_data = json.loads(data)

    return JsonResponse(return_data, safe=False)
