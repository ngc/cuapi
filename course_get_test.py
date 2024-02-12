from scraper import CourseScraper


def main():
    scraper = CourseScraper()
    terms = scraper.get_terms()
    subjects = scraper.get_subjects()
    term = terms[1]
    subject = "HIST"
    courses = scraper.search_by_subject(subject, term)

    print(courses)


if __name__ == "__main__":
    main()
