"""
URL configuration for cuapi project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path
from courses.views import (
    add_course_details,
    query_offerings,
    schedule_offerings,
    health_check,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("add-course-details/", add_course_details, name="add-course-details"),
    path(
        "query-offerings/<str:term>/<str:query>/",
        query_offerings,
        name="query-offerings",
    ),
    path("schedule/", schedule_offerings, name="schedule-offerings"),
    path("healthz/", health_check, name="health-check"),
]
