# Using flask to create a web api that will return the data from the database in json format

from flask import Flask, jsonify
from flask_restful import Resource, Api, reqparse
from models import DatabaseConnection
import json
from flask_cors import CORS


"""
Use CORs to allow from any origin
"""


app = Flask(__name__)
cors = CORS(app)

db = DatabaseConnection()
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


# Add the resource to the api
api.add_resource(Course, "/course/<string:term>/<string:crn>")
api.add_resource(CourseSearch, "/search/<string:search_term>/<int:page>")
api.add_resource(
    OfferingSearch, "/offering/<string:term>/<string:subject>/<string:code>/<int:page>"
)
api.add_resource(
    SearchForOfferings, "/search-offerings/<string:term>/<string:search_term>"
)


def run_dev_server():
    app.run(port=1211, debug=True)


if __name__ == "__main__":
    app.run(port=3969, debug=True)
