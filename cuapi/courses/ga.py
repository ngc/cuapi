from .models import CourseDetails, CourseSection, Offering
import random

MUTATION_RATE = 0.1
POPULATION_SIZE = 100
GENERATIONS = 100


# const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

# export const flattenSchedule = (schedule: Schedule): CourseDetails[] => {
#     let flat: CourseDetails[] = [];
#     for (let term in schedule) {
#         flat.push(schedule[term].course);
#         if (schedule[term].tutorial) {
#             flat.push(schedule[term].tutorial as CourseDetails);
#         }
#     }
#     return flat;
# };

# export interface timestampedCourses {
#     startMinute: number;
#     endMinute: number;
#     dayIndex: number;
#     localStartMinute: number;
#     localEndMinute: number;
#     localStartHour: number;
#     localEndHour: number;
# }

# export const convertToTimestamps = memoize(
#     (schedule: CourseDetails[]): timestampedCourses[] => {
#         // depending on the day we add 1440 * day to the start and end times
#         let timestamps: timestampedCourses[] = [];
#         for (const course of schedule) {
#             if (course === undefined) continue;
#             try {
#                 const meetings = course.meeting_details;
#                 if (meetings === undefined) continue;
#                 for (const meeting of meetings) {
#                     try {
#                         const days = meeting.days;
#                         const time = meeting.time;
#                         const start = time.split("-")[0];
#                         const end = time.split("-")[1];

#                         const startHour = parseInt(start.split(":")[0]);
#                         const endHour = parseInt(end.split(":")[0]);

#                         const startMinute =
#                             parseInt(start.split(":")[0]) * 60 +
#                             parseInt(start.split(":")[1]);
#                         const endMinute =
#                             parseInt(end.split(":")[0]) * 60 +
#                             parseInt(end.split(":")[1]);

#                         for (const day of days) {
#                             const dayIndex = WEEKDAYS.indexOf(day);
#                             timestamps.push({
#                                 startMinute: startMinute + 1440 * dayIndex,
#                                 endMinute: endMinute + 1440 * dayIndex,
#                                 dayIndex: dayIndex,
#                                 localStartMinute: startMinute,
#                                 localEndMinute: endMinute,
#                                 localStartHour: startHour,
#                                 localEndHour: endHour,
#                             });
#                         }
#                     } catch (e) {
#                         continue;
#                     }
#                 }
#             } catch (e) {
#                 continue;
#             }
#         }
#         return timestamps;
# }
# );

# /**
#  * Calculates the number of conflicts in a schedule.
#  * We do this by creating an array of minutes in a week and incrementing the count of each minute that has a conflict.
#  * Might seem bad, but there's usually not many courses in a schedule so we get a really nice speed boooost.
#  * @param schedule
#  * @returns
#  */
# export const calculateConflicts = (schedule: Schedule): number => {
#     // Initialize an array to represent minutes of the week
#     const minutesInWeek = 7 * 24 * 60; // 7 days * 24 hours * 60 minutes
#     const conflictsAtMinute: number[] = new Array(minutesInWeek).fill(0);
#     let totalConflicts = 0;

#     // Iterate over courses and update conflictsAtMinute
#     for (const { startMinute, endMinute } of convertToTimestamps(
#         flattenSchedule(schedule)
#     )) {
#         for (let minute = startMinute; minute < endMinute; minute++) {
#             conflictsAtMinute[minute]++;
#             totalConflicts += conflictsAtMinute[minute] > 1 ? 1 : 0;
#         }
#     }

#     return totalConflicts;
# };

# export const calculateDaysOff = (schedule: Schedule): number => {
#     const dayCounts = [0, 0, 0, 0, 0];
#     const flat = flattenSchedule(schedule);
#     const timestamps = convertToTimestamps(flat);
#     for (let timestamp of timestamps) {
#         dayCounts[timestamp.dayIndex]++;
#     }
#     return dayCounts.filter((count) => count === 0).length;
# };

# export const fitness = memoize((schedule: Schedule): number => {
#     let score = -100000 * calculateConflicts(schedule);

#     return score;
# });


class ScheduleUnit:
    def __init__(self, sections: list[CourseSection]):
        self.sections = sections
        self.tutorial = None
        self.lecture = None
        self.select_pair()

    def select_pair(self):
        section = random.choice(self.sections)
        if section.tutorials.all():
            self.tutorial = random.choice(list(section.tutorials.all()))

        if section.lectures.all():
            self.lecture = random.choice(list(section.lectures.all()))

    def mutate(self):
        if random.random() < MUTATION_RATE:
            self.select_pair()

    def __str__(self):
        return f"{self.tutorial} - {self.lecture}"


class Schedule:
    def __init__(self, units: list[ScheduleUnit]):
        self.units = units

    def convert_course_details_to_timestamps(self, course_details: list[CourseDetails]):
        timestamps = []
        for course in course_details:
            if course is None:
                continue
            for meeting in course.meeting_details:
                print(meeting)
                days = meeting["days"]
                time = meeting["time"]
                start = time.split("-")[0]
                end = time.split("-")[1]

                start_hour = int(start.split(":")[0])
                end_hour = int(end.split(":")[0])

                start_minute = int(start.split(":")[0]) * 60 + int(start.split(":")[1])
                end_minute = int(end.split(":")[0]) * 60 + int(end.split(":")[1])

                for day in days:
                    day_index = ["Mon", "Tue", "Wed", "Thu", "Fri"].index(day)
                    timestamps.append(
                        {
                            "startMinute": start_minute + 1440 * day_index,
                            "endMinute": end_minute + 1440 * day_index,
                            "dayIndex": day_index,
                            "localStartMinute": start_minute,
                            "localEndMinute": end_minute,
                            "localStartHour": start_hour,
                            "localEndHour": end_hour,
                        }
                    )
        return timestamps

    def convert_to_timestamps(self):
        timestamps = []
        for unit in self.units:
            timestamps += self.convert_course_details_to_timestamps(
                [unit.tutorial, unit.lecture]
            )
        return timestamps

    def calculate_conflicts(self):
        minutes_in_week = 7 * 24 * 60
        conflicts_at_minute = [0] * minutes_in_week
        total_conflicts = 0

        for _ in self.units:
            for timestamp in self.convert_to_timestamps():
                for minute in range(timestamp["startMinute"], timestamp["endMinute"]):
                    conflicts_at_minute[minute] += 1
                    total_conflicts += 1 if conflicts_at_minute[minute] > 1 else 0

        return total_conflicts

    def fitness(self):
        score = -100000 * self.calculate_conflicts()
        return score

    def mutate(self):
        for unit in self.units:
            unit.mutate()

    def __str__(self):
        return "\n".join(str(unit) for unit in self.units)

    def copy(self):
        return Schedule([unit for unit in self.units])


# Genetic Algorithm
class SectionScheduler:
    def __init__(self, offerings: list[Offering]):
        self.offerings = offerings

        units = []
        for offering in offerings:
            units.append(ScheduleUnit(list(offering.sections.all())))
        self.population = [Schedule(units) for _ in range(POPULATION_SIZE)]

    def run(self):
        for _ in range(GENERATIONS):
            self.population.sort(key=lambda x: x.fitness(), reverse=True)
            # split the population in half and keep the top half
            self.population = self.population[: POPULATION_SIZE // 2]
            # fill in the rest with new mutations
            while len(self.population) < POPULATION_SIZE:
                new_schedule = random.choice(self.population)
                copy = new_schedule.copy().mutate()
                self.population.append(copy)

        self.population.sort(key=lambda x: x.fitness(), reverse=True)
        result_length = min(5, len(self.population) - 1)
        return self.population[:result_length]
