const axios = require('axios');
const crypto = require('crypto');

const BIN_ID = "686e1231dfff172fa657ed90"; // Gamitin ang bin mo
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G"; // Secret key mo
const BASE_URL = "https://watch-gomotv.online"; // Domain ng shortener mo
const MAX_ATTEMPTS = 5;
const MAX_SLUG_LENGTH = 8;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON format' })
    };
  }

  const originalUrl = body.url && body.url.trim();
  if (!originalUrl || !originalUrl.startsWith('https://gomotv.pages.dev/')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Only gomotv.pages.dev URLs are allowed.' })
    };
  }

  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    const existingUrls = res.data || {};

    // Reuse existing slug if URL already present
    const existingSlug = Object.keys(existingUrls).find(key => existingUrls[key] === originalUrl);
    if (existingSlug) {
      return {
        statusCode: 200,
        body: JSON.stringify({ short: existingSlug })
      };
    }

    // Generate unique slug
    let shortId;
    let attempts = 0;
    do {
      shortId = crypto.randomBytes(4).toString('hex').slice(0, MAX_SLUG_LENGTH);
      attempts++;
    } while (existingUrls[shortId] && attempts < MAX_ATTEMPTS);

    if (attempts >= MAX_ATTEMPTS) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate unique ID. Try again.' })
      };
    }

    existingUrls[shortId] = originalUrl;

    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, existingUrls, {
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json',
        'X-Bin-Versioning': 'false'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ short: shortId })
    };

  } catch (err) {
    console.error('Shortener error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error. Try again later.' })
    };
  }
};
