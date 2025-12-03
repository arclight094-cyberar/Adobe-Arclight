import { cloudinary } from '../config/cloudinary.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure image directory exists
const imageDir = path.join(__dirname, '..', 'image');
fs.mkdir(imageDir, { recursive: true }).catch(console.error);

// Custom storage that saves to both Cloudinary and local filesystem
class HybridStorage extends CloudinaryStorage {
    async _handleFile(req, file, cb) {
        // Generate unique filename for local storage
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = path.extname(file.originalname || '') || '.jpg';
        const localFilename = `${timestamp}_${randomStr}${ext}`;
        const localPath = path.join(imageDir, localFilename);

        // Collect file chunks to save locally and upload to Cloudinary
        const chunks = [];
        let totalBytes = 0;

        file.stream.on('data', (chunk) => {
            chunks.push(chunk);
            totalBytes += chunk.length;
        });

        file.stream.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);

                // Save to local filesystem first
                await fs.writeFile(localPath, buffer);

                // Create a new readable stream from buffer for Cloudinary
                const bufferStream = new Readable();
                bufferStream.push(buffer);
                bufferStream.push(null);

                // Create a file-like object for Cloudinary upload
                const cloudinaryFile = {
                    ...file,
                    buffer: buffer,
                    stream: bufferStream,
                    size: totalBytes
                };

                // Extract image dimensions from buffer as fallback
                let imageWidth = 0;
                let imageHeight = 0;
                try {
                    const metadata = await sharp(buffer).metadata();
                    imageWidth = metadata.width || 0;
                    imageHeight = metadata.height || 0;
                } catch (dimErr) {
                    console.warn('Could not extract image dimensions:', dimErr.message);
                }

                // Upload to Cloudinary using parent class
                super._handleFile(req, cloudinaryFile, (err, cloudinaryResult) => {
                    if (err) {
                        // Clean up local file on error
                        fs.unlink(localPath).catch(console.error);
                        return cb(err);
                    }

                    // Extract format from filename if not in Cloudinary result
                    const fileExt = path.extname(file.originalname || '').slice(1).toLowerCase() || 'jpg';
                    const format = cloudinaryResult.format || 
                                   (fileExt === 'jpg' ? 'jpeg' : fileExt) || 
                                   'jpg';

                    // Ensure all required properties are present
                    // CloudinaryStorage normally provides: filename, path, format, width, height, bytes
                    const result = {
                        ...cloudinaryResult,
                        localPath: localPath,
                        // Ensure format is set
                        format: format,
                        // Use Cloudinary dimensions if available, otherwise use extracted dimensions
                        width: cloudinaryResult.width || imageWidth,
                        height: cloudinaryResult.height || imageHeight,
                        // Ensure size/bytes is set
                        bytes: cloudinaryResult.bytes || totalBytes,
                        size: cloudinaryResult.bytes || totalBytes
                    };

                    cb(null, result);
                });
            } catch (saveErr) {
                console.error('Error saving file locally:', saveErr);
                // Try to upload to Cloudinary anyway
                const buffer = Buffer.concat(chunks);
                
                // Extract image dimensions from buffer as fallback
                let imageWidth = 0;
                let imageHeight = 0;
                try {
                    const metadata = await sharp(buffer).metadata();
                    imageWidth = metadata.width || 0;
                    imageHeight = metadata.height || 0;
                } catch (dimErr) {
                    console.warn('Could not extract image dimensions:', dimErr.message);
                }

                const bufferStream = new Readable();
                bufferStream.push(buffer);
                bufferStream.push(null);

                const cloudinaryFile = {
                    ...file,
                    buffer: buffer,
                    stream: bufferStream,
                    size: totalBytes
                };

                super._handleFile(req, cloudinaryFile, (err, cloudinaryResult) => {
                    if (err) {
                        return cb(err);
                    }
                    
                    // Extract format from filename if not in Cloudinary result
                    const fileExt = path.extname(file.originalname || '').slice(1).toLowerCase() || 'jpg';
                    const format = cloudinaryResult.format || 
                                   (fileExt === 'jpg' ? 'jpeg' : fileExt) || 
                                   'jpg';
                    
                    // Ensure all required properties are present even on error fallback
                    const result = {
                        ...cloudinaryResult,
                        localPath: null,
                        format: format,
                        width: cloudinaryResult.width || imageWidth,
                        height: cloudinaryResult.height || imageHeight,
                        bytes: cloudinaryResult.bytes || totalBytes,
                        size: cloudinaryResult.bytes || totalBytes
                    };
                    cb(null, result);
                });
            }
        });

        file.stream.on('error', (err) => {
            fs.unlink(localPath).catch(console.error);
            cb(err);
        });
    }
}

// Configure Hybrid storage (Cloudinary + Local)
const storage = new HybridStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'adobe-ps-uploads', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'heif'],
        // No transformation - preserve original dimensions for AI processing
    }
});

// Create multer upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

export default upload;
