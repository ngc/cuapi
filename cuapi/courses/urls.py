from django.urls import path
from .views import add_course_details, query_offerings

urlpatterns = [
    path("add-course-details/", add_course_details, name="add-course-details"),
    # other url patterns...
]
