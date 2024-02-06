import { EventAttributes, createEvents } from "ics";

import "ics";
import { MeetingDetails } from "./AppManager";
import { CalendarEvent } from "../components/Calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]; // 0-4

export const convertTermToDates = (meeting_date: string): [Date, Date] => {
    // The meeting date is in the format ("Sep 06, 2023 to Dec 08, 2023")
    // the first date is the start of the semester
    // the second date is the end of the semester
    // we want to find the first day of class which is the first day the class meets after the start of the semester

    const dates = meeting_date.split(" to ");
    const start = new Date(dates[0]);
    const end = new Date(dates[1]);

    return [start, end];
};

export const getFirstDayOfClass = (event: CalendarEvent): Date => {
    // a calendar event has a meeting attribute which is a meeting details object
    const meeting: MeetingDetails = event.meeting;
    const days = meeting.days;
    const period = meeting.meeting_date;

    const [start, end] = convertTermToDates(period);
    let current = start;
    let found = false;
    while (!found) {
        if (
            days.includes(current.toLocaleString("en-US", { weekday: "short" }))
        ) {
            found = true;
        } else {
            current.setDate(current.getDate() + 1);
        }
    }
    return current;
};

export const getLastDayOfClass = (event: CalendarEvent): Date => {
    const meeting: MeetingDetails = event.meeting;
    const days = [WEEKDAYS[event.day]];

    const period = meeting.meeting_date;

    const [start, end] = convertTermToDates(period);
    let current = end;
    let found = false;
    while (!found) {
        if (
            days.includes(current.toLocaleString("en-US", { weekday: "short" }))
        ) {
            found = true;
        } else {
            current.setDate(current.getDate() - 1);
        }
    }
    return current;
};

export const getAllCalendarEvents = (
    event: CalendarEvent
): EventAttributes[] => {
    const meeting: MeetingDetails = event.meeting;
    const days = [WEEKDAYS[event.day]];

    const times = meeting.time.split(" - ");
    const start = times[0].split(":");
    const end = times[1].split(":");
    const startHour = parseInt(start[0]);
    const startMinute = parseInt(start[1]);
    const endHour = parseInt(end[0]);
    const endMinute = parseInt(end[1]);

    const firstDayOfClass = getFirstDayOfClass(event);
    const lastDayOfClass = getLastDayOfClass(event);

    let current = new Date(firstDayOfClass);
    let events: EventAttributes[] = [];
    while (current <= lastDayOfClass) {
        if (
            days.includes(current.toLocaleString("en-US", { weekday: "short" }))
        ) {
            let start = new Date(current);
            start.setHours(startHour);
            start.setMinutes(startMinute);
            let end = new Date(current);
            end.setHours(endHour);
            end.setMinutes(endMinute);

            events.push({
                start: [
                    start.getFullYear(),
                    start.getMonth() + 1,
                    start.getDate(),
                    start.getHours(),
                    start.getMinutes(),
                ],
                end: [
                    end.getFullYear(),
                    end.getMonth() + 1,
                    end.getDate(),
                    end.getHours(),
                    end.getMinutes(),
                ],
                title: event.title,
                description: event.course.course_description,
            });
        }
        current.setDate(current.getDate() + 1);
    }
    return events;
};

export const exportEventsToICS = (events: CalendarEvent[]): string => {
    let icsEvents = [];
    for (let event of events) {
        for (let calendarEvent of getAllCalendarEvents(event)) {
            icsEvents.push(calendarEvent);
        }
    }

    const createdEvents = createEvents(icsEvents, {
        calName: "Carleton Schedule",
        method: "PUBLISH",
        productId: "ics-generator",
    });

    return createdEvents.value || "";
};
