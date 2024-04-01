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

export const listToCommaString = (list: string[]): string => {
    // everything should be separated by commas except for the last two items, which should be separated by "and"
    if (list.length === 0) {
        return "";
    } else if (list.length === 1) {
        return list[0];
    } else if (list.length === 2) {
        return list[0] + " and " + list[1];
    } else {
        return list[0] + ", " + listToCommaString(list.slice(1));
    }
};
