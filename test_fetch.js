const { app, net } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const filePath = path.join(__dirname, 'test_audio.mp4');
  console.log('Testing filePath:', filePath);
  
  // Create URL
  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
  console.log('Fetching:', fileUrl);
  
  try {
    const res = await net.fetch(fileUrl);
    console.log('Status:', res.status);
    console.log('Headers:', Array.from(res.headers.entries()));
  } catch (err) {
    console.error('Fetch error:', err);
  }
  
  app.quit();
});
