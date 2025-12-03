import express from 'express';
import { 
    relightImage, 
    enhanceImage,
    faceRestore,
    styleTransfer,
    removeBackground
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';
import { route } from '../AI/gemini.js';

const router = express.Router();

// All routes require authentication
router.use(protect);


// AI processing routes
router.post('/relight', relightImage);
router.post('/enhance', enhanceImage);
router.post('/face-restore', faceRestore);
router.post('/style-transfer', styleTransfer);
router.post('/remove-background', removeBackground);

export default router;
