const fs = require('fs');
const axios = require('axios');
const { writeFileSync } = require('fs');

async function downloadFromGoogleDrive(fileId, destPath) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const res = await axios.get(url, {
    responseType: 'stream',
    maxRedirects: 5,
  });

  const stream = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    res.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = { downloadFromGoogleDrive };
