import { SectionModel } from "./AppManager";
import { CourseDetails } from "./api";

export interface CourseAndTutorial {
    course: CourseDetails;
    tutorial?: CourseDetails;
}

export type Schedule = {
    [subject_code: string]: CourseAndTutorial;
};

// For each chosen course, add all possible combinations of lectures and tutorials
export type AvailableCourses = {
    [subject_code: string]: SectionModel[];
};

export const mutateSchedule = (
    schedule: Schedule,
    availableCourses: AvailableCourses
): Schedule => {
    // first pick a random key from schedule
    const keys = Object.keys(schedule);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];

    const randomSectionModel =
        availableCourses[randomKey][
            Math.floor(Math.random() * availableCourses[randomKey].length)
        ];
    // mutate the course and tutorial
    schedule[randomKey].course =
        randomSectionModel.courses[
            Math.floor(Math.random() * randomSectionModel.courses.length)
        ];
    if (randomSectionModel.tutorials.length > 0) {
        schedule[randomKey].tutorial =
            randomSectionModel.tutorials[
                Math.floor(Math.random() * randomSectionModel.tutorials.length)
            ];
    }
    return schedule;
};

export const generateRandomSchedule = (
    availableCourses: AvailableCourses
): Schedule => {
    let schedule: Schedule = {};
    for (let subject_code in availableCourses) {
        const sectionModel =
            availableCourses[subject_code][
                Math.floor(
                    Math.random() * availableCourses[subject_code].length
                )
            ];
        schedule[subject_code] = {
            course: sectionModel.courses[
                Math.floor(Math.random() * sectionModel.courses.length)
            ],
        };
        if (sectionModel.tutorials.length > 0) {
            schedule[subject_code].tutorial =
                sectionModel.tutorials[
                    Math.floor(Math.random() * sectionModel.tutorials.length)
                ];
        }
    }
    return schedule;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const flattenSchedule = (schedule: Schedule): CourseDetails[] => {
    let flat: CourseDetails[] = [];
    for (let term in schedule) {
        if (schedule[term] === undefined) continue;
        flat.push(schedule[term].course);
        if (schedule[term].tutorial) {
            flat.push(schedule[term].tutorial as CourseDetails);
        }
    }
    return flat;
};

export interface timestampedCourses {
    startMinute: number;
    endMinute: number;
    dayIndex: number;
    localStartMinute: number;
    localEndMinute: number;
    localStartHour: number;
    localEndHour: number;
}

export const convertToTimestamps = (
    schedule: CourseDetails[]
): timestampedCourses[] => {
    // depending on the day we add 1440 * day to the start and end times
    let timestamps: timestampedCourses[] = [];
    for (const course of schedule) {
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

                    const startHour = parseInt(start.split(":")[0]);
                    const endHour = parseInt(end.split(":")[0]);

                    const startMinute =
                        parseInt(start.split(":")[0]) * 60 +
                        parseInt(start.split(":")[1]);
                    const endMinute =
                        parseInt(end.split(":")[0]) * 60 +
                        parseInt(end.split(":")[1]);

                    for (const day of days) {
                        const dayIndex = WEEKDAYS.indexOf(day);
                        timestamps.push({
                            startMinute: startMinute + 1440 * dayIndex,
                            endMinute: endMinute + 1440 * dayIndex,
                            dayIndex: dayIndex,
                            localStartMinute: startMinute,
                            localEndMinute: endMinute,
                            localStartHour: startHour,
                            localEndHour: endHour,
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
    return timestamps;
};

export const calculateConflicts = (schedule: Schedule): number => {
    // first we want to flatten the CourseAndTutorial objects into an array of CourseDetails
    const flat = flattenSchedule(schedule);
    // then we convert the CourseDetails into an array of timestampedCourses
    const timestamps = convertToTimestamps(flat);

    // we sort the timestamps by start time
    timestamps.sort((a, b) => a.startMinute - b.startMinute);

    // we keep track of the current end time
    let currentEnd = 0;
    let conflicts = 0;
    for (let timestamp of timestamps) {
        if (timestamp.startMinute < currentEnd) {
            conflicts++;
        }
        currentEnd = Math.max(currentEnd, timestamp.endMinute);
    }

    return conflicts;
};

export const calculateTimeSpentInBetweenClasses = (
    schedule: Schedule
): number => {
    const flat = flattenSchedule(schedule);
    const timestamps = convertToTimestamps(flat);
    timestamps.sort((a, b) => a.startMinute - b.startMinute);
    let timeSpentInBetweenClasses = 0;
    let currentEnd = 0;
    // if the dayIndex of the current timestamp is the same as the dayIndex of the previous timestamp
    // and the startMinute of the current timestamp is less than the currentEnd
    // then we add the difference between the currentEnd and the startMinute of the current timestamp to timeSpentInBetweenClasses
    let previousDayIndex = -1;
    for (let timestamp of timestamps) {
        if (
            (timestamp.dayIndex === previousDayIndex ||
                previousDayIndex === -1) &&
            timestamp.startMinute < currentEnd
        ) {
            timeSpentInBetweenClasses += currentEnd - timestamp.startMinute;
        }
        currentEnd = Math.max(currentEnd, timestamp.endMinute);
        previousDayIndex = timestamp.dayIndex;
    }
    return timeSpentInBetweenClasses;
};

export const calculateDaysOff = (schedule: Schedule): number => {
    const dayCounts = [0, 0, 0, 0, 0];
    const flat = flattenSchedule(schedule);
    const timestamps = convertToTimestamps(flat);
    for (let timestamp of timestamps) {
        dayCounts[timestamp.dayIndex]++;
    }
    return dayCounts.filter((count) => count === 0).length;
};

export const fitness = (schedule: Schedule): number => {
    let score = -100000 * calculateConflicts(schedule);
    score -= 100 * calculateTimeSpentInBetweenClasses(schedule);
    score += 10000 * calculateDaysOff(schedule);

    return score;
};

export const purgeConflicts = (schedules: Schedule[]): Schedule[] => {
    let purged: Schedule[] = [];
    for (let schedule of schedules) {
        if (calculateConflicts(schedule) === 0) {
            purged.push(schedule);
        }
    }
    return purged;
};

export const stringifySchedule = (schedule: Schedule): string => {
    let stringified = "";
    for (let courseAndTutorial of Object.values(schedule)) {
        stringified +=
            courseAndTutorial.course?.CRN ?? (Math.random() * 1000).toString();
        if (courseAndTutorial.tutorial) {
            stringified += "| " + courseAndTutorial.tutorial?.CRN;
        }
    }
    return stringified;
};

export const purgeDuplicates = (schedules: Schedule[]): Schedule[] => {
    let purged: Schedule[] = [];
    let seen = new Set<string>();
    for (let schedule of schedules) {
        const stringified = stringifySchedule(schedule);
        if (!seen.has(stringified)) {
            purged.push(schedule);
            seen.add(stringified);
        }
    }
    return purged;
};

export const getBestSchedules = (
    availableCourses: AvailableCourses,
    populationSize: number = 100,
    maxGenerations: number = 1000,
    returnSize: number = 10
): Schedule[] => {
    if (Object.keys(availableCourses).length === 0) {
        return [];
    }

    // generate initial population
    let population: Schedule[] = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(generateRandomSchedule(availableCourses));
    }

    for (let generation = 0; generation < maxGenerations; generation++) {
        // sort population by fitness
        population.sort((a, b) => fitness(a) - fitness(b));

        // select the best
        population = population.slice(0, populationSize / 2);

        // mutate
        for (let i = 0; i < populationSize / 2; i++) {
            population.push(mutateSchedule(population[i], availableCourses));
        }
        population = purgeDuplicates(population);
        for (let i = population.length; i < populationSize; i++) {
            population.push(
                mutateSchedule(
                    population[i % population.length],
                    availableCourses
                )
            );
        }
    }

    // return the best

    population.sort((a, b) => fitness(a) - fitness(b));

    return purgeConflicts(population).slice(0, returnSize);
};
