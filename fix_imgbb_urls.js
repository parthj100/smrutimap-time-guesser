import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rhxbadjyjjjrjpvfhpap.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeGJhZGp5ampqcmpwdmZocGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDUyMTUsImV4cCI6MjA2MzUyMTIxNX0.Z7sfOz6dgSgjKyJspwoYPz4gbJwYRe8zxpNYV_YeonA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to convert ImgBB sharing URL to direct image URL
async function convertImgBBUrl(sharingUrl) {
  try {
    console.log(`🔄 Converting: ${sharingUrl}`);
    
    // Fetch the sharing page
    const response = await fetch(sharingUrl);
    const html = await response.text();
    
    // Extract the direct image URL from the HTML
    // Look for the meta property="og:image" tag
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogImageMatch) {
      const directUrl = ogImageMatch[1];
      console.log(`✅ Found direct URL: ${directUrl}`);
      return directUrl;
    }
    
    // Alternative: look for data-src or src attributes
    const imgSrcMatch = html.match(/data-src="(https:\/\/i\.ibb\.co\/[^"]+)"/);
    if (imgSrcMatch) {
      const directUrl = imgSrcMatch[1];
      console.log(`✅ Found direct URL (alt method): ${directUrl}`);
      return directUrl;
    }
    
    console.log(`❌ Could not extract direct URL from: ${sharingUrl}`);
    return null;
    
  } catch (error) {
    console.log(`❌ Error converting ${sharingUrl}: ${error.message}`);
    return null;
  }
}

async function fixImgBBUrls() {
  console.log("🔧 Starting ImgBB URL conversion...\n");
  
  try {
    // Get all ImgBB sharing URLs
    const { data: images, error } = await supabase
      .from("game_images")
      .select("id, image_url, location_name, year")
      .ilike("image_url", "%ibb.co/%")
      .not("image_url", "ilike", "%i.ibb.co%"); // Exclude already direct URLs
    
    if (error) {
      console.error("❌ Database Error:", error);
      return;
    }
    
    console.log(`📊 Found ${images.length} ImgBB sharing URLs to convert\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process first 5 images as a test
    const testImages = images.slice(0, 5);
    
    for (const img of testImages) {
      console.log(`\n🔄 Processing: ${img.location_name} (${img.year})`);
      console.log(`   Original: ${img.image_url}`);
      
      const directUrl = await convertImgBBUrl(img.image_url);
      
      if (directUrl) {
        // Update the database
        const { error: updateError } = await supabase
          .from("game_images")
          .update({ image_url: directUrl })
          .eq("id", img.id);
        
        if (updateError) {
          console.log(`   ❌ Database update failed: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`   ✅ Updated successfully!`);
          successCount++;
        }
      } else {
        failCount++;
      }
      
      // Small delay to be nice to ImgBB servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📈 RESULTS:`);
    console.log(`✅ Successfully converted: ${successCount}`);
    console.log(`❌ Failed to convert: ${failCount}`);
    
    if (successCount > 0) {
      console.log(`\n🎉 SUCCESS! ${successCount} ImgBB URLs have been fixed.`);
      console.log(`🎮 Try refreshing your game to see the images!`);
    }
    
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

fixImgBBUrls(); 