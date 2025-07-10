const axios = require('axios');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";
const DEFAULT_THUMBNAIL = "https://watch-gomotv.online/preview.jpg";
const CACHE_TTL = 3600; // 1 hour cache
const SAFE_REDIRECT_DOMAINS = [];

exports.handler = async function(event, context) {
  const slug = event.path.replace(/^\//, '').trim(); // Clean the slug

  // Root path handler
  if (!slug) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>GoMoTV URL Shortener</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            h1 { color: #4285f4; }
          </style>
        </head>
        <body>
          <h1>GoMoTV URL Shortener</h1>
          <p>Welcome to our URL shortening service</p>
        </body>
        </html>
      `
    };
  }

  // Validate slug format (alphanumeric + hyphen/underscore)
  if (!/^[a-z0-9-_]+$/i.test(slug)) {
    return {
      statusCode: 400,
      body: 'Invalid short URL format'
    };
  }

  try {
    // Fetch URL mapping from JSONBin with caching headers
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 
        'X-Master-Key': API_KEY,
        'X-Bin-Meta': 'false' // Don't include metadata
      },
      timeout: 5000 // 5 second timeout
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
          <head>
            <title>Link Not Found</title>
          </head>
          <body>
            <h2>Short link not found</h2>
            <p>The requested short URL does not exist.</p>
          </body>
          </html>
        `
      };
    }

    // Generate HTML with OG tags and immediate redirect
    const html = `
      <!DOCTYPE html>
      <html prefix="og: http://ogp.me/ns#">
      <head>
        <meta charset="UTF-8">
        <title>GoMoTV Link Redirect</title>
        
        <!-- Primary Meta Tags -->
        <meta name="description" content="Watch your favorite content on GoMoTV">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:title" content="Watch on GoMoTV">
        <meta property="og:description" content="Click to watch your favorite content">
        <meta property="og:image" content="${DEFAULT_THUMBNAIL}">
        <meta property="og:url" content="${event.headers.host}/${slug}">
        <meta property="og:type" content="website">
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Watch on GoMoTV">
        <meta name="twitter:description" content="Click to watch your favorite content">
        <meta name="twitter:image" content="${DEFAULT_THUMBNAIL}">
        
        <!-- Immediate redirect with backup link -->
        <meta http-equiv="refresh" content="0; url=${targetUrl}">
        <script>
          window.location.href = "${targetUrl}";
        </script>
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
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Robots-Tag': 'noindex' // Prevent search indexing of short URLs
      },
      body: html
    };

  } catch (err) {
    console.error("Redirect error:", err.message);
    
    // Handle JSONBin specific errors
    if (err.response) {
      console.error("API response error:", err.response.status, err.response.data);
      
      if (err.response.status === 404) {
        return {
          statusCode: 500,
          body: 'Configuration error: JSONBin not found'
        };
      }
      
      if (err.response.status === 403) {
        return {
          statusCode: 500,
          body: 'Configuration error: Invalid API key'
        };
      }
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Server Error</title>
        </head>
        <body>
          <h2>Error processing your request</h2>
          <p>Please try again later.</p>
        </body>
        </html>
      `
    };
  }
};
