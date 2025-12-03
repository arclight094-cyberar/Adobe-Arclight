import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Image from '../models/Image.js';
import { route as geminiRoute } from '../AI/gemini.js';
import { relightImage, enhanceImage, styleTransfer } from './aiController.js';
import fs from 'fs/promises';

// Helper function for conditional logging
const isDevelopment = (process.env.NODE_ENV || '').trim() === 'development';
const log = {
    info: (...args) => isDevelopment && console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    timing: (...args) => console.log(...args)
};

// @desc    Analyze image and get AI editing suggestions using Gemini
// @route   POST /api/gemini/analyze
// @access  Private
export const analyzeImage = catchAsync(async (req, res, next) => {
    const { publicId } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
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

    log.info('Starting image analysis with Gemini AI...');

    // Read local image file
    const imageBuffer = await fs.readFile(image.localPath);

    // Get Gemini API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        return next(new AppError('Gemini API key not configured', 500));
    }

    // Analyze image using Gemini
    const analysis = await geminiRoute(geminiApiKey, {
        imageBytes: imageBuffer,
        userText: null
    });

    log.timing('[Gemini] Image analysis completed');

    // Send response
    res.status(200).json({
        success: true,
        message: 'Image analyzed successfully',
        data: {
            imageId: image._id,
            imageUrl: image.imageUrl,
            publicId: image.publicId,
            analysis: analysis,
            availableActions: {
                relight: {
                    endpoint: '/api/v1/adobe-ps/ai/relight',
                    description: 'Adjust lighting and brightness for low-light images',
                    params: { publicId, brightness: '0.5' }
                },
                denoise: {
                    endpoint: '/api/v1/adobe-ps/ai/enhance',
                    description: 'Remove noise from images',
                    params: { publicId, mode: 'denoise' }
                },
                deblur: {
                    endpoint: '/api/v1/adobe-ps/ai/enhance',
                    description: 'Remove blur and sharpen images',
                    params: { publicId, mode: 'deblur' }
                },
                faceRestore: {
                    endpoint: '/api/v1/adobe-ps/ai/face-restore',
                    description: 'Restore and enhance faces in images using CodeFormer',
                    params: { publicId, fidelity: '0.7' }
                },
                styleTransfer: {
                    endpoint: '/api/v1/adobe-ps/ai/style-transfer',
                    description: 'Apply artistic styles to images (requires uploading a separate style reference image)',
                    params: { contentPublicId: 'current_image_id', stylePublicId: 'style_reference_image_id' }
                }
            }
        }
    });
});

// @desc    Process user text prompt with Gemini and automatically execute the action
// @route   POST /api/gemini/prompt
// @access  Private
export const processPrompt = catchAsync(async (req, res, next) => {
    const { publicId, prompt } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (!prompt) {
        return next(new AppError('Please provide a text prompt', 400));
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

    log.info('Processing user prompt with Gemini AI...');

    // Read local image file
    const imageBuffer = await fs.readFile(image.localPath);

    // Get Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        return next(new AppError('Gemini API key not configured', 500));
    }

    // Analyze prompt with image using Gemini
    const intentAnalysis = await geminiRoute(geminiApiKey, {
        imageBytes: imageBuffer,
        userText: prompt
    });

    // Parse JSON response
    let parsedIntent;
    try {
        // Remove markdown code blocks if present
        const cleanJson = intentAnalysis.replace(/```json\n?|```\n?/g, '').trim();
        parsedIntent = JSON.parse(cleanJson);
    } catch (err) {
        log.error('Failed to parse Gemini response:', err);
        return next(new AppError('Failed to analyze prompt. Please try again.', 500));
    }

    log.timing('[Gemini] Prompt analysis completed');

    // Check if feature is supported
    if (!parsedIntent.supported) {
        return res.status(200).json({
            success: false,
            message: parsedIntent.message,
            data: {
                userPrompt: prompt,
                supported: false,
                availableFeatures: ['relight', 'denoise', 'deblur']
            }
        });
    }

    // Execute the appropriate action based on Gemini's analysis
    log.info(`Executing action: ${parsedIntent.feature}`);

    try {
        switch (parsedIntent.feature) {
            case 'relighting':
                // Call relight function directly
                req.body = { publicId, brightness: 0.5 };
                await relightImage(req, res, next);
                return; // relightImage sends response

            case 'auto_enhance':
                // Determine mode (denoise or deblur) based on message
                const mode = parsedIntent.message.toLowerCase().includes('blur') ? 'deblur' : 'denoise';
                req.body = { publicId, mode };
                await enhanceImage(req, res, next);
                return; // enhanceImage sends response

            default:
                return next(new AppError(`Feature "${parsedIntent.feature}" is recognized but not yet implemented`, 501));
        }
    } catch (error) {
        log.error('Error executing AI action:', error);
        return next(new AppError(`Failed to execute ${parsedIntent.feature}: ${error.message}`, 500));
    }
});




//------------------------------------------- not implemented fully yet -------------------------------------------------//

// @desc    Analyze image with user prompt (combined analysis)
// @route   POST /api/gemini/analyze-with-prompt
// @access  Private
export const analyzeImageWithPrompt = catchAsync(async (req, res, next) => {
    const { publicId, prompt } = req.body;

    // Validation
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    if (!prompt) {
        return next(new AppError('Please provide a text prompt', 400));
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

    log.info('Starting combined image and prompt analysis with Gemini AI...');

    // Read local image file
    const imageBuffer = await fs.readFile(image.localPath);

    // Get Gemini API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        return next(new AppError('Gemini API key not configured', 500));
    }

    // Analyze image with prompt using Gemini
    const analysis = await geminiRoute(geminiApiKey, {
        imageBytes: imageBuffer,
        userText: prompt
    });

    // Parse JSON response
    let parsedAnalysis;
    try {
        const cleanJson = analysis.replace(/```json\n?|```\n?/g, '').trim();
        parsedAnalysis = JSON.parse(cleanJson);
    } catch (err) {
        // If not JSON, return raw response
        parsedAnalysis = { response: analysis };
    }

    log.timing('[Gemini] Combined analysis completed');

    // Send response
    res.status(200).json({
        success: true,
        message: 'Image and prompt analyzed successfully',
        data: {
            imageId: image._id,
            imageUrl: image.imageUrl,
            publicId: image.publicId,
            userPrompt: prompt,
            analysis: parsedAnalysis
        }
    });
});
