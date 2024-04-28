import { Suspense, useLayoutEffect, useState } from "react";
import "./App.css";
import { useStyletron } from "baseui";
import { Calendar } from "./Calendar";
import { useAppManager } from "../main";
import { observer } from "mobx-react-lite";
import { Select } from "baseui/select";
import { TERMS } from "../api/AppManager";
import { CourseSelectionList, CourseSelectionModal } from "./CourseSelection";
import { Column, Row } from "./util";
import Wordmark from "../Wordmark.svg";

const getTermLabel = (term: string) => {
    if (term.includes("Fall")) {
        return "🍂 " + term;
    } else if (term.includes("Winter")) {
        return "❄️ " + term;
    } else if (term.includes("Summer")) {
        return "☀️ " + term;
    } else {
        return term;
    }
};

export const TermPicker = observer(() => {
    const appManager = useAppManager();

    return (
        <Select
            key={appManager.selectedTerm}
            overrides={{
                Root: {
                    style: {
                        zIndex: 1000,
                    },
                },
                ControlContainer: {
                    style: {
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                    },
                },
            }}
            clearable={false}
            searchable={false}
            value={[
                {
                    label: getTermLabel(appManager.selectedTerm),
                    id: appManager.selectedTerm,
                },
            ]}
            options={TERMS.map((term) => {
                return { label: getTermLabel(term), id: term };
            })}
            onChange={(params) => {
                appManager.setTerm(
                    (params.value[0].id as string) ?? "Fall 2024"
                );
            }}
        />
    );
});

export const App = observer(() => {
    const [css, _$theme] = useStyletron();
    const [isOpen, setIsOpen] = useState(false);

    const [isMobile, setIsMobile] = useState(
        window.innerWidth <= 768 || window.innerHeight <= 768
    );

    const appManager = useAppManager();

    useLayoutEffect(() => {
        function updateSize() {
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 768);
        }
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    return (
        <>
            <CourseSelectionModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                showCourses={isMobile}
            />
            {!isMobile ? (
                <Column $style={{ height: "100vh", width: "100vw" }}>
                    <Row
                        $style={{
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            paddingLeft: "10px",
                        }}
                    >
                        <Row
                            $style={{
                                padding: "10px",
                            }}
                        >
                            <img src={Wordmark} alt="cuScheduling" />
                        </Row>
                    </Row>

                    <Column
                        $style={{
                            justifyContent: "center",
                        }}
                    >
                        <Row>
                            <Column
                                $style={{
                                    width: "50%",
                                    height: "100%",
                                    flex: 1,
                                }}
                            >
                                <CourseSelectionList
                                    onClickAddCourse={() => {
                                        setIsOpen(true);
                                    }}
                                />
                                <div
                                    className={css({
                                        marginLeft: "20px",
                                        marginRight: "20px",
                                        boxShadow:
                                            "0 4px 8px 0 rgba(0, 0, 0, 0.2)",
                                    })}
                                >
                                    <TermPicker />
                                </div>
                            </Column>
                            <Column
                                $style={{
                                    flex: 7,
                                    marginRight: "40px",
                                }}
                            >
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Calendar />
                                </Suspense>
                            </Column>
                        </Row>
                    </Column>
                    <Row
                        $style={{
                            position: "fixed",
                            bottom: 0,
                            width: "100%",
                            justifyContent: "center",
                            marginBottom: "10px",
                            userSelect: "none",
                        }}
                    >
                        <footer>
                            Made with ❤️ by{" "}
                            <a href="https://nathancoulas.com">Nathan Coulas</a>
                        </footer>
                    </Row>
                </Column>
            ) : (
                <Column
                    $style={{
                        height: "100vh",
                        width: "100vw",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
                    <Row>
                        <Column
                            $style={{
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Row
                                $style={{
                                    padding: "10px",
                                }}
                            >
                                <img src={Wordmark} alt="cuScheduling" />
                            </Row>
                            <Row>
                                <footer>
                                    Made with ❤️ by{" "}
                                    <a href="https://nathancoulas.com">
                                        Nathan Coulas
                                    </a>
                                </footer>
                            </Row>
                        </Column>
                    </Row>
                    <Row>
                        <Calendar
                            mobile={true}
                            key={appManager.currentScheduleIndex}
                            openCourseSelection={() => setIsOpen(true)}
                        />
                    </Row>
                    <CourseSelectionList
                        row={true}
                        onClickAddCourse={() => {}}
                    />
                </Column>
            )}
        </>
    );
});

export default App;
