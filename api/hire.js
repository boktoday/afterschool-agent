// POST /api/hire — Afterschool agency hire enquiry.
const EMAILIT_URL = 'https://api.emailit.com/v2/emails';
const TO = process.env.CONTACT_TO || 'boktoday@gmail.com';
const FROM = process.env.CONTACT_FROM || 'Afterschool website <go@getonetoeight.org>';

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}
function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method_not_allowed' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // the afterschool form's hidden field is "company"
  if (clean(body.company, 200) || clean(body.website, 200)) { res.status(200).json({ ok: true }); return; }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const message = String(body.message || '').trim().slice(0, 4000);
  if (!name || !looksLikeEmail(email) || message.length < 2) {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return;
  }

  try {
    const resp = await fetch(EMAILIT_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (process.env.EMAILIT_API_KEY || ''), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: TO, reply_to: email,
        subject: 'Hire enquiry: ' + name,
        text: ['Name: ' + name, 'Email: ' + email, '', message, '', 'Sent from the hire page on afterschool.agency'].join('\n'),
      }),
    });
    if (!resp.ok) { res.status(502).json({ ok: false, error: 'delivery_failed' }); return; }
  } catch (err) {
    res.status(502).json({ ok: false, error: 'delivery_failed' });
    return;
  }
  res.status(200).json({ ok: true, notified: true });
};
