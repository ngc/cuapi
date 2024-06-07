import { CourseDetails, SectionModel } from "./AppManager";

export interface Offering {
    id: string;
    related_offering: string;
    long_title: string;
    description: string;
    registration_term: string;
    sections: Section[];
}

export interface Section {
    registration_term: string;
    related_offering: string;
    section_key: string;
    long_title: string;
    short_title: string;
    subject_code: string;
    tutorials: CourseDetails[];
    lectures: CourseDetails[];
}

export type QueryOfferingsResponse = Offering[];

export const convertSectionsToModels = (
    sections: Section[]
): SectionModel[] => {
    return sections.map((section) => {
        const sectionKey = section.section_key;
        return {
            courses: section.lectures ?? [],
            tutorials: section.tutorials ?? [],
            sectionKey: sectionKey,
        };
    });
};

const IS_DEV = window.location.hostname !== "cuscheduling.com";
let API_URL = IS_DEV
    ? "http://localhost:3969/"
    : "https://cuapi.cuscheduling.com/";

if (window.location.hostname === "cuscheduling.local") {
    API_URL = "http://cuapi.local/";
}

export class API {
    abortController: AbortController;

    constructor() {
        this.abortController = new AbortController();
    }

    fetch(url: string, options: RequestInit): Promise<Response> {
        return fetch(url, {
            ...options,
            signal: this.abortController.signal,
        });
    }

    queryOfferings = async (
        query: string,
        term: string
    ): Promise<QueryOfferingsResponse> => {
        this.abortController.abort();
        this.abortController = new AbortController();

        const response = await this.fetch(
            `${API_URL}query-offerings/${term}/${query}/`,
            {
                method: "GET",
            }
        );

        return response.json();
    };
}
