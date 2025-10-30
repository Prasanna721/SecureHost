const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'douei524x',
  api_key: '616435215468667',
  api_secret: '-7nEuA5u1M0G2OGhbq08cCt68nI'
});

async function uploadToCloudinary(filePath) {
  try {
    console.log('   📤 Uploading to Cloudinary...');
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'privacy-guardian', // Organize screenshots in a folder
      resource_type: 'image',
      public_id: `screenshot-${Date.now()}`, // Unique identifier
      overwrite: false,
      tags: ['privacy-guardian', 'screenshot'] // Add tags for organization
    });
    
    if (result && result.secure_url) {
      console.log(`   ✅ Cloudinary upload successful`);
      console.log(`   🔗 URL: ${result.secure_url}`);
      return result.secure_url;
    }
    
    throw new Error('Invalid Cloudinary response');
  } catch (error) {
    console.error('   ❌ Cloudinary upload failed:', error.message);
    throw error;
  }
}

// Backup services (in case Cloudinary fails)
async function uploadToImgur(filePath) {
  try {
    const axios = require('axios');
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.post('https://api.imgur.com/3/image', {
      image: base64Image,
      type: 'base64'
    }, {
      headers: {
        'Authorization': 'Client-ID 546c25a59c58ad7'
      }
    });
    
    if (response.data && response.data.success && response.data.data) {
      return response.data.data.link;
    }
    
    throw new Error('Invalid Imgur response');
  } catch (error) {
    console.error('   ❌ Imgur upload failed:', error.message);
    throw error;
  }
}

async function uploadScreenshot(filePath) {
  const fileName = path.basename(filePath);
  console.log(`📤 Uploading screenshot: ${fileName}`);
  
  // Try Cloudinary first, then fallback to Imgur
  const uploadStrategies = [
    { name: 'Cloudinary', fn: uploadToCloudinary },
    { name: 'Imgur (backup)', fn: uploadToImgur }
  ];
  
  for (const strategy of uploadStrategies) {
    try {
      console.log(`   Trying ${strategy.name}...`);
      const url = await strategy.fn(filePath);
      console.log(`   ✅ Upload successful: ${url}`);
      return url;
    } catch (error) {
      console.log(`   ❌ ${strategy.name} failed: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('All upload services failed');
}

// Optional: Function to delete screenshots from Cloudinary after analysis
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error.message);
    throw error;
  }
}

module.exports = { 
  uploadScreenshot, 
  deleteFromCloudinary,
  cloudinary // Export for direct use if needed
};