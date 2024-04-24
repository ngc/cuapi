import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App.tsx";
import { Client as Styletron } from "styletron-engine-monolithic";
import { Provider as StyletronProvider } from "styletron-react";
import { LightTheme, BaseProvider, useStyletron, Theme } from "baseui";
import { Instance, onSnapshot } from "mobx-state-tree";
import { AppManager } from "./api/AppManager.ts";
import { observer } from "mobx-react-lite";
import { ToasterContainer } from "baseui/toast/toaster";
import Modal from "baseui/modal/modal";
import { Row } from "./components/util.tsx";

const engine = new Styletron();
console.log(
    `                      

                                                                                                             
                                                                                                             
             jjjj                   lllllll   iiii                                         333333333333333   
            j::::j                  l:::::l  i::::i                                <<<<<<<3:::::::::::::::33 
             jjjj                   l:::::l   iiii                                <:::::< 3::::::33333::::::3
                                    l:::::l                                      <:::::<  3333333     3:::::3
           jjjjjjjuuuuuu    uuuuuu   l::::l iiiiiii     eeeeeeeeeeee            <:::::<               3:::::3
           j:::::ju::::u    u::::u   l::::l i:::::i   ee::::::::::::ee         <:::::<                3:::::3
            j::::ju::::u    u::::u   l::::l  i::::i  e::::::eeeee:::::ee      <:::::<         33333333:::::3 
            j::::ju::::u    u::::u   l::::l  i::::i e::::::e     e:::::e     <:::::<          3:::::::::::3  
            j::::ju::::u    u::::u   l::::l  i::::i e:::::::eeeee::::::e      <:::::<         33333333:::::3 
            j::::ju::::u    u::::u   l::::l  i::::i e:::::::::::::::::e        <:::::<                3:::::3
            j::::ju::::u    u::::u   l::::l  i::::i e::::::eeeeeeeeeee          <:::::<               3:::::3
            j::::ju:::::uuuu:::::u   l::::l  i::::i e:::::::e                    <:::::<              3:::::3
            j::::ju:::::::::::::::uul::::::li::::::ie::::::::e                    <:::::< 3333333     3:::::3
            j::::j u:::::::::::::::ul::::::li::::::i e::::::::eeeeeeee             <<<<<<<3::::::33333::::::3
            j::::j  uu::::::::uu:::ul::::::li::::::i  ee:::::::::::::e                    3:::::::::::::::33 
            j::::j    uuuuuuuu  uuuulllllllliiiiiiii    eeeeeeeeeeeeee                     333333333333333   
            j::::j                                                                                           
  jjjj      j::::j                                                                                           
 j::::jj   j:::::j                                                                                           
 j::::::jjj::::::j                                                                                           
  jj::::::::::::j                                                                                            
    jjj::::::jjj                                                                                             
       jjjjjj                                                                                                

    `
);
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
        const parsedSnapshot = JSON.parse(snapshot!);
        parsedSnapshot.currentScheduleIndex = 0;
        parsedSnapshot.selectedCourses = [];
        parsedSnapshot.toEvents = [];

        return AppManager.create(parsedSnapshot);
    }
    return AppManager.create();
};

interface ThemeContextInterface {
    theme: Theme;
    setTheme: (theme: "Fall" | "Winter" | "Summer") => void;
}

const ThemeContext = React.createContext<ThemeContextInterface>({
    theme: LightTheme,
    setTheme: (theme: "Fall" | "Winter" | "Summer") => {},
});

export const useTheme = () => {
    if (React.useContext(ThemeContext) === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return React.useContext(ThemeContext);
};

export const ThemeProvider = observer(
    (props: { children: React.ReactNode }) => {
        const [theme, setTheme] = React.useState<Theme>(LightTheme);

        const setThemeFromTerm = (term: string) => {
            if (term.includes("Fall")) {
                setTheme(LightTheme);
            } else if (term.includes("Winter")) {
                setTheme(LightTheme);
            } else if (term.includes("Summer")) {
                setTheme(LightTheme);
            }
        };

        return (
            <ThemeContext.Provider
                value={{ theme, setTheme: setThemeFromTerm }}
            >
                {props.children}
            </ThemeContext.Provider>
        );
    }
);

export const Background = () => {
    const [css, _$theme] = useStyletron();

    return (
        <div
            className={css({
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: -1,
                backgroundColor: "#D5E3FF",
                filter: "blur(10px)",
                transform: "scale(1.1)",
            })}
        >
            <img
                className={css({
                    // place in the top right upside down and mirrored
                    position: "absolute",

                    left: "-20%",
                    // flip the image
                    transform: "scale(2)",
                    zIndex: 1,

                    mixBlendMode: "color-burn",
                })}
                // src={pinkGradient}
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
