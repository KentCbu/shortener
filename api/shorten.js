const axios = require('axios');
const crypto = require('crypto');
const validator = require('validator');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";
const BASE_URL = "https://watch-gomotv.online";

exports.handler = async function(event) {
  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let originalUrl;
  try {
    const body = JSON.parse(event.body);
    originalUrl = body.url;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON format' })
    };
  }

  // Validate URL
  if (!originalUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  if (!validator.isURL(originalUrl, {
    require_protocol: true,
    protocols: ['http', 'https']
  })) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid URL format' })
    };
  }

  // Generate short ID with collision check
  let attempts = 0;
  const maxAttempts = 3;
  let shortId;
  let existingUrls = {};

  try {
    // Get existing URLs
    const getRes = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });
    existingUrls = getRes.data.record || {};

    // Generate unique short ID
    do {
      shortId = crypto.randomBytes(3).toString('hex');
      attempts++;
    } while (existingUrls[shortId] && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate unique short ID' })
      };
    }

    // Save the new mapping
    existingUrls[shortId] = originalUrl;
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, existingUrls, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
        'X-Bin-Versioning': 'false'
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        short: shortId,
        shortUrl: `${BASE_URL}/${shortId}`,
        originalUrl: originalUrl
      })
    };

  } catch (err) {
    console.error('Error processing request:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: err.message 
      })
    };
  }
};
