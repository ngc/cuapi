import os
import sys
import time
import random
import json
from selenium import webdriver
from bs4 import BeautifulSoup
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from src.models import CourseDetails, MeetingDetails, SectionInformation
import requests

URL = "https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT"


def get_subjects(subjects_list_html: str):
    # Parsing the HTML
    soup = BeautifulSoup(subjects_list_html, "html.parser")

    # Extracting option values and texts
    courses = {
        option["value"]: option.get_text().split("(")[0].strip()
        for option in soup.find_all("option")
        if option["value"]
    }

    return courses


class CourseScraper:
    def __init__(self):
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        self.driver = webdriver.Chrome(
            options=options, service=Service(ChromeDriverManager().install())
        )

        self.driver.get(URL)
        print("initialized scraper")

    def get_course_data(self, course_url: str) -> CourseDetails:
        self.driver.get(course_url)
        html = self.driver.page_source
        soup = BeautifulSoup(html, "html.parser")

        def find_next_or_none(search_term: str):
            element = soup.find(text=search_term)
            if element is None:
                return None

            if element.find_next() is None:
                return None
            return element.find_next().get_text(strip=True)

        # Extracting data
        registration_term = find_next_or_none("Registration Term:")
        CRN = find_next_or_none("CRN:")
        subject_code = find_next_or_none("Subject Code:") or find_next_or_none(
            "Subject:"
        )
        long_title = find_next_or_none("Long Title:")
        short_title = find_next_or_none("Short Title:")
        course_description = find_next_or_none("Course Description:")
        course_credit_value = float(find_next_or_none("Credit Value:") or 0.0)
        schedule_type = find_next_or_none("Schedule Type:")
        session_info = find_next_or_none("Session Information:")
        registration_status = find_next_or_none("Registration Status:")
        if registration_status is None:
            registration_status = "OPEN"

        # Extracting section information
        suitability = soup.find(text="NOT SUITABLE FOR ONLINE STUDENTS")
        if suitability:
            suitability = suitability.get_text(strip=True)
        else:
            suitability = "SUITABLE FOR ONLINE STUDENTS"

        section_info = SectionInformation(
            find_next_or_none("Section Information:") or "N/A",
            suitability=suitability,
        )

        # Extracting meeting details
        has_no_meeting_table = (
            soup.find(text="Meeting Date") is None
            or soup.find(text="Meeting Date").find_parent("table") is None
        )
        meeting_details = []

        if not has_no_meeting_table:
            meeting_table = soup.find(text="Meeting Date").find_parent("table")
            meeting_rows = meeting_table.find_all("tr")[1:]  # Skip header row
            for row in meeting_rows:
                cols = row.find_all("td")
                meeting_date = cols[0].get_text(strip=True)
                days = cols[1].get_text(strip=True).split(" ")
                meeting_time = cols[2].get_text(strip=True)
                schedule = cols[3].get_text(strip=True)
                instructor = None
                if len(cols) > 4:
                    instructor = cols[4].get_text(strip=True)
                meeting_details.append(
                    MeetingDetails(
                        meeting_date, days, meeting_time, schedule, instructor
                    )
                )

        return CourseDetails(
            registration_term,
            CRN,
            subject_code,
            long_title,
            short_title,
            course_description,
            course_credit_value,
            schedule_type,
            session_info,
            registration_status,
            section_info,
            meeting_details=meeting_details,
        )

    def select_term(self, term: str):
        # there is a select element with name="term_code"
        # there is an option element with the value of term
        # click the option element

        term_select = self.driver.find_element(By.XPATH, "//select[@name='term_code']")
        term_options = term_select.find_elements(By.TAG_NAME, "option")
        for term_option in term_options:
            if term_option.get_attribute("value") == term:
                term_option.click()
                self.driver.implicitly_wait(100)
                return

        raise Exception(f"Term {term} not found")

    def search_by_subject(self, subject: str, term: str) -> [CourseDetails]:
        self.driver.get(URL)

        self.select_term(term)

        self.driver.find_element(
            By.XPATH, "//input[@value='Proceed to Search']"
        ).click()

        subject_option = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//option[@value='{subject}']"))
        )

        # scroll inside sel_subj till subject_option is visible
        self.driver.execute_script("arguments[0].scrollIntoView();", subject_option)
        # wait for 1 second
        time.sleep(1)

        sel_subj = self.driver.find_element(By.XPATH, "//select[@name='sel_subj']")
        # focus on sel_subj
        self.driver.execute_script("arguments[0].focus();", sel_subj)

        all_subjects_option = self.driver.find_element(
            By.XPATH, "//option[text()='All Subjects']"
        )

        # click all_subjects_option then press down arrow until subject_option has attribute selected and all_subjects_option does not
        all_subjects_option.click()
        while not subject_option.get_attribute(
            "selected"
        ) or all_subjects_option.get_attribute("selected"):
            sel_subj.send_keys("\ue015")

        # find an input with the title="Search for courses based on my criteria"
        # click it
        self.driver.find_element(
            By.XPATH,
            "//input[@title='Search for courses based on my criteria']",
        ).click()
        self.driver.implicitly_wait(100)

        # now i want a list of links on the entire page that contain the text "&crn=[number]"
        crn_elements = self.driver.find_elements(
            By.XPATH, "//a[contains(@href, '&crn=')]"
        )
        # now get the value of the href attribute of each of these elements
        crn_set = set()
        for crn_element in crn_elements:
            crn_link = crn_element.get_attribute("href")
            crn_set.add(crn_link)

        crn_links = list(crn_set)

        courses = []

        for course in crn_links:
            try:
                courses.append(self.get_course_data(course))
            except Exception as e:
                print(f"Error scraping {course}: {e}")

        return courses

    def get_subjects(self):
        self.driver.get(URL)

        self.driver.find_element(
            By.XPATH, "//input[@value='Proceed to Search']"
        ).click()

        self.driver.implicitly_wait(100)

        # ump the html into a string called subjects_list_html
        subjects_list_html = self.driver.find_element(
            By.XPATH, "//select[@name='sel_subj']"
        ).get_attribute("innerHTML")
        subjects = get_subjects(subjects_list_html)

        return subjects

    def get_terms(self):
        self.driver.get(URL)
        terms = []
        term_select = self.driver.find_element(By.XPATH, "//select[@name='term_code']")
        term_options = term_select.find_elements(By.TAG_NAME, "option")
        for term_option in term_options:
            terms.append(term_option.get_attribute("value"))

        return terms

    def scrape(self):
        terms = self.get_terms()
        subjects = self.get_subjects()

        for term in terms:
            term_courses = []
            for subject in subjects:
                print(f"Scraping {subject} for term {term}")
                term_courses += self.search_by_subject(subject, term)


def main():
    scraper = CourseScraper()
    terms = scraper.get_terms()
    subjects = scraper.get_subjects()
    term = terms[0]
    subject = "COMP"
    courses = scraper.search_by_subject(subject, term)
    print(courses)
    with open("courses.json", "w") as f:
        json.dump(courses, f, indent=4)
        f.close()


def scrape_specific_course():
    debug_scraper = CourseScraper()
    print(
        debug_scraper.get_course_data(
            "https://central.carleton.ca/prod/bwysched.p_display_course?wsea_code=EXT&term_code=202330&disp=20546965&crn=35943"
        )
    )


if __name__ == "__main__":
    scrape_specific_course()
