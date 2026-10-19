# party-spam

A static page that helps Israeli voters demand deletion of their personal data from party databases
(section 17ו of the Privacy Protection Law). It generates one email per electoral list and opens it in your own mail client.
Nothing you type leaves your browser.

Live: https://nadavbh12.github.io/party-spam/

## Data

- `data/parties.json` - registered parties behind lists that polled at least 4 seats in at least one 2026 poll,
  from the [Party Registrar](https://www.gov.il/he/departments/dynamiccollectors/parties-db) (scraped 19.10.2026).
- `data/polling.json` - which registered parties make up each list.
- `data/contacts.json` - privacy contacts found on the parties' own websites, with the source page.

## Build

```
python3 build.py
```

This writes `index.html` from `template.html` and the data files. Commit both.

Not legal advice.
