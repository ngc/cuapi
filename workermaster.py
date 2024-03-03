from concurrent.futures import ThreadPoolExecutor
import json
from models import CourseDetails, DatabaseConnection
from scraper import CourseScraper
import requests
import os
from dotenv import load_dotenv

URL = "http://localhost:3969"
load_dotenv()


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
    try:
        scraper = CourseScraper()
        courses = scraper.search_by_subject(subject, term)

        for course in courses:
            print(f"Adding {course.subject_code} to the database")
            add_course(course)

    except Exception as e:
        print(f"Error scraping {subject} for term {term}: {e}")

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
