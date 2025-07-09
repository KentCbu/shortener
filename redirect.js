const fs = require('fs');
const path = require('path');
const urlsPath = path.join(__dirname, '../../data/urls.json');

exports.handler = async (event) => {
  const slug = event.path.replace('/.netlify/functions/redirect/', '');
  const urls = JSON.parse(fs.readFileSync(urlsPath));
  const targetUrl = urls[slug];

  if (!targetUrl) {
    return { statusCode: 404, body: 'Not Found' };
  }

  const ua = event.headers['user-agent'] || '';
  if (ua.includes('facebookexternalhit')) {
    return { statusCode: 403, body: 'Blocked for Facebook bot' };
  }

  return {
    statusCode: 302,
    headers: { Location: targetUrl }
  };
};
