# Adobe Photoshop Clone - Frontend Development Guide

Complete API documentation and integration guide for mobile app developers.

---

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Auth Endpoints](#auth-endpoints)
  - [Image Management](#image-management)
  - [Project Management](#project-management)
  - [AI Processing](#ai-processing)
  - [User Settings](#user-settings)
- [Request/Response Examples](#requestresponse-examples)
- [Error Handling](#error-handling)
- [File Upload](#file-upload)
- [Testing with Postman](#testing-with-postman)

---

## 🌐 Base URL

```
Production: https://your-domain.com/api/v1/adobe-ps
Development: http://localhost:4000/api/v1/adobe-ps
```

---

## 🔐 Authentication

All protected endpoints require JWT authentication via:

1. **Bearer Token** (Recommended for mobile apps):

```
Authorization: Bearer <your_jwt_token>
```

2. **Cookie** (Alternative):

```
Cookie: jwt=<your_jwt_token>
```

### Authentication Flow

```
1. User Signs Up → Receives OTP
2. User Verifies OTP → Receives JWT Token
3. Store JWT Token Securely (Keychain/SecureStorage)
4. Include Token in All Protected Requests
```

---

## 📡 API Endpoints

### Auth Endpoints

#### 1. Sign Up

```http
POST /auth/signup
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "OTP sent to your email",
  "data": {
    "user": {
      "_id": "673d8f2e1234567890abcdef",
      "name": "John Doe",
      "email": "john@example.com",
      "otpVerified": false
    }
  }
}
```

---

#### 2. Verify OTP

```http
POST /auth/verify-otp
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "673d8f2e1234567890abcdef",
      "name": "John Doe",
      "email": "john@example.com",
      "otpVerified": true
    }
  }
}
```

**Store this token for all future requests!**

---

#### 3. Resend OTP

```http
POST /auth/resend-otp
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

---

#### 4. Login

```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "673d8f2e1234567890abcdef",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

#### 5. Google OAuth

```http
POST /auth/google
Content-Type: application/json
```

**Request Body:**

```json
{
  "credential": "google_oauth_credential_token"
}
```

---

#### 6. Logout

```http
GET /auth/logout
Authorization: Bearer <token>
```

---

### Image Management

#### 1. Upload Single Image

```http
POST /images/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

```
image: [File] (required)
```

**Response (201):**

```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "image": {
      "_id": "673d9a1b1234567890abcdef",
      "publicId": "adobe-ps-uploads/user123_1732098765",
      "imageUrl": "https://res.cloudinary.com/...",
      "localPath": "D:/backend/image/user123_1732098765.jpg",
      "format": "jpg",
      "width": 1920,
      "height": 1080,
      "size": 245678,
      "user": "673d8f2e1234567890abcdef",
      "createdAt": "2024-11-20T10:30:00.000Z"
    }
  }
}
```

---

#### 2. Upload Multiple Images

```http
POST /images/upload-multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

```
images: [File, File] (max 2 images)
```

**Response (201):**

```json
{
  "status": "success",
  "message": "2 images uploaded successfully",
  "data": {
    "images": [
      {
        "_id": "673d9a1b1234567890abcdef",
        "publicId": "adobe-ps-uploads/user123_1732098765",
        "imageUrl": "https://res.cloudinary.com/...",
        "format": "jpg",
        "width": 1920,
        "height": 1080
      },
      {
        "_id": "673d9a1c1234567890abcdef",
        "publicId": "adobe-ps-uploads/user123_1732098766",
        "imageUrl": "https://res.cloudinary.com/...",
        "format": "png",
        "width": 1280,
        "height": 720
      }
    ]
  }
}
```

---

#### 3. Crop Image

```http
PATCH /images/crop
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "publicId": "adobe-ps-uploads/user123_1732098765",
  "crop": {
    "x": 100,
    "y": 50,
    "width": 800,
    "height": 600
  }
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Image cropped successfully",
  "data": {
    "image": {
      "_id": "673d9a1b1234567890abcdef",
      "publicId": "adobe-ps-uploads/user123_1732098765",
      "imageUrl": "https://res.cloudinary.com/...",
      "width": 800,
      "height": 600,
      "updatedAt": "2024-11-20T10:35:00.000Z"
    }
  }
}
```

---

#### 4. Get Image Details

```http
GET /images/:publicId
Authorization: Bearer <token>
```

**Example:**

```
GET /images/adobe-ps-uploads%2Fuser123_1732098765
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "image": {
      "_id": "673d9a1b1234567890abcdef",
      "publicId": "adobe-ps-uploads/user123_1732098765",
      "imageUrl": "https://res.cloudinary.com/...",
      "format": "jpg",
      "width": 1920,
      "height": 1080,
      "size": 245678,
      "createdAt": "2024-11-20T10:30:00.000Z"
    }
  }
}
```

---

#### 5. Delete Image

```http
DELETE /images/:publicId
Authorization: Bearer <token>
```

**Response (204):**

```
No Content
```

---

### Project Management

Projects work like ChatGPT conversations - each project has:

- **Original image** (immutable)
- **Multiple versions** (edited versions, max configurable via settings)

#### 1. Create New Project

```http
POST /projects/create
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

```
image: [File] (required)
title: "My Photo Edit" (optional)
```

**Response (201):**

```json
{
  "status": "success",
  "message": "Project created successfully",
  "data": {
    "project": {
      "_id": "673d9b2c1234567890abcdef",
      "title": "My Photo Edit",
      "user": "673d8f2e1234567890abcdef",
      "originalImage": {
        "_id": "673d9b2d1234567890abcdef",
        "publicId": "adobe-ps-uploads/user123_1732099000",
        "imageUrl": "https://res.cloudinary.com/...",
        "format": "jpg",
        "width": 1920,
        "height": 1080
      },
      "versions": [],
      "createdAt": "2024-11-20T10:40:00.000Z",
      "updatedAt": "2024-11-20T10:40:00.000Z"
    }
  }
}
```

---

#### 2. Get All User Projects

```http
GET /projects
Authorization: Bearer <token>
```

**Query Parameters (optional):**

```
?sort=-updatedAt    (Sort by latest first)
?limit=10           (Limit results)
?page=1             (Pagination)
```

**Response (200):**

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "projects": [
      {
        "_id": "673d9b2c1234567890abcdef",
        "title": "My Photo Edit",
        "originalImage": {
          "imageUrl": "https://res.cloudinary.com/...",
          "format": "jpg"
        },
        "versions": [
          {
            "imageUrl": "https://res.cloudinary.com/...",
            "createdAt": "2024-11-20T10:45:00.000Z"
          }
        ],
        "createdAt": "2024-11-20T10:40:00.000Z",
        "updatedAt": "2024-11-20T10:45:00.000Z"
      }
    ]
  }
}
```

---

#### 3. Get Project Details

```http
GET /projects/:projectId
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "project": {
      "_id": "673d9b2c1234567890abcdef",
      "title": "My Photo Edit",
      "user": "673d8f2e1234567890abcdef",
      "originalImage": {
        "_id": "673d9b2d1234567890abcdef",
        "publicId": "adobe-ps-uploads/user123_1732099000",
        "imageUrl": "https://res.cloudinary.com/original.jpg",
        "format": "jpg",
        "width": 1920,
        "height": 1080
      },
      "versions": [
        {
          "_id": "673d9b2e1234567890abcdef",
          "publicId": "adobe-ps-uploads/user123_1732099100",
          "imageUrl": "https://res.cloudinary.com/version1.jpg",
          "description": "Brightness adjusted",
          "createdAt": "2024-11-20T10:45:00.000Z"
        }
      ],
      "createdAt": "2024-11-20T10:40:00.000Z",
      "updatedAt": "2024-11-20T10:45:00.000Z"
    }
  }
}
```

---

#### 4. Add Version to Project

```http
POST /projects/:projectId/add-version
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "publicId": "adobe-ps-uploads/user123_1732099200",
  "description": "Added contrast filter"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Version added successfully",
  "data": {
    "project": {
      "_id": "673d9b2c1234567890abcdef",
      "versions": [
        {
          "_id": "673d9b2e1234567890abcdef",
          "imageUrl": "https://res.cloudinary.com/version1.jpg"
        },
        {
          "_id": "673d9b2f1234567890abcdef",
          "imageUrl": "https://res.cloudinary.com/version2.jpg",
          "description": "Added contrast filter"
        }
      ]
    }
  }
}
```

---

#### 5. Update Project Title

```http
PATCH /projects/:projectId/title
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Updated Project Name"
}
```

---

#### 6. Delete Project

```http
DELETE /projects/:projectId
Authorization: Bearer <token>
```

**Response (204):**

```
No Content
```

---

### AI Processing

#### 1. Relight Image (Low-Light Enhancement)

```http
POST /ai/relight
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "publicId": "adobe-ps-uploads/user123_1732098765",
  "brightness": 1.5
}
```

**Parameters:**

- `publicId`: Image identifier from previous upload
- `brightness`: Enhancement intensity (0.1 to 3.0, default: 1.0)
  - `0.5` = Subtle enhancement
  - `1.0` = Normal enhancement
  - `2.0` = Strong enhancement

**Response (200):**

```json
{
  "status": "success",
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
    "createdAt": "2024-11-20T11:00:00.000Z"
  }
}
```

**Processing Time:** ~30-60 seconds (PyTorch model)

**Error Handling:**

```json
{
  "status": "fail",
  "message": "AI processing failed: Timeout Error"
}
```

---

### User Settings

#### 1. Get User Settings

```http
GET /settings
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "settings": {
      "maxVersions": 10
    }
  }
}
```

---

#### 2. Update Max Versions

```http
PATCH /settings/max-versions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "maxVersions": 15
}
```

**Constraints:**

- Minimum: 1
- Maximum: 15
- Default: 10

**Response (200):**

```json
{
  "status": "success",
  "message": "Settings updated successfully",
  "data": {
    "settings": {
      "maxVersions": 15
    }
  }
}
```

---

## 🔄 Request/Response Examples

### Complete Workflow Example

```javascript
// 1. Sign Up
POST /auth/signup
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "SecurePass123"
}

// 2. Verify OTP (received via email)
POST /auth/verify-otp
{
  "email": "alice@example.com",
  "otp": "123456"
}
// → Receive JWT token

// 3. Create Project with Image
POST /projects/create
Headers: { Authorization: "Bearer eyJhbGc..." }
FormData: { image: File, title: "Sunset Photo" }
// → Receive projectId and originalImage

// 4. Enhance Image with AI
POST /ai/relight
Headers: { Authorization: "Bearer eyJhbGc..." }
Body: {
  "publicId": "adobe-ps-uploads/user123_1732098765",
  "brightness": 1.2
}
// → Receive enhanced image URL

// 5. Add Enhanced Version to Project
POST /projects/:projectId/add-version
Headers: { Authorization: "Bearer eyJhbGc..." }
Body: {
  "publicId": "adobe-ps-uploads/relight_user123_1732099500",
  "description": "AI enhanced"
}

// 6. Get All Projects
GET /projects
Headers: { Authorization: "Bearer eyJhbGc..." }
```

---

## ❌ Error Handling

### Error Response Format

```json
{
  "status": "fail",
  "message": "Detailed error message",
  "error": {
    "statusCode": 400,
    "isOperational": true
  }
}
```

### Common Error Codes

| Status Code | Error Type            | Description                                     |
| ----------- | --------------------- | ----------------------------------------------- |
| 400         | Bad Request           | Invalid request data                            |
| 401         | Unauthorized          | Missing or invalid JWT token                    |
| 403         | Forbidden             | Token valid but insufficient permissions        |
| 404         | Not Found             | Resource doesn't exist                          |
| 409         | Conflict              | Duplicate resource (e.g., email already exists) |
| 413         | Payload Too Large     | File size exceeds limit                         |
| 499         | Client Closed Request | Cloudinary timeout (increase timeout)           |
| 500         | Internal Server Error | Server-side error                               |

### Example Error Responses

**401 Unauthorized:**

```json
{
  "status": "fail",
  "message": "You are not logged in. Please log in to get access"
}
```

**400 Bad Request:**

```json
{
  "status": "fail",
  "message": "Please provide image publicId"
}
```

**404 Not Found:**

```json
{
  "status": "fail",
  "message": "No image found with that ID"
}
```

**Validation Error:**

```json
{
  "status": "fail",
  "message": "Validation Error: maxVersions must be between 1 and 15"
}
```

---

## 📁 File Upload

### Supported Image Formats

- JPG/JPEG
- PNG
- WebP
- GIF

### File Size Limits

- Single upload: 10 MB
- Multiple upload: 10 MB per file

### Upload Guidelines

**React Native Example:**

```javascript
const uploadImage = async (imageUri) => {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "photo.jpg",
  });

  const response = await fetch(
    "http://localhost:4000/api/v1/adobe-ps/images/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  return await response.json();
};
```

**Flutter Example:**

```dart
Future<Map<String, dynamic>> uploadImage(File imageFile) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('http://localhost:4000/api/v1/adobe-ps/images/upload'),
  );

  request.headers['Authorization'] = 'Bearer $token';
  request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));

  var response = await request.send();
  var responseData = await response.stream.bytesToString();

  return json.decode(responseData);
}
```

---

## 🧪 Testing with Postman

### 1. Setup Environment Variables

```
base_url: http://localhost:4000/api/v1/adobe-ps
token: (will be set after login)
```

### 2. Test Sequence

**Step 1: Sign Up**

```
POST {{base_url}}/auth/signup
Body (JSON):
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test1234"
}
```

**Step 2: Verify OTP**

```
POST {{base_url}}/auth/verify-otp
Body (JSON):
{
  "email": "test@example.com",
  "otp": "123456"
}

→ Copy token from response
→ Set Environment Variable: token = <copied_token>
```

**Step 3: Upload Image**

```
POST {{base_url}}/images/upload
Headers:
  Authorization: Bearer {{token}}
Body (form-data):
  image: [Select File]

→ Copy publicId from response
```

**Step 4: AI Enhancement**

```
POST {{base_url}}/ai/relight
Headers:
  Authorization: Bearer {{token}}
Body (JSON):
{
  "publicId": "<copied_publicId>",
  "brightness": 1.5
}
```

**Step 5: Create Project**

```
POST {{base_url}}/projects/create
Headers:
  Authorization: Bearer {{token}}
Body (form-data):
  image: [Select File]
  title: "Test Project"
```

---

## 📱 Mobile App Implementation Tips

### 1. Token Management

```javascript
// Store token securely
import AsyncStorage from "@react-native-async-storage/async-storage";

const storeToken = async (token) => {
  await AsyncStorage.setItem("jwt_token", token);
};

const getToken = async () => {
  return await AsyncStorage.getItem("jwt_token");
};
```

### 2. API Service Class

```javascript
class AdobePSAPI {
  constructor() {
    this.baseURL = "http://localhost:4000/api/v1/adobe-ps";
    this.token = null;
  }

  async setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  // Auth methods
  async signup(name, email, password) {
    return this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  async verifyOTP(email, otp) {
    const data = await this.request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
    this.token = data.token;
    return data;
  }

  // Image methods
  async uploadImage(imageUri) {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "photo.jpg",
    });

    return fetch(`${this.baseURL}/images/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    }).then((res) => res.json());
  }

  // AI methods
  async relightImage(publicId, brightness = 1.0) {
    return this.request("/ai/relight", {
      method: "POST",
      body: JSON.stringify({ publicId, brightness }),
    });
  }

  // Project methods
  async getProjects() {
    return this.request("/projects");
  }

  async createProject(imageUri, title) {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "photo.jpg",
    });
    if (title) formData.append("title", title);

    return fetch(`${this.baseURL}/projects/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    }).then((res) => res.json());
  }
}

export default new AdobePSAPI();
```

### 3. Error Handling

```javascript
try {
  const result = await api.relightImage(publicId, 1.5);
  console.log("Enhanced:", result.data.relitImageUrl);
} catch (error) {
  if (error.message.includes("Unauthorized")) {
    // Token expired - redirect to login
  } else if (error.message.includes("Timeout")) {
    // Retry or show "Processing taking longer" message
  } else {
    // Show generic error message
  }
}
```

---

## 🎯 Key Features for Mobile App

### 1. Project-Based Workflow (Like ChatGPT)

- Each project = conversation
- Original image = first message
- Versions = edits/iterations
- Max versions configurable per user

### 2. Image Processing Flow

```
Upload Original → Store in Project → Apply AI Enhancement →
Add as Version → Repeat with Different Edits
```

### 3. Real-time Updates

- Use loading indicators for AI processing (30-60s)
- Show progress messages
- Handle timeouts gracefully

### 4. Offline Support

- Cache downloaded images
- Queue uploads when offline
- Sync when connection restored

---

## 📞 Support

For issues or questions:

- Backend Team: backend@your-domain.com
- API Documentation: https://your-domain.com/api-docs

---

## 🔄 Changelog

**v1.0.0** (2024-11-20)

- Initial API release
- Auth system with OTP verification
- Image upload and management
- AI-powered low-light enhancement
- Project management system
- User settings

---

**Happy Coding! 🚀**


