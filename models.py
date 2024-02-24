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


class DatabaseConnection:
    def __init__(self) -> None:
        load_dotenv()

        self.conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
        )

    def initialize_db(self):
        with self.conn.cursor() as cur:

            cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

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
            self.conn.commit()

            # also setup full text search using a GIN index on the following columns:
            # long_title, short_title, course_description and meeting_details
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS courses_fts_idx ON courses USING GIN (
                    to_tsvector('english', long_title || ' ' || short_title || ' ' || subject_code || ' ' || meeting_details)
                );
                """
            )
            self.conn.commit()

            # create a table called "searchable_courses" that will be used for full text search
            # this table will have the following columns:
            # 1. registration_term
            # 2. related_offering
            # 3. long_title
            # 4. description
            # 5. sections (this will be a jsonb column)
            # sections will have be an array of json objects with the following properties:
            # {
            #  "section": "A GLOBAL ID",
            # "tutorials": ["A GLOBAL ID", "ANOTHER GLOBAL ID"] # tutorials can be empty
            # }
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

            # use trigrams for fuzzy search
            # also use ranked search with related_offering first
            # long_title second
            # and description third
            # do not ever include sections in the search

            # first, trigram index on related_offering and long_title
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

            # then, full text search index on long_title and description
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

    def search_courses(self, query: str, page: int, per_page=10):
        # use phraseto_tsquery to search for exact phrases

        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT *, ts_rank(to_tsvector('english', long_title || ' ' || short_title || ' ' || subject_code || ' ' || meeting_details), plainto_tsquery(%(query)s)) AS relevance
                FROM courses
                WHERE to_tsvector('english', long_title || ' ' || short_title || ' ' || subject_code || ' ' || meeting_details) @@ plainto_tsquery(%(query)s)
                ORDER BY relevance DESC
                LIMIT %(per_page)s OFFSET %(offset)s;
                """,
                {"query": query, "per_page": per_page, "offset": (page - 1) * per_page},
            )

            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(self.row_to_course_details(row))
            return courses

    def delete_course(self, course: CourseDetails):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM courses WHERE registration_term = %(registration_term)s AND crn = %(CRN)s;
                """,
                course.__dict__(),
            )
            self.conn.commit()

    def search_offerings(
        self, term: str, subject: str, code: str, page: int, per_page=10
    ):
        # search the related_offering column for "{subject} {code}"
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM courses
                WHERE registration_term = %(term)s AND related_offering = %(related_offering)s
                LIMIT %(per_page)s OFFSET %(offset)s;
                """,
                {
                    "term": term,
                    "related_offering": f"{subject} {code}",
                    "per_page": per_page,
                    "offset": (page - 1) * per_page,
                },
            )

            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(self.row_to_course_details(row))
            return courses

    def search_searchable_courses(self, term: str, query: str, page: int, per_page=10):
        with self.conn.cursor() as cur:
            # cur.execute(
            #     """
            #     SELECT * FROM searchable_courses
            #     WHERE registration_term = %(term)s AND (related_offering ILIKE %(query)s OR long_title ILIKE %(query)s)
            #     LIMIT %(per_page)s OFFSET %(offset)s;
            #     """,
            #     {
            #         "term": term,
            #         "query": f"%{query}%",
            #         "per_page": per_page,
            #         "offset": (page - 1) * per_page,
            #     },
            # )

            # rank related_offering 5x higher than long_title
            cur.execute(
                """
                SELECT *, ts_rank(to_tsvector('english', related_offering), plainto_tsquery(%(query)s))
                + 5 * ts_rank(to_tsvector('english', long_title), plainto_tsquery(%(query)s))
                AS relevance
                FROM searchable_courses
                WHERE registration_term = %(term)s AND (related_offering ILIKE %(query)s OR long_title ILIKE %(query)s)
                ORDER BY relevance DESC
                LIMIT %(per_page)s OFFSET %(offset)s;
                """,
                {
                    "term": term,
                    "query": f"%{query}%",
                    "per_page": per_page,
                    "offset": (page - 1) * per_page,
                },
            )

            rows = cur.fetchall()
            courses = []
            for row in rows:
                courses.append(self.row_to_searchable_course(row))
            return courses

    def course_exists(self, course: CourseDetails) -> bool:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM courses WHERE global_id = %(global_id)s;
                """,
                course.__dict__(),
            )
            rows = cur.fetchall()
            return len(rows) > 0

    def update_course(self, course: CourseDetails):
        self.delete_course(course)
        self.insert_course(course)

    def insert_course(self, course: CourseDetails):
        with self.conn.cursor() as cur:
            if self.course_exists(course):
                # overrite the existing course with the new one
                self.update_course(course)
                return

            course_dict = course.__dict__()
            course_dict["section_information"] = json.dumps(
                course_dict["section_information"]
            )

            course_dict["meeting_details"] = json.dumps(course_dict["meeting_details"])

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
                course_dict,
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
