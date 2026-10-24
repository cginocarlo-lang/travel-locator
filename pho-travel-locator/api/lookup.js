import { findEmployee } from './_sheets.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const id = String(req.query.id || '').trim();
  if (!id || id.length > 50) {
    return res.status(400).json({ success: false, message: 'Invalid Employee ID.' });
  }

  try {
    const result = await findEmployee(id);
    // Only return what the form needs
    return res.status(200).json(
      result.success
        ? { success: true, fullName: result.fullName, designation: result.designation }
        : { success: false, message: result.message }
    );
  } catch (err) {
    console.error('lookup error:', err);
    return res.status(500).json({ success: false, message: 'Could not read the employee list.' });
  }
}
