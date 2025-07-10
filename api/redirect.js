const REDIRECT_MAP = {}; // temporary in-memory map

exports.handler = async (event) => {
  const slug = event.path.replace(/^\//, '');
  const url = REDIRECT_MAP[slug];
  if (!url) {
    return {
      statusCode: 404,
      body: 'Not Found'
    };
  }
  const html = `<!DOCTYPE html>
  <html prefix="og: http://ogp.me/ns#">
  <head>
    <meta charset="UTF-8">
    <title>Watch on GoMoTV</title>
    <meta name="description" content="Click to watch your favorite content">
    <meta property="og:title" content="Watch on GoMoTV">
    <meta property="og:description" content="Click to watch your favorite content">
    <meta property="og:image" content="https://watch-gomotv.online/preview.jpg">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Watch on GoMoTV">
    <meta name="twitter:description" content="Click to watch your favorite content">
    <meta name="twitter:image" content="https://watch-gomotv.online/preview.jpg">
    <meta http-equiv="refresh" content="0; url=${url}">
    <script>window.location.href = "${url}";</script>
  </head>
  <body>
    <p>Redirecting to GoMoTV...</p>
    <p>If not redirected, <a href="${url}">click here</a>.</p>
  </body>
  </html>`;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html
  };
};
