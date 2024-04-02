import { Input } from "baseui/input";
import { Modal } from "baseui/modal";
import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { SearchableCourse } from "../api/api";
import { useAppManager } from "../main";
import { Column, Row } from "./util";
import { Button } from "baseui/button";
import { Instance } from "mobx-state-tree";
import { RelatedOffering } from "../api/AppManager";
import { SegmentedControl, Segment } from "baseui/segmented-control";
import { TermPicker } from "./App";
import { debounce } from "lodash";
import { toaster } from "baseui/toast";

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

        const displaySeparately = appManager.selectedOnlineOfferings.length > 0;

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
                    <Column
                        $style={{
                            gap: "2px",
                        }}
                    >
                        {displaySeparately && (
                            <a
                                className={css({
                                    fontSize: "small",
                                    margin: "0px",
                                    padding: "0px",
                                })}
                            >
                                Regular Courses
                            </a>
                        )}
                        {appManager.selectedRegularOfferings.map((course) => {
                            return (
                                <Row>
                                    <SelectedCourseItem course={course} />
                                </Row>
                            );
                        })}
                    </Column>

                    <Column
                        $style={{
                            gap: "2px",
                        }}
                    >
                        {displaySeparately && (
                            <a
                                className={css({
                                    fontSize: "small",
                                    margin: "0px",
                                    padding: "0px",
                                })}
                            >
                                Online Courses
                            </a>
                        )}
                        {appManager.selectedOnlineOfferings.map((course) => {
                            return (
                                <Row>
                                    <SelectedCourseItem course={course} />
                                </Row>
                            );
                        })}
                    </Column>

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

export const SearchResultItem = observer(
    (props: { course: SearchableCourse; closeModal: () => void }) => {
        const [css, _$theme] = useStyletron();

        const appManager = useAppManager();

        return (
            <div
                onClick={async () => {
                    props.closeModal();

                    // check if course is already added
                    if (
                        appManager.selectedOfferings.find(
                            (offering) =>
                                offering.offering_name ===
                                props.course.related_offering
                        )
                    ) {
                        toaster.warning("Course already added");
                        return;
                    }

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

export const CourseSelectionModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    showCourses?: boolean;
}) => {
    const [searchResults, setSearchResults] = useState<SearchableCourse[]>([]);
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

        debounce(() => {
            fetchData();
        }, 300)();
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
                        overflowY: "cutoff",
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
                        height: "70%",
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
                        <CourseSelectionList row onClickAddCourse={() => {}} />
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
                        overflowY: "scroll",
                        gap: "5px",
                        height: "500px",
                        // fade out bottom of element
                        maskImage:
                            "linear-gradient(to bottom, black 0%, black calc(100% - 50px), transparent 100%)",
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
};
