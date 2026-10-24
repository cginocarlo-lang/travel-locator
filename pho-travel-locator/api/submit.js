import { findEmployee, sheetsClient } from './_sheets.js';

const MAX_LEN = 45;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

// Stops text from being evaluated as a formula (the leading ' is not stored in the cell)
function safeText(v) {
  const s = String(v ?? '').trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Current Philippine time as "yyyy-mm-dd hh:mm:ss"
function nowManila() {
  return new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}

// Google Sheets serial number for a yyyy-mm-dd string (no timezone drift).
function dateToSerial(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const utc = Date.UTC(y, mo - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return Math.round(utc / 86400000) + 25569;
}

// Current date-time as a serial number in Philippine time (UTC+8).
function nowSerialManila() {
  return (Date.now() + MANILA_OFFSET_MS) / 86400000 + 25569;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const employeeId = String(body.employeeId || '').trim();
    const activity = String(body.activity || '').trim();
    const venue = String(body.venue || '').trim();

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }
    if (!activity || activity.length > MAX_LEN) {
      return res.status(400).json({ success: false, message: `Name of Activity must be between 1 and ${MAX_LEN} characters.` });
    }
    if (!venue || venue.length > MAX_LEN) {
      return res.status(400).json({ success: false, message: `Venue/Destination must be between 1 and ${MAX_LEN} characters.` });
    }

    const start = dateToSerial(body.startTravel);
    const end = dateToSerial(body.endTravel);
    if (start === null || end === null) {
      return res.status(400).json({ success: false, message: 'Please provide valid travel dates.' });
    }
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End of Travel cannot be earlier than Start of Travel.' });
    }

    // Re-verify on the server; never trust the name/designation sent by the browser
    const employee = await findEmployee(employeeId);
    if (!employee.success) {
      return res.status(400).json({ success: false, message: 'Employee ID could not be verified. Please re-enter it and try again.' });
    }

    // RAW stores values exactly as given, so text like "=HYPERLINK(...)" is never evaluated as a formula.
await sheetsClient().spreadsheets.values.append({
  spreadsheetId: process.env.SHEET_ID,
  range: 'Log!A:H',
  valueInputOption: 'USER_ENTERED',
  insertDataOption: 'INSERT_ROWS',
  requestBody: {
    values: [[
      nowManila(),
      "'" + employee.employeeId,        // keeps IDs as text, so leading zeros survive
      safeText(employee.fullName),
      safeText(employee.designation),
      safeText(activity),
      safeText(venue),
      String(body.startTravel),         // yyyy-mm-dd, validated above
      String(body.endTravel),
    ]],
  },
});

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'DEBUG: ' + (err.message || err) });
  }
}
