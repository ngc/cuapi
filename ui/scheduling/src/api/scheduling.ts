import { SectionModel } from "./AppManager";
import { CourseDetails } from "./api";
import { memoize } from "lodash";

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

export const stringifySectionModel = (sectionModel: SectionModel): string => {
    const tutorials = sectionModel.tutorials.map(
        (tutorial) => tutorial.global_id
    );
    const courses = sectionModel.courses.map((course) => course.global_id);
    tutorials.sort();
    courses.sort();

    return JSON.stringify({ tutorials, courses });
};

export const stringifyAvailableCourses = (
    availableCourses: AvailableCourses
): string => {
    const stringified = {} as { [subject_code: string]: string[] };
    for (let subject_code in availableCourses) {
        stringified[subject_code] = availableCourses[subject_code].map(
            stringifySectionModel
        );
    }
    return JSON.stringify(stringified);
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

export const calculateDaysOff = (schedule: Schedule): number => {
    const dayCounts = [0, 0, 0, 0, 0];
    const flat = flattenSchedule(schedule);
    const timestamps = convertToTimestamps(flat);
    for (let timestamp of timestamps) {
        dayCounts[timestamp.dayIndex]++;
    }
    return dayCounts.filter((count) => count === 0).length;
};

export const fitness = memoize((schedule: Schedule): number => {
    let score = -100000 * calculateConflicts(schedule);

    return score;
});

export const purgeConflicts = (schedules: Schedule[]): Schedule[] => {
    let purged: Schedule[] = [];
    for (let schedule of schedules) {
        if (calculateConflicts(schedule) === 0) {
            purged.push(schedule);
        }
    }
    return purged;
};

export const stringifySchedule = memoize((schedule: Schedule): string => {
    // iterate through all CourseAndTutorial objects
    if (Object.keys(schedule).length === 0) return "";
    let globalIdList = [];
    for (let subject_code in schedule) {
        if (schedule?.[subject_code].course === undefined) continue;
        globalIdList.push(schedule[subject_code].course.subject_code);
        if (schedule[subject_code].tutorial) {
            globalIdList.push(schedule[subject_code].tutorial!.subject_code);
        }
    }
    return globalIdList.sort().join(",");
});

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

export const getBestSchedules = memoize(
    (
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
                population.push(
                    mutateSchedule(population[i], availableCourses)
                );
            }
            population = purgeDuplicates(population);
            for (let i = population.length; i < populationSize; i++) {
                population.push(generateRandomSchedule(availableCourses));
            }
        }
        population = purgeDuplicates(purgeConflicts(population));

        // sort for most days off
        population.sort((a, b) => calculateDaysOff(b) - calculateDaysOff(a));

        return population.slice(0, returnSize);
    },
    (availableCourses, populationSize, maxGenerations, returnSize) =>
        JSON.stringify([
            stringifyAvailableCourses(availableCourses),
            populationSize,
            maxGenerations,
            returnSize,
        ]) // A bunch of JSON.stringifys + multiple sorts is still faster than running the algorithm again
    // This works great for when we're hiding and unhiding courses and we quickly call getBestSchedules again
);
