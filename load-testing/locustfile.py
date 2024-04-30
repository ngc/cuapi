from dotenv import load_dotenv
import os
import locust

load_dotenv()


class User(locust.HttpUser):
    wait_time = locust.between(1, 2)
    host = "http://" + os.getenv("BACKEND_URL")

    @locust.task
    def search_for_course(self):
        self.client.get("/course-code/F/comp/1")
