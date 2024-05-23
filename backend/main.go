package main

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/joho/godotenv/autoload"
)

func livenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

type postCourseDetailsRequest struct {
	CourseDetails CourseDetails `json:"course_details"`
	WorkerKey     string        `json:"worker_key"`
}

// postCourseDetails function will use the redis client and our addCourseDetails function to add the course details
// it takes a JSON request body and returns a JSON response
func postCourseDetails(c *gin.Context) {
	var requestBody postCourseDetailsRequest

	err := c.BindJSON(&requestBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// print request body
	requestBodyBytes, _ := json.Marshal(requestBody)
	println(string(requestBodyBytes))

	workerKey := requestBody.WorkerKey
	if workerKey != os.Getenv("WORKER_KEY") {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid worker key",
		})
		return
	}

	courseDetails := requestBody.CourseDetails

	insertErr := InsertCourseDetails(courseDetails)

	if insertErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": insertErr.Error(),
		})

		panic(insertErr)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Course details added successfully",
	})
}

func getByCourseCode(c *gin.Context) {
	// get the term and course code from the URL
	term := c.Param("term")
	courseCode := c.Param("course_code")

	// get the course details from the Neo4j database
	courseDetails, err := GetByCourseCode(term, courseCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})

		panic(err)
	}

	c.JSON(http.StatusOK, gin.H{
		"course_details": courseDetails,
	})

}

func getSectionsByCourseCode(c *gin.Context) {
	// get the term and course code from the URL
	term := c.Param("term")
	courseCode := c.Param("course_code")

	// get the course details from the Neo4j database
	sections, err := GetSectionsByCourseCode(term, courseCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})

		panic(err)
	}

	c.JSON(http.StatusOK, gin.H{
		"sections": sections,
	})

}

func queryCourses(c *gin.Context) {
	// get the term and course code from the URL
	query := c.Param("query")
	term := c.Param("term")

	courses, err := QueryCourses(query, term)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
	})

}

func main() {

	// load dotenv file
	err := godotenv.Load("../.env")
	if err != nil {
		println("Error loading .env file")
	}

	router := gin.Default()

	// Allow all origins
	router.Use(cors.Default())

	router.GET("/healthz", livenessCheck)
	router.POST("/add-course-details", postCourseDetails)
	router.GET("/get-by-course-code/:term/:course_code", getByCourseCode)
	router.GET("/get-sections-by-course-code/:term/:course_code", getSectionsByCourseCode)
	router.GET("/query-courses/:query/:term", queryCourses)

	initNeo4jConnection()
	err = InitCoursesIndex()
	if err != nil {
		panic(err)
	}

	router.Run(":3969")
}
