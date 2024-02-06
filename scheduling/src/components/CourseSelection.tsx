import { Input } from "baseui/input";
import { Modal } from "baseui/modal";
import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { CourseDetails, offeringSearch } from "../api/api";
import { useAppManager } from "../main";
import { Column, Row } from "./util";
import { Button } from "baseui/button";
import { getSnapshot } from "mobx-state-tree";
import { convert_term } from "../api/AppManager";

export const AddCourseButton = (props: { onClick: () => void }) => {
    const [css, $theme] = useStyletron();
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
    (props: { course: CourseDetails }) => {
        const [css, $theme] = useStyletron();
        const appManager = useAppManager();

        return (
            <div
                className={css({
                    height: "1em",
                    width: "100%",
                    backgroundColor: "rgba(255, 0, 0, 0.25)",
                    border: "1px dashed red",
                    padding: "5px",
                    borderRadius: "5px",
                    ":hover": {
                        backgroundColor: "rgba(255, 0, 0, 0.5)",
                        cursor: "pointer",
                    },
                })}
                onClick={() => {
                    appManager.removeCourse(props.course);
                }}
            >
                {props.course.subject_code}
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
                }}
            >
                <Row>
                    <h3>Selected Courses</h3>
                </Row>

                <Column
                    $style={{
                        gap: "5px",
                    }}
                >
                    {appManager.selectedOfferings.map((course) => {
                        return (
                            <Row>
                                {/* <SelectedCourseItem course={course} /> */}
                                <div
                                    onClick={() => {
                                        // appManager.removeOffering(course);
                                        console.log(
                                            "$$$",
                                            course.course_options.toJSON()
                                        );
                                    }}
                                >
                                    {course.offering_name}
                                </div>
                            </Row>
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

export const CourseSelectionModal = (props: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const appManager = useAppManager();

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
                }}
            >
                <h1>Add Course</h1>
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                />

                {searchResults.map((course) => {
                    return (
                        <div
                            onClick={async () => {
                                const [subject, code] = course.split(" ");

                                const courseOptions = await offeringSearch(
                                    convert_term(appManager.selectedTerm),
                                    subject,
                                    code,
                                    1
                                );

                                console.log("$$$ options", courseOptions);

                                appManager.addOffering({
                                    offering_name: course,
                                    course_options: courseOptions,
                                });
                                props.onClose();
                            }}
                        >
                            {course}
                        </div>
                    );
                })}
            </Column>
        </Modal>
    );
};
