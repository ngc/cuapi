import {
    CourseDetails,
    SectionModel,
    isRegistrationClosed,
} from "./AppManager";

const IS_DEV = window.location.hostname !== "cuscheduling.com";
let API_URL = IS_DEV
    ? "http://localhost:3969/"
    : "https://cuapi.cuscheduling.com/";

if (window.location.hostname === "cuscheduling.local") {
    API_URL = "http://cuapi.local/";
}

export interface SectionResult {
    section_code: string;
    lectures: CourseDetails[];
    tutorials: CourseDetails[];
}
export interface GetSectionsByCourseCodeResponse {
    sections: SectionResult[];
}

export interface CourseQueryResult {
    course_code: string;
    long_title: string;
    description: string;
    related_offering: string;
}

export interface QueryCoursesResponse {
    courses: CourseQueryResult[];
}

const removeClosedCourseDetails = (
    courseDetails: CourseDetails[]
): CourseDetails[] => {
    return courseDetails.filter((course) => !isRegistrationClosed(course));
};

export const maybeFlipCoursesAndTutorials = (
    courses: CourseDetails[],
    tutorials: CourseDetails[]
) => {
    if (courses.length === 0 && tutorials.length > 0) {
        return { courses: tutorials, tutorials: courses };
    }
    return { courses, tutorials };
};

export const cleanupSections = (sections: SectionModel[]) => {
    const DEMO_MODE = true;

    for (let i = 0; i < sections.length; i++) {
        const { courses, tutorials } = maybeFlipCoursesAndTutorials(
            sections[i].courses,
            sections[i].tutorials
        );
        sections[i].courses = courses;
        sections[i].tutorials = tutorials;
    }

    // Demo mode: show all sections regardless of whether they are closed
    if (DEMO_MODE) {
        return sections;
    }

    return sections.filter(
        (section) =>
            removeClosedCourseDetails(section.courses).length > 0 ||
            removeClosedCourseDetails(section.tutorials).length > 0
    );
};

export const isEmptySection = (section: SectionModel) => {
    return section.courses.length === 0 && section.tutorials.length === 0;
};

// uses an AbortController to only ever have one request in flight at a time
export class API {
    controller: AbortController;
    signal: AbortSignal;

    constructor() {
        this.controller = new AbortController();
        this.signal = this.controller.signal;
    }

    fetch = async (url: string, options: RequestInit) => {
        this.controller.abort();
        this.controller = new AbortController();
        this.signal = this.controller.signal;

        return fetch(url, { ...options, signal: this.signal });
    };

    getSectionsByCourseCode = async (
        courseCode: string,
        term?: string
    ): Promise<GetSectionsByCourseCodeResponse> => {
        if (!term) {
            term = courseCode[0];
            courseCode = courseCode.slice(1).trim();
        }

        const response = await this.fetch(
            `${API_URL}get-sections-by-course-code/${term}/${courseCode}`,
            {
                method: "GET",
            }
        );

        return response.json();
    };

    queryCourses = async (
        query: string,
        term: string
    ): Promise<QueryCoursesResponse> => {
        const response = await this.fetch(
            `${API_URL}query-courses/${query}/${term}`,
            {
                method: "GET",
            }
        );
        return response.json();
    };
}

export const convertSectionsToModels = (
    sections: GetSectionsByCourseCodeResponse
): SectionModel[] => {
    return sections.sections.map((section) => {
        const sectionKey = section.section_code;
        return {
            courses: section.lectures ?? [],
            tutorials: section.tutorials ?? [],
            sectionKey: sectionKey,
        };
    });
};
