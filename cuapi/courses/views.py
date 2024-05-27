from django.shortcuts import render

"""
Simple REST API for courses, no rest framework or authentication required.
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import CourseDetails



# func main() {

# 	// load dotenv file
# 	err := godotenv.Load("../.env")
# 	if err != nil {
# 		println("Error loading .env file")
# 	}

# 	router := gin.Default()

# 	// Allow all origins
# 	router.Use(cors.Default())

# 	router.GET("/healthz", livenessCheck)
# 	router.POST("/add-course-details", postCourseDetails)
# 	router.GET("/get-by-course-code/:term/:course_code", getByCourseCode)
# 	router.GET("/get-sections-by-course-code/:term/:course_code", getSectionsByCourseCode)
# 	router.GET("/query-courses/:query/:term", queryCourses)

# 	err = InitCoursesIndex()
# 	if err != nil {
# 		panic(err)
# 	}

# 	router.Run(":3969")
# }

@csrf_exempt
def healthz(request):
    return JsonResponse({'status': 'ok'})

def query_courses(request, query, term):
    # this needs to be a full text search query
    
