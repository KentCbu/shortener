const axios = require('axios');

const BIN_ID = "YOUR_BIN_ID_HERE";
const API_KEY = "YOUR_API_KEY_HERE";

exports.handler = async function(event) {
  const slug = event.path.replace("/", "");

  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY
      }
    });

    const urls = res.data.record || {};
    const target = urls[slug];

    if (target) {
      return {
        statusCode: 302,
        headers: {
          Location: target
        }
      };
    } else {
      return {
        statusCode: 404,
        body: "Short link not found"
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: "Error fetching data"
    };
  }
};
    
