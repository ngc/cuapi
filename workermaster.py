from concurrent.futures import ThreadPoolExecutor
import json
from models import CourseDetails, DatabaseConnection
from scraper import CourseScraper
import requests
import os
from dotenv import load_dotenv

URL = "http://localhost:3969"
load_dotenv()

"""
class AddCourse(Resource):
    def post(self):
        parser = reqparse.RequestParser()

        # take a single JSON string as input
        parser.add_argument("course_details", type=str)
        args = parser.parse_args()

        course_details = json.loads(args["course_details"])
        db.insert_course(course_details)
        return jsonify(course_details)


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
"""


def add_course(course: CourseDetails):
    # use the add-course endpoint to add a course to the database

    response = requests.post(
        f"{URL}/add-course",
        json={
            "course_details": course.__dict__(),
            "worker_key": os.environ.get("WORKER_KEY"),
        },
        timeout=5,
    )

    return response.json()


db = DatabaseConnection()
db.initialize_db()


def run_scraper(subject, term):
    scraper = CourseScraper()
    courses = scraper.search_by_subject(subject, term)

    for course in courses:
        add_course(course)

    return courses


if __name__ == "__main__":
    main_scraper = CourseScraper()

    subjects = main_scraper.get_subjects()
    terms = main_scraper.get_terms()

    all_courses = []

    futures = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        for term in terms:
            # get list of subjects keys
            subjects_keys = list(subjects.keys())

            for subject in subjects_keys:
                futures.append(executor.submit(run_scraper, subject, term))

        for future in futures:
            try:
                all_courses += future.result()
            except Exception as e:
                print(e)
                continue

    with open("courses.json", "w") as f:
        json.dump(all_courses, f, indent=4)
        f.close()
