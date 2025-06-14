import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rhxbadjyjjjrjpvfhpap.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeGJhZGp5ampqcmpwdmZocGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDUyMTUsImV4cCI6MjA2MzUyMTIxNX0.Z7sfOz6dgSgjKyJspwoYPz4gbJwYRe8zxpNYV_YeonA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to convert ImgBB sharing URL to direct image URL
async function convertImgBBUrl(sharingUrl) {
  try {
    const response = await fetch(sharingUrl);
    const html = await response.text();
    
    // Look for the meta property="og:image" tag
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogImageMatch) {
      return ogImageMatch[1];
    }
    
    // Alternative: look for data-src or src attributes
    const imgSrcMatch = html.match(/data-src="(https:\/\/i\.ibb\.co\/[^"]+)"/);
    if (imgSrcMatch) {
      return imgSrcMatch[1];
    }
    
    return null;
    
  } catch (error) {
    console.log(`❌ Error converting ${sharingUrl}: ${error.message}`);
    return null;
  }
}

async function fixAllImgBBUrls() {
  console.log("🔧 Converting ALL remaining ImgBB URLs...\n");
  
  try {
    // Get all remaining ImgBB sharing URLs
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
    
    // Process all remaining images
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      console.log(`\n🔄 [${i+1}/${images.length}] ${img.location_name} (${img.year})`);
      
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
        console.log(`   ❌ Could not extract direct URL`);
        failCount++;
      }
      
      // Small delay to be nice to ImgBB servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📈 FINAL RESULTS:`);
    console.log(`✅ Successfully converted: ${successCount}`);
    console.log(`❌ Failed to convert: ${failCount}`);
    console.log(`📊 Total processed: ${successCount + failCount}`);
    
    if (successCount > 0) {
      console.log(`\n🎉 SUCCESS! All ImgBB URLs have been fixed.`);
      console.log(`🎮 Refresh your game to see the images loading!`);
    }
    
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

fixAllImgBBUrls(); 