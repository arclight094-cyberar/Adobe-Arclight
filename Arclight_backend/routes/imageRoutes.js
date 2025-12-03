import express from 'express';
import { uploadImage, uploadMultipleImages, uploadStyleTransferImages, deleteImage, deleteAllImages, getImageDetails, cropImage } from '../controllers/imageController.js';
import upload from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Image routes
router.post('/upload', upload.single('image'), uploadImage);
router.post('/upload-multiple', upload.array('images', 2), uploadMultipleImages); // Max 2 images
router.post('/upload-style-transfer', upload.fields([
    { name: 'content', maxCount: 1 },
    { name: 'style', maxCount: 1 }
]), uploadStyleTransferImages); // Named fields for style transfer
router.patch('/crop', cropImage); // Crop image and replace original
router.delete('/delete-all', deleteAllImages); // Delete all user images
router.delete('/:publicId', deleteImage);
router.get('/:publicId', getImageDetails);

export default router;
