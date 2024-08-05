const cloudinary = require('cloudinary').v2;
const { cloud_name, api_key, api_secret } = require('../config').cloudinary;
const axios = require('axios');
const fs = require('fs');


cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
});

const uploadImage = (filePath) => {
  return cloudinary.uploader.upload(filePath, { folder: 'image-web-app' });
};


const deleteImage = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

const downloadImage = async (imageUrl, dest) => {
  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.log('Error downloading image:', error);
    throw error;
  }
};



module.exports = {
  uploadImage,
  deleteImage,
  downloadImage
};
