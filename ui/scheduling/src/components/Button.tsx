import { useStyletron } from "baseui";
import { StyleObject } from "styletron-react";
import { Row } from "./util";

interface ButtonProps {
    onClick?: () => void;
    children: React.ReactNode;
    $style?: StyleObject;
    disabled?: boolean;
}

export const Button = (props: ButtonProps) => {
    const [css, _$theme] = useStyletron();

    const baseStyle = {
        border: "0.5px solid black",
        padding: "5.5px",
        fontSize: "1em",
        borderRadius: "5px",
        cursor: "pointer",
        fontFamily: "monospace",
        backgroundColor: "rgba(50, 100, 255, 0.1)",
        ":hover": {
            backgroundColor: "rgba(50, 100, 255, 0.025)",
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
        },
        transition: "background-color 0.2s, box-shadow 0.2s",
        ...props.$style,
    };

    const disabledStyle = {
        ...baseStyle,
        cursor: "not-allowed",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        color: "rgba(0, 0, 0, 0.5)",
        ":hover": undefined,
    };

    return (
        <a
            className={css(props.disabled ? disabledStyle : baseStyle)}
            onClick={props.onClick}
        >
            <Row
                $style={{
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "2px",
                }}
            >
                {props.children}
            </Row>
        </a>
    );
};
