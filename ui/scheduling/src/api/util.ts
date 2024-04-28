import { Instance } from "mobx-state-tree";
import { MeetingDetails, RelatedOffering } from "./AppManager";

export const hasNoDays = (meetingDetails: MeetingDetails[]) => {
    return (
        meetingDetails.every(
            (meeting) => meeting.days.length === 1 && meeting.days[0] === ""
        ) || meetingDetails.length === 0
    );
};
