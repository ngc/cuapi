import { Instance, SnapshotIn, types } from "mobx-state-tree";
import {
    courseDetails,
    courseSearch,
    offeringSearch,
    searchForOfferings,
} from "./api";

import { CalendarEvent } from "../components/Calendar";
import {
    AvailableCourses,
    CourseAndTutorial,
    Schedule,
    flattenSchedule,
    getBestSchedules,
} from "./scheduling";
import { toaster } from "baseui/toast";

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
    related_offering?: string; // Optional in TypeScript
    global_id?: string; // Optional in TypeScript
}

export const TERMS = ["Fall", "Winter", "Summer"];
export const convert_term = (term: string) => {
    switch (term) {
        case "Fall":
            return "F";
        case "Winter":
            return "W";
        case "Summer":
            return "S";
    }
    return "F";
};

export const parseInstructor = (
    instructor?: string | null
): string | undefined => {
    if (instructor === undefined) return undefined;
    if (instructor === null) return undefined;

    const split = instructor.split(" ");
    const name = [];
    for (let i = 0; i < split.length - 1; i++) {
        if (split[i][0] !== "(") {
            name.push(split[i]);
        }
    }

    return name.join(" ");
};

const stringToColor = (str: string): string => {
    // DJB2 hash function
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char;
    }

    // Ensure hash is positive
    hash = Math.abs(hash);

    // Extract RGB components using modular arithmetic
    const red = (hash & 0xff0000) >> 16;
    const green = (hash & 0x00ff00) >> 8;
    const blue = hash & 0x0000ff;

    // Convert to hex color
    const hexColor = `#${red.toString(16).padStart(2, "0")}${green
        .toString(16)
        .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
    return hexColor;
};

export interface SectionModel {
    courses: CourseDetails[];
    tutorials: CourseDetails[];
}

export const RelatedOffering = types
    .model({
        offering_name: types.string,
        section_models: types.array(types.frozen<SectionModel>()),
    })
    .views((self) => ({
        get allSectionModels(): SectionModel[] {
            const sectionModels: SectionModel[] = [];
            for (let sectionModel of self.section_models) {
                sectionModels.push(sectionModel);
            }
            return sectionModels;
        },
    }));

export const AppManager = types
    .model({
        selectedTerm: types.optional(
            types.enumeration<typeof TERMS>(["Fall", "Winter", "Summer"]),
            "Fall"
        ),
        selectedOfferings: types.optional(types.array(RelatedOffering), []),
        currentScheduleIndex: types.optional(types.number, 0),
        unwantedHours: types.optional(types.array(types.number), []), // 0-23
    })
    .views((self) => ({
        get availableCourses(): AvailableCourses {
            let availableCourses: AvailableCourses = {};
            for (let offering of self.selectedOfferings) {
                availableCourses[offering.offering_name] =
                    offering.allSectionModels;
            }
            return availableCourses;
        },
    }))
    .views((self) => ({
        get bestSchedules() {
            const schedules: Schedule[] = getBestSchedules(
                self.availableCourses,
                100,
                100,
                10
            );
            // purge all duplicate schedules
            // we will id a schedule by the CRNs of the courses

            return schedules;
        },
    }))
    .views((self) => ({
        get selectedCourses() {
            const bestSchedules = self.bestSchedules;
            if (
                self.selectedOfferings.length !== 0 &&
                bestSchedules.length === 0
            ) {
                toaster.negative("No schedules found", {});
                return [];
            }
            const schedule: Schedule =
                bestSchedules[self.currentScheduleIndex] || bestSchedules[0];

            return flattenSchedule(schedule);
        },
    }))

    .views((self) => ({
        get courseCount() {
            return self.selectedCourses.length;
        },
    }))
    .actions((self) => ({
        addOffering(offering: SnapshotIn<typeof RelatedOffering>) {
            const newOffering = RelatedOffering.create(offering);
            self.selectedOfferings.push(newOffering);
            self.currentScheduleIndex = 0;
        },
        removeOffering(offering: Instance<typeof RelatedOffering>) {
            // search by offering_name
            const index = self.selectedOfferings.findIndex(
                (o) => o.offering_name === offering.offering_name
            );

            if (index !== -1) {
                self.selectedOfferings.splice(index, 1);
            }

            self.currentScheduleIndex = 0;
        },
    }))
    .views((self) => ({
        /**
         * Convert the selected courses into a list of CalendarEvents
         */
        toEvents(): CalendarEvent[] {
            let events: CalendarEvent[] = [];

            const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

            const courseDetailsToEvent = (course: CourseDetails) => {
                if (course === undefined) {
                    return;
                }

                console.log(course);

                for (let meeting of course.meeting_details) {
                    for (let day of meeting.days) {
                        let dayIndex = days.indexOf(day);
                        if (dayIndex !== -1) {
                            // meeting time is in the format "HH:MM - HH:MM"
                            let times = meeting.time.split(" - ");
                            let start = times[0].split(":");
                            let end = times[1].split(":");
                            let startHour = parseInt(start[0]);
                            let startMinute = parseInt(start[1]);
                            let endHour = parseInt(end[0]);
                            let endMinute = parseInt(end[1]);

                            const subject = course.subject_code.split(" ")[0];

                            events.push({
                                startTime: {
                                    hour: startHour,
                                    minute: startMinute,
                                },
                                endTime: { hour: endHour, minute: endMinute },
                                day: dayIndex,
                                title: course.subject_code,
                                body: course.long_title,
                                onClick: () => {},
                                onHover: () => {},
                                onLeave: () => {},
                                color: stringToColor(subject),
                                course: course,
                                meeting: meeting,
                                instructor: parseInstructor(meeting.instructor),
                            });
                        }
                    }
                }
            };

            for (let course of self.selectedCourses) {
                courseDetailsToEvent(course);
            }

            return events;
        },
    }))
    .actions((self) => ({
        clearCourses() {
            self.selectedOfferings.clear();
        },
    }))
    .actions((self) => ({
        async fetchCourseDetails(crn: string) {
            return await courseDetails(convert_term(self.selectedTerm), crn);
        },
        async fetchCourseSearch(searchTerm: string, page: number) {
            return await courseSearch(searchTerm, page);
        },
        async fetchOfferingSearch(subject: string, code: string, page: number) {
            return await offeringSearch(
                convert_term(self.selectedTerm),
                subject,
                code,
                page
            );
        },
        async fetchSearchForOfferings(searchTerm: string): Promise<string[]> {
            return await searchForOfferings(
                convert_term(self.selectedTerm),
                searchTerm
            );
        },
    }))
    .actions((self) => ({
        setTerm(term: (typeof TERMS)[number]) {
            self.selectedTerm = term;
            self.clearCourses();
        },
        nextSchedule() {
            if (self.currentScheduleIndex == self.bestSchedules.length - 1)
                return;
            self.currentScheduleIndex++;
        },
        previousSchedule() {
            if (self.currentScheduleIndex == 0) return;
            self.currentScheduleIndex--;
        },
    }))
    .views((self) => ({
        get hasPreviousSchedule() {
            return self.currentScheduleIndex > 0;
        },
    }))
    .views((self) => ({
        get hasNextSchedule() {
            return self.currentScheduleIndex < self.bestSchedules.length - 1;
        },
    }));
