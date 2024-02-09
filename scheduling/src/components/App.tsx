import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import "./App.css";
import { useStyletron } from "baseui";
import { CourseDetails } from "../api/api";
import { StyleObject } from "styletron-react";
import { Calendar } from "./Calendar";
import { Modal } from "baseui/modal";
import { useAppManager } from "../main";
import { observer } from "mobx-react-lite";
import { Input } from "baseui/input";
import { Select } from "baseui/select";
import { TERMS } from "../api/AppManager";
import { CourseSelectionList, CourseSelectionModal } from "./CourseSelection";
import { Column, Row } from "./util";

export const App = observer(() => {
    const [css, $theme] = useStyletron();
    const [isOpen, setIsOpen] = useState(false);
    const appManager = useAppManager();

    return (
        <>
            <CourseSelectionModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
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
                        <Select
                            overrides={{
                                Root: {
                                    style: {
                                        zIndex: 1000,
                                    },
                                },
                            }}
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
                                    (params.value[0].id as string) ??
                                        "Fall 2024"
                                );
                            }}
                        />
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
        </>
    );
});

export default App;
