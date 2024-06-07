import requests
from bs4 import BeautifulSoup
import json
import os
import threading
from queue import Queue
import time

BASE_URL = "https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT"
POST_URL = "https://central.carleton.ca/prod/bwysched.p_course_search"


class CourseScraper:
    def __init__(self):
        self.session_code = self.get_session_code()
        self.terms = self.get_terms()
        self.thread_count = 2
        self.queue = Queue()

    def get_session_code(self):
        response = requests.get(BASE_URL)
        soup = BeautifulSoup(response.text, "html.parser")
        session_code = soup.find("input", {"name": "session_id"}).get("value")
        return session_code

    def get_terms(self):
        response = requests.get(BASE_URL)
        soup = BeautifulSoup(response.text, "html.parser")
        options = soup.select("select[name='term_code'] option")
        terms = [
            {"term_code": option.get("value"), "term_name": option.text}
            for option in options
        ]
        return terms

    def get_subjects(self, term):
        subjects = []
        data = {"wsea_code": "EXT", "session_id": self.session_code, "term_code": term}
        response = requests.post(
            "https://central.carleton.ca/prod/bwysched.p_search_fields", data=data
        )
        soup = BeautifulSoup(response.text, "html.parser")
        options = soup.select("select[name='sel_subj'] option")
        subjects = [option.get("value") for option in options if option.get("value")]
        return subjects

    def setup_form_data(self, term, subject):
        data = {
            "wsea_code": "EXT",
            "term_code": term,
            "session_id": self.session_code,
            "sel_subj": subject,
            "sel_special": "N",
            "sel_begin_hh": "0",
            "sel_begin_mi": "0",
            "sel_begin_am_pm": "a",
            "sel_end_hh": "0",
            "sel_end_mi": "0",
            "sel_end_am_pm": "a",
        }
        days = ["m", "t", "w", "r", "f", "s", "u"]
        for day in days:
            data[f"sel_day_{day}"] = day
        dummy_fields = [
            "sel_aud",
            "sel_subj",
            "sel_camp",
            "sel_sess",
            "sel_attr",
            "sel_levl",
            "sel_schd",
            "sel_insm",
            "sel_link",
            "sel_wait",
            "sel_day",
            "sel_begin_hh",
            "sel_begin_mi",
            "sel_begin_am_pm",
            "sel_end_hh",
            "sel_end_mi",
            "sel_end_am_pm",
            "sel_instruct",
            "sel_special",
            "sel_resd",
            "sel_breadth",
        ]
        for field in dummy_fields:
            data[field] = "dummy"
        blank_fields = [
            "ws_numb",
            "sel_number",
            "sel_crn",
            "sel_sess",
            "sel_schd",
            "sel_instruct",
            "block_button",
        ]
        for field in blank_fields:
            data[field] = ""
        return data

    def get_crns_for_subject(self, term, subject):
        data = self.setup_form_data(term, subject)
        response = requests.post(POST_URL, data=data)
        soup = BeautifulSoup(response.text, "html.parser")
        crns = set()
        for a in soup.select("td[style='word-wrap: break-word'] a"):
            href = a.get("href")
            crn = href.split("=")[-1]
            crns.add(crn)
        return list(crns)

    def get_course_details_for_crn(self, term, crn):
        course_url = f"https://central.carleton.ca/prod/bwysched.p_display_course?wsea_code=EXT&term_code={term}&disp={self.session_code}&crn={crn}"
        response = requests.get(course_url)
        soup = BeautifulSoup(response.text, "html.parser")

        course_details = {}
        tables = soup.find_all("table")

        for table in tables:
            if "Registration Term:" in table.text:
                course_details["RegistrationTerm"] = self.find_td(
                    table, "Registration Term:"
                )
                course_details["CRN"] = self.find_td(table, "CRN:")
                course_details["SubjectCode"] = self.find_td(table, "Subject:")
                course_details["LongTitle"] = self.find_td(table, "Long Title:")
                course_details["ShortTitle"] = self.find_td(table, "Title:")
                course_details["CourseDescription"] = self.find_td(
                    table, "Course Description:"
                )
                course_details["CourseCreditValue"] = float(
                    self.find_td(table, "Course Credit Value:")
                    .replace("\n", "0")
                    .strip()
                )
                course_details["ScheduleType"] = self.find_td(table, "Schedule Type:")
                course_details["RegistrationStatus"] = self.find_td(table, "Status:")
                suitability = (
                    "SUITABLE FOR ONLINE STUDENTS"
                    if "NOT SUITABLE FOR ONLINE STUDENTS" not in table.text
                    else "NOT SUITABLE FOR ONLINE STUDENTS"
                )
                course_details["SectionInformation"] = {
                    "SectionType": self.find_td(table, "Section Information:"),
                    "Suitability": suitability,
                }
                course_details["MeetingDetails"] = self.get_meeting_details(table)
                course_details["GlobalID"] = self.text_to_term_char_code(
                    self.find_td(table, "Registration Term:")
                ) + self.find_td(table, "CRN:")
                course_details["RelatedOffering"] = self.remove_section_code(
                    self.find_td(table, "Subject:")
                )
                course_details["SectionKey"] = self.get_section_key(
                    self.find_td(table, "Subject:")
                )

                break
        return course_details

    def find_td(self, table, search):
        td = table.find("td", text=lambda text: text and search in text)
        if not td:
            return ""
        return td.find_next_sibling("td").text.strip()

    def text_to_term_char_code(self, text):
        if "Winter" in text:
            return "W"
        elif "Summer" in text:
            return "S"
        else:
            return "F"

    def remove_section_code(self, text):
        split = text.split()
        if len(split) < 2:
            return ""
        return " ".join(split[:2])

    def get_section_key(self, text):
        split = text.split()
        if len(split) < 3:
            return "$"
        return split[2][0]

    def get_meeting_details(self, table):
        meeting_details = []
        for td in table.select("td.default"):
            tr = td.find_parent("tr")
            tds = tr.find_all("td")
            meeting_date = tds[0].text.strip()
            days = tds[1].text.strip().split()
            time = tds[2].text.strip()
            schedule_type = tds[3].text.strip()
            instructor = tds[4].text.strip()
            meeting_details.append(
                {
                    "MeetingDate": meeting_date,
                    "Days": days,
                    "Time": time,
                    "ScheduleType": schedule_type,
                    "Instructor": instructor,
                }
            )
        return meeting_details

    def submit_course_details(self, course):
        backend_url = "http://127.0.0.1:3969/add-course-details/"
        worker_key = os.getenv("WORKER_KEY")
        request_body = {
            "course_details": course,
            "worker_key": worker_key,
        }
        response = requests.post(backend_url, json=request_body)
        if response.status_code != 200:
            print(f"Failed to post course details: {response.status_code}")

    def worker(self):
        while not self.queue.empty():
            term, subject, crn = self.queue.get()
            print(
                f"Getting course details for term {term}, subject {subject}, CRN {crn}"
            )
            course_details = self.get_course_details_for_crn(term, crn)
            self.submit_course_details(course_details)
            self.queue.task_done()

    def run(self):
        start_time = time.time()

        for term in self.terms:
            print(f"Getting subjects for term {term['term_name']}")
            subjects = self.get_subjects(term["term_code"])
            for subject in subjects:
                print(f"Getting CRNs for term {term['term_name']}, subject {subject}")
                crns = self.get_crns_for_subject(term["term_code"], subject)
                for crn in crns:
                    self.queue.put((term["term_code"], subject, crn))

        threads = []
        for _ in range(self.thread_count):
            thread = threading.Thread(target=self.worker)
            thread.start()
            threads.append(thread)

        self.queue.join()
        for thread in threads:
            thread.join()

        end_time = time.time()
        print(f"Time taken: {end_time - start_time}")


if __name__ == "__main__":
    scraper = CourseScraper()
    scraper.run()
