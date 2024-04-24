from celery import Celery, chord, group
from redbeat import RedBeatSchedulerEntry as Entry
from src.scraper import CourseScraper
from celery.schedules import crontab
from dotenv import load_dotenv
from src.models import CourseDetails
import requests
import os
from celery import chain
from celery import group

URL = "http://localhost:3969"
load_dotenv()

redis_username = os.environ.get("REDIS_USERNAME", "default")
redis_password = os.environ.get("REDIS_PASSWORD")
redis_host = os.environ.get("REDIS_HOST", "localhost")
redis_port = os.environ.get("REDIS_PORT", "6379")
redis_db = os.environ.get("REDIS_DB", "1")

if os.environ.get("IS_BEAT") != "true":
    redis_host = input("Enter the Redis host: ")
    isLocal = input("Is this running locally? (y/n): ")
    if isLocal == "n":
        URL = "https://cuapi.cuscheduling.com"

broker_url = f"redis://{redis_host}:{redis_port}/{redis_db}"

app = Celery("tasks", broker=broker_url)
app.conf.redbeat_redis_url = broker_url
app.conf.beat_scheduler = "redbeat.RedBeatScheduler"
app.conf.result_backend = broker_url


def add_course(course: CourseDetails):
    response = requests.post(
        f"{URL}/add-course",
        json={
            "course_details": course.to_dict(),
            "worker_key": os.environ.get("WORKER_KEY"),
        },
        timeout=5,
    )


@app.task(bind=True)
def get_courses_by_subject(self, subject, term):
    scraper = CourseScraper()
    courses = scraper.search_by_subject(subject, term)

    for course in courses:
        print(f"Adding {course.subject_code} to the database")
        add_course(course)

    return courses


@app.task(bind=True)
def get_subjects(self, _terms=None):
    mainScraper = CourseScraper()
    subjects = mainScraper.get_subjects()
    return subjects


@app.task(bind=True)
def get_terms(self):
    mainScraper = CourseScraper()
    terms = mainScraper.get_terms()
    return terms


@app.task(bind=True)
def update_course_database(self):
    # Group get_terms and get_subjects tasks to execute in parallel
    header = group(get_terms.s(), get_subjects.s())

    # Set process_terms_and_subjects as the callback to execute after the group
    callback = process_terms_and_subjects.s()

    # Combine the group and the callback into a chord and apply it
    chord(header)(callback)


@app.task(bind=True)
def process_terms_and_subjects(self, results):
    terms, subjects = results
    for term in terms:
        for subject in subjects:
            print(f"Get courses for subject: {subject} in term: {term}")
            get_courses_by_subject.delay(subject, term)


if os.environ.get("IS_BEAT") == "true":
    entry = Entry(
        name="Update course database",
        task="tasks.update_course_database",
        schedule=crontab(minute=0, hour="*/6"),
        app=app,
    )
    entry.save()

    update_course_database.apply_async()
