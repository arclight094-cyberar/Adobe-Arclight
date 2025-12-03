import express from 'express';
import { 
    analyzeImage,
    processPrompt,
    analyzeImageWithPrompt
} from '../controllers/geminiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Gemini AI analysis routes
router.post('/analyze', analyzeImage);
router.post('/prompt', processPrompt);
router.post('/analyze-with-prompt', analyzeImageWithPrompt);

export default router;
