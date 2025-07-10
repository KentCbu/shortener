const axios = require('axios');
const crypto = require('crypto');
const validator = require('validator');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";
const BASE_URL = "https://watch-gomotv.online";
const MAX_SLUG_LENGTH = 10;
const MAX_ATTEMPTS = 5;
const SAFE_DOMAINS = [];

exports.handler = async function(event) {
  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Validate content type
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
      body: JSON.stringify({ 
        error: 'Invalid JSON format',
        details: err.message 
      })
    };
  }

  // Validate URL presence
  if (!originalUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  // Validate URL format
  if (!validator.isURL(originalUrl, {
    require_protocol: true,
    protocols: ['http', 'https'],
    allow_underscores: true,
    allow_trailing_dot: false
  })) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Invalid URL format',
        details: 'URL must start with http:// or https:// and be properly formatted'
      })
    };
  }

  // Check for existing URL to avoid duplicates
  let existingUrls = {};
  let shortId = '';
  let attempts = 0;

  try {
    // Fetch existing URLs
    const getRes = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 
        'X-Master-Key': API_KEY,
        'X-Bin-Meta': 'false'
      },
      timeout: 5000
    });
    
    existingUrls = getRes.data || {};

    // Check if URL already exists
    const existingSlug = Object.keys(existingUrls).find(key => existingUrls[key] === originalUrl);
    if (existingSlug) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short: existingSlug,
          shortUrl: `${BASE_URL}/${existingSlug}`,
          originalUrl: originalUrl,
          existing: true
        })
      };
    }

    // Generate unique short ID
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

    // Save the new mapping
    existingUrls[shortId] = originalUrl;
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, existingUrls, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
        'X-Bin-Versioning': 'false'
      },
      timeout: 5000
    });

    // Return success response
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // Prevent caching of sensitive data
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

    // Handle specific JSONBin errors
    let errorDetails = 'Internal server error';
    if (err.response) {
      if (err.response.status === 401 || err.response.status === 403) {
        errorDetails = 'Authentication failed with URL service';
      } else if (err.response.status === 404) {
        errorDetails = 'URL storage not found';
      } else {
        errorDetails = `Service responded with ${err.response.status}`;
      }
    } else if (err.code === 'ECONNABORTED') {
      errorDetails = 'Request timeout with URL service';
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to shorten URL',
        details: errorDetails,
        requestId: event.requestContext?.requestId || ''
      })
    };
  }
};
