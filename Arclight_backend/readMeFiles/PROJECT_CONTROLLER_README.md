# Project Controller API Documentation

## Overview
The Project Controller manages image editing projects with version history. Each project contains an original image and tracks all AI-processed versions (edits) applied to it.

---

## 🔑 Authentication
All endpoints require JWT authentication. Include the token in the request header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Table of Contents
1. [Create Project](#1-create-project)
2. [Get All User Projects](#2-get-all-user-projects)
3. [Get Project Details](#3-get-project-details)
4. [Add Version to Project](#4-add-version-to-project)
5. [Update Project Title](#5-update-project-title)
6. [Delete Project](#6-delete-project)
7. [Complete Workflow Examples](#complete-workflow-examples)

---

## API Endpoints
### 1. Create Project
Creates a new project from a previously uploaded image.

**Endpoint:** `POST /api/v1/adobe-ps/projects/create`

**Prerequisites:**
- Image must be uploaded first using `/api/v1/adobe-ps/images/upload`
- You need the `publicId` from the upload response

**Request Body:**
```json
{
  "publicId": "adobe-ps-uploads/abc123xyz",
  "title": "My Beach Photo Edit" // optional, defaults to "Untitled Project"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "projectId": "674c8f9a1234567890abcdef",
    "title": "My Beach Photo Edit",
    "originalImage": {
      "imageUrl": "https://res.cloudinary.com/...",
      "publicId": "adobe-ps-uploads/abc123xyz",
      "prompt": "",
      "operation": "original",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "size": 345678
    },
    "maxVersions": 10,
    "createdAt": "2024-12-01T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing publicId
- `404` - Image not found or doesn't belong to user
- `401` - Unauthorized (no/invalid token)

**Frontend Example:**
```javascript
// Step 1: Upload image first
const formData = new FormData();
formData.append('image', imageFile);

const uploadResponse = await fetch('/api/v1/adobe-ps/images/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
const { data: imageData } = await uploadResponse.json();

// Step 2: Create project with the publicId
const projectResponse = await fetch('/api/v1/adobe-ps/projects/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    publicId: imageData.publicId,
    title: 'My Awesome Edit'
  })
});
const { data: projectData } = await projectResponse.json();
console.log('Project created:', projectData.projectId);
```

---

### 2. Get All User Projects
Retrieves all projects belonging to the authenticated user (gallery view).

**Endpoint:** `GET /api/v1/adobe-ps/projects`

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "projectId": "674c8f9a1234567890abcdef",
      "title": "Beach Photo Edit",
      "latestImage": {
        "imageUrl": "https://res.cloudinary.com/.../latest.jpg",
        "publicId": "adobe-ps-uploads/latest123",
        "operation": "enhance",
        "width": 1920,
        "height": 1080,
        "format": "jpg"
      },
      "totalVersions": 3,
      "createdAt": "2024-12-01T10:00:00.000Z",
      "updatedAt": "2024-12-01T14:30:00.000Z"
    },
    {
      "projectId": "674c8f9a9876543210fedcba",
      "title": "Portrait Retouch",
      "latestImage": {
        "imageUrl": "https://res.cloudinary.com/.../portrait.jpg",
        "publicId": "adobe-ps-uploads/portrait456",
        "operation": "face-restore",
        "width": 1200,
        "height": 1600,
        "format": "png"
      },
      "totalVersions": 1,
      "createdAt": "2024-11-30T09:00:00.000Z",
      "updatedAt": "2024-11-30T09:15:00.000Z"
    }
  ]
}
```

**Use Case:** Display project gallery with thumbnails

**Frontend Example:**
```javascript
const response = await fetch('/api/v1/adobe-ps/projects', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: projects } = await response.json();

// Display in gallery
projects.forEach(project => {
  displayProjectCard({
    id: project.projectId,
    title: project.title,
    thumbnail: project.latestImage.imageUrl,
    editCount: project.totalVersions,
    lastModified: project.updatedAt
  });
});
```

---

### 3. Get Project Details
Retrieves full details of a single project including all version history.

**Endpoint:** `GET /api/v1/adobe-ps/projects/:projectId`

**URL Parameters:**
- `projectId` - MongoDB ObjectId of the project

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "674c8f9a1234567890abcdef",
    "title": "Beach Photo Edit",
    "user": {
      "_id": "674a1b2c3d4e5f6789012345",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "originalImage": {
      "imageUrl": "https://res.cloudinary.com/.../original.jpg",
      "publicId": "adobe-ps-uploads/orig123",
      "prompt": "",
      "operation": "original",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "size": 345678,
      "createdAt": "2024-12-01T10:00:00.000Z"
    },
    "versions": [
      {
        "imageUrl": "https://res.cloudinary.com/.../v1.jpg",
        "publicId": "adobe-ps-uploads/denoised123",
        "prompt": "remove noise",
        "operation": "enhance",
        "width": 1920,
        "height": 1080,
        "format": "jpg",
        "size": 356789,
        "createdAt": "2024-12-01T10:15:00.000Z"
      },
      {
        "imageUrl": "https://res.cloudinary.com/.../v2.jpg",
        "publicId": "adobe-ps-uploads/bright123",
        "prompt": "make it brighter",
        "operation": "enhance",
        "width": 1920,
        "height": 1080,
        "format": "jpg",
        "size": 367890,
        "createdAt": "2024-12-01T10:30:00.000Z"
      }
    ],
    "totalVersions": 2,
    "maxVersions": 10,
    "latestVersion": {
      "imageUrl": "https://res.cloudinary.com/.../v2.jpg",
      "publicId": "adobe-ps-uploads/bright123",
      "operation": "enhance",
      "width": 1920,
      "height": 1080
    },
    "createdAt": "2024-12-01T10:00:00.000Z",
    "updatedAt": "2024-12-01T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing projectId
- `404` - Project not found

**Use Case:** 
- Display detailed project view with editing timeline
- Show before/after comparisons
- Enable undo/redo functionality

**Frontend Example:**
```javascript
const projectId = '674c8f9a1234567890abcdef';
const response = await fetch(`/api/v1/adobe-ps/projects/${projectId}`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: project } = await response.json();

// Display editing timeline
console.log('Original:', project.originalImage.imageUrl);
project.versions.forEach((version, index) => {
  console.log(`Edit ${index + 1}:`, version.operation, version.prompt);
});

// Show before/after
displayComparison(
  project.originalImage.imageUrl,
  project.latestVersion.imageUrl
);
```

---

### 4. Add Version to Project
Adds a new edited version to the project after AI processing.

**Endpoint:** `POST /api/v1/adobe-ps/projects/:projectId/add-version`

**URL Parameters:**
- `projectId` - MongoDB ObjectId of the project

**Request Body:**
```json
{
  "imageUrl": "https://res.cloudinary.com/.../processed.jpg",
  "publicId": "adobe-ps-uploads/processed123",
  "prompt": "make it brighter",
  "operation": "enhance",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "size": 456789
}
```

**Field Details:**
- `imageUrl` **(required)** - Cloudinary URL of processed image
- `publicId` **(required)** - Cloudinary public ID
- `prompt` *(optional)* - User's text prompt (e.g., "remove noise")
- `operation` *(optional)* - Type of AI operation, defaults to "custom"
  - Valid values: `original`, `segment`, `remove-background`, `enhance`, `upscale`, `style-transfer`, `crop`, `custom`
- `width`, `height` - Image dimensions
- `format` - Image format (jpg, png, etc.)
- `size` - File size in bytes

**Success Response (200):**
```json
{
  "success": true,
  "message": "Version added to project",
  "data": {
    "projectId": "674c8f9a1234567890abcdef",
    "totalVersions": 3,
    "latestVersion": {
      "imageUrl": "https://res.cloudinary.com/.../processed.jpg",
      "publicId": "adobe-ps-uploads/processed123",
      "prompt": "make it brighter",
      "operation": "enhance",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "size": 456789
    }
  }
}
```

**Error Responses:**
- `400` - Missing projectId, imageUrl, or publicId
- `404` - Project not found

**Important Notes:**
- Automatically limits to `maxVersions` (default 10)
- When limit is reached, oldest version is removed
- Does NOT delete images from Cloudinary, only database reference

**Frontend Example:**
```javascript
// After AI processing completes
const aiResponse = await fetch('/api/v1/adobe-ps/ai/enhance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    publicId: currentImage.publicId,
    mode: 'denoise'
  })
});
const { data: processedImage } = await aiResponse.json();

// Add the processed version to project
const projectId = '674c8f9a1234567890abcdef';
const versionResponse = await fetch(
  `/api/v1/adobe-ps/projects/${projectId}/add-version`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl: processedImage.enhancedImageUrl,
      publicId: processedImage.publicId,
      prompt: 'remove noise',
      operation: 'enhance',
      width: processedImage.width,
      height: processedImage.height,
      format: processedImage.format,
      size: processedImage.size
    })
  }
);
const { data: versionData } = await versionResponse.json();
console.log('Version added! Total versions:', versionData.totalVersions);
```

---

### 5. Update Project Title
Updates the title of an existing project.

**Endpoint:** `PATCH /api/v1/adobe-ps/projects/:projectId/title`

**URL Parameters:**
- `projectId` - MongoDB ObjectId of the project

**Request Body:**
```json
{
  "title": "Sunset Beach Photo - Final Edit"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project title updated",
  "data": {
    "projectId": "674c8f9a1234567890abcdef",
    "title": "Sunset Beach Photo - Final Edit"
  }
}
```

**Error Responses:**
- `400` - Missing projectId or title
- `404` - Project not found

**Frontend Example:**
```javascript
const projectId = '674c8f9a1234567890abcdef';
const response = await fetch(
  `/api/v1/adobe-ps/projects/${projectId}/title`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'My Awesome Beach Edit'
    })
  }
);
const { data } = await response.json();
console.log('Title updated:', data.title);
```

---

### 6. Delete Project
Permanently deletes a project and all its version references.

**Endpoint:** `DELETE /api/v1/adobe-ps/projects/:projectId`

**URL Parameters:**
- `projectId` - MongoDB ObjectId of the project

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses:**
- `400` - Missing projectId
- `404` - Project not found

**Important Notes:**
- Currently only deletes database records
- Images remain in Cloudinary (TODO: implement Cloudinary cleanup)
- Action is irreversible

**Frontend Example:**
```javascript
const projectId = '674c8f9a1234567890abcdef';
const response = await fetch(
  `/api/v1/adobe-ps/projects/${projectId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { message } = await response.json();
console.log(message); // "Project deleted successfully"
```

---

## Complete Workflow Examples

### Workflow 1: Create Project and Apply Edits

```javascript
// ============================================
// STEP 1: Upload Original Image
// ============================================
const formData = new FormData();
formData.append('image', imageFile);

const uploadRes = await fetch('/api/v1/adobe-ps/images/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
const { data: uploadedImage } = await uploadRes.json();
console.log('Uploaded:', uploadedImage.publicId);

// ============================================
// STEP 2: Create Project
// ============================================
const createProjectRes = await fetch('/api/v1/adobe-ps/projects/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    publicId: uploadedImage.publicId,
    title: 'My Photo Edit Project'
  })
});
const { data: project } = await createProjectRes.json();
console.log('Project created:', project.projectId);

// ============================================
// STEP 3: Apply AI Enhancement (Denoise)
// ============================================
const enhanceRes = await fetch('/api/v1/adobe-ps/ai/enhance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    publicId: uploadedImage.publicId,
    mode: 'denoise'
  })
});
const { data: enhancedImage } = await enhanceRes.json();
console.log('Enhanced:', enhancedImage.enhancedImageUrl);

// ============================================
// STEP 4: Add Enhanced Version to Project
// ============================================
const addVersionRes = await fetch(
  `/api/v1/adobe-ps/projects/${project.projectId}/add-version`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl: enhancedImage.enhancedImageUrl,
      publicId: enhancedImage.publicId,
      prompt: 'remove noise',
      operation: 'enhance',
      width: enhancedImage.width,
      height: enhancedImage.height,
      format: enhancedImage.format,
      size: enhancedImage.size
    })
  }
);
const { data: versionData } = await addVersionRes.json();
console.log('Version added! Total:', versionData.totalVersions);

// ============================================
// STEP 5: Apply Another Edit (Relight)
// ============================================
const relightRes = await fetch('/api/v1/adobe-ps/ai/relight', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    publicId: enhancedImage.publicId,
    brightness: 0.7
  })
});
const { data: relitImage } = await relightRes.json();

// ============================================
// STEP 6: Add Relit Version to Project
// ============================================
await fetch(
  `/api/v1/adobe-ps/projects/${project.projectId}/add-version`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl: relitImage.relitImageUrl,
      publicId: relitImage.publicId,
      prompt: 'brighten image',
      operation: 'enhance',
      width: relitImage.width,
      height: relitImage.height,
      format: relitImage.format,
      size: relitImage.size
    })
  }
);

// ============================================
// STEP 7: View Project History
// ============================================
const detailsRes = await fetch(
  `/api/v1/adobe-ps/projects/${project.projectId}`,
  {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { data: projectDetails } = await detailsRes.json();
console.log('Original:', projectDetails.originalImage.imageUrl);
console.log('Versions:', projectDetails.versions.length);
console.log('Latest:', projectDetails.latestVersion.imageUrl);
```

---

### Workflow 2: Display Project Gallery

```javascript
// ============================================
// Fetch and Display All Projects
// ============================================
async function displayProjectGallery() {
  const response = await fetch('/api/v1/adobe-ps/projects', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data: projects, count } = await response.json();

  console.log(`You have ${count} projects`);

  projects.forEach(project => {
    // Display project card
    const card = `
      <div class="project-card">
        <img src="${project.latestImage.imageUrl}" alt="${project.title}">
        <h3>${project.title}</h3>
        <p>${project.totalVersions} edits</p>
        <p>Last modified: ${new Date(project.updatedAt).toLocaleDateString()}</p>
        <button onclick="openProject('${project.projectId}')">Open</button>
      </div>
    `;
    document.getElementById('gallery').innerHTML += card;
  });
}

// ============================================
// Open Specific Project
// ============================================
async function openProject(projectId) {
  const response = await fetch(
    `/api/v1/adobe-ps/projects/${projectId}`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const { data: project } = await response.json();

  // Display original
  document.getElementById('original').src = project.originalImage.imageUrl;

  // Display all versions
  project.versions.forEach((version, index) => {
    const versionCard = `
      <div class="version-item">
        <img src="${version.imageUrl}" alt="Version ${index + 1}">
        <p>Edit ${index + 1}: ${version.operation}</p>
        <p>${version.prompt || 'No prompt'}</p>
        <p>${new Date(version.createdAt).toLocaleString()}</p>
      </div>
    `;
    document.getElementById('versions').innerHTML += versionCard;
  });

  // Display current version
  document.getElementById('current').src = project.latestVersion.imageUrl;
}
```

---

### Workflow 3: Undo Last Edit

```javascript
// ============================================
// Undo Feature (Revert to Previous Version)
// ============================================
async function undoLastEdit(projectId) {
  // Get project details
  const detailsRes = await fetch(
    `/api/v1/adobe-ps/projects/${projectId}`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const { data: project } = await detailsRes.json();

  if (project.versions.length === 0) {
    console.log('No edits to undo. Showing original.');
    return project.originalImage;
  }

  // Get previous version (second to last, or original if only 1 version)
  const previousVersion = project.versions.length > 1
    ? project.versions[project.versions.length - 2]
    : project.originalImage;

  console.log('Reverted to:', previousVersion.imageUrl);
  return previousVersion;
}
```

---

## Data Models Reference

### Project Model
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  title: String,
  originalImage: {
    imageUrl: String,
    publicId: String,
    prompt: String,
    operation: String (enum: ['original', 'segment', 'remove-background', 'enhance', 'upscale', 'style-transfer', 'crop', 'custom']),
    width: Number,
    height: Number,
    format: String,
    size: Number,
    createdAt: Date
  },
  versions: [
    {
      imageUrl: String,
      publicId: String,
      prompt: String,
      operation: String,
      width: Number,
      height: Number,
      format: String,
      size: Number,
      createdAt: Date
    }
  ],
  maxVersions: Number (default: 10),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "status": "error",
  "message": "Descriptive error message",
  "statusCode": 400
}
```

### Common HTTP Status Codes
- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST create)
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (project doesn't belong to user)
- `404` - Not Found (project/image not found)
- `500` - Server Error

### Frontend Error Handling Example
```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error.message);
    // Show user-friendly error
    showErrorNotification(error.message);
    throw error;
  }
}

// Usage
try {
  const project = await safeApiCall('/api/v1/adobe-ps/projects/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ publicId: 'abc123', title: 'My Project' })
  });
  console.log('Success:', project);
} catch (error) {
  // Error already logged and displayed
}
```

---

## Best Practices

### 1. Always Check for Errors
```javascript
const response = await fetch('/api/v1/adobe-ps/projects/create', {...});
const result = await response.json();

if (!result.success) {
  console.error('Error:', result.message);
  return;
}

// Proceed with result.data
```

### 2. Store ProjectId After Creation
```javascript
const { data: project } = await createProject();
localStorage.setItem('currentProjectId', project.projectId);
```

### 3. Refresh Project Details After Adding Versions
```javascript
await addVersionToProject(projectId, versionData);
// Refresh to get updated totalVersions and latestVersion
const updatedProject = await getProjectDetails(projectId);
```

### 4. Optimize Gallery Loading
```javascript
// Use GET /projects (lightweight) for gallery
// Use GET /projects/:id only when user opens a project
```

### 5. Handle Version Limits
```javascript
if (project.totalVersions >= project.maxVersions) {
  showWarning('Adding a new version will remove the oldest edit');
}
```

---

## Rate Limiting & Performance

- No explicit rate limits currently implemented
- AI processing endpoints can take 30-90 seconds
- Recommend showing loading states during AI operations
- Consider implementing optimistic UI updates

---

## Support & Contact

For backend issues or feature requests, contact the backend team or create an issue in the repository.

**Base URL:** `http://localhost:4000` (development)

**API Version:** v1

**Last Updated:** December 1, 2025
