from src.models import CourseDetails
from src.scraper import CourseScraper
from concurrent.futures import ThreadPoolExecutor
import requests
import os
from dotenv import load_dotenv
import time

load_dotenv()
URL = "https://localhost:3969"


def add_course(course: CourseDetails):
    try:
        response = requests.post(
            f"{URL}/add-course",
            json={
                "course_details": course.__dict__(),
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


def populate_db():
    scraper = CourseScraper()
    terms = scraper.get_terms()
    subjects = scraper.get_subjects()
    futures = []
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


if __name__ == "__main__":
    populate_db()
