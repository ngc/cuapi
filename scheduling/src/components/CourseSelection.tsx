import { Input } from "baseui/input";
import { Modal } from "baseui/modal";
import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { CourseDetails, offeringSearch } from "../api/api";
import { useAppManager } from "../main";
import { Column, Row } from "./util";
import { Button } from "baseui/button";
import { Instance, getSnapshot } from "mobx-state-tree";
import { RelatedOffering, SectionModel, convert_term } from "../api/AppManager";
import { SegmentedControl, Segment } from "baseui/segmented-control";
import { Tooltip } from "@mui/material";
import { motion } from "framer-motion";

export const AddCourseButton = (props: { onClick: () => void }) => {
    const [css, $theme] = useStyletron();
    return (
        <Button
            kind="secondary"
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
        const [css, $theme] = useStyletron();
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
    (props: { onClickAddCourse: () => void }) => {
        const [css, $theme] = useStyletron();
        const appManager = useAppManager();

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
                <Row>
                    <h3>Selected Courses</h3>
                </Row>

                <Column
                    $style={{
                        gap: "2px",
                    }}
                >
                    {appManager.selectedOfferings.map((course) => {
                        return (
                            <Tooltip title={"Click to remove"}>
                                <Row>
                                    {/* <SelectedCourseItem course={course} /> */}
                                    <SelectedCourseItem course={course} />
                                </Row>
                            </Tooltip>
                        );
                    })}
                </Column>
                <Row>
                    <AddCourseButton onClick={props.onClickAddCourse} />
                </Row>
            </Column>
        );
    }
);

enum SearchType {
    SUBJECT_CODE,
    CRN,
    COURSE_CODE,
}

export const SearchResultItem = observer(
    (props: { course: string; closeModal: () => void }) => {
        const [css, $theme] = useStyletron();
        const appManager = useAppManager();
        const course = props.course;

        return (
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.4 }}
                className={css({
                    all: "unset",
                    width: "90%",
                })}
            >
                <div
                    className={css({
                        height: "1em",
                        border: "1px dashed grey",
                        padding: "5px",
                        borderRadius: "5px",
                        transition: "0.2s",
                        ":hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.1)",
                            cursor: "pointer",
                        },
                    })}
                    onClick={async () => {
                        const [subject, code] = course.split(" ");

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

                        // print all the courses and tutorials
                        console.log(courses);
                        console.log(tutorials);

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

                        const sectionModels: SectionModel[] =
                            Object.values(sectionMap);

                        appManager.addOffering({
                            offering_name: course,
                            section_models: sectionModels,
                        });
                        props.closeModal();
                    }}
                >
                    {props.course}
                </div>
            </motion.button>
        );
    }
);

export const CourseSelectionModal = (props: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const appManager = useAppManager();
    const [activeTab, setActiveTab] = useState(0);
    const [css, $theme] = useStyletron();

    useEffect(() => {
        const fetchData = async () => {
            const results = await appManager.fetchSearchForOfferings(
                searchQuery
            );
            setSearchResults(results);
            console.log(results);
        };
        fetchData();
    }, [searchQuery]);

    return (
        <Modal
            overrides={{
                Root: {
                    style: {
                        zIndex: 1000,
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
                            badge={1}
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
                        height: "200px",
                        overflowY: "scroll",
                        gap: "5px",
                    }}
                >
                    {searchResults.map((course) => {
                        return (
                            <Row
                                $style={{
                                    width: "100%",
                                    justifyContent: "center",
                                }}
                            >
                                <SearchResultItem
                                    key={course}
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
};
