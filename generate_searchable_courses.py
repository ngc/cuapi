from models import DatabaseConnection, SearchableCourse
import json

# at this point we have a full table of courses
# but nothing in the searchable_courses table
# we want to populate the searchable_courses table with the data from the courses table

# we're going to get all courses from the courses table and one by one store them as CourseDetails objects

"""
class SearchableCourse:
    def __init__(
        self,
        registration_term: str,
        related_offering: str,
        long_title: str,
        description: str,
        sections: List[str],
    ):
        self.registration_term = registration_term
        self.related_offering = related_offering
        self.long_title = long_title
        self.description = description
        self.sections = sections

    def __dict__(self):
        return {
            "registration_term": self.registration_term,
            "related_offering": self.related_offering,
            "long_title": self.long_title,
            "description": self.description,
            "sections": self.sections,
        }
"""

db = DatabaseConnection()
db.initialize_db()
db_conn = db.get_connection()


def sectionify_searchable_course(searchable_course: SearchableCourse):
    # Currently the sections field is a list of objects, each object has a course
    # We want to extract all these courses, store them in a list of objects

    all_courses = []

    sections = searchable_course.sections
    for section in sections:
        all_courses.append(section["course"])

    # clear the sections field
    searchable_course.sections = []

    # now we want to iterate through all the courses and store them in a map with the section code as the key
    # and an object with an array of courses and array of tutorials as the value

    # the section code is the first character of the third part of the course code
    # the course code is in the format: "CSC 110 L1A"
    # the section code is "L"
    # if there is no section code, the section code will be "$"

    section_map = {}

    for course in all_courses:
        split_course_code = course["subject_code"].split(" ")
        section_code = split_course_code[2][0] if len(split_course_code) > 2 else "$"

        # is not lecture or seminar or studio
        lecture_aliases = [
            "Lecture",
            "Seminar",
            "Studio",
            "Comprehensive",
            "Practicum",
            "Other",
            "Workshop",
            "PhD Thesis",
            "Masters Thesis",
            "Directed Studies",
            "Honours Essay",
            "Problem Analysis",
        ]
        is_tutorial = course["schedule_type"] not in lecture_aliases

        if section_code in section_map:
            if is_tutorial:
                section_map[section_code]["tutorials"].append(course)
            else:
                section_map[section_code]["courses"].append(course)
        else:
            if is_tutorial:
                section_map[section_code] = {
                    "courses": [],
                    "tutorials": [course],
                }
            else:
                section_map[section_code] = {
                    "courses": [course],
                    "tutorials": [],
                }

    # now iterate through all the values in section_map
    # if any of the values have no courses,
    # then make all the tutorials for that section the courses for that section
    for section in section_map.values():
        if len(section["courses"]) == 0:
            section["courses"] = section["tutorials"]
            section["tutorials"] = []

    # now we want to iterate through the section_map and store the values in the sections field of the searchable_course
    new_sections = section_map.values()
    searchable_course.sections = list(new_sections)

    return searchable_course


for course in db.all_courses():
    with db_conn.cursor() as cursor:
        # check if the course is already in the searchable_courses table
        # this means there is already a searchable_course with the same registration_term and related_offering
        cursor.execute(
            "SELECT * FROM searchable_courses WHERE registration_term = %s AND related_offering = %s",
            (course.registration_term, course.related_offering),
        )
        pre_existing = cursor.fetchone()

        if pre_existing:
            # if the course is already in the searchable_courses table we need to add it to the sections
            sections = pre_existing[5]
            sections.append(
                {
                    "course": course.__dict__(),
                    "tutorials": [],
                }
            )
            cursor.execute(
                "UPDATE searchable_courses SET sections = %s WHERE registration_term = %s AND related_offering = %s",
                (
                    json.dumps(sections),
                    course.registration_term,
                    course.related_offering,
                ),
            )
        else:
            # if the course is not already in the searchable_courses table we need to add it as a new searchable_course
            cursor.execute(
                "INSERT INTO searchable_courses (registration_term, related_offering, long_title, description, sections) VALUES (%s, %s, %s, %s, %s)",
                (
                    course.registration_term,
                    course.related_offering,
                    course.long_title,
                    course.course_description,
                    json.dumps([{"course": course.__dict__(), "tutorials": []}]),
                ),
            )

        db_conn.commit()

for searchable_course in db.all_searchable_courses():
    searchable_course = sectionify_searchable_course(searchable_course)
    with db_conn.cursor() as cursor:
        cursor.execute(
            "UPDATE searchable_courses SET sections = %s WHERE registration_term = %s AND related_offering = %s",
            (
                json.dumps(searchable_course.sections),
                searchable_course.registration_term,
                searchable_course.related_offering,
            ),
        )
        db_conn.commit()
