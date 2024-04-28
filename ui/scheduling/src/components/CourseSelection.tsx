import { Input } from "baseui/input";
import { Modal } from "baseui/modal";
import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { SearchableCourse } from "../api/api";
import { IS_MOBILE, useAppManager } from "../main";
import { Column, Row } from "./util";
import { Button } from "baseui/button";
import { Instance } from "mobx-state-tree";
import { AppManager, CourseDetails, RelatedOffering } from "../api/AppManager";
import { SegmentedControl, Segment } from "baseui/segmented-control";
import { TermPicker } from "./App";
import { toaster } from "baseui/toast";
import { getSubjectColor, hexToSplitRGB } from "./colorize";
import { useHover } from "@uidotdev/usehooks";
import { FaEye } from "react-icons/fa";
import { BsEye } from "react-icons/bs";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import React from "react";

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
    (props: { course: Instance<typeof RelatedOffering>; inline?: boolean }) => {
        const [css, _$theme] = useStyletron();
        const appManager = useAppManager();

        const subject = props.course.offering_name.split(" ")[0];
        const color = getSubjectColor(subject);
        const [red, green, blue] = hexToSplitRGB(color);

        const [isHovered, setIsHovered] = React.useState(false);

        const displayIcon =
            (!props.course.isVisible || isHovered) &&
            !props.course.isOnlineOnly;

        return (
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsHovered(true)}
                onBlur={() => setIsHovered(false)}
                className={css({
                    width: "120%",
                    justifyContent: "center",
                    display: "flex",
                    flexDirection: "row",
                    gap: "5px",
                    marginLeft: "-18px",
                })}
            >
                <a
                    className={css({
                        justifyContent: "center",
                        alignItems: "center",
                        display: "flex",
                        visibility: displayIcon ? "visible" : "hidden",
                        cursor: "pointer",
                        ":hover": {
                            color: "rgba(0, 0, 0, 0.75)",
                        },
                        transition: "opacity 0.1s",
                    })}
                    onClick={() => {
                        setIsHovered(false);
                        props.course.toggleVisibility();
                    }}
                >
                    {props.course.isVisible ? <IoMdEye /> : <IoMdEyeOff />}
                </a>

                <div
                    className={css({
                        width: "100%",
                        backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.25)`,
                        border: `1px dashed rgba(${red}, ${green}, ${blue}, 1)`,

                        ...(!props.course.isVisible && {
                            border: `1px solid rgba(${red}, ${green}, ${blue}, 0.145)`,
                            backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.145)`,
                            color: `rgba(${0}, ${0}, ${0}, 0.3)`,
                        }),

                        padding: "5px",
                        borderRadius: "5px",
                        fontFamily: "monospace",
                        fontSize: "1.2em",
                        ":hover": {
                            backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.5)`,
                            cursor: "pointer",
                        },
                        ...(props.inline && {
                            display: "flex",
                            justifyContent: "center",
                            padding: "7px",
                        }),
                    })}
                    onClick={() => {
                        appManager.removeOffering(props.course);
                    }}
                >
                    {props.course.offering_name}
                </div>
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
                <>
                    {appManager.selectedOfferings.length > 0 && (
                        <Column
                            $style={{
                                justifyContent: "center",
                                alignContent: "center",
                            }}
                        >
                            <a
                                className={css({
                                    fontSize: "1.15em",
                                    fontWeight: "bold",
                                    textAlign: "center",
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
                    )}
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
                            return (
                                <SelectedCourseItem course={course} inline />
                            );
                        })}
                        {appManager.selectedOfferings.length === 0 && (
                            <p>No courses selected</p>
                        )}
                    </div>
                </>
            );
        }

        const displaySeparately = appManager.selectedOnlineOfferings.length > 0;

        return (
            <Column
                $style={{
                    textAlign: "center",
                    gap: "10px",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "10px",
                    padding: "20px",
                    boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)",
                    margin: "20px",
                    marginTop: "0px",
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

interface DisplayType {
    long_title: string;
    description: string;
    related_offering: string;
    section_count: number;
}

export const CourseResultDisplay = (props: {
    course: DisplayType;
    onClick: () => void;
}) => {
    const [css, _$theme] = useStyletron();

    return (
        <div
            onClick={props.onClick}
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
                            {props.course.section_count &&
                                props.course.section_count +
                                    " section" +
                                    (props.course.section_count > 1 ? "s" : "")}
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
};

export const SingleCourseSearchResultItem = observer(
    (props: { course: CourseDetails; closeModal: () => void }) => {
        const appManager = useAppManager();
        const displayInfo = {
            long_title: props.course.subject_code,
            description: props.course.course_description,
            related_offering: props.course.subject_code,
            section_count: 1,
        };

        return (
            <CourseResultDisplay
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
                        toaster.positive("Adding course to existing selection");
                    }

                    appManager.addSingleCourse(props.course);
                }}
                course={displayInfo}
            />
        );
    }
);

export const SearchableCourseResultItem = observer(
    (props: { course: SearchableCourse; closeModal: () => void }) => {
        const appManager = useAppManager();
        const displayInfo = {
            long_title: props.course.long_title,
            description: props.course.description,
            related_offering: props.course.related_offering,
            section_count: props.course.sections.length,
        };

        return (
            <CourseResultDisplay
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
                course={displayInfo}
            />
        );
    }
);

enum SearchType {
    SUBJECT_CODE = 0,
    CRN = 1,
    COURSE_CODE = 2,
}

export const useFetchSearchResults = (
    searchQuery: string,
    activeTab:
        | SearchType.SUBJECT_CODE
        | SearchType.CRN
        | SearchType.COURSE_CODE,
    appManager?: Instance<typeof AppManager>
) => {
    const [searchResults, setSearchResults] = useState<
        SearchableCourse[] | CourseDetails[]
    >([]);

    appManager = (appManager ?? useAppManager()) as Instance<typeof AppManager>;

    useEffect(() => {
        const fetchData = async (activeTab: number, searchQuery: string) => {
            const controller = new AbortController();
            const { signal } = controller;
            let results = [] as SearchableCourse[] | CourseDetails[];

            try {
                switch (activeTab) {
                    case SearchType.SUBJECT_CODE:
                        results = await appManager!.fetchSearchableCourses(
                            searchQuery,
                            1,
                            signal
                        );
                        break;
                    case SearchType.CRN:
                        results = await appManager!.searchByCRN(
                            searchQuery,
                            1,
                            signal
                        );
                        break;
                    case SearchType.COURSE_CODE:
                        results = await appManager!.searchByCourseCode(
                            searchQuery,
                            1,
                            signal
                        );
                        break;
                }

                setSearchResults(results);
            } catch (error: any) {
                if (error.name !== "AbortError") {
                    console.error("Fetch failed:", error);
                }
            }

            return () => {
                controller.abort(); // Clean up the controller when the component unmounts or dependencies change
            };
        };

        fetchData(activeTab, searchQuery);
    }, [searchQuery, activeTab, appManager]);

    return [searchResults, () => setSearchResults([])] as const;
};

export const CourseSelectionModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    showCourses?: boolean;
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const appManager = useAppManager();
    const [activeTab, setActiveTab] = useState<number>(SearchType.SUBJECT_CODE);

    const [searchResults, clearSearchResults] = useFetchSearchResults(
        searchQuery,
        activeTab,
        appManager
    );

    return (
        <Modal
            overrides={{
                Root: {
                    style: {
                        ...(!props.showCourses
                            ? {
                                  zIndex: 1000,
                              }
                            : {
                                  zIndex: 1000,
                              }),
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
                            clearSearchResults();
                            setActiveTab(parseInt(activeKey as string));
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
                        />
                        {!IS_MOBILE && (
                            <Segment
                                artwork={() => "😡"}
                                label="By Course Code"
                                description="Example: MATH 1104 CT"
                            />
                        )}
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
                    {activeTab === SearchType.SUBJECT_CODE &&
                        (searchResults as SearchableCourse[]).map((course) => {
                            return (
                                <Row
                                    key={course.related_offering}
                                    $style={{
                                        width: "100%",
                                        justifyContent: "center",
                                    }}
                                >
                                    <SearchableCourseResultItem
                                        course={course as SearchableCourse}
                                        closeModal={props.onClose}
                                    />
                                </Row>
                            );
                        })}

                    {activeTab === SearchType.CRN &&
                        (searchResults as CourseDetails[]).map((course) => {
                            return (
                                <Row
                                    key={course.CRN}
                                    $style={{
                                        width: "100%",
                                        justifyContent: "center",
                                    }}
                                >
                                    <SingleCourseSearchResultItem
                                        course={course}
                                        closeModal={props.onClose}
                                    />
                                </Row>
                            );
                        })}

                    {activeTab === SearchType.COURSE_CODE &&
                        (searchResults as CourseDetails[]).map((course) => {
                            return (
                                <Row
                                    key={course.related_offering}
                                    $style={{
                                        width: "100%",
                                        justifyContent: "center",
                                    }}
                                >
                                    <SingleCourseSearchResultItem
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
