const axios = require('axios');
const crypto = require('crypto');
const validator = require('validator');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";
const BASE_URL = "https://watch-gomotv.online";
const MAX_SLUG_LENGTH = 10;
const MAX_ATTEMPTS = 5;
const SAFE_DOMAINS = ['gomotv.com', 'watch-gomotv.online', 'gomotv.pages.dev'];

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if (!event.headers['content-type'] || !event.headers['content-type'].includes('application/json')) {
    return {
      statusCode: 415,
      body: JSON.stringify({ error: 'Unsupported Media Type' })
    };
  }

  let originalUrl;
  try {
    const body = JSON.parse(event.body);
    originalUrl = body.url && body.url.trim();
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON format', details: err.message })
    };
  }

  if (!originalUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  if (!validator.isURL(originalUrl, {
    require_protocol: true,
    protocols: ['http', 'https'],
    allow_underscores: true
  })) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid URL format',
        details: 'URL must start with http:// or https:// and be properly formatted'
      })
    };
  }

  try {
    const urlObj = new URL(originalUrl);
    if (!SAFE_DOMAINS.some(domain => urlObj.hostname.endsWith(domain))) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Unsupported domain',
          details: 'Only specific domains are allowed'
        })
      };
    }
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid URL', details: 'Malformed URL' })
    };
  }

  let shortId = '';
  let attempts = 0;

  try {
    const getRes = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY,
        'X-Bin-Meta': 'false'
      },
      timeout: 5000
    });

    const existingUrls = getRes.data || {};

    do {
      shortId = crypto.randomBytes(4).toString('hex').slice(0, MAX_SLUG_LENGTH);
      attempts++;
    } while (existingUrls[shortId] && attempts < MAX_ATTEMPTS);

    if (attempts >= MAX_ATTEMPTS) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to generate unique short ID',
          details: 'Please try again later'
        })
      };
    }

    existingUrls[shortId] = originalUrl;

    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, existingUrls, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
        'X-Bin-Versioning': 'false'
      },
      timeout: 5000
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        short: shortId,
        shortUrl: `${BASE_URL}/${shortId}`,
        originalUrl: originalUrl,
        createdAt: new Date().toISOString()
      })
    };

  } catch (err) {
    console.error('Shorten error:', err);

    let errorDetails = 'Internal server error';
    if (err.response) {
      errorDetails = `API error: ${err.response.status}`;
    } else if (err.code === 'ECONNABORTED') {
      errorDetails = 'Request timeout with URL service';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to shorten URL',
        details: errorDetails
      })
    };
  }
};
