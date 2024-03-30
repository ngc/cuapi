from tasks import add_course
from src.scraper import CourseScraper
from concurrent.futures import ThreadPoolExecutor


def populate_db():
    # scraper = CourseScraper()
    # terms = scraper.get_terms()
    # subjects = scraper.get_subjects()
    # for term in terms:
    #     for subject in subjects:
    #         courses = scraper.search_by_subject(subject, term)
    #         for course in courses:
    #             add_course(course)

    # return True

    scraper = CourseScraper()
    terms = scraper.get_terms()
    subjects = scraper.get_subjects()
    futures = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        for term in terms:
            for subject in subjects:
                courses = scraper.search_by_subject(subject, term)
                for course in courses:
                    futures.append(executor.submit(add_course, course))

    # send all futures to db
    for future in futures:
        add_course(future.result())

    return True


if __name__ == "__main__":
    populate_db()
