// We are going to create a course scheduler
// This will be implemented via a genetic algorithm
// We will have a population of schedules
// Each schedule will have a fitness score
// The fitness score will be based on the number of conflicts

import { CourseDetails } from "./api";
import { memoize } from "lodash";

// We will also have a keyed object of courses
// The keys are the course
// The values are the specific offerings and sections of the course
// Each schedule must consist of a single section of each course and no more than one section of each course

/**
 * In our final schedule we want to have a single section of each course
 * This means a single value in the array for each of the keys
 */
type AvailableCourses = {
    [key: string]: CourseDetails[];
};

/*
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
*/

/**
 * A schedule is a keyed object (the keys are the course and the values are the chosen offering of the course)
 */
export interface Schedule {
    [key: string]: CourseDetails;
}

interface StrippedCourse {
    startHour: number;
    endHour: number;
    startMinute: number;
    endMinute: number; // Days will not be included in this number
    day: string; // we want to know which day this is for minimizing time between classes
}

interface FlattenedCourse {
    startMinute: number; // we will use day * 1440 + minute
    endMinute: number; // we will use day * 1440 + minute
    day: string; // we want to know which day this is for minimizing time between classes
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]; // 0-4

const stripCourses = (schedule: Schedule): StrippedCourse[] => {
    const courses: CourseDetails[] = Object.values(schedule);

    let strippedCourses: StrippedCourse[] = [];

    // This time consider all meetings
    for (const course of courses) {
        if (course === undefined) continue;
        try {
            const meetings = course.meeting_details;
            if (meetings === undefined) continue;
            for (const meeting of meetings) {
                try {
                    const days = meeting.days;
                    const time = meeting.time;
                    const start = time.split("-")[0];
                    const end = time.split("-")[1];
                    const startMinute =
                        parseInt(start.split(":")[0]) * 60 +
                        parseInt(start.split(":")[1]);
                    const endMinute =
                        parseInt(end.split(":")[0]) * 60 +
                        parseInt(end.split(":")[1]);

                    for (const day of days) {
                        const dayIndex = WEEKDAYS.indexOf(day);
                        strippedCourses.push({
                            startHour: parseInt(start.split(":")[0]),
                            endHour: parseInt(end.split(":")[0]),
                            startMinute: startMinute,
                            endMinute: endMinute,
                            day: day,
                        });
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            continue;
        }
    }
    return strippedCourses;
};

const timeSpentBetweenClasses = (schedule: Schedule): number => {
    // this will be the sum of all the time between classes
    const strippedCourses = stripCourses(schedule);
    strippedCourses.sort(
        (a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute
    );

    // if and end time and the next start times are on the same day add the difference to the sum
    // if they are not then add zero
    let timeSpent = 0;
    let previousEnd = 0;
    let previousDay = "";
    for (const course of strippedCourses) {
        if (previousDay === course.day) {
            timeSpent += course.startMinute - previousEnd;
        }
        previousEnd = course.endMinute;
        previousDay = course.day;
    }
    return timeSpent;
};

const flattenCourses = (
    strippedCourses: StrippedCourse[]
): FlattenedCourse[] => {
    let flattenedCourses: FlattenedCourse[] = [];
    for (const course of strippedCourses) {
        const startMinute = course.startHour * 60 + course.startMinute;
        const endMinute = course.endHour * 60 + course.endMinute;
        flattenedCourses.push({
            startMinute: startMinute,
            endMinute: endMinute,
            day: course.day,
        });
    }
    return flattenedCourses;
};

const calculateConflicts = (schedule: Schedule): number => {
    const flattenedCourses = flattenCourses(stripCourses(schedule));
    flattenedCourses.sort(
        (a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute
    );

    let conflicts = 0;
    let previousEnd = 0;
    for (const course of flattenedCourses) {
        if (course.startMinute < previousEnd) {
            conflicts++;
        }
        previousEnd = course.endMinute;
    }
    return conflicts;
};

const calculateDaysOff = (schedule: Schedule): number => {
    const days: number[] = [0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri
    // for each course in the schedule
    // for each meeting in the course
    // for each day in the meeting
    // add one to the day in the days array
    const courses: CourseDetails[] = Object.values(schedule);
    for (const course of courses) {
        if (course === undefined) continue;
        const meetings = course.meeting_details;
        if (meetings === undefined) continue;
        for (const meeting of meetings) {
            for (const day of meeting.days) {
                const dayIndex = WEEKDAYS.indexOf(day);
                days[dayIndex]++;
            }
        }
    }

    // return the number of days that are 0
    return days.filter((day) => day === 0).length;
};

const calculateUnwantedHoursConflicts = (
    schedule: Schedule,
    unwantedHours: number[]
): number => {
    // for each course find out if it occurs between (inclusive) any of the unwanted hours
    // if it does add one to the conflicts
    let conflicts = 0;
    const courses: CourseDetails[] = Object.values(schedule);
    const strippedCourses = stripCourses(schedule);
    for (const course of strippedCourses) {
        const startHour = course.startHour;
        const endHour = course.endHour;
        for (const unwantedHour of unwantedHours) {
            if (startHour <= unwantedHour && unwantedHour <= endHour) {
                conflicts++;
            }
        }
    }

    return conflicts;
};

const fitness = (schedule: Schedule, unwantedHours: number[]): number => {
    if (schedule === undefined) return -100000;
    if (schedule === null) return -100000;
    if (Object.keys(schedule).length === 0) return -100000;

    const conflicts = calculateConflicts(schedule);
    const daysOff = calculateDaysOff(schedule);
    const timeSpent = timeSpentBetweenClasses(schedule);
    const unwantedHoursConflicts = calculateUnwantedHoursConflicts(
        schedule,
        unwantedHours
    );

    let conflictsScore = -100000 * conflicts;
    let daysOffScore = 100 * daysOff;
    let timeSpentScore = -timeSpent;
    let unwantedHoursScore = -100000 * unwantedHoursConflicts;

    return conflictsScore + daysOffScore + timeSpentScore + unwantedHoursScore;
};

const generateRandomSchedule = (
    availableCourses: AvailableCourses
): Schedule => {
    const schedule: Schedule = {};
    for (const key in availableCourses) {
        const course = availableCourses[key];
        const randomIndex = Math.floor(Math.random() * course.length);
        schedule[key] = course[randomIndex];
    }
    return schedule;
};

const mutate = (
    schedule: Schedule,
    availableCourses: AvailableCourses
): Schedule => {
    const newSchedule = { ...schedule };
    const courseKeys = Object.keys(schedule);
    if (courseKeys.length === 0) {
        return newSchedule;
    }
    const randomIndex = Math.floor(Math.random() * courseKeys.length);
    const randomKey = courseKeys[randomIndex];
    const randomCourse = availableCourses[randomKey];
    const randomCourseIndex = Math.floor(Math.random() * randomCourse.length);
    newSchedule[randomKey] = randomCourse[randomCourseIndex];
    return newSchedule;
};

const evaluate = (
    population: Schedule[],
    unwantedHours: number[]
): Schedule[] => {
    const populationWithFitness = population.map((schedule) => {
        return {
            schedule: schedule,
            fitness: fitness(schedule, unwantedHours),
        };
    });
    populationWithFitness.sort((a, b) => b.fitness - a.fitness);
    return populationWithFitness.map((item) => item.schedule);
};

const removeDuplicates = (schedules: Schedule[]): Schedule[] => {
    let uniqueSchedules: Schedule[] = [];
    const crnSet = new Set<string>();

    for (let schedule of schedules) {
        let crns = Object.values(schedule).map((course) => course.CRN);
        crns.sort();
        let crnString = crns.join(",");
        if (!crnSet.has(crnString)) {
            crnSet.add(crnString);
            uniqueSchedules.push(schedule);
        }
    }
    return uniqueSchedules;
};

export const getBestSchedulesResolver = (
    availableCourses: AvailableCourses,
    unwantedHours: number[] = [],
    populationSize: number = 100,
    maxGenerations: number = 1000,
    returnSize: number = 10
): string => {
    let ret = "";
    // for all keys in availableCourses
    for (let key in availableCourses) {
        ret += key + "|";
    }
    ret += unwantedHours.join("|");
    ret += "|";
    ret += populationSize.toString();
    ret += "|";
    ret += maxGenerations.toString();
    ret += "|";
    ret += returnSize.toString();
    return ret;
};

export const getBestSchedules = (
    availableCourses: AvailableCourses,
    unwantedHours: number[] = [],
    populationSize: number = 100,
    maxGenerations: number = 1000,
    returnSize: number = 10
): Schedule[] => {
    if (populationSize < returnSize) {
        throw new Error("Population size must be greater than return size");
    }

    // Generate initial population
    let population: Schedule[] = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(generateRandomSchedule(availableCourses));
    }

    let generation = 0;
    while (generation < maxGenerations) {
        population = evaluate(population, unwantedHours);
        // We will keep the top 10% of the population
        population = population.slice(0, populationSize / 10);
        // We will mutate the top 10% of the population
        for (let i = 0; i < populationSize / 10; i++) {
            population.push(mutate(population[i], availableCourses));
        }
        generation++;
    }

    const uniqueSchedules = removeDuplicates(
        evaluate(population, unwantedHours)
    );
    const withoutConflicts = uniqueSchedules.filter(
        (schedule) =>
            calculateConflicts(schedule) === 0 &&
            calculateUnwantedHoursConflicts(schedule, unwantedHours) === 0
    );

    return withoutConflicts.slice(0, returnSize);
};
