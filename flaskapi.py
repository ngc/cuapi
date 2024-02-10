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


class Course(Resource):
    def get(self, term, crn):
        return jsonify(db.get_course(term, crn).__dict__())


class CourseSearch(Resource):
    def get(self, search_term, page: int):
        dict_list = [
            course.__dict__() for course in db.search_courses(search_term, page)
        ]

        return jsonify(dict_list)


class OfferingSearch(Resource):
    def get(self, term: str, subject: str, code: str, page: int):
        dict_list = [
            course.__dict__()
            for course in db.search_offerings(term, subject, code, page)
        ]

        return jsonify(dict_list)


class SearchForOfferings(Resource):
    def get(self, term: str, search_term: str):
        return db.search_for_offerings(term, search_term)


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


# Add the resource to the api
api.add_resource(Course, "/course/<string:term>/<string:crn>")
api.add_resource(CourseSearch, "/search/<string:search_term>/<int:page>")
api.add_resource(
    OfferingSearch, "/offering/<string:term>/<string:subject>/<string:code>/<int:page>"
)
api.add_resource(
    SearchForOfferings, "/search-offerings/<string:term>/<string:search_term>"
)
api.add_resource(AddCourse, "/add-course")


def run_dev_server():
    app.run(port=1211, debug=True)


if __name__ == "__main__":
    app.run(port=3969, debug=True)
