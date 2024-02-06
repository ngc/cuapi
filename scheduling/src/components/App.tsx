import { useEffect, useLayoutEffect, useState } from "react";
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
                        justifyContent: "space-between",
                    }}
                >
                    <h1>cuScheduling</h1>
                    <div
                        className={css({
                            width: "10%",
                            paddingRight: "50px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        })}
                    >
                        <Select
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
                        <Calendar events={appManager.toEvents()} />
                    </Column>
                </Row>
            </Column>
        </>
    );
});

export default App;
