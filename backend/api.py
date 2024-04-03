# Using flask to create a web api that will return the data from the database in json format

from flask import Flask, jsonify, request
from flask_restful import Resource, Api, reqparse
from src.models import (
    CourseDetails,
    DatabaseConnection,
    MeetingDetails,
    SectionInformation,
    course_dict_to_course_details,
)
import json
from flask_cors import CORS
import os
from dotenv import load_dotenv


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

        course_details = course_dict_to_course_details(course_details_dict)

        db.insert_course(course_details)
        return "success"


"""
export async function crnSearch(
    term: string,
    crn: string,
    page: number
): Promise<CourseDetails[]> {
    const response = await fetch(`${API_URL}crn/${term}/${crn}/${page}`);
    return response.json();
}
"""


class SearchByCourseCode(Resource):
    def get(self, term: str, course_code: str, page: int):
        dict_list = [
            course.__dict__()
            for course in db.search_by_course_code(term, course_code, page)
        ]

        return jsonify(dict_list)


class SearchByCrn(Resource):
    def get(self, term: str, crn: str, page: int):
        dict_list = [course.__dict__() for course in db.search_by_crn(term, crn, page)]

        return jsonify(dict_list)


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
api.add_resource(SearchByCrn, "/crn/<string:term>/<string:crn>/<int:page>")
api.add_resource(
    SearchByCourseCode, "/course-code/<string:term>/<string:course_code>/<int:page>"
)


def run_dev_server():
    app.run(port=1211, debug=True)


if __name__ == "__main__":
    app.run(port=3969, debug=True)
