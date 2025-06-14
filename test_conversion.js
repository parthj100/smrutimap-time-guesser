console.log("Testing Google Drive URL conversion...");

const testUrls = [
  "https://drive.google.com/file/d/1ABC123/view?usp=sharing",
  "https://drive.google.com/open?id=1ABC123", 
  "https://drive.google.com/uc?id=1ABC123", // Old format that's in database
  "https://example.com/image.jpg"
];

const convertGoogleDriveUrl = (url) => {
  if (!url) return url;
  
  // Check if it's a Google Drive URL that needs conversion
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  const driveUcMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  
  let fileId = null;
  
  if (driveFileMatch) {
    fileId = driveFileMatch[1];
  } else if (driveOpenMatch) {
    fileId = driveOpenMatch[1];
  } else if (driveUcMatch) {
    fileId = driveUcMatch[1];
  }
  
  if (fileId) {
    // Use the thumbnail method which still works as of 2024
    // sz=s4000 sets max size - can be increased for higher resolution
    const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s4000`;
    console.log(`Converting: ${url} → ${convertedUrl}`);
    return convertedUrl;
  }
  
  // Return original URL if it's not a Google Drive URL that needs conversion
  return url;
};

testUrls.forEach(url => {
  console.log(`Input: ${url}`);
  console.log(`Output: ${convertGoogleDriveUrl(url)}`);
  console.log("---");
});
