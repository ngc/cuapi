import { Suspense, useLayoutEffect, useState } from "react";
import "./App.css";
import { useStyletron } from "baseui";
import { Calendar } from "./Calendar";
import { useAppManager } from "../main";
import { observer } from "mobx-react-lite";
import { Select } from "baseui/select";
import { TERMS } from "../api/AppManager";
import {
    AddCourseButton,
    CourseSelectionList,
    CourseSelectionModal,
} from "./CourseSelection";
import { Column, Row } from "./util";

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
            }}
            clearable={false}
            searchable={false}
            value={[
                {
                    label: appManager.selectedTerm,
                    id: appManager.selectedTerm,
                },
            ]}
            options={TERMS.map((term) => {
                return { label: term, id: term };
            })}
            onChange={(params) => {
                appManager.setTerm(
                    (params.value[0].label as string) ?? "Fall 2024"
                );
            }}
        />
    );
});

export const App = observer(() => {
    const [css, _$theme] = useStyletron();
    const [isOpen, setIsOpen] = useState(false);
    const appManager = useAppManager();

    const [isMobile, setIsMobile] = useState(
        window.innerWidth <= 768 || window.innerHeight <= 768
    );

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
                            justifyContent: "space-between",
                            width: "100%",
                            paddingLeft: "10px",
                        }}
                    >
                        <Row>
                            <h1
                                className={css({
                                    textAlign: "center",
                                })}
                            >
                                cuScheduling
                            </h1>
                        </Row>
                        <div
                            className={css({
                                width: "10%",
                                paddingRight: "60px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            })}
                        >
                            <TermPicker />
                        </div>
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
                            </Column>
                            <Column
                                $style={{
                                    flex: 8,
                                    marginRight: "40px",
                                }}
                            >
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Calendar events={appManager.toEvents()} />
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
                        <h1>cuScheduling</h1>
                    </Row>
                    <Row>
                        <Calendar
                            events={appManager.toEvents()}
                            $style={{
                                // set the scale on x to 1.1 and the scale on y to 1.5
                                transform: "scale(1)",
                            }}
                            mobile={true}
                        />
                    </Row>
                    <Row>
                        <AddCourseButton
                            onClick={() => {
                                setIsOpen(true);
                            }}
                        />
                    </Row>
                </Column>
            )}
        </>
    );
});

export default App;
