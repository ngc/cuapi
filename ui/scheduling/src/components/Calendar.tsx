import { useStyletron } from "baseui";
import { useState, useLayoutEffect, useEffect } from "react";
import "./Calendar.css";
import { Button as CustomButton } from "./Button";
import { exportEventsToICS } from "../api/icsGenerator";
import { observer } from "mobx-react-lite";
import { IS_MOBILE, useAppManager } from "../main";
import { Column, Row, listToCommaString } from "./util";
import { ChevronLeft, ChevronRight } from "baseui/icon";
import { Modal } from "baseui/modal";
import { StyleObject } from "styletron-react";
import { Popover } from "baseui/popover";
import { CgExport } from "react-icons/cg";
import { BiCalendarPlus } from "react-icons/bi";
import {
    CalendarBestSchedules,
    CourseDetails,
    MeetingDetails,
    generateCalendarBestSchedules,
} from "../api/AppManager";
import { toaster } from "baseui/toast";

/**
 * The CalendarTime interface is used to represent a time in the calendar.
 * @param hour The hour of the day (0-23)
 * @param minute The minute of the hour (0-59)
 */
export interface CalendarTime {
    hour: number;
    minute: number;
}

const getCalendarTimeString = (time: CalendarTime) => {
    // takes an hour and a minute and reutrns a string representation of the time in 12 hour format
    let hour = time.hour;
    let minute = time.minute;
    let suffix = "am";
    if (hour > 12) {
        hour = hour - 12;
        suffix = "pm";
    }
    if (hour === 0) {
        hour = 12;
    }
    if (minute < 10) {
        return `${hour}:0${minute} ${suffix}`;
    }
    return `${hour}:${minute} ${suffix}`;
};

export const CalendarTime = (props: { time: CalendarTime }) => {
    const [css, _$theme] = useStyletron();

    return (
        <span
            className={css({
                color: "white",
                fontWeight: "bold",
            }).toString()}
        >
            {getCalendarTimeString(props.time)}
        </span>
    );
};

export interface CalendarEvent {
    startTime: CalendarTime;
    endTime: CalendarTime;
    day: number; // 0-4 (Monday to Friday)
    title: string;
    course: CourseDetails;
    meeting: MeetingDetails;
    body: React.ReactNode;
    onClick: () => void;
    onHover: () => void;
    onLeave: () => void;
    color: string;
    instructor?: string;
}

export interface CalendarProps {
    $style?: StyleObject;
    openCourseSelection?: () => void;
}

const shortDayToLong = (short: string) => {
    switch (short) {
        case "Mon":
            return "Monday";
        case "Tue":
            return "Tuesday";
        case "Wed":
            return "Wednesday";
        case "Thu":
            return "Thursday";
        case "Fri":
            return "Friday";
        case "Sat":
            return "Saturday";
        case "Sun":
            return "Sunday";
        default:
            return short;
    }
};

const CalendarGrid = observer(() => {
    /*
    Calendar grid will be a 5x13 grid that will be used to display the events.
    */

    const [css, _$theme] = useStyletron();

    const hours = [
        "8 am",
        "9 am",
        "10 am",
        "11 am",
        "12 pm",
        "1 pm",
        "2 pm",
        "3 pm",
        "4 pm",
        "5 pm",
        "6 pm",
        "7 pm",
        "8 pm",
        "9 pm",
    ];

    if (IS_MOBILE) {
        // remove pm and am
        for (let i = 0; i < hours.length; i++) {
            hours[i] = hours[i].replace(" am", "").replace(" pm", "");
        }
    }

    const row = css({
        margin: 0,
        padding: 0,
        borderRadius: "10px",
    });

    const tdClass = css({
        margin: 0,
        padding: 0,
        border: "1px solid black",
        textAlign: "center",
        verticalAlign: "middle",
        position: "relative",
    });

    return (
        <table
            className={css({
                width: "100%",
                borderCollapse: "collapse",
                borderSpacing: 0,
                tableLayout: "fixed",
                margin: 0,
                height: "100%",
                padding: 0,
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)",
                borderRadius: "10px",
            })}
        >
            <tr
                className={`${row} ${css({
                    fontFamily:
                        "'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif",

                    ...(IS_MOBILE ? { fontSize: "0.90em" } : {}),
                })}`}
            >
                <td
                    className={tdClass + " " + css({ width: "5%" }).toString()}
                    id="calendar-time-header"
                ></td>
                <td className={tdClass} id="calendar-monday-header">
                    Monday
                </td>
                <td className={tdClass}>Tuesday</td>
                <td className={tdClass}>Wednesday</td>
                <td className={tdClass}>Thursday</td>
                <td className={tdClass}>Friday</td>
            </tr>
            {hours.map((hour, index) => {
                const cellClass =
                    css({
                        ":hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },

                        ...(IS_MOBILE
                            ? {
                                  height: "4vh",
                              }
                            : {
                                  height: "40px",
                              }),
                    }) +
                    " " +
                    tdClass;

                return (
                    <tr>
                        <td id={`hour-${index}`} className={tdClass}>
                            {hour}
                        </td>
                        <td className={cellClass}></td>
                        <td className={cellClass}></td>
                        <td className={cellClass}></td>
                        <td className={cellClass}></td>
                        <td className={cellClass}></td>
                    </tr>
                );
            })}
        </table>
    );
});

const CourseInfoPill = (props: {
    children: React.ReactNode;
    $style?: StyleObject;
}) => {
    const [css, _$theme] = useStyletron();
    return (
        <div
            className={css({
                display: "flex",
                flexDirection: "row",
                gap: "5px",
                padding: "5px",
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                borderRadius: "10px",
                fontSize: "0.75em",
                ...props.$style,
            })}
        >
            {props.children}
        </div>
    );
};

const MeetingDetailsDisplay = (props: { meeting: MeetingDetails }) => {
    const [css, _$theme] = useStyletron();
    return (
        <div
            className={css({
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                borderRadius: "10px",
                padding: "10px",
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                border: "1px solid black",
                fontSize: "0.9em",
            })}
        >
            <Row>
                <a
                    className={css({
                        fontSize: "1.05em",
                        fontWeight: "medium",
                        color: "black",
                    })}
                >
                    Every{" "}
                    {listToCommaString(
                        props.meeting.days.map((day) => shortDayToLong(day))
                    )}
                </a>
            </Row>
            <Row>
                <a>{props.meeting.schedule_type}</a>
            </Row>
            {props.meeting.instructor && (
                <Row>
                    <a>Instructor: {props.meeting.instructor}</a>
                </Row>
            )}
        </div>
    );
};

export const OnlinePill = (props: { suitability?: string }) => {
    if (!props.suitability) return null;

    const notOnline = props.suitability.toLowerCase().includes("not");

    const display = notOnline ? "In-Person Only" : "Online Allowed";

    return (
        <Column>
            <CourseInfoPill
                $style={{
                    backgroundColor: notOnline
                        ? "rgba(255, 0, 0, 0.5)"
                        : "rgba(100, 255, 30, 0.5)",
                }}
            >
                <a>{display}</a>
            </CourseInfoPill>
        </Column>
    );
};

const CourseInfoDisplay = (props: { course: CourseDetails }) => {
    const [css, _$theme] = useStyletron();
    return (
        <div
            className={css({
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                backgroundColor: "white",
                padding: "10px",
                borderRadius: "10px",
                maxWidth: "500px",
            })}
        >
            <a
                className={css({
                    fontSize: "1.25em",
                    fontWeight: "medium",
                    color: "black",
                })}
            >
                {props.course.long_title}
            </a>
            <Row
                $style={{
                    gap: "5px",
                }}
            >
                <Column>
                    <CourseInfoPill>
                        <a>{props.course.subject_code}</a>
                    </CourseInfoPill>
                </Column>
                <Column>
                    <CourseInfoPill>
                        <a>CRN: {props.course.CRN}</a>
                    </CourseInfoPill>
                </Column>
                <OnlinePill
                    suitability={props.course.section_information?.suitability}
                />
            </Row>
            <Row
                $style={{
                    width: "100%",
                }}
            >
                <p>{props.course.course_description}</p>
            </Row>

            {/*
                Meeting details
                */}
            <a
                className={css({
                    fontSize: "1.15em",
                    fontWeight: "medium",
                    color: "black",
                })}
            >
                Meeting Details
                <div
                    className={css({
                        borderBottom: "1px solid black",
                        margin: "10px 0",
                    })}
                />
            </a>
            <Column
                $style={{
                    gap: "10px",
                }}
            >
                {props.course.meeting_details.map((meeting, index) => {
                    return (
                        <MeetingDetailsDisplay meeting={meeting} key={index} />
                    );
                })}
            </Column>
        </div>
    );
};

const makeHexTransparent = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const EventPositioner = (props: { event: CalendarEvent }) => {
    // This div will be used to position the event on the grid
    // we use the start and end times to calculate the position of the event
    // firstly, the column will be the day of the week
    // the row will be the start time
    // the height will be the end time - start time

    const [css, _$theme] = useStyletron();
    const [layout, setLayout] = useState({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
    });

    const [popoverOpen, setPopoverOpen] = useState(false);

    useLayoutEffect(() => {
        const calculateLayout = () => {
            const startHour = props.event.startTime.hour - 7;
            const startMinute = props.event.startTime.minute;
            const endHour = props.event.endTime.hour - 7;
            const endMinute = props.event.endTime.minute;

            const timeHeaderCell = document.getElementById("hour-0");
            // we will use this to calculate contextual size
            // the height of this cell is the same as the height of every hour
            // the width of this cell will be used as an offset as the first column represents the time (and not a day)
            const mondayHeaderCell = document.getElementById(
                "calendar-monday-header"
            );
            // we will use this to calculate contextual size
            // the width of this cell is the same as the width of every day
            // the height of this cell will be the same as the height of every hour
            const cellHeight = timeHeaderCell?.clientHeight! + 1; // we add 1 to account for the border
            const dayWidth = mondayHeaderCell?.clientWidth! + 1; // we add 1 to account for the border

            let leftPos = timeHeaderCell?.clientWidth! + 2; // start by offsetting
            let topPos =
                startHour * cellHeight! + (startMinute / 60) * cellHeight!;
            let width = dayWidth - 2; // we subtract 2 to account for the border
            leftPos =
                leftPos! + width! * 1 * props.event.day + props.event.day * 2; // we add the width of the day cell

            let height =
                (endHour - startHour) * cellHeight! +
                ((endMinute - startMinute) / 60) * cellHeight! -
                3; // we subtract 2 to account for the border
            setLayout({
                top: topPos,
                left: leftPos,
                width: width,
                height: height,
            });
        };

        window.addEventListener("resize", calculateLayout);
        calculateLayout();

        return () => window.removeEventListener("resize", calculateLayout);
    }, [props.event.startTime, props.event.endTime]);

    return (
        <>
            <Popover
                isOpen={popoverOpen}
                content={<CourseInfoDisplay course={props.event.course} />}
                onClick={() => {
                    setPopoverOpen(true);
                }}
                onEsc={() => {
                    setPopoverOpen(false);
                }}
                onClickOutside={() => {
                    setPopoverOpen(false);
                }}
                overrides={{
                    Body: {
                        style: {
                            zIndex: 1000,
                        },
                    },
                }}
            >
                <div
                    onClick={() => {
                        setPopoverOpen(!popoverOpen);
                    }}
                    className={css({
                        position: "absolute",
                        width: `${layout.width}px`,
                        height: `${layout.height}px`,
                        top: 0,
                        left: 0,
                        transform: `translate(${layout.left}px, ${layout.top}px)`,

                        borderRadius: "12px",
                        border: "0.09vw dashed black",
                        zIndex: 10,
                        overflow: "hidden",
                        padding: 0,
                        margin: 0,
                        cursor: "pointer",

                        // backdropFilter: "blur(10px)",
                        boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)",
                        backgroundColor: makeHexTransparent(
                            props.event.color,
                            0.5
                        ),
                        transition: "transform 0.2s",
                        pointerEvents: "all",
                    })}
                >
                    <div
                        className={css({
                            position: "relative",
                            display: "flex",
                            justifyContent: "left",
                            alignItems: "left",
                            height: "100%",
                            width: "100%",
                        })}
                    >
                        <EventDisplay
                            event={props.event}
                            height={layout.height}
                        />
                    </div>
                </div>
            </Popover>
        </>
    );
};

const EventDisplay = (props: { event: CalendarEvent; height: number }) => {
    const [css, _$theme] = useStyletron();
    // grid that has three rows or three columns depending on the container size
    return (
        <div
            className={css({
                display: "grid",
                gridTemplateColumns: "1fr",
                gridTemplateRows: "1fr 1fr",
                height: "30%",
                width: "100%",
                padding: "2px",
                margin: 0,
                fontFamily: "Inconsolata, monospace",
            })}
        >
            <Row
                $style={{
                    justifyContent: "space-between",
                }}
            >
                <div
                    className={css({
                        display: "flex",
                        padding: 0,
                        margin: 0,
                        fontSize: "calc(1.25em * 1.25vw)",
                        color: "white",
                    })}
                >
                    {IS_MOBILE
                        ? props.event.title.split(" ")[0] +
                          " " +
                          props.event.title.split(" ")[1]
                        : props.event.title}
                </div>
            </Row>
            {!IS_MOBILE && (
                <>
                    <span
                        className={css({
                            display:
                                props.height < 40 || IS_MOBILE
                                    ? "none"
                                    : "flex",
                        })}
                    >
                        <Row
                            $style={{
                                gap: "5px",
                                color: "white",
                                fontSize: "calc(1.25em * 1.25vw)",
                            }}
                        >
                            <CalendarTime time={props.event.startTime} />
                            {" - "}
                            <CalendarTime time={props.event.endTime} />
                        </Row>
                    </span>
                    {props.event.instructor && (
                        <span
                            className={css({
                                display: props.height < 80 ? "none" : "flex",
                                // fit in one line
                                // as the length of the instructor's name increases, the font size decreases
                                fontSize: `${
                                    1.25 -
                                    Math.min(
                                        0.4,
                                        props.event.instructor.length / 20
                                    )
                                }em`,
                                color: "white",
                            })}
                        >
                            <p>Instructor: {props.event.instructor}</p>
                        </span>
                    )}
                </>
            )}
        </div>
    );
};

const CalendarButtonRow = (props: {
    onExport: () => void;
    onNextPage: () => void;
    onPrevPage: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    onAddCourse?: () => void;
    onCarletonCentral: () => void;
}) => {
    const [css, _$theme] = useStyletron();
    return (
        <div
            className={css({
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px",

                backgroundColor: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(10px)",
                borderRadius: "10px",
                boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)",
                alignItems: "center",
            })}
        >
            {IS_MOBILE ? (
                <CustomButton onClick={props.onAddCourse}>
                    Add Course
                </CustomButton>
            ) : (
                <CustomButton onClick={props.onExport}>
                    <BiCalendarPlus /> Export to Calendar
                </CustomButton>
            )}
            <Row
                $style={{
                    gap: "5px",
                }}
            >
                <CustomButton
                    disabled={!props.hasPrev}
                    onClick={props.onPrevPage}
                >
                    <ChevronLeft size={25} />
                </CustomButton>
                <CustomButton
                    disabled={!props.hasNext}
                    onClick={props.onNextPage}
                >
                    <ChevronRight size={25} />
                </CustomButton>
            </Row>

            <CustomButton onClick={props.onCarletonCentral}>
                <CgExport /> Export {!IS_MOBILE && " to Carleton Central"}
            </CustomButton>
        </div>
    );
};

const CalendarEventsOverlay = (props: { events: CalendarEvent[] }) => {
    const [css, _$theme] = useStyletron();

    return (
        <div
            className={css({
                position: "absolute",
                top: 0,
                left: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
                pointerEvents: "none",
            })}
        >
            {props.events.map((event) => {
                return <EventPositioner event={event} />;
            })}
        </div>
    );
};

export const useGetBestSchedules = (resetPage: () => void) => {
    const appManager = useAppManager();

    // generateCalendarBestSchedules will generate the best schedules for the current selection
    // this must be async so we can use suspense
    const [schedules, setSchedules] = useState<CalendarBestSchedules | null>(
        null
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const generate = async () => {
            const schedules = await generateCalendarBestSchedules(
                appManager.availableCourses
            );
            return schedules;
        };

        setLoading(true);
        generate().then((schedules) => {
            if (schedules.length === 0) {
                toaster.warning(
                    "No schedules found for the current selection."
                );
            }

            setSchedules(schedules);
            setLoading(false);
            resetPage();
        });
    }, [appManager.availableCourses]);

    return [schedules, loading] as const;
};

/**
 * The Calendar component is a simple 5 day calendar that can display events.
 * It works by first creating a grid of 5 columns and 13 rows (8 am to 8 pm) and then it will overlay events on top of the grid.
 * @param props
 * @returns
 */
export const Calendar = observer((props: CalendarProps) => {
    // we want a div that will contain the grid and have the event overlay displayed directly on top of it
    const [css, _$theme] = useStyletron();
    const appManager = useAppManager();
    const [tutorialModalContent, setTutorialModalContent] =
        useState<React.ReactNode | null>(null);

    const [schedules, loading] = useGetBestSchedules(() => setCurrentPage(0));

    const [currentPage, setCurrentPage] = useState(0);

    console.log("$$$", schedules);

    const nextPage = () => {
        if (!schedules) return;
        if (currentPage === schedules.length - 1) {
            return;
        }

        setCurrentPage((currentPage) => currentPage + 1);
    };

    const prevPage = () => {
        if (currentPage === 0) {
            return;
        }

        setCurrentPage((currentPage) => currentPage - 1);
    };

    if (loading || !schedules) {
        return <div>Loading...</div>;
    }

    const events = schedules[currentPage] ?? [];

    return (
        <>
            <Modal
                isOpen={tutorialModalContent !== null}
                onClose={() => setTutorialModalContent(null)}
                overrides={{
                    Root: {
                        style: {
                            zIndex: 1000,
                        },
                    },
                    DialogContainer: {
                        style: {
                            backdropFilter: "blur(10px)",
                        },
                    },
                }}
            >
                {tutorialModalContent}
            </Modal>
            <Column
                $style={{
                    gap: "10px",
                    ...props.$style,
                }}
            >
                <div
                    className={css({
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                    })}
                >
                    <Row>
                        <div
                            className={css({
                                display: "flex",
                                flexDirection: "column",
                                position: "relative",
                                userSelect: "none",
                            })}
                        >
                            <CalendarGrid />
                            <CalendarEventsOverlay events={events} />
                        </div>
                    </Row>
                    <Row>
                        <CalendarButtonRow
                            onAddCourse={() => {
                                props.openCourseSelection?.();
                            }}
                            onExport={() => {
                                const icsString = exportEventsToICS(events);
                                const blob = new Blob([icsString], {
                                    type: "text/calendar",
                                });
                                // trigger download
                                const link = document.createElement("a");
                                link.href = window.URL.createObjectURL(blob);
                                const currentDateStr = new Date().toISOString();
                                const name = `Carleton-Schedule-(${appManager.selectedTerm})-${currentDateStr}.ics`;
                                link.download = name;
                                link.click();

                                const tutorial = (
                                    <div
                                        className={css({
                                            padding: "20px",
                                            backgroundColor: "white",
                                            borderRadius: "10px",
                                        })}
                                    >
                                        <h2>Export to Calendar</h2>
                                        <p>
                                            You can import this file into your
                                            calendar app to see your schedule.
                                        </p>
                                        <p>Platform Tutorials</p>
                                        <ul>
                                            <li>
                                                <a href="https://support.google.com/calendar/answer/37118?hl=en&co=GENIE.Platform%3DDesktop">
                                                    Google Calendar
                                                </a>
                                            </li>
                                            <li>
                                                <a href="https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c">
                                                    Outlook
                                                </a>
                                            </li>
                                            <li>
                                                <a href="https://support.apple.com/en-gb/guide/calendar/icl1023/14.0/mac/14.0">
                                                    Apple Calendar
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                );

                                setTutorialModalContent(tutorial);
                            }}
                            onNextPage={() => {
                                nextPage();
                            }}
                            onPrevPage={() => {
                                prevPage();
                            }}
                            hasPrev={currentPage > 0}
                            hasNext={currentPage < schedules.length - 1}
                            onCarletonCentral={() => {
                                const crnSet = new Set<string>();
                                for (let event of events) {
                                    crnSet.add(event.course.CRN);
                                }
                                const crns = Array.from(crnSet);
                                for (let offering of appManager.selectedOnlineOfferings) {
                                    const sectionModels =
                                        offering.section_models;
                                    // pick a random section model
                                    const sectionModel =
                                        sectionModels[
                                            Math.floor(
                                                Math.random() *
                                                    sectionModels.length
                                            )
                                        ];

                                    const course =
                                        sectionModel.courses.length > 0
                                            ? sectionModel.courses[
                                                  Math.floor(
                                                      Math.random() *
                                                          sectionModel.courses
                                                              .length
                                                  )
                                              ]
                                            : null;
                                    const tutorial =
                                        sectionModel.tutorials.length > 0
                                            ? sectionModel.tutorials[
                                                  Math.floor(
                                                      Math.random() *
                                                          sectionModel.tutorials
                                                              .length
                                                  )
                                              ]
                                            : null;
                                    if (course) {
                                        crns.push(course.CRN);
                                    }
                                    if (tutorial) {
                                        crns.push(tutorial.CRN);
                                    }
                                }

                                setTutorialModalContent(
                                    <div
                                        className={css({
                                            padding: "20px",
                                            backgroundColor: "white",
                                            borderRadius: "10px",
                                        })}
                                    >
                                        <h2>Export to Carleton Central</h2>
                                        <ol>
                                            <li>
                                                <p>Go to Carleton Central</p>
                                            </li>
                                            <li>
                                                <p>
                                                    Click "Build Your
                                                    Timetable/Registration"
                                                    under Registration.
                                                </p>
                                            </li>
                                            <li>
                                                <p>Click "View Worksheet".</p>
                                            </li>
                                            <li>
                                                At the bottom, copy the
                                                following CRNs and paste them
                                                into the text fields.
                                            </li>
                                            <li>
                                                <p>Click "Add Courses".</p>
                                            </li>
                                            <li>Review your schedule!</li>
                                        </ol>
                                        <Row
                                            $style={{
                                                justifyContent: "center",
                                                fontWeight: "bold",
                                                fontSize: "1.25em",
                                                borderBottom: "1px solid black",
                                            }}
                                        >
                                            CRNs
                                        </Row>
                                        <Row
                                            $style={{
                                                display: "grid",
                                                gap: "10px",
                                                gridTemplateColumns:
                                                    "1fr 1fr 1fr 1fr",
                                                padding: "10px",
                                            }}
                                        >
                                            {crns.map((crn) => {
                                                return (
                                                    <pre
                                                        className={css({
                                                            padding: "10px",
                                                            backgroundColor:
                                                                "rgba(0, 0, 0, 0.1)",
                                                            borderRadius:
                                                                "10px",
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        })}
                                                    >
                                                        {crn}
                                                    </pre>
                                                );
                                            })}
                                        </Row>
                                    </div>
                                );
                            }}
                        />
                    </Row>
                </div>
            </Column>
        </>
    );
});
