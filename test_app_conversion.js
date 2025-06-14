// Test script to verify Google Drive URL conversion in app context
import { convertGoogleDriveUrl, transformDatabaseImageToGameImage } from './src/utils/gameUtils.js';

console.log('🧪 Testing Google Drive URL conversion in app context...\n');

// Test the convertGoogleDriveUrl function
const testUrls = [
  'https://drive.google.com/file/d/1WxiBT2ookkXEniZB514GRjWYHK-o4elL/view?usp=sharing',
  'https://drive.google.com/open?id=1aft1XeQFh4VqTnL4Z8apdaDyWDGLKFFh',
  'https://drive.google.com/uc?id=1-Sl6dZ8I-NY5TTfoX6GmDWhQ3NSbcvct', // Already converted
  'https://images.unsplash.com/photo-1517022812141-23620dba5c23', // Non-Google Drive
];

console.log('🔗 Testing convertGoogleDriveUrl function:');
testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. Input: ${url}`);
  const converted = convertGoogleDriveUrl(url);
  console.log(`   Output: ${converted}`);
  console.log(`   Changed: ${url !== converted ? '✅ Yes' : '❌ No'}`);
});

// Test the transformDatabaseImageToGameImage function
console.log('\n\n🔄 Testing transformDatabaseImageToGameImage function:');
const mockDatabaseImage = {
  id: 'test-123',
  image_url: 'https://drive.google.com/file/d/1WxiBT2ookkXEniZB514GRjWYHK-o4elL/view?usp=sharing',
  year: 1984,
  location_lat: 40.7128,
  location_lng: -74.0060,
  location_name: 'New York, NY',
  description: 'Test historical image'
};

console.log('\nInput database object:');
console.log(JSON.stringify(mockDatabaseImage, null, 2));

const transformedImage = transformDatabaseImageToGameImage(mockDatabaseImage);

console.log('\nTransformed GameImage object:');
console.log(JSON.stringify(transformedImage, null, 2));

console.log('\n✅ Google Drive URL conversion test completed!'); 