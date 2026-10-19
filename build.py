"""Build index.html from template.html and the data files.

data/parties.json   - the published parties (section 1 only), as scraped from the Party Registrar.
                      The full scrape is kept locally in data/registry-full.json and not published.
data/polling.json   - party numbers that belong to a list polling >= 4 seats
data/contacts.json  - optional extra privacy contacts found on party websites
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / "data"
SCRAPED_DATE = "19.10.2026"
CHECKED_DATE = "19.10.2026"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


def load(name, default=None):
    path = DATA / name
    if not path.exists() and default is not None:
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def build_parties(parties, polling, contacts):
    by_number = {p["number"]: p for p in parties}
    unknown = [x["number"] for x in polling + contacts if x["number"] not in by_number]
    if unknown:
        sys.exit(f"Unknown party numbers in polling/contacts: {unknown}")

    likely = {x["number"]: x for x in polling}
    extra = {x["number"]: x for x in contacts}
    result = []
    for p in parties:
        emails = []
        if p["email"]:
            if EMAIL_RE.match(p["email"]):
                emails.append(p["email"])
            else:
                print(f"skipping invalid registry email for {p['name']}: {p['email']}", file=sys.stderr)
        contact = extra.get(p["number"], {})
        privacy_email = contact.get("privacy_email")
        if privacy_email and privacy_email.lower() not in (e.lower() for e in emails):
            emails.append(privacy_email)
        result.append({
            "name": p["name"],
            "number": p["number"],
            "address": p["address"],
            "emails": emails,
            "note_key": contact.get("note_key", "noteSite") if privacy_email else None,
            "likely": p["number"] in likely,
            "list": likely.get(p["number"], {}).get("list"),
        })
    return result


def check_i18n(i18n, list_order):
    """Every language must have every UI string, letter line and list name that Hebrew has."""
    problems = []
    for lang in i18n["languages"]:
        missing_ui = set(i18n["ui"]["he"]) - set(i18n["ui"].get(lang, {}))
        missing_letter = set(i18n["letter"]["he"]) - {"subject"} - set(i18n["letter"].get(lang, {}))
        missing_lists = [] if lang == "he" else set(list_order) - set(i18n["lists"].get(lang, {}))
        for kind, keys in (("ui", missing_ui), ("letter", missing_letter), ("lists", missing_lists)):
            if keys:
                problems.append(f"{lang} {kind} missing: {sorted(keys)}")
    if problems:
        sys.exit("i18n.json is incomplete:\n" + "\n".join(problems))


def main():
    parties = load("parties.json")
    polling_file = load("polling.json")
    polling = polling_file["likely"]
    list_order = polling_file["list_order"]
    if sorted(list_order) != sorted({x["list"] for x in polling}):
        sys.exit("list_order in polling.json must name every list exactly once")
    contacts = load("contacts.json", default=[])
    i18n = load("i18n.json")
    check_i18n(i18n, list_order)
    data = {"parties": build_parties(parties, polling, contacts), "list_order": list_order, "i18n": i18n}
    # Escape "</" so party text can never close the embedding <script> tag.
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    validate_js = (ROOT / "src" / "validate.js").read_text(encoding="utf-8")
    html = (ROOT / "template.html").read_text(encoding="utf-8")
    html = (html.replace("{{DATA}}", payload)
                .replace("{{VALIDATE_JS}}", validate_js)
                .replace("{{SCRAPED_DATE}}", SCRAPED_DATE)
                .replace("{{CHECKED_DATE}}", CHECKED_DATE))
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    with_mail = sum(1 for p in data["parties"] if p["emails"])
    print(f"wrote index.html: {len(data['parties'])} parties, {with_mail} with email, "
          f"{sum(p['likely'] for p in data['parties'])} likely")


if __name__ == "__main__":
    main()
