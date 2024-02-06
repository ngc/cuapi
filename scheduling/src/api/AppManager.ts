import { Instance, SnapshotIn, types } from "mobx-state-tree";
import {
    courseDetails,
    courseSearch,
    offeringSearch,
    searchForOfferings,
} from "./api";
import { action } from "mobx";
import { CalendarEvent } from "../components/Calendar";
import { Schedule, getBestSchedules } from "./scheduling";

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

export const RelatedOffering = types
    .model({
        offering_name: types.string,
        course_options: types.optional(
            types.array(types.frozen<CourseDetails>()),
            []
        ),
    })
    .actions((self) => ({
        setCourseOptions(options: CourseDetails[]) {
            self.course_options.replace(options);
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
        get availableCourses(): { [key: string]: CourseDetails[] } {
            let courses: { [key: string]: CourseDetails[] } = {};
            for (let offering of self.selectedOfferings) {
                courses[offering.offering_name] = offering.course_options;
            }
            return courses;
        },
    }))
    .views((self) => ({
        get bestSchedules() {
            const schedules: Schedule[] = getBestSchedules(
                self.availableCourses,
                self.unwantedHours,
                100,
                1000,
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
            if (bestSchedules.length === 0) {
                return [];
            }
            const schedule: Schedule =
                bestSchedules[self.currentScheduleIndex] || bestSchedules[0];

            console.log("$$$ schedule", schedule);

            return Object.values(schedule);
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
        /*
      export interface CalendarEvent {
    startTime: CalendarTime,
    endTime: CalendarTime,
    day: number, (0-4) for Monday-Friday
    title: string,
    body: React.ReactNode,
    onClick: () => void,
    onHover: () => void,
    onLeave: () => void,
    color: string,
  }
  */

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
                for (let meeting of course.meeting_details) {
                    console.log("meeting", meeting);
                    for (let day of meeting.days) {
                        let dayIndex = days.indexOf(day);
                        console.log("dayIndex", dayIndex);
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
                                color: "#FF0000",
                                course: course,
                                meeting: meeting,
                            });
                        }
                    }
                }
            };

            for (let course of self.selectedCourses) {
                courseDetailsToEvent(course);
            }

            console.log("events $$$", events);

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
        toggleHour(hour: number) {
            if (self.unwantedHours.includes(hour)) {
                self.unwantedHours.replace(
                    self.unwantedHours.filter((h) => h !== hour)
                );
            } else {
                self.unwantedHours.push(hour);
            }
        },
    }))
    .views((self) => ({
        isHourUnwanted(hour: number) {
            return self.unwantedHours.includes(hour);
        },
    }));
