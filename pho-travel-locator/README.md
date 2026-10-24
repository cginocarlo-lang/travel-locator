# PHO Travel Locator (Vercel + Google Sheets)

Static frontend in `public/`, serverless API in `api/`, Google Sheets as the database.

```
pho-travel-locator/
├── api/
│   ├── _sheets.js     # Sheets client + employee lookup (shared)
│   ├── lookup.js      # GET  /api/lookup?id=...
│   └── submit.js      # POST /api/submit
├── public/
│   └── index.html
├── package.json
├── .env.example
└── .gitignore
```

## 1. Google Cloud setup (one time)

1. Go to https://console.cloud.google.com and create (or pick) a project.
2. **APIs & Services → Library →** enable **Google Sheets API**.
3. **IAM & Admin → Service Accounts → Create service account** (any name, e.g. `pho-travel-locator`). No roles needed.
4. Open the service account → **Keys → Add key → Create new key → JSON**. A file downloads.
   From it you need `client_email` and `private_key`.
5. Open your spreadsheet → **Share** → paste the `client_email` → give it **Editor** access.

## 2. Spreadsheet layout

**Employees** (row 1 = headers)

| A: Employee ID | B: Full Name | C: Designation |
|---|---|---|

**Log** (row 1 = headers). Note the new Employee ID column compared with the old Apps Script version:

| A: Timestamp | B: Employee ID | C: Full Name | D: Designation | E: Activity | F: Venue | G: Start of Travel | H: End of Travel |
|---|---|---|---|---|---|---|---|

If you already have data in Log, insert a new column B (Employee ID) first.

Dates and the timestamp are written as real date serial numbers. Format once:
- Column A: **Format → Number → Date time**
- Columns G and H: **Format → Number → Date**

Format the whole column so new rows inherit it.

The tab names `Employees` and `Log` must match exactly.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo (`.env` is git-ignored, never commit the key).
2. In Vercel: **Add New → Project →** import the repo. No build settings needed.
3. **Settings → Environment Variables**, add for Production (and Preview if you like):
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (paste the whole key including BEGIN/END lines)
   - `SHEET_ID` (from the spreadsheet URL)
4. Deploy. Redeploy after any env var change.

## Local testing

```bash
npm i -g vercel
npm install
cp .env.example .env.local   # fill in values
vercel dev
```

## Notes

- Submissions use `valueInputOption: 'RAW'`, so text such as `=HYPERLINK(...)` is stored as plain text, never evaluated.
- The server re-checks the employee ID, lengths and date order on submit. The browser values are not trusted.
- `values.append` is atomic, so no lock is needed for concurrent users.
- Anyone with the site URL can query employee IDs (same as the old app). To restrict it, put the site behind Vercel Authentication or add a shared access code check in `api/`.
