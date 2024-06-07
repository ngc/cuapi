# tasks.py
import json
from celery import shared_task, chain, group, chord
from celery.result import allow_join_result
import requests
from bs4 import BeautifulSoup
from django.conf import settings

if __name__ != "__main__":
    from .models import CourseDetails

CARLETON_BASE_URL = (
    "https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT"
)
CARLETON_POST_URL = "https://central.carleton.ca/prod/bwysched.p_course_search"


@shared_task
def get_session_code():
    response = requests.get(CARLETON_BASE_URL)
    soup = BeautifulSoup(response.text, "html.parser")
    session_code = soup.find("input", {"name": "session_id"}).get("value")

    return session_code


@shared_task
def get_terms(session_code):
    response = requests.get(CARLETON_BASE_URL)
    soup = BeautifulSoup(response.text, "html.parser")
    options = soup.select("select[name='term_code'] option")
    terms = [
        {"term_code": option.get("value"), "term_name": option.text}
        for option in options
    ]

    terms = [term["term_code"] for term in terms]

    return session_code, terms


@shared_task
def get_subjects(session_code_term):
    session_code, term = session_code_term
    data = {"wsea_code": "EXT", "session_id": session_code, "term_code": term}
    response = requests.post(
        "https://central.carleton.ca/prod/bwysched.p_search_fields", data=data
    )
    soup = BeautifulSoup(response.text, "html.parser")
    options = soup.select("select[name='sel_subj'] option")
    subjects = [option.get("value") for option in options if option.get("value")]
    return session_code, term, subjects


class FormData:
    def __init__(self) -> None:
        self.data = {}

    def add(self, key, value):
        # check if key exists
        if key in self.data:
            # if key exists, create a list of values
            if isinstance(self.data[key], list):
                self.data[key].append(value)
            else:
                self.data[key] = [self.data[key], value]
        else:
            self.data[key] = value

    def get(self):
        return self.data


def setup_form_data(term, subject, session_code):
    data = FormData()
    data.add("wsea_code", "EXT")
    data.add("term_code", term)
    data.add("session_id", session_code)
    data.add("sel_subj", subject)
    data.add("sel_special", "N")
    data.add("sel_begin_hh", "0")
    data.add("sel_begin_mi", "0")
    data.add("sel_begin_am_pm", "a")
    data.add("sel_end_hh", "0")
    data.add("sel_end_mi", "0")
    data.add("sel_end_am_pm", "a")
    days = ["m", "t", "w", "r", "f", "s", "u"]
    for day in days:
        data.add(f"sel_day", day)
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
        data.add(field, "dummy")
    blank_fields = [
        "ws_numb",
        "sel_number",
        "sel_crn",
        "sel_sess",
        "sel_schd",
        "sel_instruct",
        "block_button",
        "sel_levl",
    ]
    for field in blank_fields:
        data.add(field, "")
    return data.get()


@shared_task
def get_crns_for_a_subject(session_code_term_subject):
    session_code, term, subject = session_code_term_subject
    session_code = get_session_code()
    crns = []
    data = setup_form_data(term, subject, session_code)
    response = requests.post(CARLETON_POST_URL, data=data)
    soup = BeautifulSoup(response.text, "html.parser")

    print(soup.prettify())

    for a in soup.select("td[style='word-wrap: break-word'] a"):
        href = a.get("href")
        crn = href.split("=")[-1]
        crns.append(crn)
    return session_code, term, subject, crns, soup.prettify()


@shared_task
def create_course_details_for_crn(session_code_term_subject_crn):
    session_code, term, subject, crn = session_code_term_subject_crn
    course_url = f"https://central.carleton.ca/prod/bwysched.p_display_course?wsea_code=EXT&term_code={term}&disp={session_code}&crn={crn}"
    response = requests.get(course_url)
    soup = BeautifulSoup(response.text, "html.parser")

    details = {}
    tables = soup.find_all("table")

    def find_td(table, search):
        td = table.find("td", text=lambda text: text and search in text)
        if not td:
            return ""
        return td.find_next_sibling("td").text.strip()

    def text_to_term_char_code(text):
        if "Winter" in text:
            return "W"
        elif "Summer" in text:
            return "S"
        else:
            return "F"

    def remove_section_code(text):
        split = text.split()
        if len(split) < 2:
            return ""
        return " ".join(split[:2])

    def get_section_key(text):
        split = text.split()
        if len(split) < 3:
            return "$"
        return split[2][0]

    def get_or_undefined(tds, index):
        try:
            return tds[index].text.strip()
        except IndexError:
            return ""

    def get_meeting_details(table):
        meeting_details = []
        for td in table.select("td.default"):
            tr = td.find_parent("tr")
            tds = tr.find_all("td")
            meeting_date = get_or_undefined(tds, 0)
            days = get_or_undefined(tds, 1)
            time = get_or_undefined(tds, 2)
            schedule_type = get_or_undefined(tds, 3)
            instructor = get_or_undefined(tds, 4)

            days_list = days.split(" ") if days else []

            meeting_details.append(
                {
                    "meeting_date": meeting_date,
                    "days": days_list,
                    "time": time,
                    "schedule_type": schedule_type,
                    "instructor": instructor,
                }
            )
        return meeting_details

    for table in tables:
        if "Registration Term:" in table.text:
            details["registration_term"] = text_to_term_char_code(
                find_td(table, "Registration Term:")
            )
            details["crn"] = find_td(table, "CRN:")
            details["subject_code"] = find_td(table, "Subject:")
            details["long_title"] = find_td(table, "Long Title:")
            details["short_title"] = find_td(table, "Short Title:")
            details["course_description"] = find_td(table, "Course Description:")
            details["course_credit_value"] = float(
                find_td(table, "Course Credit Value:").replace("\n", "0").strip()
            )
            details["schedule_type"] = find_td(table, "Schedule Type:")
            details["registration_status"] = find_td(table, "Status:")
            suitability = (
                "SUITABLE FOR ONLINE STUDENTS"
                if "NOT SUITABLE FOR ONLINE STUDENTS" not in table.text
                else "NOT SUITABLE FOR ONLINE STUDENTS"
            )
            details["section_information"] = {
                "section_type": find_td(table, "Section Information:"),
                "suitability": suitability,
            }
            details["meeting_details"] = get_meeting_details(table)
            details["global_id"] = text_to_term_char_code(
                find_td(table, "Registration Term:")
            ) + find_td(table, "CRN:")
            details["related_offering"] = remove_section_code(
                find_td(table, "Subject:")
            )
            details["section_key"] = get_section_key(find_td(table, "Subject:"))

            break

        # check if course already exists
    if not CourseDetails.objects.filter(
        crn=details["crn"], registration_term=details["registration_term"]
    ).exists():
        CourseDetails.objects.create(**details)
    else:
        # update the course details
        CourseDetails.objects.filter(
            crn=details["crn"], registration_term=details["registration_term"]
        ).update(**details)


def main():
    session_code = get_session_code()
    term = "202420"
    subject = "STAT"

    crns = get_crns_for_a_subject((session_code, term, subject))
    print(crns)


if __name__ == "__main__":
    main()


@shared_task
def create_all_course_details(session_code_term_subject_crns):
    session_code, term, subject, crns, _ = session_code_term_subject_crns
    crn_chains = [
        create_course_details_for_crn.s((session_code, term, subject, crn))
        for crn in crns
    ]
    group(crn_chains)()


@shared_task
def get_crns_for_every_subject(session_code_term_subjects):
    session_code, term, subjects = session_code_term_subjects
    crn_chains = [
        chain(
            get_crns_for_a_subject.s((session_code, term, subject)),
            create_all_course_details.s(),
        )
        for subject in subjects
    ]
    group(crn_chains)()


# Create a chain for each term to get subjects, CRNs, and course details
def create_term_chain(session_code, term):
    return chain(
        get_subjects.s((session_code, term)),  # Get subjects for the term
        get_crns_for_every_subject.s(),  # Get CRNs for each subject
    )


# Define a callback to handle the session code and terms
@shared_task
def handle_session_code_and_terms(session_code_terms):
    session_code, terms = session_code_terms
    term_chains = [create_term_chain(session_code, term) for term in terms]
    group(term_chains)()


@shared_task
def scrape_carleton_courses():
    # Define the initial chain to get session code and terms
    session_code_chain = chain(
        get_session_code.s(),  # Get the session code
        get_terms.s(),  # Get the terms
    )

    # Chain the session code chain with the handle_session_code_and_terms task
    full_chain = session_code_chain | handle_session_code_and_terms.s()
    full_chain.apply_async()
