import { findEmployee, sheetsClient } from './_sheets.js';

const MAX_LEN = 45;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function dateToSerial(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const utc = Date.UTC(y, mo - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return Math.round(utc / 86400000) + 25569;
}

function safeText(v) {
  const s = String(v ?? '').trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function nowManila() {
  return new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
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

    const employee = await findEmployee(employeeId);
    if (!employee.success) {
      return res.status(400).json({ success: false, message: 'Employee ID could not be verified. Please re-enter it and try again.' });
    }

    await sheetsClient().spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Log!A:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          nowManila(),                       // A: Timestamp
          "'" + employee.employeeId,         // B: Employee ID (kept as text, leading zeros survive)
          safeText(employee.fullName),       // C: Full Name
          safeText(employee.designation),    // D: Designation
          safeText(activity),                // E: Activity
          safeText(venue),                   // F: Venue
          String(body.startTravel),          // G: Start of Travel (yyyy-mm-dd)
          String(body.endTravel),            // H: End of Travel (yyyy-mm-dd)
        ]],
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ success: false, message: 'Could not save your entry. Please try again.' });
  }
}
