package main

type SectionInformation struct {
	SectionType string `json:"section_type"`
	Suitability string `json:"suitability"`
}

type MeetingDetails struct {
	MeetingDate  string   `json:"meeting_date"`
	Days         []string `json:"days"`
	Time         string   `json:"time"`
	ScheduleType string   `json:"schedule_type"`
	Instructor   string   `json:"instructor"`
}

type CourseDetails struct {
	RegistrationTerm   string             `json:"registration_term"`
	CRN                string             `json:"CRN"`
	SubjectCode        string             `json:"subject_code"`
	LongTitle          string             `json:"long_title"`
	ShortTitle         string             `json:"short_title"`
	CourseDescription  string             `json:"course_description"`
	CourseCreditValue  float64            `json:"course_credit_value"`
	ScheduleType       string             `json:"schedule_type"`
	RegistrationStatus string             `json:"registration_status"`
	SectionInformation SectionInformation `json:"section_information"`
	MeetingDetails     []MeetingDetails   `json:"meeting_details"`
	GlobalID           string             `json:"global_id"`
	RelatedOffering    string             `json:"related_offering"`
	SectionKey         string             `json:"section_key"`
}

// isLecture determines if the given scheduleType is a lecture based on a list of aliases.
func isLecture(scheduleType string) bool {
	/* This is based on code found in AppManager.ts in the scheduling/ui React app */

	lectureAliases := []string{
		"Lecture",
		"Seminar",
		"Studio",
		"Comprehensive",
		"Practicum",
		"Other",
		"Workshop",
		"PhD Thesis",
		"Masters Thesis",
		"Directed Studies",
		"Honours Essay",
		"Problem Analysis",
	}

	for _, alias := range lectureAliases {
		if scheduleType == alias {
			return true
		}
	}

	return false
}
