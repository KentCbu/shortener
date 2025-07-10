const axios = require('axios');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";
const DEFAULT_THUMBNAIL = "https://watch-gomotv.online/preview.jpg"; // Your static thumbnail

exports.handler = async function(event) {
  const slug = event.path.replace("/", "");

  // Skip if root path
  if (!slug) {
    return {
      statusCode: 200,
      body: "Welcome to GoMoTV URL Shortener"
    };
  }

  try {
    // 1. Fetch the URL mapping from JSONBin
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });

    const urls = res.data.record || {};
    const targetUrl = urls[slug];

    if (!targetUrl) {
      return {
        statusCode: 404,
        body: "Short link not found"
      };
    }

    // 2. Return HTML with OG tags for Facebook sharing
    const html = `
      <!DOCTYPE html>
      <html prefix="og: http://ogp.me/ns#">
      <head>
        <title>GoMoTV Link</title>
        <meta property="og:title" content="Watch on GoMoTV">
        <meta property="og:description" content="Click to watch your favorite content">
        <meta property="og:image" content="${DEFAULT_THUMBNAIL}">
        <meta property="og:url" content="https://watch-gomotv.online/${slug}">
        <meta property="og:type" content="website">
        <meta http-equiv="refresh" content="5; url=${targetUrl}">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Redirecting to GoMoTV...</h2>
        <p>If you aren't redirected automatically, <a href="${targetUrl}">click here</a>.</p>
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: html
    };

  } catch (err) {
    console.error("Redirect error:", err);
    return {
      statusCode: 500,
      body: "Error processing your request"
    };
  }
};
