const multer = require('multer');
const Image = require('../models/image');
const { uploadImage, deleteImage, downloadImage  } = require('../services/cloudinaryService');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');



// Ensure uploads directory exists
const ensureUploadsDirectory = () => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDirectory();
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const uploadImageController = async (req, res) => {
  try {
    const filePath = req.file.path;
    const result = await uploadImage(filePath);
    
    
     fs.unlinkSync(filePath);

    const image = new Image({ url: result.secure_url, public_id: result.public_id });
    await image.save();
    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllImagesController = async (req, res) => {
    try {
      const images = await Image.find();
      res.status(200).json(images);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
};

const getImageByIdController = async (req, res) => {
    try {
      const { id } = req.params;
      const image = await Image.findById(id);
      if (!image) return res.status(404).json({ error: 'Image not found' });
  
      res.status(200).json(image);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
};

const editImageController = async (req, res) => {
    try {
      const { id } = req.params;
      const { width, height, left, top } = req.body;
  
      const image = await Image.findById(id);
      if (!image) return res.status(404).json({ error: 'Image not found' });
  
      const filePath = path.join(__dirname, '..', 'uploads', `${Date.now()}-edited.jpg`);
      await downloadImage(image.url, filePath);
  
      let transform = sharp(filePath);
      
      // Apply cropping if dimensions are provided
      if (width && height && left !== undefined && top !== undefined) {
        transform = transform.extract({ width: parseInt(width), height: parseInt(height), left: parseInt(left), top: parseInt(top) });
      }
      // Apply resizing if only width and/or height are provided
      if (width && !height) {
        transform = transform.resize({ width: parseInt(width) });
      }
      if (!width && height) {
        transform = transform.resize({ height: parseInt(height) });
      }
      if (width && height && (left === undefined || top === undefined)) {
        transform = transform.resize({ width: parseInt(width), height: parseInt(height) });
      }
  
      const editedImagePath = path.join(__dirname, '..', 'uploads', `${Date.now()}-final.jpg`);
      await transform.toFile(editedImagePath);
  
      const result = await uploadImage(editedImagePath);
  
      image.url = result.secure_url;
      image.public_id = result.public_id;
      await image.save();
  
      // Ensure file streams are closed and files are not in use
      fs.closeSync(fs.openSync(filePath, 'r'));
      fs.closeSync(fs.openSync(editedImagePath, 'r'));
  
      // Delete the temporary files
    //   fs.unlinkSync(filePath);
    //   fs.unlinkSync(editedImagePath);
  
      res.status(200).json(image);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
};

const deleteImageController = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Image.findById(id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    await deleteImage(image.public_id);
    await Image.deleteOne({ _id: id });
    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadImageController,
  getAllImagesController,
  getImageByIdController,
  editImageController,
  deleteImageController,
  upload,
};
