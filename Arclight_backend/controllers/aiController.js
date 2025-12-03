import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { cloudinary } from '../config/cloudinary.js';
import Image from '../models/Image.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';


const execAsync = promisify(exec);

// Helper function for conditional logging
const isDevelopment = (process.env.NODE_ENV || '').trim() === 'development';
const log = {
    info: (...args) => isDevelopment && console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    timing: (...args) => console.log(...args) // Always log timing info
};

// Docker container configuration for AI models
const AI_CONTAINERS = {
    LOWLIGHT: {
        name: 'lowlight-service',
        image: 'sameer513/lowlight-cpu-bullseye'
    },
    FACE_RESTORE: {
        name: 'codeformer-service',
        image: 'sameer513/codeformer_app'
    },
    ENHANCE: {
        name: 'nafnet-service',
        image: 'sameer513/nafnet-image'
    },
    STYLE_TRANSFER: {
        name: 'style-transfer-service',
        image: 'sameer513/pca-style-transfer-fixed'
    }
};

// Helper function to ensure container is running
async function ensureContainerRunning(containerName, imageName) {
    try {
        // Try to start existing container
        await execAsync(`docker start ${containerName}`);
        log.info(`Container ${containerName} restarted`);
    } catch (err) {
        // Container doesn't exist, create it
        log.info(`Creating container ${containerName}...`);
        await execAsync(`docker run -d --name ${containerName} ${imageName} tail -f /dev/null`);
        log.info(`Container ${containerName} created`);
    }
}

//---------------------------- AI Controllers ----------------------------//

// @desc    Relight image using AI model
// @route   POST /api/ai/relight
// @access  Private
export const relightImage = catchAsync(async (req, res, next) => {
    const { publicId, brightness = 0.5 } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (brightness < 0.1 || brightness > 3.0) {
        return next(new AppError('Brightness must be between 0.1 and 3.0', 400));
    }

    // Find image in database
    const image = await Image.findOne({ publicId });

    if (!image) {
        return next(new AppError('Image not found', 404));
    }

    // Check if local file exists
    if (!image.localPath) {
        return next(new AppError('Local image file not found. Please re-upload the image.', 404));
    }

    await fs.access(image.localPath);

    // Prepare paths with unique identifiers to avoid conflicts
    const inputPath = image.localPath;
    const inputFilename = path.basename(inputPath);
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    const outputFilename = `${path.parse(inputPath).name}_relight_${uniqueId}.${image.format}`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    // Docker configuration - use persistent container
    const containerName = AI_CONTAINERS.LOWLIGHT.name;
    const dockerImage = AI_CONTAINERS.LOWLIGHT.image;

    log.info('Starting AI relight processing with Docker...');
    log.info('Input image:', inputPath);
    log.info('Output will be saved to:', outputPath);

    const startTime = Date.now();

    // Ensure container is running
    await ensureContainerRunning(containerName, dockerImage);

    // Copy input image to container
    log.info('Copying image to Docker container...');
    await execAsync(`docker cp "${inputPath}" ${containerName}:/app/${inputFilename}`);
    log.info('Image copied to container');

    // Run AI model inside container
    log.info('Running AI model (this may take 30-60 seconds)...');
    const processCommand = `docker exec ${containerName} python infer.py --weights best_model_LOLv1.pth --input ${inputFilename} --output ${outputFilename} --brightness ${brightness}`;
    const { stdout, stderr } = await execAsync(processCommand, {
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    log.timing(`[Relight] Processing completed in ${processingTime} seconds`);

    if (stdout) {
        log.info('AI output:', stdout.trim());
    }
    if (stderr && !stderr.includes('Saved:') && !stderr.includes('Resized')) {
        log.warn('AI warnings:', stderr.trim());
    }

    // Copy result back from container
    log.info('Copying result from Docker container...');
    await execAsync(`docker cp ${containerName}:/app/${outputFilename} "${outputPath}"`);
    log.info('Result copied from container');

    // Clean up files inside container to avoid accumulation
    await execAsync(`docker exec ${containerName} rm -f /app/${inputFilename} /app/${outputFilename}`).catch(err => {
        log.warn('Failed to cleanup container files:', err.message);
    });
    log.info('Container files cleaned up');

    // Check if output file was created
    await fs.access(outputPath);
    log.info('Output file created successfully');

    // Upload relit image to Cloudinary
    log.info('Uploading processed image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
        folder: 'adobe-ps-uploads',
        resource_type: 'image',
        public_id: `relight_${image.publicId}_${Date.now()}`
    });

    // Save relit image to database
    const relitImage = await Image.create({
        user: req.user._id,
        publicId: uploadResult.public_id,
        imageUrl: uploadResult.secure_url,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes,
        localPath: null // Don't store local path for processed images
    });

    // Send response first
    res.status(200).json({
        success: true,
        message: 'Image relit successfully',
        data: {
            originalImageId: image._id,
            originalImageUrl: image.imageUrl,
            relitImageId: relitImage._id,
            relitImageUrl: relitImage.imageUrl,
            publicId: relitImage.publicId,
            brightness: brightness,
            format: relitImage.format,
            width: relitImage.width,
            height: relitImage.height,
            size: relitImage.size,
            createdAt: relitImage.createdAt
        }
    });

    // Clean up local files after response is sent (non-blocking)
    res.on('finish', async () => {
        // Delete AI output image
        if (outputPath) {
            await fs.unlink(outputPath).catch(err => {
                log.warn('Failed to delete output image:', err.message);
            });
            log.info('Cleaned up output image:', outputPath);
        }

        // Delete original uploaded image (if it exists and was used for processing)
        if (image.localPath) {
            await fs.unlink(image.localPath).catch(err => {
                log.warn('Failed to delete original image:', err.message);
            });
            log.info('Cleaned up original image:', image.localPath);

            // Update database to remove localPath reference
            image.localPath = null;
            await image.save().catch(err => {
                log.warn('Failed to update image localPath in database:', err.message);
            });
        }
    });
});



// @desc    Face restoration using CodeFormer
// @route   POST /api/ai/face-restore
// @access  Private
export const faceRestore = catchAsync(async (req, res, next) => {
    const { publicId, fidelity = 0.7 } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (fidelity < 0 || fidelity > 1) {
        return next(new AppError('Fidelity must be between 0 and 1', 400));
    }

    // Find image in database
    const image = await Image.findOne({ publicId });

    // Check if image exists
    if (!image) {
        return next(new AppError('Image not found', 404));
    }

    // Check if local file exists
    if (!image.localPath) {
        return next(new AppError('Local image file not found. Please re-upload the image.', 404));
    }

    await fs.access(image.localPath);

    // Prepare paths with unique identifiers to avoid conflicts
    const inputPath = image.localPath;
    const inputFilename = path.basename(inputPath);
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    const outputFilename = `${path.parse(inputPath).name}_restored_${uniqueId}.${image.format}`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    // Docker configuration - use persistent container
    const containerName = AI_CONTAINERS.FACE_RESTORE.name;
    const dockerImage = AI_CONTAINERS.FACE_RESTORE.image;

    log.info('Starting AI face restoration with Docker...');
    log.info('Input image:', inputPath);
    log.info('Output will be saved to:', outputPath);

    const startTime = Date.now();

    // Ensure container is running
    await ensureContainerRunning(containerName, dockerImage);

    // Copy input image to container
    log.info('Copying image to Docker container...');
    await execAsync(`docker cp "${inputPath}" ${containerName}:/cf/input/${inputFilename}`);
    log.info('Image copied to container');

    // Run CodeFormer inside container (without face_upsample and has_aligned to avoid bugs)
    log.info('Running CodeFormer face restoration (this may take 30-60 seconds)...');
    const processCommand = `docker exec ${containerName} bash -c "cd /cf/CodeFormer && python inference_codeformer.py --w ${fidelity} --test_path /cf/input"`;
    const { stdout, stderr } = await execAsync(processCommand, {
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    log.timing(`[FaceRestore] Processing completed in ${processingTime} seconds`);

    if (stdout) {
        log.info('AI output:', stdout.trim());
    }
    if (stderr) {
        log.warn('AI warnings:', stderr.trim());
    }

    // Copy result back from container
    log.info('Copying result from Docker container...');
    // CodeFormer saves to /cf/output/input_{w}/final_results/ and converts to PNG
    const outputFilenameBase = path.parse(inputFilename).name;
    const containerOutputPath = `/cf/output/input_${fidelity}/final_results/${outputFilenameBase}.png`;
    await execAsync(`docker cp ${containerName}:${containerOutputPath} "${outputPath}"`);
    log.info('Result copied from container');

    // Clean up files inside container to avoid accumulation
    await execAsync(`docker exec ${containerName} rm -rf /cf/input/${inputFilename} /cf/output/input_${fidelity}`).catch(err => {
        log.warn('Failed to cleanup container files:', err.message);
    });
    log.info('Container files cleaned up');

    // Check if output file was created
    await fs.access(outputPath);
    log.info('Output file created successfully');

    // Upload restored image to Cloudinary
    log.info('Uploading processed image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
        folder: 'adobe-ps-uploads',
        resource_type: 'image',
        public_id: `face_restore_${image.publicId}_${Date.now()}`
    });

    // Save restored image to database
    const restoredImage = await Image.create({
        user: req.user._id,
        publicId: uploadResult.public_id,
        imageUrl: uploadResult.secure_url,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes,
        localPath: null
    });

    // Send response first
    res.status(200).json({
        success: true,
        message: 'Face restored successfully',
        data: {
            originalImageId: image._id,
            originalImageUrl: image.imageUrl,
            restoredImageId: restoredImage._id,
            restoredImageUrl: restoredImage.imageUrl,
            publicId: restoredImage.publicId,
            fidelity: fidelity,
            format: restoredImage.format,
            width: restoredImage.width,
            height: restoredImage.height,
            size: restoredImage.size,
            createdAt: restoredImage.createdAt
        }
    });

    // Clean up local files after response is sent (non-blocking)
    res.on('finish', async () => {
        // Delete AI output image
        if (outputPath) {
            await fs.unlink(outputPath).catch(err => {
                log.warn('Failed to delete output image:', err.message);
            });
            log.info('Cleaned up output image:', outputPath);
        }

        // Delete original uploaded image
        if (image.localPath) {
            await fs.unlink(image.localPath).catch(err => {
                log.warn('Failed to delete original image:', err.message);
            });
            log.info('Cleaned up original image:', image.localPath);

            // Update database to remove localPath reference
            image.localPath = null;
            await image.save().catch(err => {
                log.warn('Failed to update image localPath in database:', err.message);
            });
        }
    });
});



// @desc    Enhance(denoise , deblur) image using NafNet
// @route   POST /api/ai/enhance
// @access  Private
export const enhanceImage = catchAsync(async (req, res, next) => {
    const { publicId, mode } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (!mode) {
        return next(new AppError('Please provide mode (denoise or deblur)', 400));
    }

    if (!['denoise', 'deblur'].includes(mode)) {
        return next(new AppError('Mode must be either "denoise" or "deblur"', 400));
    }

    // Find image in database
    const image = await Image.findOne({ publicId });

    if (!image) {
        return next(new AppError('Image not found', 404));
    }

    // Check if local file exists
    if (!image.localPath) {
        return next(new AppError('Local image file not found. Please re-upload the image.', 404));
    }

    await fs.access(image.localPath);

    // Prepare paths with unique identifiers to avoid conflicts
    const inputPath = image.localPath;
    const inputFilename = path.basename(inputPath);
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    const outputFilename = `${path.parse(inputPath).name}_${mode}_${uniqueId}.${image.format}`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    // Docker configuration - use persistent container
    const containerName = AI_CONTAINERS.ENHANCE.name;
    const dockerImage = AI_CONTAINERS.ENHANCE.image;

    log.info(`Starting AI ${mode} processing with Docker...`);
    log.info('Input image:', inputPath);
    log.info('Output will be saved to:', outputPath);

    const startTime = Date.now();

    // Ensure container is running
    await ensureContainerRunning(containerName, dockerImage);

    // Copy input image to container
    log.info('Copying image to Docker container...');
    await execAsync(`docker cp "${inputPath}" ${containerName}:/app/demo/${inputFilename}`);
    log.info('Image copied to container');

    // Set PYTHONPATH and run AI model inside container
    log.info(`Running AI model for ${mode} (this may take 30-60 seconds)...`);
    
    // Choose config file based on mode
    const configFile = mode === 'denoise' 
        ? 'options/test/SIDD/NAFNet-width64.yml' 
        : 'options/test/REDS/NAFNet-width64.yml';
    
    const processCommand = `docker exec ${containerName} bash -c "export PYTHONPATH=/app:$PYTHONPATH && python3 basicsr/demo.py -opt ${configFile} --input_path ./demo/${inputFilename} --output_path ./demo/${outputFilename}"`;
    const { stdout, stderr } = await execAsync(processCommand, {
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    log.timing(`[Enhance-${mode}] Processing completed in ${processingTime} seconds`);

    if (stdout) {
        log.info('AI output:', stdout.trim());
    }
    if (stderr) {
        log.warn('AI warnings:', stderr.trim());
    }

    // Copy result back from container
    log.info('Copying result from Docker container...');
    await execAsync(`docker cp ${containerName}:/app/demo/${outputFilename} "${outputPath}"`);
    log.info('Result copied from container');

    // Clean up files inside container to avoid accumulation
    await execAsync(`docker exec ${containerName} rm -f /app/demo/${inputFilename} /app/demo/${outputFilename}`).catch(err => {
        log.warn('Failed to cleanup container files:', err.message);
    });
    log.info('Container files cleaned up');

    // Check if output file was created
    await fs.access(outputPath);
    log.info('Output file created successfully');

    // Upload enhanced image to Cloudinary
    log.info('Uploading processed image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
        folder: 'adobe-ps-uploads',
        resource_type: 'image',
        public_id: `${mode}_${image.publicId}_${Date.now()}`
    });

    // Save enhanced image to database
    const enhancedImage = await Image.create({
        user: req.user._id,
        publicId: uploadResult.public_id,
        imageUrl: uploadResult.secure_url,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes,
        localPath: null
    });

    // Send response first
    res.status(200).json({
        success: true,
        message: `Image ${mode}d successfully`,
        data: {
            originalImageId: image._id,
            originalImageUrl: image.imageUrl,
            enhancedImageId: enhancedImage._id,
            enhancedImageUrl: enhancedImage.imageUrl,
            publicId: enhancedImage.publicId,
            mode: mode,
            format: enhancedImage.format,
            width: enhancedImage.width,
            height: enhancedImage.height,
            size: enhancedImage.size,
            createdAt: enhancedImage.createdAt
        }
    });

    // Clean up local files after response is sent (non-blocking)
    res.on('finish', async () => {
        // Delete AI output image
        if (outputPath) {
            await fs.unlink(outputPath).catch(err => {
                log.warn('Failed to delete output image:', err.message);
            });
            log.info('Cleaned up output image:', outputPath);
        }

        // Delete original uploaded image
        if (image.localPath) {
            await fs.unlink(image.localPath).catch(err => {
                log.warn('Failed to delete original image:', err.message);
            });
            log.info('Cleaned up original image:', image.localPath);

            // Update database to remove localPath reference
            image.localPath = null;
            await image.save().catch(err => {
                log.warn('Failed to update image localPath in database:', err.message);
            });
        }
    });
});


// @desc    Style transfer using PCA-based model
// @route   POST /api/ai/style-transfer
// @access  Private
export const styleTransfer = catchAsync(async (req, res, next) => {
    const { contentPublicId, stylePublicId } = req.body;

    // Validation
    if (!contentPublicId) {
        return next(new AppError('Please provide content image public ID', 400));
    }

    if (!stylePublicId) {
        return next(new AppError('Please provide style image public ID', 400));
    }

    // Find both images in database
    const contentImage = await Image.findOne({ publicId: contentPublicId });
    const styleImage = await Image.findOne({ publicId: stylePublicId });

    if (!contentImage) {
        return next(new AppError('Content image not found', 404));
    }

    if (!styleImage) {
        return next(new AppError('Style image not found', 404));
    }

    // Check if local files exist
    if (!contentImage.localPath) {
        return next(new AppError('Content image local file not found. Please re-upload the image.', 404));
    }

    if (!styleImage.localPath) {
        return next(new AppError('Style image local file not found. Please re-upload the image.', 404));
    }

    await fs.access(contentImage.localPath);
    await fs.access(styleImage.localPath);

    // Prepare paths with unique identifiers
    const contentPath = contentImage.localPath;
    const stylePath = styleImage.localPath;
    const contentFilename = path.basename(contentPath);
    const styleFilename = path.basename(stylePath);
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    const outputFilename = `styled_${uniqueId}.jpg`;
    const outputPath = path.join(path.dirname(contentPath), outputFilename);

    // Docker configuration - use persistent container
    const containerName = AI_CONTAINERS.STYLE_TRANSFER.name;
    const dockerImage = AI_CONTAINERS.STYLE_TRANSFER.image;

    log.info('Starting AI style transfer with Docker...');
    log.info('Content image:', contentPath);
    log.info('Style image:', stylePath);
    log.info('Output will be saved to:', outputPath);

    const startTime = Date.now();

    // Ensure container is running
    await ensureContainerRunning(containerName, dockerImage);

    // Copy content image to container
    log.info('Copying content image to Docker container...');
    await execAsync(`docker cp "${contentPath}" ${containerName}:/app/figures/content/${contentFilename}`);
    log.info('Content image copied to container');

    // Copy style image to container
    log.info('Copying style image to Docker container...');
    await execAsync(`docker cp "${stylePath}" ${containerName}:/app/figures/style/${styleFilename}`);
    log.info('Style image copied to container');

    // Run style transfer inside container
    log.info('Running style transfer (this may take 30-90 seconds)...');
    const processCommand = `docker exec ${containerName} python demo.py --content figures/content/${contentFilename} --style figures/style/${styleFilename}`;
    const { stdout, stderr } = await execAsync(processCommand, {
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    log.timing(`[StyleTransfer] Processing completed in ${processingTime} seconds`);

    if (stdout) {
        log.info('AI output:', stdout.trim());
    }
    if (stderr) {
        log.warn('AI warnings:', stderr.trim());
    }

    // Copy result back from container
    log.info('Copying result from Docker container...');
    await execAsync(`docker cp ${containerName}:/app/results/output.jpg "${outputPath}"`);
    log.info('Result copied from container');

    // Clean up files inside container to avoid accumulation
    await execAsync(`docker exec ${containerName} rm -f /app/figures/content/${contentFilename} /app/figures/style/${styleFilename} /app/results/output.jpg`).catch(err => {
        log.warn('Failed to cleanup container files:', err.message);
    });
    log.info('Container files cleaned up');

    // Check if output file was created
    await fs.access(outputPath);
    log.info('Output file created successfully');

    // Upload styled image to Cloudinary
    log.info('Uploading processed image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
        folder: 'adobe-ps-uploads',
        resource_type: 'image',
        public_id: `style_transfer_${contentImage.publicId}_${Date.now()}`
    });

    // Save styled image to database
    const styledImage = await Image.create({
        user: req.user._id,
        publicId: uploadResult.public_id,
        imageUrl: uploadResult.secure_url,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes,
        localPath: null
    });

    // Send response first
    res.status(200).json({
        success: true,
        message: 'Style transfer completed successfully',
        data: {
            contentImageId: contentImage._id,
            contentImageUrl: contentImage.imageUrl,
            styleImageId: styleImage._id,
            styleImageUrl: styleImage.imageUrl,
            styledImageId: styledImage._id,
            styledImageUrl: styledImage.imageUrl,
            publicId: styledImage.publicId,
            format: styledImage.format,
            width: styledImage.width,
            height: styledImage.height,
            size: styledImage.size,
            createdAt: styledImage.createdAt
        }
    });

    // Clean up local files after response is sent (non-blocking)
    res.on('finish', async () => {
        // Delete output image
        if (outputPath) {
            await fs.unlink(outputPath).catch(err => {
                log.warn('Failed to delete output image:', err.message);
            });
            log.info('Cleaned up output image:', outputPath);
        }

        // Delete content image
        if (contentImage.localPath) {
            await fs.unlink(contentImage.localPath).catch(err => {
                log.warn('Failed to delete content image:', err.message);
            });
            log.info('Cleaned up content image:', contentImage.localPath);

            contentImage.localPath = null;
            await contentImage.save().catch(err => {
                log.warn('Failed to update content image localPath in database:', err.message);
            });
        }

        // Delete style image
        if (styleImage.localPath) {
            await fs.unlink(styleImage.localPath).catch(err => {
                log.warn('Failed to delete style image:', err.message);
            });
            log.info('Cleaned up style image:', styleImage.localPath);

            styleImage.localPath = null;
            await styleImage.save().catch(err => {
                log.warn('Failed to update style image localPath in database:', err.message);
            });
        }
    });
});


//@desc remove background from image using AI
//@route POST /api/ai/remove-background
//@access Private
export const removeBackground = catchAsync(async (req, res, next) => {
    const { publicId, mode = 'object' } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (!['human', 'object'].includes(mode)) {
        return next(new AppError('Mode must be either "human" or "object"', 400));
    }

    // Find image in database
    const image = await Image.findOne({ publicId, user: req.user._id });

    if (!image) {
        return next(new AppError('Image not found or does not belong to you', 404));
    }

    // Check if local file exists
    if (!image.localPath) {
        return next(new AppError('Local image file not found. Please re-upload the image.', 404));
    }

    await fs.access(image.localPath);

    // Prepare paths with unique identifiers
    const inputPath = image.localPath;
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    const outputFilename = `${path.parse(inputPath).name}_nobg_${uniqueId}.png`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    // Determine rembg model based on mode
    const rembgModel = mode === 'human' ? 'u2net_human_seg' : 'u2netp';
    
    // Use full path to rembg.exe on Windows, or from environment variable
    const defaultRembgPath = process.platform === 'win32' 
        ? 'C:\\Users\\ayush\\AppData\\Roaming\\Python\\Python313\\Scripts\\rembg.exe'
        : 'rembg';
    const rembgPath = process.env.REMBG_PATH || defaultRembgPath;
    
    log.info('Starting background removal with rembg...');
    log.info('Mode:', mode);
    log.info('Model:', rembgModel);
    log.info('Rembg path:', rembgPath);
    log.info('Input image:', inputPath);
    log.info('Output will be saved to:', outputPath);

    const startTime = Date.now();

    // Execute rembg command with full path
    const rembgCommand = `"${rembgPath}" i -m ${rembgModel} "${inputPath}" "${outputPath}"`;
    log.info('Executing command:', rembgCommand);

    const { stdout, stderr } = await execAsync(rembgCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    if (stderr) {
        log.warn('rembg stderr:', stderr);
    }
    if (stdout) {
        log.info('rembg stdout:', stdout);
    }

    const processingTime = Date.now() - startTime;
    log.timing(`Background removal completed in ${processingTime}ms`);

    // Verify output file exists
    await fs.access(outputPath);
    const stats = await fs.stat(outputPath);
    log.info('Output file size:', stats.size, 'bytes');

    if (stats.size === 0) {
        return next(new AppError('Background removal produced an empty file', 500));
    }

    // Upload processed image to Cloudinary
    log.info('Uploading processed image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
        folder: 'adobe-ps-uploads',
        resource_type: 'image',
        allowed_formats: ['png', 'jpg', 'jpeg', 'webp']
    });

    // Save to database
    const processedImage = await Image.create({
        user: req.user._id,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        localPath: outputPath,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.bytes
    });

    log.info('Background removal process completed successfully');

    res.status(200).json({
        success: true,
        message: 'Background removed successfully',
        data: {
            originalImage: image.imageUrl,
            processedImageUrl: processedImage.imageUrl,
            publicId: processedImage.publicId,
            mode: mode,
            model: rembgModel,
            width: processedImage.width,
            height: processedImage.height,
            format: processedImage.format,
            size: processedImage.size,
            processingTime: `${processingTime}ms`
        }
    });

    // Cleanup input file after successful processing
    setTimeout(async () => {
        try {
            await fs.unlink(image.localPath);
            log.info('Cleaned up input image:', image.localPath);

            image.localPath = null;
            await image.save().catch(err => {
                log.warn('Failed to update image localPath in database:', err.message);
            });
        } catch (err) {
            log.warn('Failed to delete input image:', err.message);
        }
    }, 5000);
});