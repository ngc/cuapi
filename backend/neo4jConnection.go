// Uses neo4j bolt driver to connect to neo4j database
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/neo4j/neo4j-go-driver/neo4j"
)

// Neo4jConnection holds the driver and session for the Neo4j database
type Neo4jConnection struct {
	Driver  neo4j.Driver
	Session neo4j.Session
}

var (
	ctx context.Context
)

// NewNeo4jConnection creates a new Neo4jConnection
func NewNeo4jConnection() (*Neo4jConnection, error) {
	println("Creating new Neo4j connection")
	println(os.Getenv("NEO4J_URI"))

	driver, err := neo4j.NewDriver(os.Getenv("NEO4J_URI"), neo4j.BasicAuth(os.Getenv("NEO4J_USER"), os.Getenv("NEO4J_PASSWORD"), ""), func(c *neo4j.Config) {
		c.Encrypted = false
	})
	if err != nil {
		return nil, err
	}

	session, err := driver.Session(neo4j.AccessModeWrite)
	if err != nil {
		return nil, err
	}

	return &Neo4jConnection{Driver: driver, Session: session}, nil
}

// Close closes the driver and session for the Neo4j database
func (nc *Neo4jConnection) Close() {
	nc.Session.Close()
	nc.Driver.Close()
}

// RunCypherQuery runs a cypher query on the Neo4j database
func (nc *Neo4jConnection) RunCypherQuery(query string, params map[string]interface{}) (neo4j.Result, error) {
	result, err := nc.Session.Run(query, params)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// return a new neo4j connection, dont
func GetNeo4jConnection(attempts int) *Neo4jConnection {
	neo4jConnection, ok := NewNeo4jConnection()
	if ok != nil {
		if attempts < 3 {
			attempts++
			return GetNeo4jConnection(attempts)
		}
		log.Fatalf("could not create Neo4j connection: %v", ok)
	}

	return neo4jConnection
}

func InitCoursesIndex() error {
	println("Creating courses full-text index")
	nc := GetNeo4jConnection(0)

	createIndexQuery := `
    CREATE FULLTEXT INDEX coursesFullTextIndex FOR (c:Course)
    ON EACH [c.longTitle, c.courseDescription, c.relatedOffering]
    OPTIONS {
      indexConfig: {
        ` + "`fulltext.analyzer`" + `: 'english',
        ` + "`fulltext.eventually_consistent`" + `: true
      }
    }
    `

	_, err := nc.RunCypherQuery(createIndexQuery, nil)

	if err != nil {
		return err
	}

	// check if there was an error creating the index
	listIndexesQuery := `
	SHOW INDEXES
	`

	result, err := nc.RunCypherQuery(listIndexesQuery, nil)
	if err != nil {
		return err
	}

	flag := false
	for result.Next() {
		record := result.Record()
		// check if name == "coursesFullTextIndex"
		if name, ok := record.Get("name"); ok {
			if name == "coursesFullTextIndex" {
				flag = true
				break
			}
		}
	}

	if !flag {
		return fmt.Errorf("INDEX NOT CREATED")
	}

	if err = result.Err(); err != nil {
		return err
	}

	nc.Close()
	return nil
}

type Course struct {
	CourseCode        string `json:"course_code"`
	LongTitle         string `json:"long_title"`
	CourseDescription string `json:"description"`
	RelatedOffering   string `json:"related_offering"`
}

// QueryCourses searches for courses in the Neo4j database using a full-text search
func QueryCourses(searchTerm string, registrationTerm string) ([]Course, error) {
	nc := GetNeo4jConnection(0)

	result, err := nc.RunCypherQuery(`
		CALL db.index.fulltext.queryNodes("coursesFullTextIndex", $searchTerm)
		YIELD node
		WHERE node.courseCode STARTS WITH $registrationTerm
		RETURN node
		LIMIT 10
	`, map[string]interface{}{
		"searchTerm":       searchTerm,
		"registrationTerm": registrationTerm,
	})

	if err != nil {
		return nil, err
	}

	var courses []Course
	for result.Next() {
		record := result.Record()
		if node, ok := record.Get("node"); ok {
			props := node.(neo4j.Node).Props()
			course := Course{
				CourseCode:        props["courseCode"].(string),
				LongTitle:         props["longTitle"].(string),
				CourseDescription: props["courseDescription"].(string),
				RelatedOffering:   props["relatedOffering"].(string),
			}
			courses = append(courses, course)
		}
	}

	if err = result.Err(); err != nil {
		return nil, err
	}

	nc.Close()

	return courses, nil
}

// CreateCourseDetailsNode creates a CourseDetails node in the Neo4j database
func CreateCourseDetailsNode(courseDetails CourseDetails) error {

	nc := GetNeo4jConnection(0)

	// first check if the course details node already exists
	result, err := nc.RunCypherQuery(`
		MATCH (c:CourseDetails {globalID: $globalID})
		RETURN c
	`, map[string]interface{}{
		"globalID": courseDetails.GlobalID,
	})

	if err != nil {
		return err
	}

	// if the course details node already exists, delete it and its relationships
	if result.Next() {
		_, err := nc.RunCypherQuery(`
			MATCH (c:CourseDetails {globalID: $globalID})
			DETACH DELETE c
		`, map[string]interface{}{
			"globalID": courseDetails.GlobalID,
		})

		if err != nil {
			return err
		}
	}

	//  JSON using json.Marshal
	meetingDetailsJSON, err := json.Marshal(courseDetails.MeetingDetails)
	if err != nil {
		return err
	}

	sectionInformationJSON, err := json.Marshal(courseDetails.SectionInformation)
	if err != nil {
		return err
	}

	meetingDetailsString := string(meetingDetailsJSON)
	sectionInformationString := string(sectionInformationJSON)

	// create the actual course details node
	// Add any nested data as string properties
	_, err = nc.RunCypherQuery(`
		CREATE (c:CourseDetails {
			registrationTerm: $registrationTerm,
			CRN: $CRN,
			subjectCode: $subjectCode,
			longTitle: $longTitle,
			shortTitle: $shortTitle,
			courseDescription: $courseDescription,
			courseCreditValue: $courseCreditValue,
			scheduleType: $scheduleType,
			registrationStatus: $registrationStatus,
			sectionInformation: $sectionInformation,
			meetingDetails: $meetingDetails,
			globalID: $globalID,
			relatedOffering: $relatedOffering,
			sectionKey: $sectionKey
		})
	`, map[string]interface{}{
		"registrationTerm":   courseDetails.RegistrationTerm,
		"CRN":                courseDetails.CRN,
		"subjectCode":        courseDetails.SubjectCode,
		"longTitle":          courseDetails.LongTitle,
		"shortTitle":         courseDetails.ShortTitle,
		"courseDescription":  courseDetails.CourseDescription,
		"courseCreditValue":  courseDetails.CourseCreditValue,
		"scheduleType":       courseDetails.ScheduleType,
		"registrationStatus": courseDetails.RegistrationStatus,
		"sectionInformation": sectionInformationString,
		"meetingDetails":     meetingDetailsString,
		"globalID":           courseDetails.GlobalID,
		"relatedOffering":    courseDetails.RelatedOffering,
		"sectionKey":         courseDetails.SectionKey,
	})

	if err != nil {
		return err
	}

	nc.Close()

	return nil
}

// CreateCourseDetailsRelationships creates relationships for a CourseDetails node in the Neo4j database
// and adds additional data to the Course node.
func CreateCourseDetailsRelationships(courseDetails CourseDetails) error {
	nc := GetNeo4jConnection(0)

	var relationshipType string
	if isLecture(courseDetails.ScheduleType) {
		relationshipType = "LECTURE_IN"
	} else {
		relationshipType = "TUTORIAL_IN"
	}

	// create the relationships for the course details node and update the Course node with additional details
	_, err := nc.RunCypherQuery(`
		MATCH (c:CourseDetails {globalID: $globalID})
		MERGE (t:Term {term: $term})
		MERGE (co:Course {courseCode: $courseCode})
		ON CREATE SET co.relatedOffering = $relatedOffering, co.longTitle = $longTitle, co.courseDescription = $description
		ON MATCH SET co.relatedOffering = $relatedOffering, co.longTitle = $longTitle, co.courseDescription = $description
		MERGE (s:Section {sectionCode: $sectionCode})
		MERGE (co)-[:DURING]->(t)
		MERGE (s)-[:OFFERING_OF]->(co)
		MERGE (c)-[:`+relationshipType+`]->(s)
	`, map[string]interface{}{
		"globalID":        courseDetails.GlobalID,
		"term":            courseDetails.RegistrationTerm,
		"courseCode":      courseDetails.RegistrationTerm + " " + courseDetails.RelatedOffering,
		"sectionCode":     courseDetails.RegistrationTerm + " " + courseDetails.RelatedOffering + " " + courseDetails.SectionKey,
		"relatedOffering": courseDetails.RelatedOffering,
		"longTitle":       courseDetails.LongTitle,
		"description":     courseDetails.CourseDescription,
	})

	if err != nil {
		return err
	}

	nc.Close()

	return nil
}

// InsertCourseDetails inserts a CourseDetails node and its relationships into the Neo4j database
func InsertCourseDetails(courseDetails CourseDetails) error {
	err := CreateCourseDetailsNode(courseDetails)
	if err != nil {
		return err
	}

	err = CreateCourseDetailsRelationships(courseDetails)
	if err != nil {
		return err
	}

	return nil
}

func GetTutorialsBySectionCode(sectionCode string) ([]CourseDetails, error) {
	nc := GetNeo4jConnection(0)

	session, err := nc.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, fmt.Errorf("failed to open session: %v", err)
	}
	defer session.Close()

	query := `
		MATCH (s:Section {sectionCode: $sectionCode})
		MATCH (c:CourseDetails)-[:TUTORIAL_IN]-(s)
		RETURN c
	`
	params := map[string]interface{}{
		"sectionCode": sectionCode,
	}

	result, err := session.Run(query, params)
	if err != nil {
		return nil, fmt.Errorf("failed to execute Cypher query: %v", err)
	}

	var tutorials []CourseDetails
	for result.Next() {
		record := result.Record()
		if node, ok := record.Get("c"); ok {
			props := node.(neo4j.Node).Props()
			tutorial := CourseDetails{
				RegistrationTerm:   props["registrationTerm"].(string),
				CRN:                props["CRN"].(string),
				SubjectCode:        props["subjectCode"].(string),
				LongTitle:          props["longTitle"].(string),
				ShortTitle:         props["shortTitle"].(string),
				CourseDescription:  props["courseDescription"].(string),
				CourseCreditValue:  props["courseCreditValue"].(float64),
				ScheduleType:       props["scheduleType"].(string),
				RegistrationStatus: props["registrationStatus"].(string),
				GlobalID:           props["globalID"].(string),
				RelatedOffering:    props["relatedOffering"].(string),
				SectionKey:         props["sectionKey"].(string),
			}
			tutorials = append(tutorials, tutorial)
		}
	}

	if err = result.Err(); err != nil {
		return nil, fmt.Errorf("error in result iteration: %v", err)
	}

	nc.Close()

	return tutorials, nil
}

func GetLecturesBySectionCode(sectionCode string) ([]CourseDetails, error) {
	nc := GetNeo4jConnection(0)

	session, err := nc.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, fmt.Errorf("failed to open session: %v", err)
	}
	defer session.Close()

	query := `
		MATCH (s:Section {sectionCode: $sectionCode})
		MATCH (c:CourseDetails)-[:LECTURE_IN]-(s)
		RETURN c
	`
	params := map[string]interface{}{
		"sectionCode": sectionCode,
	}

	result, err := session.Run(query, params)
	if err != nil {
		return nil, fmt.Errorf("failed to execute Cypher query: %v", err)
	}

	var lectures []CourseDetails
	for result.Next() {
		record := result.Record()
		if node, ok := record.Get("c"); ok {
			props := node.(neo4j.Node).Props()

			sectionInformation := SectionInformation{}
			sectionInformationJSON := []byte(props["sectionInformation"].(string))
			err := json.Unmarshal(sectionInformationJSON, &sectionInformation)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal section information: %v", err)
			}

			meetingDetails := []MeetingDetails{}
			meetingDetailsJSON := []byte(props["meetingDetails"].(string))
			err = json.Unmarshal(meetingDetailsJSON, &meetingDetails)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal meeting details: %v", err)
			}

			lecture := CourseDetails{
				RegistrationTerm:   props["registrationTerm"].(string),
				CRN:                props["CRN"].(string),
				SubjectCode:        props["subjectCode"].(string),
				LongTitle:          props["longTitle"].(string),
				ShortTitle:         props["shortTitle"].(string),
				CourseDescription:  props["courseDescription"].(string),
				CourseCreditValue:  props["courseCreditValue"].(float64),
				ScheduleType:       props["scheduleType"].(string),
				RegistrationStatus: props["registrationStatus"].(string),
				SectionInformation: sectionInformation,
				MeetingDetails:     meetingDetails,
				GlobalID:           props["globalID"].(string),
				RelatedOffering:    props["relatedOffering"].(string),
				SectionKey:         props["sectionKey"].(string),
			}
			lectures = append(lectures, lecture)
		}
	}

	if err = result.Err(); err != nil {
		return nil, fmt.Errorf("error in result iteration: %v", err)
	}

	nc.Close()
	return lectures, nil
}

type SectionsByCourseCode struct {
	SectionCode string          `json:"section_code"`
	Lectures    []CourseDetails `json:"lectures"`
	Tutorials   []CourseDetails `json:"tutorials"`
}

func GetSectionsByCourseCode(registrationTerm string, relatedOffering string) ([]SectionsByCourseCode, error) {
	nc := GetNeo4jConnection(0)

	session, err := nc.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, fmt.Errorf("failed to open session: %v", err)
	}
	defer session.Close()

	query := `
		MATCH (t:Term {term: $term})-[:DURING]-(co:Course {courseCode: $courseCode})
		MATCH (co)-[:OFFERING_OF]-(s:Section)
		RETURN s
	`
	println(query)

	params := map[string]interface{}{
		"term":       registrationTerm,
		"courseCode": registrationTerm + " " + relatedOffering,
	}

	result, err := session.Run(query, params)
	if err != nil {
		return nil, fmt.Errorf("failed to execute Cypher query: %v", err)
	}

	var sections []SectionsByCourseCode
	for result.Next() {
		record := result.Record()
		if node, ok := record.Get("s"); ok {
			props := node.(neo4j.Node).Props()
			section := SectionsByCourseCode{
				SectionCode: props["sectionCode"].(string),
			}

			lectures, err := GetLecturesBySectionCode(props["sectionCode"].(string))
			if err != nil {
				return nil, fmt.Errorf("failed to get lectures by section code: %v", err)
			}
			section.Lectures = lectures

			tutorials, err := GetTutorialsBySectionCode(props["sectionCode"].(string))
			if err != nil {
				return nil, fmt.Errorf("failed to get tutorials by section code: %v", err)
			}
			section.Tutorials = tutorials

			sections = append(sections, section)
		}
	}

	if err = result.Err(); err != nil {
		return nil, fmt.Errorf("error in result iteration: %v", err)
	}

	nc.Close()
	return sections, nil
}

func GetByCourseCode(registrationTerm string, relatedOffering string) ([]CourseDetails, error) {
	nc := GetNeo4jConnection(0)

	session, err := nc.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return nil, fmt.Errorf("failed to open session: %v", err)
	}
	defer session.Close()

	query := `
		MATCH (t:Term {term: $term})-[:DURING]-(co:Course {courseCode: $courseCode})
		MATCH (co)-[:OFFERING_OF]-(s:Section)
		MATCH (c:CourseDetails)-[:LECTURE_IN|TUTORIAL_IN]-(s)
		RETURN c
	`
	params := map[string]interface{}{
		"term":       registrationTerm,
		"courseCode": registrationTerm + " " + relatedOffering,
	}

	result, err := session.Run(query, params)
	if err != nil {
		return nil, fmt.Errorf("failed to execute Cypher query: %v", err)
	}

	var courses []CourseDetails
	for result.Next() {
		record := result.Record()
		if node, ok := record.Get("c"); ok {
			props := node.(neo4j.Node).Props()
			course := CourseDetails{
				RegistrationTerm:   props["registrationTerm"].(string),
				CRN:                props["CRN"].(string),
				SubjectCode:        props["subjectCode"].(string),
				LongTitle:          props["longTitle"].(string),
				ShortTitle:         props["shortTitle"].(string),
				CourseDescription:  props["courseDescription"].(string),
				CourseCreditValue:  props["courseCreditValue"].(float64),
				ScheduleType:       props["scheduleType"].(string),
				RegistrationStatus: props["registrationStatus"].(string),
				GlobalID:           props["globalID"].(string),
				RelatedOffering:    props["relatedOffering"].(string),
				SectionKey:         props["sectionKey"].(string),
			}
			courses = append(courses, course)
		}
	}

	if err = result.Err(); err != nil {
		return nil, fmt.Errorf("error in result iteration: %v", err)
	}

	nc.Close()
	return courses, nil
}
