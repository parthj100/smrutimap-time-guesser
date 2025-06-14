import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rhxbadjyjjjrjpvfhpap.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeGJhZGp5ampqcmpwdmZocGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDUyMTUsImV4cCI6MjA2MzUyMTIxNX0.Z7sfOz6dgSgjKyJspwoYPz4gbJwYRe8zxpNYV_YeonA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Copy of the conversion function from sampleData.ts
const convertGoogleDriveUrl = (url) => {
  if (!url) return url;
  
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  
  if (driveFileMatch) {
    const fileId = driveFileMatch[1];
    const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}`;
    console.log(`🔄 Converting Google Drive URL: ${url.substring(0, 50)}... → ${convertedUrl}`);
    return convertedUrl;
  }
  
  if (driveOpenMatch) {
    const fileId = driveOpenMatch[1];
    const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}`;
    console.log(`🔄 Converting Google Drive URL: ${url.substring(0, 50)}... → ${convertedUrl}`);
    return convertedUrl;
  }
  
  return url;
};

async function debugImageLoading() {
  console.log("🔍 Debug: Testing image loading...\n");
  
  try {
    const { data, error } = await supabase
      .from("game_images")
      .select("id, image_url, location_name, year")
      .limit(5);
    
    if (error) {
      console.error("❌ Database Error:", error);
      return;
    }
    
    console.log(`📊 Testing ${data.length} images...\n`);
    
    for (let i = 0; i < data.length; i++) {
      const img = data[i];
      const originalUrl = img.image_url;
      const processedUrl = convertGoogleDriveUrl(originalUrl);
      
      console.log(`${i+1}. ${img.location_name} (${img.year})`);
      console.log(`   📥 Original: ${originalUrl}`);
      console.log(`   📤 Processed: ${processedUrl}`);
      console.log(`   🔄 Changed: ${originalUrl !== processedUrl ? 'YES' : 'NO'}`);
      
      // Test if URL is accessible
      if (originalUrl.includes("i.ibb.co")) {
        console.log("   ✅ ImgBB URL detected - should work");
        
        // Test the URL
        try {
          const response = await fetch(originalUrl, { method: 'HEAD' });
          console.log(`   🌐 HTTP Status: ${response.status} ${response.statusText}`);
          console.log(`   📋 Content-Type: ${response.headers.get('content-type') || 'unknown'}`);
        } catch (fetchError) {
          console.log(`   ❌ Fetch Error: ${fetchError.message}`);
        }
      } else if (originalUrl.includes("drive.google.com")) {
        console.log("   ❌ Google Drive URL - will be broken");
      } else {
        console.log("   ❓ Other URL type");
      }
      
      console.log("");
    }
    
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

debugImageLoading(); 