# In a file called COMP.json I have a list of dictionaries that represent courses
# i want to parse all of these into their respective classes
from models import CourseDetails, SectionInformation, MeetingDetails
import json
import ics
import datetime
import os


"""
[
    {
        "registration_term": "Fall 2023 (September-December)",
        "CRN": "31195",
        "subject_code": "COMP 1001 A",
        "long_title": "Introduction to Computational Thinking for Arts and Social Science Students",
        "short_title": "Computing for Arts Students",
        "course_description": "An introduction to computational thinking and its applications to the arts and social sciences.  Students will gain computational thinking skills by exploring data representation, basic programming concepts, a selection of algorithms, and advanced usage of software packages for the arts and social sciences.Precludes additional credit for COMP 1004 (no longer offered).  This course cannot be taken for credit by students in Business, Engineering, Computer Science, Mathematics or Science.",
        "course_credit_value": 0.5,
        "schedule_type": "Lecture",
        "session_info": "",
        "registration_status": "Registration Closed",
        "section_information": {
            "section_type": "",
            "suitability": "SUITABLE FOR ONLINE STUDENTS"
        },
        "year_in_program_restriction": null,
        "level_restriction": null,
        "degree_restriction": null,
        "major_restriction": null,
        "program_restrictions": null,
        "department_restriction": null,
        "faculty_restriction": null,
        "meeting_details": [
            {
                "meeting_date": "Sep 06, 2023 to Dec 08, 2023",
                "days": [
                    "Mon Wed"
                ],
                "time": "10:05 - 11:25",
                "schedule_type": "Lecture",
                "instructor": "Leila Chinaei (Primary)"
            }
        ]
    },
]
"""


def parse_date(date_str):
    # Convert the string to a datetime.date object
    return datetime.datetime.strptime(date_str, "%b %d, %Y").date()


def find_first_class_day(start_date, weekdays):
    # Map weekday names to their corresponding datetime.weekday() numbers
    weekdays_map = {
        "Mon": 0,
        "Tue": 1,
        "Wed": 2,
        "Thu": 3,
        "Fri": 4,
        "Sat": 5,
        "Sun": 6,
    }
    weekdays_numbers = [weekdays_map[day] for day in weekdays]

    # Check each day starting from start_date to find the first class day
    current_date = start_date
    while current_date.weekday() not in weekdays_numbers:
        current_date += datetime.timedelta(days=1)
    return current_date


def get_first_class_day(meeting_details):
    # Parse the start date from the meeting details
    start_date_str = meeting_details["meeting_date"].split(" to ")[0]
    start_date = parse_date(start_date_str)

    # Get the weekdays when the class is scheduled
    weekdays = meeting_details["days"][0].split()

    # Find the first class day
    return find_first_class_day(start_date, weekdays)


def find_last_class_day(end_date, weekdays):
    # Map weekday names to their corresponding datetime.weekday() numbers
    weekdays_map = {
        "Mon": 0,
        "Tue": 1,
        "Wed": 2,
        "Thu": 3,
        "Fri": 4,
        "Sat": 5,
        "Sun": 6,
    }
    weekdays_numbers = [weekdays_map[day] for day in weekdays]

    # Check each day starting from start_date to find the first class day
    current_date = end_date
    while current_date.weekday() not in weekdays_numbers:
        current_date -= datetime.timedelta(days=1)
    return current_date


def get_last_class_day(meeting_details):
    # Parse the end date from the meeting details
    end_date_str = meeting_details["meeting_date"].split(" to ")[1]
    end_date = parse_date(end_date_str)

    # Get the weekdays when the class is scheduled
    weekdays = meeting_details["days"][0].split()

    # Find the last class day
    return find_last_class_day(end_date, weekdays)


def generate_events(course_details: CourseDetails, meeting: MeetingDetails):
    # we need to set the name of the event
    event_summary = """{course_details.subject_code} {course_details.long_title}

Instructor: {meeting.instructor}

{course_description}""".format(
        course_details=course_details,
        course_description=course_details.course_description,
        meeting=meeting,
    )

    events = []
    first_class_day = get_first_class_day(meeting.__dict__())
    last_class_day = get_last_class_day(meeting.__dict__())

    start_time = datetime.datetime.strptime(meeting.time.split(" - ")[0], "%H:%M")
    end_time = datetime.datetime.strptime(meeting.time.split(" - ")[1], "%H:%M")

    # now we want to iterate through all the days between (inclusive) first_class_day and last_class_day
    # and add an event for each day (at the start time and end time)
    for i in range((last_class_day - first_class_day).days + 1):
        # ensure that current date uses EST timezone

        current_date = first_class_day + datetime.timedelta(days=i)

        # convert current_date to a datetime.datetime object
        current_date = datetime.datetime(
            current_date.year, current_date.month, current_date.day
        )

        # get the day of the week of current_date
        day = current_date.strftime("%a")
        # check if day is in meeting.days.split(' ')
        if day in meeting.days[0].split(" "):
            # create an event for current_date
            event = ics.Event()
            event.name = course_details.long_title

            begin = current_date
            begin = begin.replace(hour=start_time.hour, minute=start_time.minute)
            end = current_date
            end = end.replace(hour=end_time.hour, minute=end_time.minute)

            # convert begin and end from EST to UTC
            begin = begin.astimezone(datetime.timezone.utc)
            end = end.astimezone(datetime.timezone.utc)

            event.begin = begin
            event.end = end

            # event.location = "Online"
            event.description = event_summary
            # add the event
            events.append(event)

    return events


def convert_to_ics(course_details: CourseDetails, calendar: ics.Calendar):
    meeting_details = course_details.meeting_details
    events = []
    for meeting in meeting_details:
        events += generate_events(course_details, meeting)

    for event in events:
        calendar.events.add(event)

    return calendar


def main():
    # there is a directory called 'jobs' that contains a json file for each subject
    # each json file contains a list of dictionaries that represent courses
    # i want to parse all of these into their respective classes
    # and store all of them in one big list
    # then i want to convert them all to a giant ics file

    # get all the json files in the jobs directory
    jobs_dir = "jobs"
    jobs = os.listdir(jobs_dir)

    # create a list of all the courses
    courses = []

    # iterate through each job
    for job in jobs:
        # open the job file
        with open(os.path.join(jobs_dir, job)) as f:
            # load the courses from the job file
            data = json.load(f)
            data_courses = []
            for course in data:
                meeting_details = []
                for meeting in course["meeting_details"]:
                    meeting_details.append(
                        MeetingDetails(
                            meeting["meeting_date"],
                            meeting["days"],
                            meeting["time"],
                            meeting["schedule_type"],
                            meeting["instructor"],
                        )
                    )

                section_information = SectionInformation(
                    course["section_information"]["section_type"],
                    course["section_information"]["suitability"],
                )

                course_details = CourseDetails(
                    course["registration_term"],
                    course["CRN"],
                    course["subject_code"],
                    course["long_title"],
                    course["short_title"],
                    course["course_description"],
                    course["course_credit_value"],
                    course["schedule_type"],
                    course["session_info"],
                    course["registration_status"],
                    section_information,
                    course["year_in_program_restriction"],
                    course["level_restriction"],
                    course["degree_restriction"],
                    course["major_restriction"],
                    course["program_restrictions"],
                    course["department_restriction"],
                    course["faculty_restriction"],
                    meeting_details,
                )
                data_courses.append(course_details)
            courses += data_courses

    calendar = ics.Calendar()
    for course in courses:
        try:
            calendar = convert_to_ics(course, calendar)
        except Exception as e:
            pass

    with open("courses.ics", "w") as f:
        f.writelines(calendar)

    # with open("COMP.json") as f:
    #     data = json.load(f)

    #     courses = []
    #     for course in data:
    #         meeting_details = []
    #         for meeting in course["meeting_details"]:
    #             meeting_details.append(
    #                 MeetingDetails(
    #                     meeting["meeting_date"],
    #                     meeting["days"],
    #                     meeting["time"],
    #                     meeting["schedule_type"],
    #                     meeting["instructor"],
    #                 )
    #             )

    #         section_information = SectionInformation(
    #             course["section_information"]["section_type"],
    #             course["section_information"]["suitability"],
    #         )

    #         course_details = CourseDetails(
    #             course["registration_term"],
    #             course["CRN"],
    #             course["subject_code"],
    #             course["long_title"],
    #             course["short_title"],
    #             course["course_description"],
    #             course["course_credit_value"],
    #             course["schedule_type"],
    #             course["session_info"],
    #             course["registration_status"],
    #             section_information,
    #             course["year_in_program_restriction"],
    #             course["level_restriction"],
    #             course["degree_restriction"],
    #             course["major_restriction"],
    #             course["program_restrictions"],
    #             course["department_restriction"],
    #             course["faculty_restriction"],
    #             meeting_details,
    #         )
    #         courses.append(course_details)

    #     calendar = ics.Calendar()

    #     for course_details in courses:
    #         calendar = convert_to_ics(course_details, calendar)

    #     with open("COMP.ics", "w") as f:
    #         f.writelines(calendar)


if __name__ == "__main__":
    main()
