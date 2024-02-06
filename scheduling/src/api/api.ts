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

type CourseOfferingName = string;

const API_URL = "http://localhost:3969/";

/*
api.add_resource(Course, "/course/<string:term>/<string:crn>")
api.add_resource(CourseSearch, "/search/<string:search_term>/<int:page>")
api.add_resource(
    OfferingSearch, "/offering/<string:term>/<string:subject>/<string:code>/<int:page>"
)
api.add_resource(
    SearchForOfferings, "/search-offerings/<string:term>/<string:search_term>"
)
*/

export async function courseSearch(
    searchTerm: string,
    page: number
): Promise<CourseDetails[]> {
    const response = await fetch(`${API_URL}search/${searchTerm}/${page}`);
    return response.json();
}

export async function courseDetails(
    term: string,
    crn: string
): Promise<CourseDetails> {
    const response = await fetch(`${API_URL}course/${term}/${crn}`);
    return response.json();
}

export async function offeringSearch(
    term: string,
    subject: string,
    code: string,
    page: number
): Promise<CourseDetails[]> {
    const response = await fetch(
        `${API_URL}offering/${term}/${subject}/${code}/${page}`
    );
    return response.json();
}

export async function searchForOfferings(
    term: string,
    searchTerm: string
): Promise<CourseOfferingName[]> {
    const response = await fetch(
        `${API_URL}search-offerings/${term}/${searchTerm}`
    );
    return response.json();
}
