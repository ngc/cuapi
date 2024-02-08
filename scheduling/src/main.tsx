import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App.tsx";
import { Client as Styletron } from "styletron-engine-monolithic";
import { Provider as StyletronProvider } from "styletron-react";
import { LightTheme, BaseProvider, useStyletron } from "baseui";
import { Instance, onSnapshot } from "mobx-state-tree";
import { AppManager } from "./api/AppManager.ts";
import { observer } from "mobx-react-lite";
import { ToasterContainer } from "baseui/toast/toaster";
import pinkGradient from "./pinkGradient.svg";

const engine = new Styletron();
interface AppManagerProviderContext {
    appManager: Instance<typeof AppManager>;
}

const AppManagerContext = React.createContext<AppManagerProviderContext>({
    appManager: AppManager.create(),
});

export const AppManagerProvider = observer(
    (props: {
        children: React.ReactNode;
        appManager: Instance<typeof AppManager>;
    }) => {
        // observable effect on appmanager to dump snapshot to localstorage
        useEffect(() => {
            const disposer = onSnapshot(props.appManager, (snapshot) => {
                localStorage.setItem("appManager", JSON.stringify(snapshot));
            });
            return () => disposer();
        }, [props.appManager]);

        return (
            <AppManagerContext.Provider
                value={{ appManager: props.appManager }}
            >
                {props.children}
            </AppManagerContext.Provider>
        );
    }
);

export const useAppManager = () => {
    if (React.useContext(AppManagerContext) === undefined) {
        throw new Error(
            "useAppManager must be used within an AppManagerProvider"
        );
    }

    return React.useContext(AppManagerContext).appManager;
};

const loadOrCreateAppManager = () => {
    const snapshot = localStorage.getItem("appManager");
    if (snapshot) {
        return AppManager.create(JSON.parse(snapshot));
    }
    return AppManager.create();
};

export const Background = () => {
    const [css, $theme] = useStyletron();

    return (
        <div
            className={css({
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: -1,
                backgroundColor: "#C5DFF8",
                filter: "blur(10px)",
                transform: "scale(1.1)",
            })}
        >
            <img
                className={css({
                    // place in the top right upside down and mirrored
                    position: "absolute",
                    top: "40",
                    left: "0%",
                    // flip the image
                    transform: "scaleX(1)",
                    zIndex: 1,
                })}
                src={pinkGradient}
                alt="background"
            />
        </div>
    );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <StyletronProvider value={engine}>
            <BaseProvider theme={LightTheme}>
                <AppManagerProvider appManager={loadOrCreateAppManager()}>
                    <ToasterContainer
                        placement="bottomRight"
                        autoHideDuration={3000}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                position: "relative",
                                userSelect: "none",
                                overflow: "hidden",
                            }}
                        >
                            <App />
                            <Background />
                        </div>
                    </ToasterContainer>
                </AppManagerProvider>
            </BaseProvider>
        </StyletronProvider>
    </React.StrictMode>
);
