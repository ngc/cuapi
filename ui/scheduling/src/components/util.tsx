import { useStyletron } from "baseui";
import { StyleObject } from "styletron-react";

export const Column = (props: {
    children: React.ReactNode;
    $style?: StyleObject;
}) => {
    const [css, _$theme] = useStyletron();
    return (
        <div
            className={css({
                display: "flex",
                flexDirection: "column",
                ...props.$style,
            })}
        >
            {props.children}
        </div>
    );
};

export const Row = (props: {
    children: React.ReactNode;
    $style?: StyleObject;
}) => {
    const [css, _$theme] = useStyletron();
    return (
        <div
            className={css({
                display: "flex",
                flexDirection: "row",
                ...props.$style,
            })}
        >
            {props.children}
        </div>
    );
};
