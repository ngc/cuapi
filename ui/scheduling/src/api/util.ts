import { Instance } from "mobx-state-tree";
import { MeetingDetails, RelatedOffering } from "./AppManager";

const hasNoDays = (meetingDetails: MeetingDetails[]) => {
    return meetingDetails.every(
        (meeting) => meeting.days.length === 1 && meeting.days[0] === ""
    );
};

export const isOnlineOnly = (course: Instance<typeof RelatedOffering>) => {
    for (const section of course.section_models) {
        for (const tutorial of section.tutorials) {
            if (!hasNoDays(tutorial.meeting_details)) {
                return false;
            }
        }
        for (const course of section.courses) {
            if (!hasNoDays(course.meeting_details)) {
                return false;
            }
        }
    }
    return true;
};
