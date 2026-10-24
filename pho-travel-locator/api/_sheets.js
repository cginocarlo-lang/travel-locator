import { google } from 'googleapis';

let cachedClient;

export function sheetsClient() {
  if (cachedClient) return cachedClient;

  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !process.env.SHEET_ID) {
    throw new Error('Missing GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY or SHEET_ID environment variable.');
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cachedClient = google.sheets({ version: 'v4', auth });
  return cachedClient;
}

// Looks up an employee in the "Employees" sheet (A: ID, B: Full Name, C: Designation).
export async function findEmployee(employeeId) {
  const wanted = String(employeeId || '').trim().toLowerCase();
  if (!wanted) return { success: false, message: 'Employee ID is required.' };

  const { data } = await sheetsClient().spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Employees!A2:C',
  });

  const row = (data.values || []).find(
    (r) => String(r[0] ?? '').trim().toLowerCase() === wanted
  );

  return row
    ? { success: true, employeeId: String(row[0]).trim(), fullName: row[1] || '', designation: row[2] || '' }
    : { success: false, message: 'Employee ID not found' };
}
