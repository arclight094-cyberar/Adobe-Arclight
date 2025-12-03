import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Project from '../models/Project.js';
import Image from '../models/Image.js';

// @desc    Create new project from uploaded image
// @route   POST /api/projects/create
// @access  Private
export const createProject = catchAsync(async (req, res, next) => {
    const { publicId, title } = req.body;

    // Validate publicId
    if (!publicId) {
        return next(new AppError('Please provide image public ID', 400));
    }

    // Find the uploaded image
    const image = await Image.findOne({ publicId, user: req.user._id });

    if (!image) {
        return next(new AppError('Image not found or does not belong to you', 404));
    }

    // Get user's maxVersions setting
    const maxVersions = req.user.settings?.maxVersions || 10;

    // Create project with original image
    const project = await Project.create({
        user: req.user._id,
        title: title || 'Untitled Project',
        maxVersions: maxVersions,
        originalImage: {
            imageUrl: image.imageUrl,
            publicId: image.publicId,
            prompt: '',
            operation: 'original',
            width: image.width,
            height: image.height,
            format: image.format,
            size: image.size
        },
        versions: []
    });

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: {
            projectId: project._id,
            title: project.title,
            originalImage: project.originalImage,
            maxVersions: project.maxVersions,
            createdAt: project.createdAt
        }
    });
});




// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
export const getUserProjects = catchAsync(async (req, res, next) => {
    const projects = await Project.find({ user: req.user._id })
        .sort({ updatedAt: -1 })
        .select('title originalImage versions createdAt updatedAt');

    // Add latest image preview for each project
    const projectsWithPreview = projects.map(project => ({
        projectId: project._id,
        title: project.title,
        latestImage: project.getLatestVersion(),
        totalVersions: project.versions.length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
    }));

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projectsWithPreview
    });
});




// @desc    Get project details with all versions
// @route   GET /api/projects/:projectId
// @access  Private
export const getProjectDetails = catchAsync(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
        return next(new AppError('Please provide project ID', 400));
    }

    const project = await Project.findById(projectId).populate('user', 'name email');

    if (!project) {
        return next(new AppError('Project not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            projectId: project._id,
            title: project.title,
            user: project.user,
            originalImage: project.originalImage,
            versions: project.versions,
            totalVersions: project.versions.length,
            maxVersions: project.maxVersions,
            latestVersion: project.getLatestVersion(),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        }
    });
});




// @desc    Add new version to project (after AI processing)
// @route   POST /api/projects/:projectId/add-version
// @access  Private
export const addVersionToProject = catchAsync(async (req, res, next) => {
    const { projectId } = req.params;
    const { imageUrl, publicId, prompt, operation, width, height, format, size } = req.body;

    if (!projectId) {
        return next(new AppError('Please provide project ID', 400));
    }

    if (!imageUrl || !publicId) {
        return next(new AppError('Image URL and public ID are required', 400));
    }

    const project = await Project.findById(projectId);

    if (!project) {
        return next(new AppError('Project not found', 404));
    }

    // Add new version
    await project.addVersion({
        imageUrl,
        publicId,
        prompt: prompt || '',
        operation: operation || 'custom',
        width,
        height,
        format,
        size
    });

    res.status(200).json({
        success: true,
        message: 'Version added to project',
        data: {
            projectId: project._id,
            totalVersions: project.versions.length,
            latestVersion: project.getLatestVersion()
        }
    });
});




// @desc    Update project title
// @route   PATCH /api/projects/:projectId/title
// @access  Private
export const updateProjectTitle = catchAsync(async (req, res, next) => {
    const { projectId } = req.params;
    const { title } = req.body;

    if (!projectId) {
        return next(new AppError('Please provide project ID', 400));
    }

    if (!title) {
        return next(new AppError('Please provide a title', 400));
    }

    const project = await Project.findByIdAndUpdate(
        projectId,
        { title: title },
        { new: true, runValidators: true }
    );

    if (!project) {
        return next(new AppError('Project not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Project title updated',
        data: {
            projectId: project._id,
            title: project.title
        }
    });
});




// @desc    Delete project
// @route   DELETE /api/projects/:projectId
// @access  Private
export const deleteProject = catchAsync(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
        return next(new AppError('Please provide project ID', 400));
    }

    const project = await Project.findById(projectId);

    if (!project) {
        return next(new AppError('Project not found', 404));
    }

    // TODO: Delete all images from Cloudinary (original + versions)
    // const imagesToDelete = [project.originalImage.publicId, ...project.versions.map(v => v.publicId)];
    // await Promise.all(imagesToDelete.map(id => cloudinary.uploader.destroy(id)));

    await Project.findByIdAndDelete(projectId);

    res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
    });
});
