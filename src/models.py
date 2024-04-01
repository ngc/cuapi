import json
from typing import List, Optional
import psycopg2
from dotenv import load_dotenv
import os


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

    def __dict__(self):
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

    def __dict__(self):
        return {
            "meeting_date": self.meeting_date,
            "days": self.days,
            "time": self.time,
            "schedule_type": self.schedule_type,
            "instructor": self.instructor,
        }


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

    def __dict__(self):
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
            "section_information": self.section_information.__dict__(),
            "year_in_program_restriction": self.year_in_program_restriction,
            "level_restriction": self.level_restriction,
            "degree_restriction": self.degree_restriction,
            "major_restriction": self.major_restriction,
            "program_restrictions": self.program_restrictions,
            "department_restriction": self.department_restriction,
            "faculty_restriction": self.faculty_restriction,
            "meeting_details": [meeting.__dict__() for meeting in self.meeting_details],
            "global_id": self.global_id,
            "related_offering": self.related_offering,
        }

    # i want a function that returns a dict representation of the object
    # so that i can easily convert it to json
    def __str__(self):
        return str(self.__dict__)

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
                course.__dict__(),
            )
            self.conn.commit()

    def search_searchable_courses(self, term: str, query: str, page: int, per_page=10):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT *, ts_rank(to_tsvector('english', related_offering), plainto_tsquery(%(query)s))
                + 5 * ts_rank(to_tsvector('english', long_title), plainto_tsquery(%(query)s))
                AS relevance
                FROM searchable_courses
                WHERE registration_term = %(term)s AND (related_offering ILIKE %(query)s OR long_title ILIKE %(query)s)
                ORDER BY relevance DESC
                LIMIT %(per_page)s OFFSET %(per_page)s * %(page)s;
                """,
                {
                    "term": term,
                    "query": f"%{query}%",
                    "per_page": per_page,
                    "page": page,
                },
            )

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
                course.__dict__(),
            )
            rows = cur.fetchall()
            if len(rows) == 0:
                return False
            searchableCourse = self.row_to_searchable_course(rows[0])
            for section in searchableCourse.sections:
                for course in section["courses"]:
                    if course["CRN"] == course.CRN:
                        return True
                for tutorial in section["tutorials"]:
                    if tutorial["CRN"] == course.CRN:
                        return True

            return False

    def update_course(self, course: CourseDetails):
        # get the searchable course
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM searchable_courses WHERE related_offering = %(related_offering)s AND registration_term = %(registration_term)s;
                """,
                course.__dict__(),
            )
            rows = cur.fetchall()
            searchableCourse = self.row_to_searchable_course(rows[0])

            sections = searchableCourse.sections
            # now we want to iterate through the sections and find the section that the course is in, whether its in the courses or tutorials lists and then the exact index of the course in that list
            for section in sections:
                for i, course in enumerate(section["courses"]):
                    if course["CRN"] == course.CRN:
                        section["courses"][i] = course.__dict__()
                        break
                for i, tutorial in enumerate(section["tutorials"]):
                    if tutorial["CRN"] == course.CRN:
                        section["tutorials"][i] = course.__dict__()
                        break

            # now update the searchable course
            cur.execute(
                """
                UPDATE searchable_courses SET sections = %s WHERE related_offering = %s AND registration_term = %s;
                """,
                (
                    json.dumps(sections),
                    course.related_offering,
                    course.registration_term,
                ),
            )

    def insert_course(self, course: CourseDetails):
        with self.conn.cursor() as cur:
            if self.course_exists(course):
                print("Course already exists")
                # overrite the existing course with the new one
                self.update_course(course)
                return

            # if the course does not exist we need to insert it into the searchable_courses table
            # find the related_offering in the searchable_courses table
            cur.execute(
                """
                SELECT * FROM searchable_courses WHERE related_offering = %(related_offering)s AND registration_term = %(registration_term)s;
                """,
                course.__dict__(),
            )
            rows = cur.fetchall()
            print(
                f"Searched for {course.related_offering} in searchable_courses table and got {len(rows)} results"
            )

            sections = []
            if len(rows) > 0:
                # if the related_offering exists in the searchable_courses table we need to get the sections
                sections = rows[0][5]

            sectionKey = course.get_section_key()
            courseOrTutorial = "courses" if course.isLecture() else "tutorials"

            notFound = True
            for i, section in enumerate(sections):
                if section["section_key"] == sectionKey:

                    sections[i][courseOrTutorial].append(course.__dict__())
                    notFound = False
                    break
            if notFound:
                # if the section does not exist we need to add it
                sections.append(
                    {
                        "section_key": sectionKey,
                        "courses": [],
                        "tutorials": [],
                    }
                )
                sections[-1][courseOrTutorial].append(course.__dict__())

            # now we want to insert or update the searchable_course
            if len(rows) > 0:
                print(f"Updating {course.related_offering} in searchable_courses")
                cur.execute(
                    """
                    UPDATE searchable_courses SET sections = %s WHERE related_offering = %s AND registration_term = %s;
                    """,
                    (
                        json.dumps(sections),
                        course.related_offering,
                        course.registration_term,
                    ),
                )
            else:
                print(f"Inserting {course.related_offering} into searchable_courses")
                cur.execute(
                    """
                    INSERT INTO searchable_courses (registration_term, related_offering, long_title, description, sections) VALUES (%s, %s, %s, %s, %s);
                    """,
                    (
                        course.registration_term,
                        course.related_offering,
                        course.long_title,
                        course.course_description,
                        json.dumps(sections),
                    ),
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
