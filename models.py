from typing import List, Optional


class SectionInformation:
    def __init__(self, section_type: str, suitability: str):
        self.section_type = section_type
        self.suitability = suitability

    def __dict__(self):
        return {"section_type": self.section_type, "suitability": self.suitability}


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
        self.registration_term = registration_term
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
        }

    # i want a function that returns a dict representation of the object
    # so that i can easily convert it to json
    def __str__(self):
        return str(self.__dict__)
