const crypto = require('crypto');

let db = {}; // in-memory store (Netlify will reset each time)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const url = body.url;
  if (!url || !url.startsWith('https://gomotv.pages.dev/')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Only gomotv.pages.dev links are allowed' }) };
  }
  const id = crypto.randomBytes(3).toString('hex');
  db[id] = url;
  return {
    statusCode: 200,
    body: JSON.stringify({ short: id })
  };
};
