import express from 'express';
import {
    createProject,
    getUserProjects,
    getProjectDetails,
    addVersionToProject,
    updateProjectTitle,
    deleteProject
} from '../controllers/projectController.js';
import upload from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Project routes
router.post('/create', upload.single('image'), createProject); // Create new project with image
router.get('/', getUserProjects); // Get all user projects
router.get('/:projectId', getProjectDetails); // Get specific project with all versions
router.post('/:projectId/add-version', addVersionToProject); // Add new edited version
router.patch('/:projectId/title', updateProjectTitle); // Update project title
router.delete('/:projectId', deleteProject); // Delete project

export default router;
