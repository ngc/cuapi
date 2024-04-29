import { Instance, SnapshotIn, getSnapshot, types } from "mobx-state-tree";
import { crnSearch, searchableCourseSearch, courseCodeSearch } from "./api";

import { CalendarEvent } from "../components/Calendar";
import {
    AvailableCourses,
    Schedule,
    flattenSchedule,
    getBestSchedules,
} from "./scheduling";
import { toaster } from "baseui/toast";
import { hasNoDays } from "./util";
import { getSubjectColor } from "../components/colorize";
import { getParentOfType } from "mobx-state-tree";

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

export const parseSectionKey = (subject_code: string): string => {
    const split = subject_code.split(" ");
    return split[2][0] || "$";
};

export const stringToColor = (str: string): string => {
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
    sectionKey?: string;
}

const courseDetailsToEvent = (course: CourseDetails): CalendarEvent[] => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const events: CalendarEvent[] = [];

    if (course === undefined) {
        return events;
    }

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
                    color: getSubjectColor(course.subject_code.split(" ")[0]),
                    course: course,
                    meeting: meeting,
                    instructor: parseInstructor(meeting.instructor),
                });
            }
        }
    }
    return events;
};

export const RelatedOffering = types
    .model({
        offering_name: types.string,
        section_models: types.array(types.frozen<SectionModel>()),
        isVisible: types.optional(types.boolean, true),
    })
    .views((self) => ({
        get allSectionModels(): SectionModel[] {
            const sectionModels: SectionModel[] = [];
            for (let sectionModel of self.section_models) {
                sectionModels.push(sectionModel);
            }
            return sectionModels;
        },
        get isOnlineOnly(): boolean {
            for (const section of self.section_models) {
                for (const tutorial of section.tutorials) {
                    if (!hasNoDays(tutorial.meeting_details)) {
                        return false;
                    }
                }
                for (const course of section.courses) {
                    if (!hasNoDays(course.meeting_details)) {
                        return false;
                    }
                }
            }
            return true;
        },
    }))
    .actions((self) => ({
        toggleVisibility() {
            self.isVisible = !self.isVisible;
            const appManager = getParentOfType(self, AppManager);
            appManager.resetScheduleIndex();
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
        doesCRNExist(crn: string): boolean {
            for (let offering of self.selectedOfferings) {
                for (let sectionModel of offering.section_models) {
                    for (let course of sectionModel.courses) {
                        if (course.CRN === crn) {
                            return true;
                        }
                    }
                    for (let course of sectionModel.tutorials) {
                        if (course.CRN === crn) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },
    }))
    .actions((self) => ({
        addSingleLecture(lecture: CourseDetails) {
            const related_offering_name =
                lecture.related_offering || lecture.subject_code;
            const sectionKey = parseSectionKey(lecture.subject_code);

            let offering = self.selectedOfferings.find(
                (o) => o.offering_name === related_offering_name
            );

            // No offering found, create a new one
            if (offering === undefined) {
                const sectionModel: SectionModel = {
                    courses: [lecture],
                    tutorials: [],
                    sectionKey: sectionKey,
                };

                const newOffering = RelatedOffering.create({
                    offering_name: related_offering_name,
                    section_models: [sectionModel],
                });

                self.selectedOfferings.push(newOffering);
                return;
            }

            // Offering found, add lecture to existing offering
            // Find the section model to place it in by comparing each sectionModel.sectionKey
            const offeringCopy = JSON.parse(
                JSON.stringify(getSnapshot(offering))
            );

            let sectionModel = offeringCopy.section_models.find(
                (s: any) => s.sectionKey === sectionKey
            );

            // No section model found, create a new one
            if (sectionModel === undefined) {
                sectionModel = {
                    courses: [lecture],
                    tutorials: [],
                    sectionKey: sectionKey,
                };
                offeringCopy.section_models.push(sectionModel);
                return;
            } else {
                // Section model found, add lecture to existing section model
                sectionModel.courses.push(lecture);
            }

            // remove offering from selected offerings
            self.selectedOfferings.splice(
                self.selectedOfferings.indexOf(offering),
                1
            );

            // add offering back to selected offerings
            self.selectedOfferings.push(offeringCopy);
        },
        addSingleTutorial(tutorial: CourseDetails) {
            const related_offering_name =
                tutorial.related_offering || tutorial.subject_code;
            const sectionKey = parseSectionKey(tutorial.subject_code);

            let offering = self.selectedOfferings.find(
                (o) => o.offering_name === related_offering_name
            );

            // No offering found, create a new one
            if (offering === undefined) {
                const sectionModel: SectionModel = {
                    courses: [],
                    tutorials: [tutorial],
                    sectionKey: sectionKey,
                };

                const newOffering = RelatedOffering.create({
                    offering_name: related_offering_name,
                    section_models: [sectionModel],
                });

                self.selectedOfferings.push(newOffering);
                return;
            }

            // Offering found, add tutorial to existing offering
            // Find the section model to place it in by comparing each sectionModel.sectionKey
            const offeringCopy = JSON.parse(
                JSON.stringify(getSnapshot(offering))
            ); // well damn me

            let sectionModel = offeringCopy.section_models.find(
                (s: any) => s.sectionKey === sectionKey
            );

            // No section model found, create a new one
            if (sectionModel === undefined) {
                sectionModel = {
                    courses: [],
                    tutorials: [tutorial],
                    sectionKey: sectionKey,
                };

                offeringCopy.section_models.push(sectionModel);
            } else {
                sectionModel.tutorials.push(tutorial);
            }

            // remove offering from selected offerings
            self.selectedOfferings.splice(
                self.selectedOfferings.indexOf(offering),
                1
            );

            // add offering back to selected offerings
            self.selectedOfferings.push(offeringCopy);
        },
    }))
    .actions((self) => ({
        addOffering(offering: SnapshotIn<typeof RelatedOffering>) {
            const newOffering = RelatedOffering.create(offering);
            self.selectedOfferings.push(newOffering);
            self.currentScheduleIndex = 0;
        },

        addSingleCourse(course: CourseDetails) {
            if (self.doesCRNExist(course.CRN)) {
                toaster.negative("Course already exists in schedule", {});
                return;
            }

            const lectureAliases = [
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
            ]; // can also be found in models.py
            const isLecture = lectureAliases.includes(course.schedule_type);

            if (isLecture) {
                self.addSingleLecture(course);
            } else {
                self.addSingleTutorial(course);
            }

            console.log(self.selectedOfferings.toJSON());

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
    .actions((self) => ({
        clearCourses() {
            self.selectedOfferings.clear();
        },
    }))
    .actions((self) => ({
        async fetchSearchableCourses(
            searchTerm: string,
            page: number,
            signal: AbortSignal
        ) {
            return await searchableCourseSearch(
                convert_term(self.selectedTerm),
                searchTerm,
                page,
                signal
            );
        },
        async searchByCRN(crn: string, page: number, signal: AbortSignal) {
            return await crnSearch(
                convert_term(self.selectedTerm),
                crn,
                page,
                signal
            );
        },
        async searchByCourseCode(
            subject_code: string,
            page: number,
            signal: AbortSignal
        ) {
            return await courseCodeSearch(
                convert_term(self.selectedTerm),
                subject_code,
                page,
                signal
            );
        },
    }))
    .extend((self) => {
        return {
            views: {
                get availableCourses(): AvailableCourses {
                    let availableCourses: AvailableCourses = {};
                    for (let offering of self.selectedOfferings) {
                        if (!offering.isVisible) continue;

                        availableCourses[offering.offering_name] =
                            offering.allSectionModels;
                    }
                    return availableCourses;
                },
            },
        };
    })
    .extend((self) => {
        return {
            views: {
                get bestSchedules() {
                    const schedules: Schedule[] = getBestSchedules(
                        self.availableCourses,
                        150,
                        300,
                        10
                    );

                    return schedules;
                },
            },
        };
    })
    .extend((self) => {
        return {
            views: {
                get selectedCourses() {
                    const bestSchedules = self.bestSchedules;

                    if (
                        self.bestSchedules.length === 0 &&
                        self.selectedOfferings.length !== 0
                    ) {
                        toaster.negative("No schedules found", {});
                        return [];
                    }

                    return flattenSchedule(
                        bestSchedules[self.currentScheduleIndex]
                    );
                },
            },
        };
    })
    .extend((self) => {
        return {
            views: {
                get toEvents(): CalendarEvent[] {
                    let events: CalendarEvent[] = [];
                    const selectedCourses = self.selectedCourses;

                    for (let course of selectedCourses) {
                        events = events.concat(courseDetailsToEvent(course));
                    }
                    return events;
                },

                get selectedOnlineOfferings(): typeof self.selectedOfferings {
                    const selectedCourses = self.selectedOfferings;
                    let onlineOfferings: any = [];
                    for (let offering of selectedCourses) {
                        if (offering.isOnlineOnly) {
                            onlineOfferings.push(offering);
                        }
                    }
                    return onlineOfferings;
                },

                get selectedRegularOfferings(): typeof self.selectedOfferings {
                    const selectedCourses = self.selectedOfferings;
                    let regularOfferings: any = [];
                    for (let offering of selectedCourses) {
                        if (offering.isOnlineOnly === false) {
                            regularOfferings.push(offering);
                        }
                    }
                    return regularOfferings;
                },
            },
        };
    })
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
        resetScheduleIndex() {
            self.currentScheduleIndex = 0;
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
