const axios = require('axios');
const crypto = require('crypto');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";

exports.handler = async function(event) {
  const body = JSON.parse(event.body);
  const originalUrl = body.url;

  if (!originalUrl) {
    return { statusCode: 400, body: "Missing URL" };
  }

  const shortId = crypto.randomBytes(3).toString('hex');

  try {
    // Get current data from JSONBin
    const getRes = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY
      }
    });

    const urls = getRes.data.record || {};
    urls[shortId] = originalUrl;

    // Save back to JSONBin
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, urls, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ short: shortId })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
