const axios = require('axios');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";
const DEFAULT_THUMBNAIL = "https://watch-gomotv.online/preview.jpg";

exports.handler = async function(event) {
  const slug = event.path.replace(/^\//, '').trim();

  if (!slug) {
    return {
      statusCode: 400,
      body: 'Missing slug'
    };
  }

  try {
    // Fetch short → long URL map
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    const urls = res.data || {};
    const targetUrl = urls[slug];

    if (!targetUrl) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <!DOCTYPE html>
          <html>
          <head><title>Not Found</title></head>
          <body>
            <h2>❌ Short link not found</h2>
            <p>This shortened link does not exist.</p>
          </body>
          </html>
        `
      };
    }

    // Redirect with preview
    const html = `
      <!DOCTYPE html>
      <html prefix="og: http://ogp.me/ns#">
      <head>
        <meta charset="UTF-8">
        <title>Watch on GoMoTV</title>
        <meta name="description" content="Click to watch your favorite content">

        <!-- Open Graph -->
        <meta property="og:title" content="Watch on GoMoTV">
        <meta property="og:description" content="Click to watch your favorite content">
        <meta property="og:image" content="${DEFAULT_THUMBNAIL}">
        <meta property="og:url" content="${targetUrl}">
        <meta property="og:type" content="website">

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Watch on GoMoTV">
        <meta name="twitter:description" content="Click to watch your favorite content">
        <meta name="twitter:image" content="${DEFAULT_THUMBNAIL}">

        <meta http-equiv="refresh" content="0; url=${targetUrl}">
        <script>window.location.href = "${targetUrl}";</script>
      </head>
      <body style="text-align:center; padding: 20px; font-family: Arial, sans-serif;">
        <h2>Redirecting to GoMoTV...</h2>
        <p>If you're not redirected, <a href="${targetUrl}">click here</a>.</p>
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex'
      },
      body: html
    };

  } catch (err) {
    console.error("Redirect error:", err.message);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h2>⚠️ Server Error</h2>
          <p>Something went wrong. Please try again later.</p>
        </body>
        </html>
      `
    };
  }
};
