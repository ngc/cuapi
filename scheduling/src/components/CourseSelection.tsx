import { Input } from "baseui/input";
import { Modal } from "baseui/modal";
import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { CourseDetails, SearchableCourse, offeringSearch } from "../api/api";
import { useAppManager } from "../main";
import { Column, Row } from "./util";
import { Button } from "baseui/button";
import { Instance } from "mobx-state-tree";
import {
    RelatedOffering,
    SectionModel,
    convert_term,
    stringToColor,
} from "../api/AppManager";
import { SegmentedControl, Segment } from "baseui/segmented-control";
import { Tooltip } from "@mui/material";
import { TermPicker } from "./App";

export const AddCourseButton = (props: { onClick: () => void }) => {
    return (
        <Button
            onClick={props.onClick}
            overrides={{
                BaseButton: {
                    style: {
                        width: "100%",
                    },
                },
            }}
        >
            Add Course
        </Button>
    );
};

export const SelectedCourseItem = observer(
    (props: { course: Instance<typeof RelatedOffering> }) => {
        const [css, _$theme] = useStyletron();
        const appManager = useAppManager();

        return (
            <div
                className={css({
                    width: "100%",
                    backgroundColor: "rgba(255, 0, 0, 0.25)",
                    border: "1px dashed red",
                    padding: "5px",
                    borderRadius: "5px",
                    fontFamily: "monospace",
                    fontSize: "1.2em",
                    ":hover": {
                        backgroundColor: "rgba(255, 0, 0, 0.5)",
                        cursor: "pointer",
                    },
                })}
                onClick={() => {
                    appManager.removeOffering(props.course);
                }}
            >
                {props.course.offering_name}
            </div>
        );
    }
);

export const CourseSelectionList = observer(
    (props: { onClickAddCourse: () => void; row?: boolean }) => {
        const [css, _$theme] = useStyletron();
        const appManager = useAppManager();

        if (props.row) {
            return (
                <div
                    className={css({
                        // grid template columns
                        display: "grid",
                        gridTemplateColumns: "auto auto",
                        gap: "10px",
                        justifyContent: "center",
                        alignItems: "center",
                    })}
                >
                    {appManager.selectedOfferings.map((course) => {
                        return <SelectedCourseItem course={course} />;
                    })}
                    {appManager.selectedOfferings.length === 0 && (
                        <p>No courses selected</p>
                    )}
                </div>
            );
        }

        return (
            <Column
                $style={{
                    textAlign: "center",
                    gap: "10px",
                    alignItems: "center",

                    // glassmorphism
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "10px",
                    padding: "20px",
                    boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)",
                    margin: "20px",
                }}
            >
                <Column>
                    <a
                        className={css({
                            fontSize: "1.15em",
                            fontWeight: "bold",
                        })}
                    >
                        Courses
                    </a>
                    {/* small italized click to remove */}
                    <a
                        className={css({
                            fontSize: "0.75em",
                            fontStyle: "italic",
                            color: "rgba(0, 0, 0, 0.5)",
                        })}
                    >
                        Click to remove
                    </a>
                </Column>

                <Column
                    $style={{
                        gap: "2px",
                    }}
                >
                    {appManager.selectedOfferings.map((course) => {
                        return (
                            <Tooltip title={"Click to remove"}>
                                <Row>
                                    <SelectedCourseItem course={course} />
                                </Row>
                            </Tooltip>
                        );
                    })}
                    {appManager.selectedOfferings.length === 0 && (
                        <p>No courses selected</p>
                    )}
                </Column>
                <Row>
                    <AddCourseButton onClick={props.onClickAddCourse} />
                </Row>
            </Column>
        );
    }
);

export const _SearchResultItem = (props: {
    course: string;
    closeModal: () => void;
}) => {
    const [css, _$theme] = useStyletron();
    const appManager = useAppManager();
    const course = props.course;

    const courseSearchInformation = {
        name: "Advanced Topics in Computer Science",
        code: "COMP 4000",
        description: "This course is about advanced topics in computer science",
        numberOfOfferings: 3,
    };

    return (
        <div
            onClick={async () => {
                const [subject, code] = course.split(" ");
                props.closeModal();

                const options = await offeringSearch(
                    convert_term(appManager.selectedTerm),
                    subject,
                    code,
                    1
                );

                let courses = [];
                let tutorials = [];
                for (const option of options) {
                    if (option.schedule_type === "Lecture") {
                        courses.push(option);
                    } else {
                        tutorials.push(option);
                    }
                }

                const sectionMap: {
                    [section: string]: {
                        courses: CourseDetails[];
                        tutorials: CourseDetails[];
                    };
                } = {};
                // the way we determine a section is by splitting the subject code by space
                // the section is the first character of the third part of the split
                // if there is no third part, then the section is "$"
                for (const course of courses) {
                    const section =
                        course.subject_code.split(" ")[2]?.[0] ?? "$";
                    if (section in sectionMap) {
                        sectionMap[section].courses.push(course);
                    } else {
                        sectionMap[section] = {
                            courses: [course],
                            tutorials: [],
                        };
                    }
                }

                // now we need to add the tutorials to the section map
                for (const tutorial of tutorials) {
                    const section =
                        tutorial.subject_code.split(" ")[2]?.[0] ?? "$";
                    if (section in sectionMap) {
                        sectionMap[section].tutorials.push(tutorial);
                    } else {
                        sectionMap[section] = {
                            courses: [],
                            tutorials: [tutorial],
                        };
                    }
                }

                const sectionModels: SectionModel[] = Object.values(sectionMap);

                appManager.addOffering({
                    offering_name: course,
                    section_models: sectionModels,
                });
            }}
            // card styling
            className={css({
                width: "100%",
                border: "1px solid black",
                padding: "10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "0px",
                // align top
                alignItems: "flex-start",
                borderRadius: "5px",
                ":hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                },
            })}
        >
            <Row
                $style={{
                    padding: "0px",
                }}
            >
                <Column>
                    <Row
                        $style={{
                            gap: "0px",
                        }}
                    >
                        <p
                            className={css({
                                fontSize: "1.15em",
                                fontWeight: "500",
                                margin: "0px",
                                padding: "0px",
                            })}
                        >
                            {courseSearchInformation.name}
                        </p>
                    </Row>
                    <Row
                        $style={{
                            color: "rgba(0, 0, 0, 0.5)",

                            margin: "0px",
                            padding: "0px",
                        }}
                    >
                        <p
                            className={css({
                                margin: "0px",
                                padding: "0px",
                            })}
                        >
                            {courseSearchInformation.code} |{" "}
                            {courseSearchInformation.numberOfOfferings}{" "}
                            {"section" +
                                (courseSearchInformation.numberOfOfferings > 1
                                    ? "s"
                                    : "")}
                        </p>
                    </Row>
                </Column>
            </Row>
            <Row>{courseSearchInformation.description}</Row>
        </div>
    );
};

export const SearchResultItem = observer(
    (props: { course: SearchableCourse; closeModal: () => void }) => {
        const [css, $theme] = useStyletron();

        const appManager = useAppManager();

        return (
            <div
                onClick={async () => {
                    props.closeModal();
                    appManager.addOffering({
                        offering_name: props.course.related_offering,
                        section_models: props.course.sections,
                    });
                }}
                // card styling
                className={css({
                    width: "100%",
                    border: `1px solid black`,
                    padding: "10px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0px",
                    // align top
                    alignItems: "flex-start",
                    borderRadius: "5px",
                    ":hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.1)",
                    },
                })}
            >
                <Row
                    $style={{
                        padding: "0px",
                    }}
                >
                    <Column>
                        <Row
                            $style={{
                                gap: "0px",
                            }}
                        >
                            <p
                                className={css({
                                    fontSize: "1.15em",
                                    fontWeight: "500",
                                    margin: "0px",
                                    padding: "0px",
                                })}
                            >
                                {props.course.long_title}
                            </p>
                        </Row>
                        <Row
                            $style={{
                                color: "rgba(0, 0, 0, 0.5)",

                                margin: "0px",
                                padding: "0px",
                            }}
                        >
                            <p
                                className={css({
                                    margin: "0px",
                                    padding: "0px",
                                })}
                            >
                                {props.course.related_offering} |{" "}
                                {props.course.sections.length}{" "}
                                {"section" +
                                    (props.course.sections.length > 1
                                        ? "s"
                                        : "")}
                            </p>
                        </Row>
                    </Column>
                </Row>
                <Row
                    $style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        alignContent: "flex-start",
                        textAlign: "left",
                        width: "100%",
                    }}
                >
                    {props.course.description}
                </Row>
            </div>
        );
    }
);

export const CourseSelectionModal = observer(
    (props: {
        isOpen: boolean;
        onClose: () => void;
        showCourses?: boolean;
    }) => {
        const [searchResults, setSearchResults] = useState<SearchableCourse[]>(
            []
        );
        const [searchQuery, setSearchQuery] = useState("");
        const appManager = useAppManager();
        const [activeTab, setActiveTab] = useState(0);

        useEffect(() => {
            const fetchData = async () => {
                const results = await appManager.fetchSearchableCourses(
                    searchQuery,
                    1
                );
                setSearchResults(results);
            };
            fetchData();
        }, [searchQuery]);

        return (
            <Modal
                overrides={{
                    Root: {
                        style: {
                            ...(!props.showCourses
                                ? {
                                      zIndex: 1000,
                                  }
                                : {}),
                        },
                    },
                    DialogContainer: {
                        style: {
                            backdropFilter: "blur(10px)",
                        },
                    },
                    Dialog: {
                        style: {
                            width: "40%",
                            height: "70vh",
                            "@media screen and (max-width: 1024px)": {
                                width: "90%",
                                height: "90%",
                            },
                        },
                    },
                }}
                onClose={() => props.onClose()}
                isOpen={props.isOpen}
            >
                <Column
                    $style={{
                        textAlign: "center",
                        gap: "10px",
                        padding: "20px",
                    }}
                >
                    {props.showCourses && (
                        <Row
                            $style={{
                                padding: "10px",
                                justifyContent: "space-between",
                            }}
                        >
                            <CourseSelectionList
                                row
                                onClickAddCourse={() => {}}
                            />
                            <TermPicker />
                        </Row>
                    )}
                    <h1>Add Course</h1>
                    <Row
                        $style={{
                            width: "100%",
                            justifyContent: "center",
                        }}
                    >
                        <SegmentedControl
                            overrides={{
                                Root: {
                                    style: {
                                        width: "100%",
                                    },
                                },
                            }}
                            activeKey={activeTab}
                            onChange={({ activeKey }) => {
                                setActiveTab(activeKey as number);
                            }}
                        >
                            <Segment
                                artwork={() => "📚"}
                                label="By Subject Code"
                                description="Example: COMP 2402"
                            />
                            <Segment
                                artwork={() => "🤓"}
                                label="By CRN"
                                description="Example: 11213"
                                disabled={true}
                            />
                            <Segment
                                artwork={() => "😡"}
                                label="By Course Code"
                                description="Example: MATH 1104 CT"
                                disabled={true}
                            />
                        </SegmentedControl>
                    </Row>

                    <Input
                        placeholder="Search for a course..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />

                    <Column
                        $style={{
                            height: "350px",
                            overflowY: "scroll",
                            gap: "5px",
                        }}
                    >
                        {searchResults.map((course) => {
                            return (
                                <Row
                                    key={course.related_offering}
                                    $style={{
                                        width: "100%",
                                        justifyContent: "center",
                                    }}
                                >
                                    <SearchResultItem
                                        course={course}
                                        closeModal={props.onClose}
                                    />
                                </Row>
                            );
                        })}
                    </Column>
                </Column>
            </Modal>
        );
    }
);
