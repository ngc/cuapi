# Using flask to create a web api that will return the data from the database in json format

from flask import Flask, jsonify, request
from flask_restful import Resource, Api, reqparse
from models import CourseDetails, DatabaseConnection, MeetingDetails, SectionInformation
import json
from flask_cors import CORS
import os
from dotenv import load_dotenv


"""
Use CORs to allow from any origin
"""


app = Flask(__name__)
cors = CORS(app)
load_dotenv()

db = DatabaseConnection()
db.initialize_db()
api = Api(app)


class AddCourse(Resource):
    def post(self):
        worker_key = request.get_json()["worker_key"]
        print(" worker key: ", worker_key)
        if worker_key != os.environ.get("WORKER_KEY"):
            return "Unauthorized", 401

        course_details_dict = request.get_json()["course_details"]

        section_information = SectionInformation(
            course_details_dict["section_information"]["section_type"],
            course_details_dict["section_information"]["suitability"],
        )

        meeting_details = []
        for meeting in course_details_dict["meeting_details"]:
            meeting_details.append(
                MeetingDetails(
                    meeting["meeting_date"],
                    meeting["days"],
                    meeting["time"],
                    meeting["schedule_type"],
                    meeting["instructor"],
                )
            )

        course_details = CourseDetails(
            course_details_dict["registration_term"],
            course_details_dict["CRN"],
            course_details_dict["subject_code"],
            course_details_dict["long_title"],
            course_details_dict["short_title"],
            course_details_dict["course_description"],
            course_details_dict["course_credit_value"],
            course_details_dict["schedule_type"],
            course_details_dict["session_info"],
            course_details_dict["registration_status"],
            section_information,
            course_details_dict["year_in_program_restriction"],
            course_details_dict["level_restriction"],
            course_details_dict["degree_restriction"],
            course_details_dict["major_restriction"],
            course_details_dict["program_restrictions"],
            course_details_dict["department_restriction"],
            course_details_dict["faculty_restriction"],
            meeting_details,
        )

        db.insert_course(course_details)
        return "success"


class SearchableCourseSearch(Resource):
    def get(self, term: str, search_term: str, page: int):
        dict_list = [
            course.__dict__()
            for course in db.search_searchable_courses(term, search_term, page)
        ]

        return jsonify(dict_list)


api.add_resource(AddCourse, "/add-course")
api.add_resource(
    SearchableCourseSearch,
    "/searchable-courses/<string:term>/<string:search_term>/<int:page>",
)


def run_dev_server():
    app.run(port=1211, debug=True)


if __name__ == "__main__":
    app.run(port=3969, debug=True)
