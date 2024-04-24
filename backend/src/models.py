import json
from typing import List, Optional
import psycopg2
from dotenv import load_dotenv
import os


def course_dict_to_course_details(course_dict):
    section_information = SectionInformation(
        course_dict["section_information"]["section_type"],
        course_dict["section_information"]["suitability"],
    )

    meeting_details = []
    for meeting in course_dict["meeting_details"]:
        meeting_details.append(
            MeetingDetails(
                meeting["meeting_date"],
                meeting["days"],
                meeting["time"],
                meeting["schedule_type"],
                meeting["instructor"],
            )
        )

    course_details = CourseDetails(
        course_dict["registration_term"],
        course_dict["CRN"],
        course_dict["subject_code"],
        course_dict["long_title"],
        course_dict["short_title"],
        course_dict["course_description"],
        course_dict["course_credit_value"],
        course_dict["schedule_type"],
        course_dict["session_info"],
        course_dict["registration_status"],
        section_information,
        course_dict["year_in_program_restriction"],
        course_dict["level_restriction"],
        course_dict["degree_restriction"],
        course_dict["major_restriction"],
        course_dict["program_restrictions"],
        course_dict["department_restriction"],
        course_dict["faculty_restriction"],
        meeting_details,
    )

    return course_details


def format_registration_term(term: str) -> str:
    if "Fall" in term:
        return "F"
    elif "Winter" in term:
        return "W"
    elif "Summer" in term:
        return "S"
    else:
        return term[0].upper()


class SectionInformation:
    def __init__(self, section_type: str, suitability: str):
        self.section_type = section_type
        self.suitability = suitability

    def to_dict(self):
        return {"section_type": self.section_type, "suitability": self.suitability}


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


class MeetingDetails:
    def __init__(
        self,
        meeting_date: str,
        days: List[str],
        time: str,
        schedule_type: str,
        instructor: Optional[str] = None,
    ):
        self.meeting_date = meeting_date
        self.days = days
        self.time = time
        self.schedule_type = schedule_type
        self.instructor = instructor

    def to_dict(self):
        return {
            "meeting_date": self.meeting_date,
            "days": self.days,
            "time": self.time,
            "schedule_type": self.schedule_type,
            "instructor": self.instructor,
        }


"""
Use this class to encode all of our custom classes to JSON
"""


class CourseJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, CourseDetails):
            return obj.to_dict()
        elif isinstance(obj, SectionInformation):
            return obj.to_dict()
        elif isinstance(obj, MeetingDetails):
            return obj.to_dict()
        return json.JSONEncoder.default(self, obj)


class CourseDetails:
    def __init__(
        self,
        registration_term: str,
        CRN: str,
        subject_code: str,
        long_title: str,
        short_title: str,
        course_description: str,
        course_credit_value: float,
        schedule_type: str,
        session_info: str,
        registration_status: str,
        section_information: SectionInformation,
        year_in_program_restriction: Optional[str] = None,
        level_restriction: Optional[str] = None,
        degree_restriction: Optional[str] = None,
        major_restriction: Optional[str] = None,
        program_restrictions: Optional[str] = None,
        department_restriction: Optional[str] = None,
        faculty_restriction: Optional[str] = None,
        meeting_details: List[MeetingDetails] = [],
    ):
        self.registration_term = format_registration_term(registration_term)
        self.CRN = CRN
        self.subject_code = subject_code
        self.long_title = long_title
        self.short_title = short_title
        self.course_description = course_description
        self.course_credit_value = course_credit_value
        self.schedule_type = schedule_type
        self.session_info = session_info
        self.registration_status = registration_status
        self.section_information = section_information
        self.year_in_program_restriction = year_in_program_restriction
        self.level_restriction = level_restriction
        self.degree_restriction = degree_restriction
        self.major_restriction = major_restriction
        self.program_restrictions = program_restrictions
        self.department_restriction = department_restriction
        self.faculty_restriction = faculty_restriction
        self.meeting_details = meeting_details

        # Computed properties
        self.global_id = f"{format_registration_term(registration_term)}{CRN}"
        # first two portions of split subject code
        split_subject_code = subject_code.split(" ")
        self.related_offering = f"{split_subject_code[0]} {split_subject_code[1]}"

    def to_dict(self):
        return {
            "registration_term": self.registration_term,
            "CRN": self.CRN,
            "subject_code": self.subject_code,
            "long_title": self.long_title,
            "short_title": self.short_title,
            "course_description": self.course_description,
            "course_credit_value": self.course_credit_value,
            "schedule_type": self.schedule_type,
            "session_info": self.session_info,
            "registration_status": self.registration_status,
            "section_information": self.section_information.to_dict(),
            "year_in_program_restriction": self.year_in_program_restriction,
            "level_restriction": self.level_restriction,
            "degree_restriction": self.degree_restriction,
            "major_restriction": self.major_restriction,
            "program_restrictions": self.program_restrictions,
            "department_restriction": self.department_restriction,
            "faculty_restriction": self.faculty_restriction,
            "meeting_details": [meeting.to_dict() for meeting in self.meeting_details],
            "global_id": self.global_id,
            "related_offering": self.related_offering,
        }

    def to_shallow_dict(self):
        # psycopg2 doesn't like python dicts with nested dicts
        # so we need to flatten the section_information and meeting_details to strings
        ret = self.to_dict()
        ret["section_information"] = json.dumps(ret["section_information"])
        ret["meeting_details"] = json.dumps(ret["meeting_details"])
        return ret

    # i want a function that returns a dict representation of the object
    # so that i can easily convert it to json
    def __str__(self):
        return str(self.to_dict)

    def get_section_key(self):
        split_subject_code = self.subject_code.split(" ")
        return split_subject_code[2][0] if len(split_subject_code) > 2 else "$"

    def isLecture(self):
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
        return self.schedule_type in lecture_aliases


class DatabaseConnection:

    def __init__(self) -> None:
        self.conn = None
        self.connect()
        self.initialize_db()

    def connect(self):
        if self.conn is not None and not self.conn.closed:
            return

        load_dotenv()

        self.conn = psycopg2.connect(
            host=os.environ.get("POSTGRES_HOST"),
            database=os.environ.get("POSTGRES_DB"),
            user=os.environ.get("POSTGRES_USER"),
            password=os.environ.get("POSTGRES_PASSWORD"),
        )

    def initialize_db(self):
        with self.conn.cursor() as cur:

            cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

            # make a table called CourseDetails
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS courses (
                    id SERIAL PRIMARY KEY,
                    registration_term VARCHAR(255),
                    crn VARCHAR(255),
                    subject_code VARCHAR(255),
                    long_title VARCHAR(255),
                    short_title VARCHAR(255),
                    course_description TEXT,
                    course_credit_value FLOAT,
                    schedule_type VARCHAR(255),
                    session_info VARCHAR(255),
                    registration_status VARCHAR(255),
                    section_information JSONB,
                    year_in_program_restriction VARCHAR(255),
                    level_restriction VARCHAR(255),
                    degree_restriction VARCHAR(255),
                    major_restriction VARCHAR(255),
                    program_restrictions VARCHAR(255),
                    department_restriction VARCHAR(255),
                    faculty_restriction VARCHAR(255),
                    meeting_details JSONB,
                    global_id VARCHAR(255),
                    related_offering VARCHAR(255)
                );
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS searchable_courses (
                    id SERIAL PRIMARY KEY,
                    registration_term VARCHAR(255),
                    related_offering VARCHAR(255),
                    long_title VARCHAR(255),
                    description TEXT,
                    sections JSONB
                );
                """
            )
            self.conn.commit()

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS searchable_courses_related_offering_trgm_idx ON searchable_courses USING gin (related_offering gin_trgm_ops);
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS searchable_courses_long_title_trgm_idx ON searchable_courses USING gin (long_title gin_trgm_ops);
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS searchable_courses_description_trgm_idx ON searchable_courses USING gin (description gin_trgm_ops);
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS searchable_courses_fts_idx ON searchable_courses USING GIN (
                    to_tsvector('english', long_title || ' ' || description)
                );
                """
            )

            self.conn.commit()

    def get_connection(self):
        return self.conn

    def delete_course(self, course: CourseDetails):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM courses WHERE registration_term = %(registration_term)s AND crn = %(CRN)s;
                """,
                course.to_dict(),
            )
            self.conn.commit()

    def search_searchable_courses(self, term: str, query: str, page: int, per_page=10):
        self.connect()

        with self.conn.cursor() as cur:
            query_string = """
            SELECT *
            FROM searchable_courses
            WHERE lower(registration_term) ILIKE '%{query}%'
            OR lower(related_offering) ILIKE '%{query}%'
            OR lower(long_title) ILIKE '%{query}%'
            OR lower(description) ILIKE '%{query}%'
            OR lower(registration_term) % lower('{query}')
            OR lower(related_offering) % lower('{query}')
            OR lower(long_title) % lower('{query}')
            OR lower(description) % lower('{query}')
            ORDER BY similarity(lower(related_offering), lower('{query}')) DESC
            LIMIT {per_page} OFFSET {per_page} * {page};
            """

            formatted_query = query_string.format(
                query=query, per_page=per_page, page=page - 1
            )

            cur.execute(formatted_query)

            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(self.row_to_searchable_course(row))
            return courses

    def course_exists(self, course: CourseDetails) -> bool:
        with self.conn.cursor() as cur:
            # search for the searchable course by related_offering and registration_term
            cur.execute(
                """
                SELECT * FROM searchable_courses WHERE related_offering = %(related_offering)s AND registration_term = %(registration_term)s;
                """,
                course.to_dict(),
            )
            rows = cur.fetchall()
            if len(rows) == 0:
                return False
            searchableCourse = self.row_to_searchable_course(rows[0])
            for section in searchableCourse.sections:
                for section_course in section["courses"]:
                    if section_course["CRN"] == course.CRN:
                        return True
                for tutorial in section["tutorials"]:
                    if tutorial["CRN"] == course.CRN:
                        return True

            return False

    def build_searchable_courses(self, registration_term: str, related_offering: str):
        # delete the searchable course if it already exists
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM searchable_courses WHERE registration_term = %(registration_term)s AND related_offering = %(related_offering)s;
                """,
                {
                    "registration_term": registration_term,
                    "related_offering": related_offering,
                },
            )
            self.conn.commit()

        # we need to get all course details from the courses table who have the same registration_term and related_offering
        course_details = []
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM courses WHERE registration_term = %(registration_term)s AND related_offering = %(related_offering)s;
                """,
                {
                    "registration_term": registration_term,
                    "related_offering": related_offering,
                },
            )
            rows = cur.fetchall()
            for row in rows:
                course_details.append(self.row_to_course_details(row))

        # this is how sections will be structured
        sections = {}

        for course in course_details:
            section_key = course.get_section_key()
            if section_key not in sections:
                sections[section_key] = {"courses": [], "tutorials": []}
            if course.isLecture():
                sections[section_key]["courses"].append(course.to_dict())
            else:
                sections[section_key]["tutorials"].append(course.to_dict())

        # now we want to flatten the sections dictionary into a list of dictionaries
        sections_list = []
        for key in sections:
            sections_list.append({"section_key": key, **sections[key]})

        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO searchable_courses (
                    registration_term,
                    related_offering,
                    long_title,
                    description,
                    sections
                )
                VALUES (
                    %(registration_term)s,
                    %(related_offering)s,
                    %(long_title)s,
                    %(description)s,
                    %(sections)s
                );
                """,
                {
                    "registration_term": registration_term,
                    "related_offering": related_offering,
                    "long_title": course_details[0].long_title,
                    "description": course_details[0].course_description,
                    "sections": json.dumps(sections_list),
                },
            )
            self.conn.commit()

    def build_all_searchable_courses(self):
        # perform a query against the courses table to get all unique pairs of registration_term and related_offering
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT registration_term, related_offering FROM courses;
                """
            )
            rows = cur.fetchall()
            for row in rows:
                registration_term = row[0]
                related_offering = row[1]

                self.build_searchable_courses(registration_term, related_offering)

    def update_course(self, course: CourseDetails):
        # update the course in courses table
        with self.conn.cursor() as cur:
            cur.execute(
                """
                UPDATE courses
                SET
                    long_title = %(long_title)s,
                    short_title = %(short_title)s,
                    course_description = %(course_description)s,
                    course_credit_value = %(course_credit_value)s,
                    schedule_type = %(schedule_type)s,
                    session_info = %(session_info)s,
                    registration_status = %(registration_status)s,
                    section_information = %(section_information)s,
                    year_in_program_restriction = %(year_in_program_restriction)s,
                    level_restriction = %(level_restriction)s,
                    degree_restriction = %(degree_restriction)s,
                    major_restriction = %(major_restriction)s,
                    program_restrictions = %(program_restrictions)s,
                    department_restriction = %(department_restriction)s,
                    faculty_restriction = %(faculty_restriction)s,
                    meeting_details = %(meeting_details)s
                WHERE
                    registration_term = %(registration_term)s
                    AND CRN = %(CRN)s;
                """,
                course.to_dict(),
            )
            self.conn.commit()

    def search_by_course_code(
        self, term: str, subject_code: str, page: int, per_page=10
    ):
        QUERY = """
SELECT
    course_details
FROM (
    SELECT
        jsonb_array_elements(jsonb_array_elements(sc.sections)->'courses') AS course_details
    FROM
        searchable_courses sc
    WHERE
        sc.sections IS NOT NULL
        AND sc.registration_term = %s
) AS subquery
WHERE
    course_details->>'subject_code' = %s

UNION ALL

SELECT
    tutorial_details
FROM (
    SELECT
        jsonb_array_elements(jsonb_array_elements(sc.sections)->'tutorials') AS tutorial_details
    FROM
        searchable_courses sc
    WHERE
        sc.sections IS NOT NULL
        AND sc.registration_term = %s
) AS subquery
WHERE
    tutorial_details->>'subject_code' = %s;
"""
        with self.conn.cursor() as cur:
            cur.execute(QUERY, (term, subject_code, term, subject_code))
            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(course_dict_to_course_details(row[0]))
            return courses

    def search_by_crn(self, term: str, crn: str, page: int, per_page=10):
        with self.conn.cursor() as cur:
            QUERY = """
SELECT
    course_details
FROM (
    SELECT
        jsonb_array_elements(jsonb_array_elements(sc.sections)->'courses') AS course_details
    FROM
        searchable_courses sc
    WHERE
        sc.sections IS NOT NULL
        AND sc.registration_term = %s
) AS subquery
WHERE
    course_details->>'CRN' = %s

UNION ALL

SELECT
    tutorial_details
FROM (
    SELECT
        jsonb_array_elements(jsonb_array_elements(sc.sections)->'tutorials') AS tutorial_details
    FROM
        searchable_courses sc
    WHERE
        sc.sections IS NOT NULL
        AND sc.registration_term = %s
) AS subquery
WHERE
    tutorial_details->>'CRN' = %s;
"""
            cur.execute(QUERY, (term, crn, term, crn))
            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(course_dict_to_course_details(row[0]))
            return courses

    def insert_course(self, course: CourseDetails):
        # first check if the course already exists
        if self.course_exists(course):
            return

        with self.conn.cursor() as cur:
            # add the course to the course_details table

            cur.execute(
                """
                INSERT INTO courses (
                    registration_term,
                    crn,
                    subject_code,
                    long_title,
                    short_title,
                    course_description,
                    course_credit_value,
                    schedule_type,
                    session_info,
                    registration_status,
                    section_information,
                    year_in_program_restriction,
                    level_restriction,
                    degree_restriction,
                    major_restriction,
                    program_restrictions,
                    department_restriction,
                    faculty_restriction,
                    meeting_details,
                    global_id,
                    related_offering
                )
                VALUES (
                    %(registration_term)s,
                    %(CRN)s,
                    %(subject_code)s,
                    %(long_title)s,
                    %(short_title)s,
                    %(course_description)s,
                    %(course_credit_value)s,
                    %(schedule_type)s,
                    %(session_info)s,
                    %(registration_status)s,
                    %(section_information)s,
                    %(year_in_program_restriction)s,
                    %(level_restriction)s,
                    %(degree_restriction)s,
                    %(major_restriction)s,
                    %(program_restrictions)s,
                    %(department_restriction)s,
                    %(faculty_restriction)s,
                    %(meeting_details)s,
                    %(global_id)s,
                    %(related_offering)s
                );
                """,
                course.to_shallow_dict(),
            )
            self.conn.commit()

    def row_to_course_details(self, row):
        section_information = SectionInformation(
            section_type=row[11]["section_type"],
            suitability=row[11]["suitability"],
        )

        meeting_details = []
        for meeting in row[19]:
            meeting_details.append(
                MeetingDetails(
                    meeting_date=meeting["meeting_date"],
                    days=meeting["days"],
                    time=meeting["time"],
                    schedule_type=meeting["schedule_type"],
                    instructor=meeting["instructor"],
                )
            )

        return CourseDetails(
            registration_term=row[1],
            CRN=row[2],
            subject_code=row[3],
            long_title=row[4],
            short_title=row[5],
            course_description=row[6],
            course_credit_value=row[7],
            schedule_type=row[8],
            session_info=row[9],
            registration_status=row[10],
            section_information=section_information,
            year_in_program_restriction=row[12],
            level_restriction=row[13],
            degree_restriction=row[14],
            major_restriction=row[15],
            program_restrictions=row[16],
            department_restriction=row[17],
            faculty_restriction=row[18],
            meeting_details=meeting_details,
            # global_id=row[21], (this is generated from the registration term and crn)
            # related_offering=row[22] (this is generated from the subject code)
        )

    def get_course(self, registration_term: str, crn: str) -> CourseDetails:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM courses WHERE registration_term = %(registration_term)s AND crn = %(crn)s;
                """,
                {"registration_term": registration_term, "crn": crn},
            )
            rows = cur.fetchall()
            if len(rows) == 0:
                raise Exception(f"Course with CRN {crn} not found")
            else:
                row = rows[0]
                return self.row_to_course_details(row)

    def get_courses_by_id_range(
        self, start_id: int, end_id: int
    ) -> List[CourseDetails]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM courses WHERE id >= %(start_id)s AND id <= %(end_id)s;
                """,
                {"start_id": start_id, "end_id": end_id},
            )
            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(self.row_to_course_details(row))
            return courses

    def close(self):
        self.conn.close()

    def print_all_courses(self):
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM courses;")
            rows = cur.fetchall()
            print(rows)

    def search_for_offerings(self, term: str, search_term: str):
        # first the rows registration_term must be equal to term
        # then perform a search on related_offering
        # then we want to return a list of strings that are the related_offerings
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT related_offering FROM courses WHERE registration_term = %(term)s AND related_offering ILIKE %(search_term)s;
                """,
                {"term": term, "search_term": f"%{search_term}%"},
            )
            rows = cur.fetchall()

            # make offerings a set of unique offerings

            offerings = set()
            for row in rows:
                offerings.add(row[0])
            return sorted(list(offerings))

    def row_to_searchable_course(self, row):
        return SearchableCourse(
            registration_term=row[1],
            related_offering=row[2],
            long_title=row[3],
            description=row[4],
            sections=row[5],
        )

    # all courses generator
    def all_courses(self) -> CourseDetails:
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM courses;")
            rows = cur.fetchall()
            for row in rows:
                yield self.row_to_course_details(row)

    def all_searchable_courses(self) -> SearchableCourse:
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM searchable_courses;")
            rows = cur.fetchall()
            for row in rows:
                yield self.row_to_searchable_course(row)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
