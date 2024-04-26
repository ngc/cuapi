import json
from celery import Celery, chord, group, chain
from redbeat import RedBeatSchedulerEntry as Entry
from src.scraper import CourseScraper
from celery.schedules import crontab
from dotenv import load_dotenv
from src.models import (
    CourseDetails,
    CourseJSONEncoder,
    DatabaseConnection,
    course_details_from_JSON,
)
import requests
import os
from celery import chain
from celery import group
from kombu.serialization import register
from kombu import Queue

URL = "http://localhost:3969"


def get_redis_url(db=1):
    load_dotenv()
    redis_username = os.environ.get("REDIS_USERNAME", "default")
    redis_password = os.environ.get("REDIS_PASSWORD")
    redis_host = os.environ.get("REDIS_HOST", "localhost")
    redis_port = os.environ.get("REDIS_PORT", "6379")

    url = f"redis://{redis_username}:{redis_password}@{redis_host}:{redis_port}/{db}"
    return url


broker_url = get_redis_url()

app = Celery("tasks", broker=broker_url)
app.conf.redbeat_redis_url = broker_url
app.conf.beat_scheduler = "redbeat.RedBeatScheduler"
app.conf.result_backend = broker_url

app.conf.task_routes = {
    "tasks.write*": {"queue": "localwrite"},
    "tasks.fetch*": {"queue": "scrape"},
    "tasks.scrape*": {"queue": "scrape"},
    "tasks.process*": {"queue": "scrape"},
    "tasks.on_all*": {"queue": "scrape"},
    "tasks.update*": {"queue": "scrape"},
    "tasks.collect*": {"queue": "scrape"},
}


# We need to register the custom JSON serializer for the CourseDetails object
def dumps(obj):
    return json.dumps(obj, cls=CourseJSONEncoder)


def loads(obj):
    return json.loads(obj)


register(
    "course_json",
    dumps,
    loads,
    content_type="application/json",
    content_encoding="utf-8",
)


register(
    "course_json",
    dumps,
    loads,
    content_type="application/json",
    content_encoding="utf-8",
)


@app.task
def fetch_terms():
    scraper = CourseScraper()
    return scraper.get_terms()


@app.task
def fetch_subjects(term):
    scraper = CourseScraper()
    subjects = scraper.get_subjects(term)

    return term, subjects


@app.task
def scrape_courses_for_subject_in_term(term_subject):
    term, subject = term_subject
    scraper = CourseScraper()
    courses = scraper.search_by_subject(subject, term)
    # Serialize each course
    serialized_courses = [dumps(course) for course in courses]

    # run the write_subject_results_to_db task
    write_subject_results_to_db.apply_async(
        args=(serialized_courses,), queue="localwrite"
    )

    return serialized_courses


@app.task
def scrape_courses_for_all_subjects_in_term(term_subjects):
    term, subjects = term_subjects
    # Create a group of scraping tasks, one for each subject in the term
    group_of_tasks = group(
        scrape_courses_for_subject_in_term.s((term, subject)) for subject in subjects
    )

    result = chord(group_of_tasks)(collect_course_data.s())
    return result


@app.task
def collect_course_data(results):
    # This function is meant to collect all serialized course data and pass it to the write_to_db function
    all_courses = []
    for result in results:
        all_courses.extend(result)
    return all_courses


@app.task
def update_course_database():
    # Step 1: Fetch terms
    # Step 2: For each term, fetch subjects and then scrape courses for those subjects
    # Step 3: Aggregate all course data and then write to DB

    # Start by asynchronously fetching terms
    fetch_terms.apply_async(link=process_terms.s())


@app.task
def process_terms(terms):
    # For each term, create a task chain for fetching subjects and scraping courses
    task_chains = [
        chain(fetch_subjects.s(term), scrape_courses_for_all_subjects_in_term.s())
        for term in terms
    ]
    # Use a chord to handle all these chains and then execute a callback when all are complete
    chord(task_chains)(on_all_scraping_complete.s())


@app.task
def on_all_scraping_complete(results):
    # Flatten the list of lists
    all_courses = [course for sublist in results for course in sublist]
    # Send to write_to_db task
    write_to_db.apply_async(args=(all_courses,), queue="localwrite")


@app.task
def write_subject_results_to_db(courses):
    if not courses or len(courses) == 0:
        return

    db = DatabaseConnection()

    courses = [course_details_from_JSON(course) for course in courses]

    for course in courses:
        db.insert_course(course)


# To only be used in the write queue
@app.task()
def write_to_db(serialized_courses):
    db = DatabaseConnection()

    db.build_all_searchable_courses()


@app.task
def write_test_write():
    print("$$$ Writing to db")
    pass


if os.environ.get("IS_BEAT") == "true":
    entry = Entry(
        name="Update course database",
        task="tasks.update_course_database",
        schedule=crontab(minute=0, hour="*/6"),
        app=app,
    )
    entry.save()

    write_test_write.apply_async()

    update_course_database.apply_async()
