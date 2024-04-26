from flask import Flask, jsonify, request
from flask_caching import Cache
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
from tasks import get_redis_url


app = Flask(__name__)
cors = CORS(app)
load_dotenv()


cache = Cache(
    app,
    config={
        "CACHE_TYPE": "redis",
        "CACHE_REDIS_URL": get_redis_url(2),
    },
)

cache.init_app(app)

db = DatabaseConnection()
db.initialize_db()
api = Api(app)


class SearchByCourseCode(Resource):
    @cache.cached(timeout=3600, query_string=True)
    def get(self, term: str, course_code: str, page: int):
        dict_list = [
            course.__dict__()
            for course in db.search_by_course_code(term, course_code, page)
        ]

        return jsonify(dict_list)


class SearchByCrn(Resource):
    @cache.cached(timeout=3600, query_string=True)
    def get(self, term: str, crn: str, page: int):
        dict_list = [course.__dict__() for course in db.search_by_crn(term, crn, page)]

        return jsonify(dict_list)


class SearchableCourseSearch(Resource):
    @cache.cached(timeout=3600, query_string=True)
    def get(self, term: str, search_term: str, page: int):
        dict_list = [
            course.__dict__()
            for course in db.search_searchable_courses(term, search_term, page)
        ]

        return jsonify(dict_list)


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
