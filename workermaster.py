from concurrent.futures import ThreadPoolExecutor
import json
from models import DatabaseConnection
from scraper import CourseScraper

db = DatabaseConnection()
db.initialize_db()


def run_scraper(subject, term):
    global db
    scraper = CourseScraper()
    courses = scraper.search_by_subject(subject, term)

    for course in courses:
        try:
            db.insert_course(course)
        except Exception as e:
            print(e)
            print(f"Failed to insert course {course}")
            continue

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
