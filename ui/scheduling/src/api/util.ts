import { MeetingDetails } from "./AppManager";

export const hasNoDays = (meetingDetails: MeetingDetails[]) => {
    if (!meetingDetails) {
        return true;
    }

    return (
        meetingDetails.every(
            (meeting) => meeting.days.length === 1 && meeting.days[0] === ""
        ) || meetingDetails.length === 0
    );
};
