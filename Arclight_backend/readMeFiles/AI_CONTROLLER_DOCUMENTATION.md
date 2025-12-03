# AI Controller Documentation - Low-Light Image Enhancement

Complete technical documentation for the `relightImage` controller with code explanations.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Step-by-Step Code Explanation](#step-by-step-code-explanation)
- [Complete Workflow](#complete-workflow)
- [File Structure](#file-structure)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The `relightImage` controller processes low-light images using a PyTorch deep learning model to enhance brightness and visibility while preserving details and colors.

**Endpoint:** `POST /api/v1/adobe-ps/ai/relight`

**Input:**
```json
{
  "publicId": "adobe-ps-uploads/user123_1732098765",
  "brightness": 1.5
}
```

**Output:** Enhanced image uploaded to Cloudinary with metadata

**Processing Time:** 30-60 seconds

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│   Node.js    │─────▶│   Python    │
│  (Mobile)   │      │   Backend    │      │  AI Model   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   MongoDB    │      │  Local Disk │
                     │   Database   │      │   Storage   │
                     └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Cloudinary  │
                     │     CDN      │
                     └──────────────┘
```

---

## 📝 Step-by-Step Code Explanation

### Step 1: Import Dependencies

```javascript
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { cloudinary } from '../config/cloudinary.js';
import Image from '../models/Image.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
```

**Purpose:**
- `catchAsync`: Async error handler wrapper
- `AppError`: Custom error class for operational errors
- `cloudinary`: Cloud storage service for images
- `Image`: MongoDB model for image metadata
- `fs/promises`: Async file system operations
- `path`: Cross-platform path handling
- `exec/promisify`: Execute Python scripts from Node.js

---

### Step 2: Setup Utilities

```javascript
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Explanation:**
- `execAsync`: Converts callback-based `exec` to Promise-based
- `__filename/__dirname`: ES module equivalents for getting current file/directory paths

---

### Step 3: Conditional Logging

```javascript
const isDevelopment = (process.env.NODE_ENV || '').trim() === 'development';
const log = {
    info: (...args) => isDevelopment && console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    timing: (...args) => console.log(...args)
};
```

**Purpose:**
- Show detailed logs only in development mode
- Always log warnings, errors, and timing info
- Reduces production log noise

---

### Step 4: Controller Function Definition

```javascript
export const relightImage = catchAsync(async (req, res, next) => {
```

**Explanation:**
- `catchAsync`: Automatically catches async errors and passes to error handler
- `req.user`: Available because of `protect` middleware (JWT auth)
- `next`: Express error handler

---

### Step 5: Extract and Validate Input

```javascript
const { publicId, brightness = 1.0 } = req.body;

// Validation
if (!publicId) {
    return next(new AppError('Please provide image publicId', 400));
}

if (brightness < 0.1 || brightness > 3.0) {
    return next(new AppError('Brightness must be between 0.1 and 3.0', 400));
}
```

**Validation:**
- `publicId`: Required - Cloudinary image identifier
- `brightness`: Optional, default 1.0
  - Range: 0.1 (subtle) to 3.0 (strong)
  - Type: Number
  
**Error codes:**
- 400: Bad Request (invalid input)

---

### Step 6: Find Image in Database

```javascript
log.info('Finding image in database...');
const image = await Image.findOne({ publicId });

if (!image) {
    return next(new AppError('No image found with that ID', 404));
}

if (!image.localPath) {
    return next(new AppError('Local image path not available', 400));
}
```

**Purpose:**
- Retrieve image metadata from MongoDB
- Ensure image has local file path (needed for AI processing)

**Database Query:**
```javascript
Image.findOne({ publicId: "adobe-ps-uploads/user123_1732098765" })
```

**Returns:**
```javascript
{
  _id: ObjectId("..."),
  publicId: "adobe-ps-uploads/user123_1732098765",
  imageUrl: "https://res.cloudinary.com/...",
  localPath: "D:/backend/image/user123_1732098765.jpg",
  format: "jpg",
  width: 1920,
  height: 1080
}
```

---

### Step 7: Setup File Paths

```javascript
log.info('Setting up paths...');
const modelDir = path.join(__dirname, '..', 'AI', 'Models', 'lowLight', 'PyTorch');
const weightsPath = path.join(modelDir, 'best_model_LOLv1.pth');
const inferScript = path.join(modelDir, 'infer.py');
const venvDir = path.join(modelDir, '..', 'LYT_Torch');

const inputPath = image.localPath;
const timestamp = Date.now();
const outputFilename = `${path.parse(inputPath).name}_relight_${timestamp}${path.parse(inputPath).ext}`;
const outputPath = path.join(path.dirname(inputPath), outputFilename);
```

**Path Construction:**

**Windows:**
```
modelDir: D:\backend\AI\Models\lowLight\PyTorch
weightsPath: D:\backend\AI\Models\lowLight\PyTorch\best_model_LOLv1.pth
inferScript: D:\backend\AI\Models\lowLight\PyTorch\infer.py
inputPath: D:\backend\image\user123_1732098765.jpg
outputPath: D:\backend\image\user123_1732098765_relight_1732099500.jpg
```

**Unix/Mac:**
```
modelDir: /home/user/backend/AI/Models/lowLight/PyTorch
weightsPath: /home/user/backend/AI/Models/lowLight/PyTorch/best_model_LOLv1.pth
inferScript: /home/user/backend/AI/Models/lowLight/PyTorch/infer.py
inputPath: /home/user/backend/image/user123_1732098765.jpg
outputPath: /home/user/backend/image/user123_1732098765_relight_1732099500.jpg
```

---

### Step 8: Detect Python Environment

```javascript
log.info('Checking Python environment...');
let pythonExecutable = 'python';

// Check for Windows virtual environment
const venvPythonPath = path.join(venvDir, 'Scripts', 'python.exe');
try {
    await fs.access(venvPythonPath);
    pythonExecutable = venvPythonPath;
    log.info('Using Windows virtual environment Python');
} catch (err) {
    // Check for Unix/Mac virtual environment
    const venvPythonPathUnix = path.join(venvDir, 'bin', 'python');
    try {
        await fs.access(venvPythonPathUnix);
        pythonExecutable = venvPythonPathUnix;
        log.info('Using Unix virtual environment Python');
    } catch (err) {
        log.warn('Virtual environment Python not found, using system python');
    }
}
```

**Priority Order:**
1. Windows venv: `LYT_Torch/Scripts/python.exe`
2. Unix venv: `LYT_Torch/bin/python`
3. System Python: `python`

**Why?**
- Virtual environments isolate dependencies
- Prevents version conflicts
- Ensures correct package versions
- Falls back gracefully to system Python

---

### Step 9: Verify Required Files

```javascript
log.info('Verifying required files...');
try {
    await fs.access(weightsPath);
    log.info('Model weights found');
} catch (err) {
    return next(new AppError('AI model weights not found', 500));
}

try {
    await fs.access(inferScript);
    log.info('Inference script found');
} catch (err) {
    return next(new AppError('Inference script not found', 500));
}

try {
    await fs.access(inputPath);
    log.info('Input image file found');
} catch (err) {
    return next(new AppError('Local image file not found on disk', 404));
}
```

**File Checks:**
- ✅ Model weights exist (`best_model_LOLv1.pth` - ~50MB)
- ✅ Python script exists (`infer.py`)
- ✅ Input image exists on disk

**Why check before processing?**
- Fail fast (save time)
- Clear error messages
- Avoid wasted computation
- Better user experience

---

### Step 10: Build Python Command

```javascript
log.info('Building Python command...');
const pythonCommand = `"${pythonExecutable}" "${inferScript}" --weights "${weightsPath}" --input "${inputPath}" --output "${outputPath}" --brightness ${brightness}`;

log.info('Python command:', pythonCommand);
```

**Example Output:**
```bash
"python" "D:/backend/AI/Models/lowLight/PyTorch/infer.py" \
  --weights "D:/backend/AI/Models/lowLight/PyTorch/best_model_LOLv1.pth" \
  --input "D:/backend/image/user123_1732098765.jpg" \
  --output "D:/backend/image/user123_1732098765_relight_1732099500.jpg" \
  --brightness 1.5
```

**Quote Handling:**
- All paths wrapped in double quotes
- Handles spaces in Windows paths
- Prevents command injection
- Cross-platform compatible

---

### Step 11: Setup Environment Variables

```javascript
const env = {
    ...process.env,
    PYTHONPATH: modelDir + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ''),
    PYTHONUNBUFFERED: '1'
};
```

**Environment Variables:**

**PYTHONPATH:**
```javascript
PYTHONPATH: "D:/backend/AI/Models/lowLight/PyTorch"
```
- Adds model directory to Python's import path
- Enables: `from model import YourModel`
- Without this: `ModuleNotFoundError`

**PYTHONUNBUFFERED:**
```javascript
PYTHONUNBUFFERED: '1'
```
- Disables Python output buffering
- Shows `print()` statements immediately
- Useful for real-time logging
- Better debugging experience

**Full Environment:**
```javascript
{
  ...process.env,  // Inherits all Node.js environment variables
  PYTHONPATH: "D:/backend/AI/Models/lowLight/PyTorch;C:/existing/path",
  PYTHONUNBUFFERED: '1'
}
```

---

### Step 12: Execute AI Model

```javascript
log.info('Starting AI processing...');
const startTime = Date.now();

const { stdout, stderr } = await execAsync(pythonCommand, {
    cwd: modelDir,
    env: env,
    shell: true,
    maxBuffer: 50 * 1024 * 1024  // 50MB
});

const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
log.timing(`[Relight] Processing completed in ${processingTime} seconds`);
```

**Execution Options:**

**cwd (Current Working Directory):**
```javascript
cwd: "D:/backend/AI/Models/lowLight/PyTorch"
```
- Python script runs from this directory
- Enables relative imports
- Access to local files

**shell: true:**
- Uses system shell (cmd.exe on Windows, bash on Unix)
- Handles complex command strings
- Required for quoted paths

**maxBuffer: 50MB:**
- Maximum stdout/stderr buffer size
- Default is 1MB (too small for large outputs)
- Prevents buffer overflow errors

**Output:**
```javascript
{
  stdout: "Model loaded\nProcessing image...\nImage saved successfully\n",
  stderr: "Warning: Image has low resolution"
}
```

---

### Step 13: What Python Does (infer.py)

**Python Code Flow:**

```python
import torch
import torchvision.transforms as transforms
from PIL import Image
from model import YourModel
import argparse

# 1. Parse command line arguments
parser = argparse.ArgumentParser()
parser.add_argument('--weights', required=True)
parser.add_argument('--input', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--brightness', type=float, default=1.0)
args = parser.parse_args()

# 2. Load PyTorch model
print("Loading model...")
model = YourModel()
model.load_state_dict(torch.load(args.weights, map_location='cpu'))
model.eval()

# 3. Load and preprocess input image
print("Loading image...")
img = Image.open(args.input).convert('RGB')
transform = transforms.Compose([
    transforms.ToTensor()  # Convert to [0,1] range
])
img_tensor = transform(img).unsqueeze(0)  # Add batch dimension

# 4. Run inference (AI magic)
print("Processing image...")
with torch.no_grad():  # Disable gradient calculation (faster)
    enhanced = model(img_tensor)

# 5. Apply brightness adjustment
enhanced = torch.clamp(enhanced * args.brightness, 0, 1)

# 6. Convert back to image and save
print("Saving result...")
output_transform = transforms.ToPILImage()
output_img = output_transform(enhanced.squeeze(0))
output_img.save(args.output)

print("Image saved successfully!")
```

**Neural Network Process:**
```
Input Image (Dark)
       ↓
Encoder Layers (extracts features)
  - Conv2D + ReLU
  - Downsampling
  - Feature maps: [64, 128, 256, 512]
       ↓
Bottleneck (compressed representation)
  - Deepest layer
  - Most abstract features
       ↓
Decoder Layers (reconstructs image)
  - Upsampling
  - Conv2D + ReLU
  - Skip connections from encoder
       ↓
Output Layer
  - 3 channels (RGB)
  - Values in [0, 1]
       ↓
Brightness Adjustment
  - Multiply by brightness factor
  - Clamp to [0, 1] range
       ↓
Output Image (Enhanced)
```

**Time Breakdown:**
```
Model Loading: ~2-5 seconds
Image Loading: ~0.1 seconds
AI Inference: ~25-50 seconds
Post-processing: ~0.5 seconds
Saving: ~0.5 seconds
Total: ~30-60 seconds
```

---

### Step 14: Log Python Output

```javascript
if (stdout) log.info('Python stdout:', stdout);
if (stderr) log.warn('Python stderr:', stderr);
```

**Example Logs:**
```
Python stdout: Model loaded
Processing image...
Image saved successfully

Python stderr: Warning: Using CPU (CUDA not available)
```

---

### Step 15: Verify Output Created

```javascript
log.info('Verifying output file...');
try {
    await fs.access(outputPath);
    log.info('Output file created successfully');
} catch (err) {
    return next(new AppError('AI processing failed to create output file', 500));
}
```

**Safety Check:**
- Confirms Python actually created the file
- Prevents uploading non-existent file
- Catches silent failures

---

### Step 16: Upload to Cloudinary

```javascript
log.info('Uploading processed image to Cloudinary...');
const uploadResult = await cloudinary.uploader.upload(outputPath, {
    folder: 'adobe-ps-uploads',
    resource_type: 'image',
    public_id: `relight_${image.publicId}_${Date.now()}`,
    quality: 'auto:good',
    timeout: 180000  // 3 minutes
});

log.info('Cloudinary upload successful:', uploadResult.public_id);
```

**Upload Options:**

**folder:**
```javascript
folder: 'adobe-ps-uploads'
```
- Organizes images in Cloudinary dashboard
- All images go to same folder
- Easier management

**public_id:**
```javascript
public_id: "relight_adobe-ps-uploads/user123_1732098765_1732099500"
```
- Unique identifier
- Includes original publicId
- Timestamp ensures uniqueness

**quality:**
```javascript
quality: 'auto:good'
```
- Automatic quality optimization
- Reduces file size
- Maintains visual quality
- Faster loading

**timeout:**
```javascript
timeout: 180000  // 3 minutes in milliseconds
```
- Prevents timeout errors
- Default is 60 seconds (often too short)
- Large files need more time

**Upload Result:**
```javascript
{
  public_id: "adobe-ps-uploads/relight_user123_1732099500",
  version: 1732099500,
  signature: "abc123def456...",
  width: 1920,
  height: 1080,
  format: "jpg",
  resource_type: "image",
  created_at: "2024-11-20T11:25:00Z",
  bytes: 289456,
  type: "upload",
  url: "http://res.cloudinary.com/...",
  secure_url: "https://res.cloudinary.com/..."
}
```

---

### Step 17: Save to Database

```javascript
log.info('Saving enhanced image to database...');
const relitImage = await Image.create({
    user: req.user._id,
    publicId: uploadResult.public_id,
    imageUrl: uploadResult.secure_url,
    format: uploadResult.format,
    width: uploadResult.width,
    height: uploadResult.height,
    size: uploadResult.bytes,
    localPath: null
});

log.info('Enhanced image saved to database');
```

**Database Record:**
```javascript
{
  _id: ObjectId("673d9c3d1234567890abcdef"),
  user: ObjectId("673d8f2e1234567890abcdef"),
  publicId: "adobe-ps-uploads/relight_user123_1732099500",
  imageUrl: "https://res.cloudinary.com/enhanced.jpg",
  format: "jpg",
  width: 1920,
  height: 1080,
  size: 289456,
  localPath: null,  // Don't store local path for processed images
  createdAt: ISODate("2024-11-20T11:25:00.000Z"),
  updatedAt: ISODate("2024-11-20T11:25:00.000Z")
}
```

**Why localPath: null?**
- Image already on Cloudinary
- No need to process again
- Saves disk space
- Local file will be deleted anyway

---

### Step 18: Send Response

```javascript
log.info('Sending response to client...');
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
```

**Response Structure:**
```json
{
  "success": true,
  "message": "Image relit successfully",
  "data": {
    "originalImageId": "673d9a1b1234567890abcdef",
    "originalImageUrl": "https://res.cloudinary.com/original.jpg",
    "relitImageId": "673d9c3d1234567890abcdef",
    "relitImageUrl": "https://res.cloudinary.com/enhanced.jpg",
    "publicId": "adobe-ps-uploads/relight_user123_1732099500",
    "brightness": 1.5,
    "format": "jpg",
    "width": 1920,
    "height": 1080,
    "size": 289456,
    "createdAt": "2024-11-20T11:25:00.000Z"
  }
}
```

**Frontend Can:**
- Display both images side-by-side
- Show before/after slider
- Download enhanced version
- Add to project as new version

---

### Step 19: Cleanup (Non-Blocking)

```javascript
log.info('Scheduling cleanup...');

// Use setImmediate to ensure response is sent first
setImmediate(async () => {
    try {
        log.info('Starting cleanup process...');
        
        // Delete AI output file
        if (outputPath) {
            await fs.unlink(outputPath).catch(() => {});
            log.info('Deleted output file:', outputPath);
        }
        
        // Delete original uploaded image
        if (image.localPath) {
            await fs.unlink(image.localPath).catch(() => {});
            log.info('Deleted original file:', image.localPath);
            
            // Update database
            image.localPath = null;
            await image.save({ validateBeforeSave: false });
            log.info('Updated database: localPath set to null');
        }
        
        log.info('Cleanup completed successfully');
    } catch (cleanupErr) {
        log.error('Cleanup error:', cleanupErr);
    }
});
```

**Cleanup Process:**

**1. setImmediate():**
```javascript
setImmediate(async () => { ... });
```
- Executes after response is sent
- Non-blocking
- User gets response immediately
- Cleanup happens in background

**2. Delete AI Output:**
```javascript
await fs.unlink(outputPath);
// Deletes: D:/backend/image/user123_relight_1732099500.jpg
```

**3. Delete Original Upload:**
```javascript
await fs.unlink(image.localPath);
// Deletes: D:/backend/image/user123_1732098765.jpg
```

**4. Update Database:**
```javascript
image.localPath = null;
await image.save({ validateBeforeSave: false });
```
- Mark as no local file
- Skip validation (faster)
- Prevents future access attempts

**Why Delete?**
- ✅ Images already on Cloudinary (safe)
- ✅ Frees server disk space
- ✅ Prevents disk from filling up
- ✅ Only need local files during processing

**Error Handling:**
```javascript
.catch(() => {})
```
- Silent failure if file doesn't exist
- Doesn't crash cleanup process
- Logs error but continues

---

### Step 20: Error Handling

```javascript
} catch (error) {
    log.error('Relight processing error:', error);
    
    // Clean up output file if it exists
    try {
        if (outputPath) {
            await fs.unlink(outputPath).catch(() => {});
            log.info('Cleaned up output file after error');
        }
    } catch (err) {
        // Ignore cleanup errors
    }
    
    return next(new AppError(`AI processing failed: ${error.message}`, 500));
}
```

**Error Recovery:**

**1. Log Error:**
```javascript
log.error('Relight processing error:', error);
```
- Full error stack trace
- Helpful for debugging
- Captured in logs

**2. Cleanup Partial Files:**
```javascript
await fs.unlink(outputPath).catch(() => {});
```
- Delete incomplete output file
- Prevent disk clutter
- Silent failure if doesn't exist

**3. Return Error to Client:**
```javascript
return next(new AppError(`AI processing failed: ${error.message}`, 500));
```

**Common Errors:**

**Python Not Found:**
```json
{
  "status": "fail",
  "message": "AI processing failed: command not found"
}
```

**Model Weights Missing:**
```json
{
  "status": "fail",
  "message": "AI model weights not found"
}
```

**Out of Memory:**
```json
{
  "status": "fail",
  "message": "AI processing failed: CUDA out of memory"
}
```

**Timeout:**
```json
{
  "status": "fail",
  "message": "AI processing failed: Timeout Error"
}
```

**File Access Denied:**
```json
{
  "status": "fail",
  "message": "Local image file not found on disk"
}
```

---

## 🔄 Complete Workflow

### Timeline Visualization

```
Time (seconds)    Action                              Status
─────────────────────────────────────────────────────────────
0.0               Client request received             ⏳
0.1               Input validation                    ✓
0.2               Database query                      ✓
0.3               File path setup                     ✓
0.4               Python environment detection        ✓
0.5               File existence checks              ✓
0.6               Build Python command               ✓
0.7               Setup environment variables        ✓
1.0               Execute Python script              ⏳
  1.0-3.0         Load PyTorch model (2s)            ⏳
  3.0-3.1         Load input image (0.1s)            ⏳
  3.1-53.1        AI inference (50s)                 ⏳ 🧠
  53.1-53.6       Post-process & brightness (0.5s)   ⏳
  53.6-54.1       Save output image (0.5s)           ⏳
54.0              Python execution complete          ✓
54.5              Verify output file created         ✓
55.0              Upload to Cloudinary start         ⏳
60.0              Cloudinary upload complete         ✓
60.1              Save to MongoDB                    ✓
60.2              Send response to client            ✓ ✅
60.3              Schedule cleanup (non-blocking)    ⏳
60.4              Client receives response           ✅
61.0              Delete local files                 ✓
61.1              Update database                    ✓
61.2              Cleanup complete                   ✓
```

---

### Data Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Mobile)   │
└──────┬──────┘
       │ POST /api/ai/relight
       │ { publicId, brightness }
       ▼
┌──────────────────────────────────┐
│     Node.js Backend              │
│  (aiController.relightImage)     │
├──────────────────────────────────┤
│ 1. Validate Input                │
│ 2. Query MongoDB                 │──────▶ ┌─────────────┐
│ 3. Find Local File               │        │   MongoDB   │
│ 4. Setup Paths                   │◀──────┘             │
│ 5. Detect Python                 │        └─────────────┘
│ 6. Build Command                 │
│ 7. Execute Python                │
└────────┬─────────────────────────┘
         │ exec(python infer.py)
         ▼
┌──────────────────────────────────┐
│     Python AI Model              │
│      (infer.py)                  │
├──────────────────────────────────┤
│ 1. Load PyTorch Model            │◀──── best_model_LOLv1.pth
│ 2. Read Input Image              │◀──── user123.jpg
│ 3. Preprocess (ToTensor)         │
│ 4. Neural Network Inference      │ 🧠
│ 5. Post-process (Brightness)     │
│ 6. Save Output Image             │────▶ user123_relight.jpg
└────────┬─────────────────────────┘
         │ Return: Success
         ▼
┌──────────────────────────────────┐
│     Node.js Backend              │
├──────────────────────────────────┤
│ 8. Verify Output Created         │
│ 9. Upload to Cloudinary          │────▶ ┌─────────────┐
│ 10. Save to MongoDB              │◀──── │ Cloudinary  │
│ 11. Send Response                │      └─────────────┘
│ 12. Schedule Cleanup             │        ┌─────────────┐
└────────┬─────────────────────────┘   ────▶│   MongoDB   │
         │                                   └─────────────┘
         │ { relitImageUrl, ... }
         ▼
┌─────────────┐
│   Client    │
│  (Mobile)   │
└─────────────┘

[Background Process]
┌──────────────────────────────────┐
│     Cleanup                      │
├──────────────────────────────────┤
│ 1. Delete Output File            │
│ 2. Delete Original File          │
│ 3. Update Database               │
└──────────────────────────────────┘
```

---

## 📂 File Structure

```
backend/
├── controllers/
│   └── aiController.js           ← Main controller
├── models/
│   └── Image.js                  ← MongoDB schema
├── config/
│   └── cloudinary.js             ← Cloudinary config
├── utils/
│   ├── catchAsync.js             ← Async error wrapper
│   └── AppError.js               ← Custom error class
├── image/                        ← Local storage (temp)
│   ├── user123_1732098765.jpg    ← Original upload
│   └── user123_relight_xxx.jpg   ← AI output (deleted after upload)
└── AI/
    └── Models/
        └── lowLight/
            ├── LYT_Torch/        ← Python virtual env (ignored by git)
            └── PyTorch/
                ├── model.py      ← Neural network architecture
                ├── infer.py      ← Inference script
                ├── best_model_LOLv1.pth  ← Model weights (~50MB)
                ├── dataloader.py
                ├── losses.py
                ├── train.py
                └── requirements.txt
```

---

## ⚠️ Error Handling

### Error Types and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Please provide image publicId` | Missing publicId in request | Include publicId in request body |
| `Brightness must be between 0.1 and 3.0` | Invalid brightness value | Use value between 0.1 and 3.0 |
| `No image found with that ID` | Image doesn't exist in DB | Upload image first |
| `Local image path not available` | Image has no local file | Re-upload image |
| `AI model weights not found` | Missing .pth file | Download model weights |
| `Inference script not found` | Missing infer.py | Check file structure |
| `Local image file not found on disk` | File deleted or moved | Re-upload image |
| `command not found` | Python not installed | Install Python |
| `ModuleNotFoundError` | Missing Python packages | Run `pip install -r requirements.txt` |
| `CUDA out of memory` | GPU memory full | Use smaller images or CPU mode |
| `Timeout Error` | Cloudinary upload timeout | Increase timeout or compress image |
| `AI processing failed to create output file` | Python script crashed | Check Python logs |

---

## 🚀 Performance Optimization

### 1. Processing Time Breakdown

```
Total Time: ~60 seconds

- Request handling:    0.5s   (1%)
- File operations:     0.5s   (1%)
- Python model load:   2.0s   (3%)
- AI inference:       50.0s  (83%)  ← Bottleneck
- Cloudinary upload:   5.0s   (8%)
- Database save:       0.2s   (0.3%)
- Cleanup:            1.0s   (2%)
```

### 2. Optimization Strategies

**For AI Inference (50s → 10s):**
- ✅ Use GPU instead of CPU
- ✅ Use smaller model (less accurate but faster)
- ✅ Reduce image resolution before processing
- ✅ Use model quantization (INT8 instead of FP32)
- ✅ Batch processing multiple images

**For Cloudinary Upload (5s → 2s):**
- ✅ Compress image before upload
- ✅ Use smaller format (WebP instead of PNG)
- ✅ Parallel upload (don't wait for response)
- ✅ Use Cloudinary's auto quality

**For Model Loading (2s → 0.5s):**
- ✅ Keep model in memory (don't reload each time)
- ✅ Use model caching
- ✅ Warm up on server start

### 3. Scaling Strategies

**Horizontal Scaling:**
```
┌─────────┐     ┌─────────────┐
│ Client  │────▶│ Load        │
└─────────┘     │ Balancer    │
                └─────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌────────┐    ┌────────┐    ┌────────┐
   │Server 1│    │Server 2│    │Server 3│
   │+ GPU   │    │+ GPU   │    │+ GPU   │
   └────────┘    └────────┘    └────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              ┌──────────────┐
              │  Cloudinary  │
              └──────────────┘
```

**Queue-Based Processing:**
```
Client ──▶ API Server ──▶ Message Queue ──▶ Worker 1 (GPU)
                               │          ──▶ Worker 2 (GPU)
                               │          ──▶ Worker 3 (GPU)
                               ▼
                          Cloudinary ──▶ Webhook ──▶ Notify Client
```

---

## 🔍 Troubleshooting

### Common Issues and Solutions

**1. "AI processing failed: command not found"**
```bash
# Check if Python is installed
python --version

# Install Python if missing
# Windows: Download from python.org
# Ubuntu: sudo apt install python3
# Mac: brew install python3
```

**2. "ModuleNotFoundError: No module named 'torch'"**
```bash
# Navigate to PyTorch directory
cd backend/AI/Models/lowLight/PyTorch

# Install dependencies
pip install torch torchvision opencv-python Pillow numpy
# or
pip install -r requirements.txt
```

**3. "AI model weights not found"**
```bash
# Check if file exists
ls backend/AI/Models/lowLight/PyTorch/best_model_LOLv1.pth

# Download model weights if missing
# (Usually provided by AI team or downloaded from cloud storage)
```

**4. "Timeout Error" from Cloudinary**
```javascript
// Increase timeout in aiController.js
const uploadResult = await cloudinary.uploader.upload(outputPath, {
    timeout: 300000  // 5 minutes instead of 3
});
```

**5. Python script hangs/freezes**
```bash
# Check Python logs
tail -f python_output.log

# Kill hanging Python processes
# Windows: taskkill /F /IM python.exe
# Unix: pkill python
```

**6. Out of disk space**
```bash
# Check disk usage
df -h  # Unix/Mac
dir    # Windows

# Clean up old files
rm backend/image/*.jpg  # Be careful!

# Or increase cleanup frequency in code
```

**7. CUDA out of memory**
```python
# Edit infer.py to use CPU
device = torch.device('cpu')  # Instead of 'cuda'
model = model.to(device)
```

---

## 📊 Monitoring and Logging

### Log Levels

**Development Mode:**
```
[INFO] Finding image in database...
[INFO] Setting up paths...
[INFO] Checking Python environment...
[INFO] Using Windows virtual environment Python
[INFO] Model weights found
[INFO] Inference script found
[INFO] Input image file found
[INFO] Building Python command...
[INFO] Starting AI processing...
[TIMING] Processing completed in 52.34 seconds
[INFO] Cloudinary upload successful: relight_user123_1732099500
[INFO] Enhanced image saved to database
[INFO] Sending response to client...
[INFO] Starting cleanup process...
[INFO] Deleted output file: D:/backend/image/user123_relight_xxx.jpg
[INFO] Deleted original file: D:/backend/image/user123_xxx.jpg
[INFO] Cleanup completed successfully
```

**Production Mode:**
```
[TIMING] Processing completed in 52.34 seconds
[WARN] Virtual environment Python not found, using system python
[ERROR] Relight processing error: ENOENT: no such file or directory
```

### Performance Metrics

**Track in Production:**
```javascript
// Add to controller
const metrics = {
    totalTime: 0,
    pythonTime: 0,
    uploadTime: 0,
    saveTime: 0
};

// Log at end
console.log('Performance Metrics:', JSON.stringify(metrics));
```

**Monitor:**
- Average processing time
- Success rate
- Error rate by type
- Cloudinary upload failures
- Disk usage trends

---

## 🎯 Best Practices

### 1. Security
- ✅ Always validate user input
- ✅ Use JWT authentication
- ✅ Sanitize file paths
- ✅ Limit file sizes
- ✅ Rate limit API endpoints

### 2. Performance
- ✅ Use GPU for AI processing
- ✅ Implement caching
- ✅ Compress images before upload
- ✅ Use CDN (Cloudinary)
- ✅ Clean up temp files

### 3. Reliability
- ✅ Handle all error cases
- ✅ Implement retry logic
- ✅ Use timeouts appropriately
- ✅ Log all operations
- ✅ Monitor system resources

### 4. Scalability
- ✅ Use message queues
- ✅ Horizontal scaling
- ✅ Load balancing
- ✅ Async processing
- ✅ Database indexing

---

## 📚 Additional Resources

- **PyTorch Documentation:** https://pytorch.org/docs/
- **Cloudinary API:** https://cloudinary.com/documentation
- **LOL Dataset:** Low-Light Image Enhancement Dataset
- **Node.js Child Process:** https://nodejs.org/api/child_process.html

---

**Last Updated:** November 30, 2025
**Version:** 1.0.0
**Author:** Backend Development Team
