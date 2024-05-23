package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/gocolly/colly/v2"
	"github.com/joho/godotenv"
)

var URL string = "https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT"

type GetTermsResponse struct {
	TermCode string `json:"term_code"`
	TermName string `json:"term_name"`
}

var ctx = context.Background()

func getSessionCode() (string, error) {
	// ex. <input type="hidden" name="session_id" value="20666066" />

	c := colly.NewCollector()

	var sessionCode string
	c.OnHTML("input[name='session_id']", func(e *colly.HTMLElement) {
		sessionCode = e.Attr("value")
	})

	c.Visit(URL)

	return sessionCode, nil
}

func getTerms() ([]GetTermsResponse, error) {
	c := colly.NewCollector()

	// within a <select name="term_code"> element there are <option> elements
	// Extract the value property of each option element as well as the text the option element contains
	// return this as a map
	terms := []GetTermsResponse{}
	c.OnHTML("select[name='term_code'] option", func(e *colly.HTMLElement) {
		termCode := e.Attr("value")
		termName := e.Text
		terms = append(terms, GetTermsResponse{TermCode: termCode, TermName: termName})
	})

	c.Visit(URL)

	return terms, nil
}

func getSubjects(term string) ([]string, error) {
	// this one is going to be trickier
	// we have to make a POST request to https://central.carleton.ca/prod/bwysched.p_search_fields
	// with the following form data:
	// --data-raw 'wsea_code=EXT&session_id=20666066&term_code=202330' ;

	// the response will be an array of subject codes (ex. "COMP", "MATH", etc.)

	var subjects []string

	c := colly.NewCollector()

	// the subjects are all in a <select name="sel_subj"> element
	// each option element has a value property that is the subject code
	// ignore any option elements with a value of "" (empty string)
	c.OnHTML("select[name='sel_subj'] option", func(e *colly.HTMLElement) {
		subject := e.Attr("value")
		if subject != "" {
			subjects = append(subjects, subject)
		}
	})

	c.Post("https://central.carleton.ca/prod/bwysched.p_search_fields", map[string]string{
		"wsea_code":  "EXT",
		"session_id": ctx.Value("session_code").(string),
		"term_code":  term,
	})

	return subjects, nil
}

func setupFormData(term string, subject string, sessionID string) url.Values {
	data := url.Values{}

	// Set specific parameters
	data.Add("wsea_code", "EXT")
	data.Add("term_code", term)
	data.Add("session_id", sessionID)
	data.Add("sel_subj", subject)
	data.Add("sel_special", "N")
	data.Add("sel_begin_hh", "0")
	data.Add("sel_begin_mi", "0")
	data.Add("sel_begin_am_pm", "a")
	data.Add("sel_end_hh", "0")
	data.Add("sel_end_mi", "0")
	data.Add("sel_end_am_pm", "a")

	// Repeat 'sel_day' with different values
	days := []string{"m", "t", "w", "r", "f", "s", "u"}
	for _, day := range days {
		data.Add("sel_day", day)
	}

	// Fields set to "dummy" that should be included in the form
	dummyFields := []string{
		"sel_aud", "sel_subj", "sel_camp", "sel_sess", "sel_attr", "sel_levl", "sel_schd", "sel_insm", "sel_link", "sel_wait", "sel_day", "sel_begin_hh", "sel_begin_mi", "sel_begin_am_pm", "sel_end_hh", "sel_end_mi", "sel_end_am_pm", "sel_instruct", "sel_special", "sel_resd", "sel_breadth",
	}

	for _, field := range dummyFields {
		data.Add(field, "dummy")
	}

	// Other fields that do not have specific values but need to be included
	blankFields := []string{
		"ws_numb", "sel_number", "sel_crn", "sel_sess", "sel_schd", "sel_instruct", "block_button",
	}
	for _, field := range blankFields {
		data.Add(field, "")
	}

	return data
}

// Colly is awesome, but it's severely lacking for this specific use case so we have to do some weird stuff
func getCRNsForSubject(term string, subject string) []string {
	data := setupFormData(term, subject, ctx.Value("session_code").(string))

	set := make(map[string]bool)

	c := colly.NewCollector()

	c.OnError(func(r *colly.Response, err error) {
		println("Request URL:", r.Request.URL, "failed with response:", r, "\nError:", err.Error())
	})

	c.OnResponse(
		func(r *colly.Response) {
			doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(r.Body)))
			if err != nil {
				println(err.Error())
				return
			}

			doc.Find("td[style='word-wrap: break-word'] a").Each(func(i int, s *goquery.Selection) {
				href, _ := s.Attr("href")
				crn := href[strings.LastIndex(href, "=")+1:]
				set[crn] = true
			})
		})

	reader := strings.NewReader(data.Encode())
	c.Request("POST", "https://central.carleton.ca/prod/bwysched.p_course_search", reader, nil, nil)

	// Collect CRNs from the set
	var crns []string
	for crn := range set {
		crns = append(crns, crn)
	}

	return crns
}

// TODO import these types from go-backend/types.go
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

func findTD(e *colly.HTMLElement, search string) string {
	/*
			<table cellspacing="0" cellpadding="4" border="0" width="95%" style="font-size:12px;">
		<tbody><tr>
		<td colspan="2"><br>

		<br><br></td>
		</tr>
		<tr>
		<td width="20%"><b>Registration Term:</b></td>
		<td>Fall 2023 (September-December)</td>
		</tr>
		<tr>
		<td><b>CRN:</b></td>
		<td>30001</td>
		</tr><tr>
		<td><b>Subject:</b></td>
		<td>
		ACCT 5001 A
		</td>
		</tr><tr>
		<td><b>Long Title:</b></td>
		<td>Financial Accounting</td>
		</tr><tr>
		<td><b>Title:</b></td>
		<td>Financial Accounting</td>
		</tr><tr>
		<td><b>Course Description:</b></td>
		<td>
		Fundamentals of financial accounting. Techniques used to measure business transactions, preparation of financial statements, recording and valuation of assets, liabilities and equities.<br>      Precludes additional credit for BUSI 5004 (no longer offered).<br><br>
		</td>
		</tr><tr>
		<td><b>Course Credit Value:</b></td>
		<td>
		.25
		</td>
		</tr><tr>
		<td><b>Schedule Type:</b></td>
		<td>
		Seminar
		</td>
		</tr><tr>
		<td><b>Full Session Info:</b></td>
		<td></td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Status:</font></u> </a></b></td>
		<td>
		<font color="red">Registration Closed</font>
		</td>
		</tr><tr>
		<td><b>Section Information:</b></td>
		<td>for in-person MBA students only.<br>Fall 1 (begins the week of Sept 5)<br>Precludes additional credit for BUSI<br>5004 (no longer offered).</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Year in Program:</font></u> </a></b></td>
		<td>{None}</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Level Restriction:</font></u> </a></b></td>
		<td>{None}</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Degree Restriction:</font></u> </a></b></td>
		<td>Master of Business Admin (Include)</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Major Restriction:</font></u> </a></b></td>
		<td>{None}</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Program Restrictions:</font></u> </a></b></td>
		<td>Business Administration (Exclude)</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Department Restriction:</font></u> </a></b></td>
		<td>{None}</td>
		</tr><tr>
		<td><b><a href="https://carleton.ca/registrar/registration/terminology/" target="_blank"><u><font color="blue">Faculty Restriction:</font></u> </a></b></td>
		<td>{None}</td>
		</tr><tr>
		</tr><tr>
		<td colspan="2"><br>
		<table cellspacing="0" cellpadding="4" border="0" width="95%" style="font-size:12px;">
		<tbody><tr>
		<td><b>Meeting Date</b></td>
		<td><b>Days</b></td>
		<td><b>Time</b></td>
		<td><b>Schedule</b></td>
		<td><b>Instructor</b></td>
		</tr>
		<tr>
		<td class="default">Sep 06, 2023 to Oct 20, 2023</td>
		<td>Tue</td>
		<td>14:35 - 17:25</td>
		<td>Seminar</td>
		<td>John Jarecsni (Primary)</td>
		</tr>
		</tbody></table>
		</td>
		</tr>
		<tr>
		<td colspan="2"><br>

		<br><br></td>
		</tr>
		</tbody></table>
		Example table above
	*/

	// in this function we want to find a <td> inside of a <tr> that contains a <b/> that contains the search term
	// then we want to return the next <td> element in the <tr>
	// if the search term is not found, return nil

	// find the <td> element that contains the search term
	td := e.DOM.Find("td").FilterFunction(func(i int, s *goquery.Selection) bool {
		return strings.Contains(s.Text(), search)
	})

	// if the search term is not found, return nil
	if td == nil {
		return ""
	}

	// return the next <td> element in the <tr>

	return td.Next().Text()
}

func textToTermCharCode(text string) string {
	if strings.Contains(text, "Winter") {
		return "W"
	} else if strings.Contains(text, "Summer") {
		return "S"
	} else {
		return "F"
	}
}

func removeSectionCode(text string) string {
	split := strings.Split(text, " ")
	if len(split) < 2 {
		return ""
	}

	return strings.Join(split[:2], " ")
}

func getSectionKey(text string) string {
	split := strings.Split(text, " ")
	if len(split) < 3 {
		return "$"
	}

	return string(split[2][0])
}

func getMeetingDetails(e *colly.HTMLElement) []MeetingDetails {

	var meetingDetails []MeetingDetails

	// Look for the td element that has the attribute CLASS with a value of "default"
	// All the data we need is in the tr that contains this td element
	// The tr element is the parent of the td element
	// Iterate through all the tds in the tr element
	// The first td is the meeting date
	// The second td is the days
	// The third td is the time
	// The fourth td is the scheduletype
	// The fifth td is the instructor
	// Create a MeetingDetails object with this data and append it to the meetingDetails array

	// Do this for all the tr elements that contain a td element with the attribute CLASS with a value of "default"

	e.DOM.Find("td.default").Each(func(i int, s *goquery.Selection) {
		tr := s.Parent()
		tds := tr.Find("td")

		meetingDate := tds.Eq(0).Text()
		days := strings.Split(tds.Eq(1).Text(), " ")
		time := tds.Eq(2).Text()
		scheduleType := tds.Eq(3).Text()
		instructor := tds.Eq(4).Text()

		meetingDetails = append(meetingDetails, MeetingDetails{
			MeetingDate:  meetingDate,
			Days:         days,
			Time:         time,
			ScheduleType: scheduleType,
			Instructor:   instructor,
		})
	})

	return meetingDetails
}

// Removes all trailing and leading whitespace from a string as well as any newline or tab characters
func cleanupString(s string) string {
	return strings.TrimSpace(strings.ReplaceAll(s, "\n", ""))
}

func cleanupMeetingDetails(meetingDetails []MeetingDetails) []MeetingDetails {
	for i := range meetingDetails {
		meetingDetails[i].MeetingDate = cleanupString(meetingDetails[i].MeetingDate)
		meetingDetails[i].Time = cleanupString(meetingDetails[i].Time)
		meetingDetails[i].ScheduleType = cleanupString(meetingDetails[i].ScheduleType)
		meetingDetails[i].Instructor = cleanupString(meetingDetails[i].Instructor)
	}
	return meetingDetails
}

func cleanupSectionInformation(sectionInformation SectionInformation) SectionInformation {
	sectionInformation.SectionType = cleanupString(sectionInformation.SectionType)
	sectionInformation.Suitability = cleanupString(sectionInformation.Suitability)
	return sectionInformation
}

func cleanupCourseDetails(courseDetails CourseDetails) CourseDetails {
	courseDetails.RegistrationTerm = cleanupString(courseDetails.RegistrationTerm)
	courseDetails.CRN = cleanupString(courseDetails.CRN)
	courseDetails.SubjectCode = cleanupString(courseDetails.SubjectCode)
	courseDetails.LongTitle = cleanupString(courseDetails.LongTitle)
	courseDetails.ShortTitle = cleanupString(courseDetails.ShortTitle)
	courseDetails.CourseDescription = cleanupString(courseDetails.CourseDescription)
	courseDetails.ScheduleType = cleanupString(courseDetails.ScheduleType)
	courseDetails.RegistrationStatus = cleanupString(courseDetails.RegistrationStatus)
	courseDetails.SectionInformation = cleanupSectionInformation(courseDetails.SectionInformation)
	courseDetails.MeetingDetails = cleanupMeetingDetails(courseDetails.MeetingDetails)
	courseDetails.GlobalID = cleanupString(courseDetails.GlobalID)
	courseDetails.RelatedOffering = cleanupString(courseDetails.RelatedOffering)
	courseDetails.SectionKey = cleanupString(courseDetails.SectionKey)
	return courseDetails
}

func getCourseDetailsForCRN(term string, crn string) (CourseDetails, error) {
	// GET request to https://central.carleton.ca/prod/bwysched.p_display_course?wsea_code=EXT&term_code=202330&disp=20666006&crn=30001
	// No form data!
	// But we have to format the URL with the term code, session code, and CRN
	// term_code is the term code
	// disp is the session code
	// crn is the CRN

	// The response will be a CourseDetails object

	c := colly.NewCollector()

	var wg sync.WaitGroup

	c.OnError(func(r *colly.Response, err error) {
		println("Request URL:", r.Request.URL, "failed with response:", r, "\nError:", err.Error())
		wg.Done()
	})

	var course CourseDetails

	c.OnHTML("table", func(e *colly.HTMLElement) {

		wg.Add(1)
		defer wg.Done()

		isCourseDetailsTable := findTD(e, "Registration Term:") != ""

		if !isCourseDetailsTable {
			return
		}

		courseCreditValueStr := findTD(e, "Course Credit Value:")
		courseCreditValueStr = strings.ReplaceAll(courseCreditValueStr, "\n", "")

		courseCreditValue, err := strconv.ParseFloat("0"+courseCreditValueStr, 64)
		if err != nil {
			courseCreditValue = 0
		}

		// We determine suitiability by checking if the text "NOT SUITABLE FOR ONLINE STUDENTS" is present
		// if it is, then the course is not suitable for online students
		// otherwise, it is suitable
		suitability := "SUITABLE FOR ONLINE STUDENTS"
		if strings.Contains(e.Text, "NOT SUITABLE FOR ONLINE STUDENTS") {
			suitability = "NOT SUITABLE FOR ONLINE STUDENTS"
		}

		registrationTerm := findTD(e, "Registration Term:")
		convertedTerm := textToTermCharCode(registrationTerm)

		course = CourseDetails{
			RegistrationTerm:  convertedTerm,
			CRN:               findTD(e, "CRN:"),
			SubjectCode:       findTD(e, "Subject:"),
			LongTitle:         findTD(e, "Long Title:"),
			ShortTitle:        findTD(e, "Title:"),
			CourseDescription: findTD(e, "Course Description:"),
			// just use string to float conversion
			CourseCreditValue:  courseCreditValue,
			ScheduleType:       findTD(e, "Schedule Type:"),
			RegistrationStatus: findTD(e, "Status:"),
			SectionInformation: SectionInformation{
				SectionType: findTD(e, "Section Information:"),
				Suitability: suitability,
			},
			MeetingDetails:  getMeetingDetails(e),
			GlobalID:        convertedTerm + findTD(e, "CRN:"),
			RelatedOffering: removeSectionCode(findTD(e, "Subject:")),
			SectionKey:      getSectionKey(findTD(e, "Subject:")),
		}

		course = cleanupCourseDetails(course)

	})

	c.Visit("https://central.carleton.ca/prod/bwysched.p_display_course?wsea_code=EXT&term_code=" + term + "&disp=" + ctx.Value("session_code").(string) + "&crn=" + crn)

	c.Wait()

	return course, nil
}

type postCourseDetailsRequest struct {
	CourseDetails CourseDetails `json:"course_details"`
	WorkerKey     string        `json:"worker_key"`
}

// SubmitCourseDetails function to submit course details to the backend
func submitCourseDetails(course CourseDetails) error {
	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		return fmt.Errorf("BACKEND_URL is not set")
	}

	workerKey := os.Getenv("WORKER_KEY")

	fullURL := fmt.Sprintf("http://%s/add-course-details", backendURL)
	jsonData, err := json.Marshal(course)
	if err != nil {
		return fmt.Errorf("failed to marshal course details: %w", err)
	}

	println(string(jsonData))

	requestBody := postCourseDetailsRequest{
		CourseDetails: course,
		WorkerKey:     workerKey,
	}

	jsonValue, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	resp, err := http.Post(fullURL, "application/json", bytes.NewBuffer(jsonValue))
	if err != nil {
		return fmt.Errorf("failed to post course details: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to post course details: %d", resp.StatusCode)
	}

	return nil
}

var threadCount = 100 // Set the desired number of threads

func main() {
	// add session code to context
	// record the start time
	startTime := time.Now()

	// load dotenv file
	err := godotenv.Load("../../.env")
	if err != nil {
		println("Error loading .env file")
	}

	sessionCode, err := getSessionCode()
	if err != nil {
		panic(err)
	}

	ctx = context.WithValue(context.Background(), "session_code", sessionCode)

	terms, err := getTerms()
	if err != nil {
		panic(err)
	}

	var allCourseDetails []CourseDetails
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, threadCount) // Use a semaphore to limit the number of concurrent goroutines

	for _, term := range terms {
		subjects, err := getSubjects(term.TermCode)
		if err != nil {
			panic(err)
		}

		for _, subject := range subjects {
			crnList := getCRNsForSubject(term.TermCode, subject)
			for _, crn := range crnList {
				wg.Add(1)
				semaphore <- struct{}{} // Acquire semaphore
				go func(termCode, subject, crn string) {
					defer wg.Done()
					defer func() { <-semaphore }() // Release semaphore when done
					fmt.Printf("Getting course details for term %s, subject %s, CRN %s\n", termCode, subject, crn)
					courseDetails, err := getCourseDetailsForCRN(termCode, crn)
					if err != nil {
						panic(err)
					}
					allCourseDetails = append(allCourseDetails, courseDetails)
				}(term.TermCode, subject, crn)
			}
		}
	}

	wg.Wait() // Wait for all goroutines to finish

	// write allCourseDetails to a file in JSON format
	// this file will be read by the backend

	// file, err := os.Create("course_details.json")
	// if err != nil {
	// 	panic(err)
	// }

	// defer file.Close()

	// encoder := json.NewEncoder(file)
	// encoder.SetIndent("", "  ")
	// err = encoder.Encode(allCourseDetails)
	// if err != nil {
	// 	panic(err)
	// }

	for _, course := range allCourseDetails {
		err := submitCourseDetails(course)
		if err != nil {
			panic(err)
		}
	}

	endTime := time.Now()
	fmt.Printf("Time taken: %v\n", endTime.Sub(startTime))
}
