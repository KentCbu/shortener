const axios = require('axios');

const BIN_ID = "686e1231dfff172fa657ed90";
const API_KEY = "$2a$10$hMAe7sa9n3owoAS9NYMjUeizXEKs5k8wuNljsyVfGUuBXLLF1lz0G";

exports.handler = async function(event) {
  const slug = event.path.replace("/", "");
  const userAgent = event.headers['user-agent'] || "";
  const isBot = /facebookexternalhit|Facebot|Twitterbot|Slackbot|Discordbot/i.test(userAgent);

  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY
      }
    });

    const urls = res.data.record || {};
    const target = urls[slug];

    if (!target) {
      return {
        statusCode: 404,
        body: "Short link not found"
      };
    }

    if (isBot) {
      // Respond with OG preview for bots (Facebook, Twitter, etc.)
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html'
        },
        body: `
<!DOCTYPE html>
<html prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <title>GoMoTV – Watch Now</title>
  <meta property="og:title" content="GoMoTV – Watch Now">
  <meta property="og:description" content="Stream free movies and TV shows instantly">
  <meta property="og:image" content="https://gomotv.pages.dev/preview.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://watch-gomotv.online/${slug}">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="1; url=${target}">
</head>
<body>
  <p>Redirecting to GoMoTV...</p>
</body>
</html>
        `
      };
    }

    // Regular user – perform redirect
    return {
      statusCode: 302,
      headers: {
        Location: target
      }
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: "Error fetching data"
    };
  }
};
