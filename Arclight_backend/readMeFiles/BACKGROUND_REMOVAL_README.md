# Background Removal API Documentation

## Overview
The Background Removal endpoint removes backgrounds from images using the rembg library with U2Net models. Supports both human segmentation and general object segmentation.

---

## 🔑 Authentication
Requires JWT authentication. Include token in request header:
```
Authorization: Bearer <your_jwt_token>
```

---

## API Endpoint

### Remove Background
Removes background from an image using AI segmentation.

**Endpoint:** `POST /api/v1/adobe-ps/ai/remove-background`

**Request Body:**
```json
{
  "publicId": "adobe-ps-uploads/abc123xyz",
  "mode": "human"
}
```

**Parameters:**
- `publicId` **(required)** - Cloudinary public ID of the image
- `mode` **(optional)** - Segmentation mode, defaults to "object"
  - `"human"` - Uses `u2net_human_seg` model (optimized for people)
  - `"object"` - Uses `u2netp` model (general purpose, faster)

---

## Mode Comparison

### Human Mode (`u2net_human_seg`)
- **Best for:** Portraits, people photos, human subjects
- **Model:** U2Net Human Segmentation
- **Advantages:** More accurate for human figures, better edge detection for hair and clothing
- **Use cases:** Profile pictures, fashion photography, portrait editing

### Object Mode (`u2netp`)
- **Best for:** Products, objects, logos, general images
- **Model:** U2Net-P (lightweight)
- **Advantages:** Faster processing, good for most objects
- **Use cases:** E-commerce products, logos, general object isolation

---

## Success Response (200)

```json
{
  "success": true,
  "message": "Background removed successfully",
  "data": {
    "originalImage": "https://res.cloudinary.com/.../original.jpg",
    "processedImageUrl": "https://res.cloudinary.com/.../nobg.png",
    "publicId": "adobe-ps-uploads/processed123",
    "mode": "human",
    "model": "u2net_human_seg",
    "width": 1920,
    "height": 1080,
    "format": "png",
    "size": 234567,
    "processingTime": "3456ms"
  }
}
```

**Response Fields:**
- `originalImage` - URL of the original image
- `processedImageUrl` - URL of the image with removed background (PNG with transparency)
- `publicId` - Cloudinary public ID of the processed image
- `mode` - Mode used ("human" or "object")
- `model` - AI model used
- `width`, `height` - Dimensions of processed image
- `format` - Always "png" (supports transparency)
- `size` - File size in bytes
- `processingTime` - Time taken in milliseconds

---

## Error Responses

### 400 - Bad Request
```json
{
  "status": "error",
  "message": "Please provide image public ID",
  "statusCode": 400
}
```

**Common causes:**
- Missing `publicId` parameter
- Invalid `mode` (must be "human" or "object")

### 404 - Not Found
```json
{
  "status": "error",
  "message": "Image not found or does not belong to you",
  "statusCode": 404
}
```

**Common causes:**
- Image with given `publicId` doesn't exist
- Image belongs to a different user
- Local file was deleted

### 500 - Server Error
```json
{
  "status": "error",
  "message": "Background removal service error. Please ensure rembg is installed.",
  "statusCode": 500
}
```

**Common causes:**
- rembg not installed or not in PATH
- Model download failed
- Insufficient memory

---

## Frontend Integration Examples

### Example 1: Basic Background Removal (Object Mode)

```javascript
async function removeBackground(publicId) {
  try {
    const response = await fetch('/api/v1/adobe-ps/ai/remove-background', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicId: publicId,
        mode: 'object'
      })
    });

    const { data } = await response.json();
    
    console.log('Background removed:', data.processedImageUrl);
    console.log('Processing time:', data.processingTime);
    
    return data;
  } catch (error) {
    console.error('Background removal failed:', error);
    throw error;
  }
}
```

---

### Example 2: Human Portrait Background Removal

```javascript
async function removePortraitBackground(publicId) {
  const response = await fetch('/api/v1/adobe-ps/ai/remove-background', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      publicId: publicId,
      mode: 'human' // Optimized for people
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  
  // Display result with transparency
  document.getElementById('result-image').src = data.processedImageUrl;
  
  return data;
}
```

---

### Example 3: Complete Workflow (Upload → Remove Background → Add to Project)

```javascript
async function uploadAndRemoveBackground(imageFile, projectId) {
  // Step 1: Upload image
  const formData = new FormData();
  formData.append('image', imageFile);

  const uploadRes = await fetch('/api/v1/adobe-ps/images/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const { data: uploadedImage } = await uploadRes.json();
  console.log('Image uploaded:', uploadedImage.publicId);

  // Step 2: Remove background
  const removeRes = await fetch('/api/v1/adobe-ps/ai/remove-background', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      publicId: uploadedImage.publicId,
      mode: 'human' // Change to 'object' for non-human subjects
    })
  });
  const { data: processedImage } = await removeRes.json();
  console.log('Background removed:', processedImage.processedImageUrl);

  // Step 3: Add processed version to project
  const versionRes = await fetch(
    `/api/v1/adobe-ps/projects/${projectId}/add-version`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: processedImage.processedImageUrl,
        publicId: processedImage.publicId,
        prompt: 'remove background',
        operation: 'remove-background',
        width: processedImage.width,
        height: processedImage.height,
        format: processedImage.format,
        size: processedImage.size
      })
    }
  );
  const { data: versionData } = await versionRes.json();
  console.log('Version added to project!');

  return {
    original: uploadedImage,
    processed: processedImage,
    project: versionData
  };
}
```

---

### Example 4: Mode Selection UI

```javascript
async function removeBackgroundWithUI(publicId) {
  // Let user choose mode
  const mode = await showModeSelector();
  
  // Show loading indicator
  showLoadingSpinner('Removing background...');
  
  try {
    const response = await fetch('/api/v1/adobe-ps/ai/remove-background', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publicId, mode })
    });

    const { data } = await response.json();
    
    hideLoadingSpinner();
    showSuccessMessage(`Background removed in ${data.processingTime}`);
    
    // Display before/after
    displayComparison(data.originalImage, data.processedImageUrl);
    
    return data;
  } catch (error) {
    hideLoadingSpinner();
    showErrorMessage(error.message);
    throw error;
  }
}

function showModeSelector() {
  return new Promise((resolve) => {
    const modal = `
      <div class="mode-selector">
        <h3>Select Background Removal Mode</h3>
        <button onclick="selectMode('human')">
          <strong>Human Mode</strong>
          <p>Best for portraits and people</p>
        </button>
        <button onclick="selectMode('object')">
          <strong>Object Mode</strong>
          <p>Best for products and general images</p>
        </button>
      </div>
    `;
    
    window.selectMode = (mode) => {
      closeModal();
      resolve(mode);
    };
    
    showModal(modal);
  });
}
```

---

## Performance Considerations

### Processing Time
- **Human Mode:** 3-8 seconds (depending on image size and complexity)
- **Object Mode:** 2-5 seconds (faster than human mode)

### Recommendations
1. Show loading indicators during processing
2. Disable submit button to prevent duplicate requests
3. Consider image size optimization before processing
4. Large images (>4000px) may take longer

---

## Output Format

### Image Format
- **Output:** Always PNG format (supports transparency)
- **Alpha Channel:** Removed background areas are fully transparent
- **Quality:** Lossless PNG compression

### Transparency Support
```javascript
// Display with transparency
<img src={processedImageUrl} style={{ background: 'transparent' }} />

// Or with custom background
<div style={{ background: '#f0f0f0' }}>
  <img src={processedImageUrl} />
</div>
```

---

## Troubleshooting

### Issue: "Background removal service error"
**Solution:** Ensure rembg is installed on the server:
```bash
pip install rembg
```

### Issue: Processing takes too long
**Solution:** 
- Try "object" mode instead of "human" mode
- Resize image before upload
- Check server resources (CPU/RAM)

### Issue: Poor edge quality
**Solution:**
- Use "human" mode for portraits
- Ensure input image has good contrast
- Try higher resolution input images

### Issue: "Local image file not found"
**Solution:** Re-upload the image using `/api/v1/adobe-ps/images/upload`

---

## Best Practices

### 1. Choose the Right Mode
```javascript
// Detect if image contains humans (pseudo-code)
const containsHumans = await detectHumans(image);
const mode = containsHumans ? 'human' : 'object';

await removeBackground(publicId, mode);
```

### 2. Handle Long Processing Times
```javascript
// Add timeout and progress indicator
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30 sec timeout

try {
  const response = await fetch('/api/v1/adobe-ps/ai/remove-background', {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ publicId, mode }),
    signal: controller.signal
  });
  
  clearTimeout(timeout);
  // Process response
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timed out');
  }
}
```

### 3. Preview Before and After
```javascript
// Show side-by-side comparison
function showComparison(originalUrl, processedUrl) {
  return `
    <div class="comparison">
      <div class="before">
        <img src="${originalUrl}" />
        <span>Before</span>
      </div>
      <div class="after">
        <img src="${processedUrl}" />
        <span>After</span>
      </div>
    </div>
  `;
}
```

### 4. Download Processed Image
```javascript
async function downloadProcessedImage(imageUrl, filename) {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'background-removed.png';
  link.click();
  
  window.URL.revokeObjectURL(url);
}
```

---

## Related Endpoints

- **Upload Image:** `POST /api/v1/adobe-ps/images/upload`
- **Add to Project:** `POST /api/v1/adobe-ps/projects/:projectId/add-version`
- **Other AI Operations:**
  - `POST /api/v1/adobe-ps/ai/relight` - Low-light enhancement
  - `POST /api/v1/adobe-ps/ai/enhance` - Denoise/Deblur
  - `POST /api/v1/adobe-ps/ai/face-restore` - Face restoration
  - `POST /api/v1/adobe-ps/ai/style-transfer` - Artistic style transfer

---

## Technical Details

### AI Models Used
- **u2net_human_seg:** Specialized for human segmentation, trained on human-specific datasets
- **u2netp:** Lightweight version of U2Net, good general-purpose performance

### System Requirements
- **Python:** 3.7+
- **rembg:** Latest version
- **Memory:** Minimum 2GB RAM recommended
- **Storage:** Models cached after first use (~180MB)

### Command Line Equivalent
```bash
# Human mode
rembg i -m u2net_human_seg input.jpg output.png

# Object mode
rembg i -m u2netp input.jpg output.png
```

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Ensure rembg is properly installed
- Verify image format is supported (jpg, png, webp)
- Contact backend team for assistance

**Last Updated:** December 1, 2025
