from src.models import CourseDetails, DatabaseConnection, course_dict_to_course_details
from src.scraper import CourseScraper
from concurrent.futures import ThreadPoolExecutor
import requests
import os
from dotenv import load_dotenv
import time

load_dotenv()
URL = "https://cuapi.cuscheduling.com"


def add_course(course: CourseDetails):
    try:
        response = requests.post(
            f"{URL}/add-course",
            json={
                "course_details": course.to_dict(),
                "worker_key": os.environ.get("WORKER_KEY"),
            },
            timeout=5,
        )
    except Exception as e:
        print(f"Error adding course {course.subject_code}: {e}")


def scrape_courses(term, subject):
    scraper = CourseScraper()
    courses = scraper.search_by_subject(subject, term)

    return courses


def scrape_then_add_to_db(term, subject, db_connection: DatabaseConnection):
    courses = scrape_courses(term, subject)
    for course in courses:
        print(f"Adding {course.subject_code} to the database")
        db_connection.insert_course(course)


def populate_db():
    scraper = CourseScraper()
    terms = scraper.get_terms()
    subjects = scraper.get_subjects()
    futures = []

    DEBUG = True

    if DEBUG:
        terms = terms[:1]
        subjects = subjects[:1]

    with ThreadPoolExecutor(max_workers=20) as executor:

        for term in terms:
            for subject in subjects:
                print(f"Scraping {subject} for term {term}")
                futures.append(executor.submit(scrape_courses, term, subject))

    # send all futures to db
    for future in futures:
        courses = future.result()
        for course in courses:
            print(f"Adding {course.subject_code} to the database")
            add_course(course)
            time.sleep(1)

    return True


"""
Uses a connection to a local postgresql database to populate the database with course data
"""


def populate_db_locally():
    scraper = CourseScraper()
    terms = scraper.get_terms()

    db_connection = DatabaseConnection()
    futures = []

    with ThreadPoolExecutor(max_workers=20) as executor:
        for term in terms:
            for subject in scraper.get_subjects(term):
                print(f"Scraping {subject} for term {term}")
                futures.append(executor.submit(scrape_courses, term, subject))

        executor.shutdown(wait=True)

    for future in futures:
        courses = future.result()
        for course in courses:
            print(f"Adding {course.subject_code} to the database")
            db_connection.insert_course(course)

    db_connection.build_all_searchable_courses()

    return True


def populate_db_slowly():
    scraper = CourseScraper()
    terms = scraper.get_terms()
    subjects = scraper.get_subjects()

    futures = []

    with ThreadPoolExecutor(max_workers=20) as executor:
        for term in terms:
            for subject in subjects:
                print(f"Scraping {subject} for term {term}")
                futures.append(executor.submit(scrape_courses, term, subject))

        executor.shutdown(wait=True)

    for future in futures:
        courses = future.result()
        for course in courses:
            print(f"Adding {course.subject_code} to the database")
            add_course(course)
            time.sleep(1)

    return True


if __name__ == "__main__":
    answer = input("Locally or remotely? (l/r): ")
    if answer == "l":
        populate_db_locally()
    else:
        populate_db_slowly()
