import { Input } from "baseui/input";
import { Modal } from "baseui/modal";
import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { IS_MOBILE, useAppManager } from "../main";
import { Column, Row } from "./util";

import { Instance } from "mobx-state-tree";
import { AppManager, RelatedOffering, convertTerm } from "../api/AppManager";
import { SegmentedControl, Segment } from "baseui/segmented-control";
import { TermPicker } from "./App";
import { toaster } from "baseui/toast";
import { getSubjectColor, hexToSplitRGB } from "./colorize";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import React from "react";
import { BiPlus } from "react-icons/bi";
import { Button } from "./Button";
import {
    API,
    Offering,
    QueryOfferingsResponse,
    convertSectionsToModels,
} from "../api/newapi";
import { cleanupSections, isEmptySection } from "../api/api";

export const AddCourseButton = (props: { onClick: () => void }) => {
    return (
        <Button
            onClick={props.onClick}
            $style={{
                width: "100%",
            }}
        >
            <Column>
                <BiPlus />{" "}
            </Column>
            <Column>Add Course</Column>
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
                    marginLeft: IS_MOBILE ? undefined : "-18px",
                })}
            >
                <Row
                    $style={{
                        gap: "5px",
                    }}
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
                </Row>
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
                <Row
                    $style={{
                        width: "100%",
                    }}
                >
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
    section_count?: number;
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
                            {props.course.related_offering}
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

export const SearchableOfferingResultItem = observer(
    (props: { offering: Offering; closeModal: () => void }) => {
        const appManager = useAppManager();
        const displayInfo = {
            long_title: props.offering.long_title,
            description: props.offering.description,
            related_offering: props.offering.related_offering,
        };

        console.log("$$$", displayInfo);

        return (
            <CourseResultDisplay
                onClick={async () => {
                    props.closeModal();

                    // check if course is already added
                    if (
                        appManager.selectedOfferings.find(
                            (offering) =>
                                offering.offering_name ===
                                props.offering.related_offering
                        )
                    ) {
                        toaster.warning("Course already added");
                        return;
                    }

                    // const api = new API();

                    // // const response = await api.getSectionsByCourseCode(
                    // //     props.course.course_code
                    // // );

                    // // const sectionModels = cleanupSections(
                    // //     convertSectionsToModels(response)
                    // // );

                    // // if (sectionModels.every(isEmptySection)) {
                    // //     toaster.negative(
                    // //         "All sections are closed for this course"
                    // //     );
                    // //     return;
                    // // }

                    // // appManager.addOffering({
                    // //     offering_name: props.course.related_offering,
                    // //     section_models: sectionModels,
                    // // });

                    const sectionModels = cleanupSections(
                        convertSectionsToModels(props.offering.sections)
                    );

                    if (sectionModels.every(isEmptySection)) {
                        toaster.negative(
                            "All sections are closed for this course"
                        );
                        return;
                    }

                    console.log("&&& offering", {
                        offering_name: props.offering.related_offering,
                        section_models: sectionModels,
                    });

                    appManager.addOffering({
                        offering_name: props.offering.related_offering,
                        section_models: sectionModels,
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
    appManager: Instance<typeof AppManager>
) => {
    const [searchResults, setSearchResults] = useState<
        QueryOfferingsResponse | undefined
    >();
    const api = new API();

    useEffect(() => {
        if (searchQuery.length === 0) {
            return;
        }

        const fetchResults = async () => {
            try {
                let response: QueryOfferingsResponse | undefined;
                switch (activeTab) {
                    case SearchType.SUBJECT_CODE:
                        response = await api.queryOfferings(
                            searchQuery,
                            convertTerm(appManager.selectedTerm)
                        );
                        break;
                    case SearchType.CRN:
                        break;
                    case SearchType.COURSE_CODE:
                        break;
                }

                setSearchResults(response);
            } catch (e) {
                console.error(e);
            }
        };

        fetchResults();
    }, [searchQuery, activeTab, appManager]);

    appManager = (appManager ?? useAppManager()) as Instance<typeof AppManager>;

    return [searchResults, () => setSearchResults(undefined)] as const;
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

    useEffect(() => {
        clearSearchResults();
        setSearchQuery("");
    }, [appManager.selectedTerm]);
    const [css, _$theme] = useStyletron();

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
                            disabled
                        />
                        {!IS_MOBILE && (
                            <Segment
                                artwork={() => "😶‍🌫️"}
                                label="By Course Code"
                                description="Example: MATH 1104 CT"
                                disabled
                            />
                        )}
                    </SegmentedControl>
                </Row>

                <Input
                    placeholder="Search for a course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <a
                    className={css({
                        color: "rgba(0, 0, 0, 0.5)",
                        fontSize: "0.75em",
                        fontStyle: "italic",
                    })}
                >
                    Example: "BIOL 2* OR COMP" shows all 2000 level Biology
                    courses and all Computer Science courses
                </a>

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
                    {searchResults &&
                        searchResults &&
                        searchResults.map((offering: Offering) => {
                            return (
                                <Row
                                    key={offering.related_offering}
                                    $style={{
                                        width: "100%",
                                        justifyContent: "center",
                                    }}
                                >
                                    <SearchableOfferingResultItem
                                        offering={offering}
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
