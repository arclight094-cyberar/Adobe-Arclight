import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { cloudinary } from '../config/cloudinary.js';
import Image from '../models/Image.js';



// @desc    Upload single image
// @route   POST /api/images/upload
// @access  Private
export const uploadImage = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload an image', 400));
    }

    // Save image metadata to database
    const image = await Image.create({
        user: req.user._id,
        publicId: req.file.filename,
        imageUrl: req.file.path,
        format: req.file.format,
        width: req.file.width,
        height: req.file.height,
        size: req.file.bytes,
        localPath: req.file.localPath || null // Save local path for AI processing
    });

    res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
            id: image._id,
            imageUrl: image.imageUrl,
            publicId: image.publicId,
            format: image.format,
            width: image.width,
            height: image.height,
            size: image.size,
            createdAt: image.createdAt
        }
    });
});




// @desc    Upload multiple images
// @route   POST /api/images/upload-multiple
// @access  Private
export const uploadMultipleImages = catchAsync(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next(new AppError('Please upload at least one image', 400));
    }

    // Save all images to database
    const imagePromises = req.files.map(file => 
        Image.create({
            user: req.user._id,
            publicId: file.filename,
            imageUrl: file.path,
            format: file.format,
            width: file.width,
            height: file.height,
            size: file.bytes,
            localPath: file.localPath || null // Save local path for AI processing
        })
    );    const images = await Promise.all(imagePromises);

    res.status(201).json({
        success: true,
        message: `${images.length} images uploaded successfully`,
        data: images.map(img => ({
            id: img._id,
            imageUrl: img.imageUrl,
            publicId: img.publicId,
            format: img.format,
            width: img.width,
            height: img.height,
            size: img.size,
            createdAt: img.createdAt
        }))
    });
});



// @desc    Upload images for style transfer (content + style)
// @route   POST /api/images/upload-style-transfer
// @access  Private
export const uploadStyleTransferImages = catchAsync(async (req, res, next) => {
    // Check if both images are provided
    if (!req.files || !req.files.content || !req.files.style) {
        return next(new AppError('Please upload both content and style images', 400));
    }

    const contentFile = req.files.content[0];
    const styleFile = req.files.style[0];

    // Save content image
    const contentImage = await Image.create({
        user: req.user._id,
        publicId: contentFile.filename,
        imageUrl: contentFile.path,
        format: contentFile.format,
        width: contentFile.width,
        height: contentFile.height,
        size: contentFile.bytes,
        localPath: contentFile.localPath || null
    });

    // Save style image
    const styleImage = await Image.create({
        user: req.user._id,
        publicId: styleFile.filename,
        imageUrl: styleFile.path,
        format: styleFile.format,
        width: styleFile.width,
        height: styleFile.height,
        size: styleFile.bytes,
        localPath: styleFile.localPath || null
    });

    res.status(201).json({
        success: true,
        message: 'Images uploaded successfully for style transfer',
        data: {
            content: {
                id: contentImage._id,
                imageUrl: contentImage.imageUrl,
                publicId: contentImage.publicId,
                format: contentImage.format,
                width: contentImage.width,
                height: contentImage.height,
                size: contentImage.size,
                createdAt: contentImage.createdAt
            },
            style: {
                id: styleImage._id,
                imageUrl: styleImage.imageUrl,
                publicId: styleImage.publicId,
                format: styleImage.format,
                width: styleImage.width,
                height: styleImage.height,
                size: styleImage.size,
                createdAt: styleImage.createdAt
            }
        }
    });
});



// @desc    Delete image
// @route   DELETE /api/images/:publicId
// @access  Private
export const deleteImage = catchAsync(async (req, res, next) => {
    const { publicId } = req.params;

    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    // Find image in database
    const image = await Image.findOne({ publicId });

    if (!image) {
        return next(new AppError('Image not found', 404));
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
        return next(new AppError('Failed to delete image from Cloudinary', 500));
    }

    // Delete from database
    await Image.findByIdAndDelete(image._id);

    res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
    });
});



// @desc    Delete all images for authenticated user
// @route   DELETE /api/images/delete-all
// @access  Private
export const deleteAllImages = catchAsync(async (req, res, next) => {
    // Find all images for the user
    const images = await Image.find({ user: req.user._id });

    if (!images || images.length === 0) {
        return next(new AppError('No images found to delete', 404));
    }

    // Delete all images from Cloudinary
    const deletePromises = images.map(image => 
        cloudinary.uploader.destroy(image.publicId).catch(err => {
            console.warn(`Failed to delete ${image.publicId} from Cloudinary:`, err.message);
            return { result: 'failed', publicId: image.publicId };
        })
    );

    await Promise.all(deletePromises);

    // Delete all images from database
    const deleteResult = await Image.deleteMany({ user: req.user._id });

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${deleteResult.deletedCount} images`,
        data: {
            deletedCount: deleteResult.deletedCount
        }
    });
});



// @desc    Get image details
// @route   GET /api/images/:publicId
// @access  Private
export const getImageDetails = catchAsync(async (req, res, next) => {
    const { publicId } = req.params;

    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    // Get image from database
    const image = await Image.findOne({ publicId }).populate('user', 'name email');

    if (!image) {
        return next(new AppError('Image not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            id: image._id,
            publicId: image.publicId,
            url: image.imageUrl,
            format: image.format,
            width: image.width,
            height: image.height,
            size: image.size,
            user: image.user,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
        }
    });
});




// @desc    Crop image and replace original
// @route   PATCH /api/images/crop
// @access  Private
export const cropImage = catchAsync(async (req, res, next) => {
    const { publicId, x, y, width, height } = req.body;

    /*  x - Starting X coordinate (left edge)
        y - Starting Y coordinate (top edge)
        width - How wide the crop should be
        height - How tall the crop should be 
    */


    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (x === undefined || y === undefined || !width || !height) {
        return next(new AppError('Please provide crop coordinates (x, y, width, height)', 400));
    }

    // Validate coordinates are positive numbers
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
        return next(new AppError('Invalid crop coordinates', 400));
    }

    // Find original image in database
    const image = await Image.findOne({ publicId });

    if (!image) {
        return next(new AppError('Image not found', 404));
    }

    const oldPublicId = image.publicId;

    // Upload cropped version to Cloudinary as a new image
    const cropResult = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        eager: [{
            crop: 'crop',
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height)
        }],
        eager_async: false
    });

    const croppedImageData = cropResult.eager[0];
    const newPublicId = cropResult.public_id;

    // Delete old image from Cloudinary
    await cloudinary.uploader.destroy(oldPublicId);

    // Update image record in database with cropped version
    image.publicId = newPublicId;
    image.imageUrl = croppedImageData.secure_url;
    image.width = croppedImageData.width;
    image.height = croppedImageData.height;
    image.size = croppedImageData.bytes;
    image.format = cropResult.format;

    await image.save();

    res.status(200).json({
        success: true,
        message: 'Image cropped and updated successfully',
        data: {
            id: image._id,
            publicId: image.publicId,
            imageUrl: image.imageUrl,
            width: image.width,
            height: image.height,
            size: image.size,
            format: image.format,
            updatedAt: image.updatedAt
        }
    });
});

