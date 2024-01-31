from concurrent.futures import ThreadPoolExecutor
from scraper import CourseScraper


def run_scraper(subject, term):
    scraper = CourseScraper()
    return scraper.search_by_subject(subject, term)


if __name__ == "__main__":
    main_scraper = CourseScraper()

    subjects = main_scraper.get_subjects()
    terms = main_scraper.get_terms()

    all_courses = []

    futures = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        for term in terms:
            for subject in subjects:
                futures.append(executor.submit(run_scraper, subject, term))

        for future in futures:
            all_courses += future.result()

    with open("courses.json", "w") as f:
        json.dump(all_courses, f, indent=4)
        f.close()
