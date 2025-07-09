const fs = require('fs');
const path = require('path');
const urlsPath = path.join(__dirname, '../../data/urls.json');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { url } = JSON.parse(event.body);
  const id = Math.random().toString(36).substring(2, 8);
  const urls = JSON.parse(fs.readFileSync(urlsPath));
  urls[id] = url;
  fs.writeFileSync(urlsPath, JSON.stringify(urls, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({ shortUrl: `https://watch-gomotv.online/${id}` })
  };
};
