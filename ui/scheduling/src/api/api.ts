import { SectionModel } from "./AppManager";

export interface SectionInformation {
    section_type: string;
    suitability: string;
}

export interface MeetingDetails {
    meeting_date: string;
    days: string[];
    time: string;
    schedule_type: string;
    instructor?: string; // Optional in TypeScript
}

export interface CourseDetails {
    registration_term: string;
    CRN: string;
    subject_code: string;
    long_title: string;
    short_title: string;
    course_description: string;
    course_credit_value: number; // float in Python becomes number in TypeScript
    schedule_type: string;
    session_info: string;
    registration_status: string;
    section_information: SectionInformation;
    year_in_program_restriction?: string; // Optional in TypeScript
    level_restriction?: string; // Optional in TypeScript
    degree_restriction?: string; // Optional in TypeScript
    major_restriction?: string; // Optional in TypeScript
    program_restrictions?: string; // Optional in TypeScript
    department_restriction?: string; // Optional in TypeScript
    faculty_restriction?: string; // Optional in TypeScript
    meeting_details: MeetingDetails[]; // Array of MeetingDetails
}

/*
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

        */

export interface SearchableCourse {
    registration_term: string;
    related_offering: string;
    long_title: string;
    description: string;
    sections: SectionModel[];
}

const IS_DEV = window.location.hostname === "localhost";

const API_URL = IS_DEV
    ? "http://localhost:3969/"
    : "https://cuapi.cuscheduling.com/";

/*
api.add_resource(Course, "/course/<string:term>/<string:crn>")
api.add_resource(CourseSearch, "/search/<string:search_term>/<int:page>")
api.add_resource(
    OfferingSearch, "/offering/<string:term>/<string:subject>/<string:code>/<int:page>"
)
api.add_resource(
    SearchForOfferings, "/search-offerings/<string:term>/<string:search_term>"
)
api.add_resource(
    SearchableCourseSearch, "/searchable-courses/<string:search_term>/<int:page>"
)

*/

export async function searchableCourseSearch(
    term: string,
    searchTerm: string,
    page: number,
    signal?: AbortSignal
): Promise<SearchableCourse[]> {
    const response = await fetch(
        `${API_URL}searchable-courses/${term}/${searchTerm}/${page}`,
        {
            signal,
        }
    );
    return response.json();
}

export async function crnSearch(
    term: string,
    crn: string,
    page: number,
    signal?: AbortSignal
): Promise<CourseDetails[]> {
    const response = await fetch(`${API_URL}crn/${term}/${crn}/${page}`, {
        signal,
    });

    return response.json();
}

export async function courseCodeSearch(
    term: string,
    course_code: string,
    page: number,
    signal?: AbortSignal
): Promise<CourseDetails[]> {
    const response = await fetch(
        `${API_URL}offering/${term}/${course_code}/${page}`,
        {
            signal,
        }
    );

    return response.json();
}
