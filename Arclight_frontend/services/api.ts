// API Service Utility
// Centralized API client for making backend requests

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getCachedApiUrl, 
  initializeApiUrl, 
  setCustomApiUrl,
  getCurrentApiUrl 
} from '../constants/api';

class ApiService {
  private baseURL: string;

  constructor() {
    // Use cached URL initially
    this.baseURL = getCachedApiUrl();
    // Initialize async URL loading
    this.initializeUrl();
  }

  private async initializeUrl() {
    const url = await initializeApiUrl();
    this.baseURL = url;
    console.log('ApiService initialized with URL:', this.baseURL);
  }

  // Add method to update base URL dynamically
  async updateBaseUrl(url: string) {
    await setCustomApiUrl(url);
    this.baseURL = url;
    console.log('ApiService base URL updated to:', this.baseURL);
  }

  // Get current base URL
  getBaseUrl(): string {
    return this.baseURL;
  }

  // Refresh base URL from storage
  async refreshBaseUrl() {
    const url = await getCurrentApiUrl();
    this.baseURL = url;
    console.log('ApiService base URL refreshed to:', this.baseURL);
    return url;
  }

  // Get stored JWT token
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('jwt_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Make API request with automatic token handling
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    console.log('=== API Request ===');
    console.log('URL:', url);
    console.log('Method:', options.method || 'GET');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    if (options.body) {
      const bodyPreview = typeof options.body === 'string' 
        ? options.body.substring(0, 200) + '...' 
        : 'Non-string body';
      console.log('Body preview:', bodyPreview);
    }
    
    try {
      console.log('Making fetch request...');
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      console.log('Response received:', response.status, response.statusText);
      return response;
    } catch (error: any) {
      console.error('API Request Error:', error);
      console.error('Request URL:', url);
      console.error('Base URL:', this.baseURL);
      
      // Provide more helpful error messages
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        const helpfulError = new Error(
          `Cannot connect to backend server at ${this.baseURL}\n\n` +
          `Possible issues:\n` +
          `1. Backend server is not running\n` +
          `2. Wrong IP address in constants/api.ts\n` +
          `3. Device/emulator not on same network\n` +
          `4. Firewall blocking port 4000\n\n` +
          `Check BACKEND_SETUP.md for setup instructions.`
        );
        helpfulError.name = 'NetworkError';
        throw helpfulError;
      }
      
      throw error;
    }
  }

  // Auth Methods
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      // If response is not valid JSON, create error object
      data = {
        success: false,
        message: response.statusText || 'An error occurred',
      };
    }
    
    if (response.ok && data.success === true) {
      // Store token and user data
      if (data.token) {
        await AsyncStorage.setItem('jwt_token', data.token);
      }
      if (data.data?.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.data.user));
      }
    }

    return { response, data };
  }

  async signup(name: string, email: string, password: string) {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      // If response is not valid JSON, create error object
      data = {
        success: false,
        message: response.statusText || 'An error occurred',
      };
    }
    return { response, data };
  }

  async verifyOTP(email: string, otp: string) {
    const response = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      // If response is not valid JSON, create error object
      data = {
        success: false,
        message: response.statusText || 'An error occurred',
      };
    }
    
    if (response.ok && data.success === true) {
      // Store token and user data after OTP verification
      if (data.token) {
        await AsyncStorage.setItem('jwt_token', data.token);
      }
      if (data.data?.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.data.user));
      }
    }

    return { response, data };
  }

  // Logout - clear stored tokens and user data
  async logout() {
    try {
      await AsyncStorage.removeItem('jwt_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('pending_email');
      await AsyncStorage.removeItem('pending_password');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  // Google Authentication
  async googleAuth(idToken: string) {
    console.log('=== API Service: Google Auth ===');
    console.log('Endpoint: /auth/google');
    console.log('ID Token provided:', idToken ? `Yes (length: ${idToken.length})` : 'NO - MISSING!');
    
    const response = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    let data;
    try {
      data = await response.json();
      console.log('Response data:', data);
    } catch (error) {
      console.error('Failed to parse response JSON:', error);
      // If response is not valid JSON, create error object
      data = {
        success: false,
        message: response.statusText || 'An error occurred',
      };
    }
    
    if (response.ok && data.success === true) {
      console.log('✅ Storing token and user data');
      // Store token and user data
      if (data.token) {
        await AsyncStorage.setItem('jwt_token', data.token);
      }
      if (data.data?.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.data.user));
      }
    } else {
      console.error('❌ Google auth failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    }

    return { response, data };
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // ============================================================
  // IMAGE UPLOAD
  // Upload image to backend
  // ============================================================
  async uploadImage(imageUri: string): Promise<{ response: Response; data: any }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    // Create FormData for file upload
    const formData = new FormData();
    
    // Extract filename from URI
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // Append file to FormData
    formData.append('image', {
      uri: imageUri,
      type: type,
      name: filename,
    } as any);

    // Make request with FormData (don't set Content-Type, let fetch set it with boundary)
    const url = `${this.baseURL}/images/upload`;
    
    console.log('=== Upload Image ===');
    console.log('URL:', url);
    console.log('Image URI:', imageUri);
    console.log('Filename:', filename);
    console.log('Type:', type);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - let fetch set it with boundary for FormData
      },
      body: formData,
    });

    console.log('Upload response status:', response.status);

    let data;
    try {
      data = await response.json();
      console.log('Upload response data:', data);
    } catch (error) {
      console.error('Failed to parse upload response:', error);
      data = {
        success: false,
        message: response.statusText || 'Upload failed',
      };
    }

    return { response, data };
  }

  // ============================================================
  // CREATE PROJECT
  // Create a new project from uploaded image
  // ============================================================
  async createProject(publicId: string, title?: string): Promise<{ response: Response; data: any }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await this.request('/projects/create', {
      method: 'POST',
      body: JSON.stringify({
        publicId,
        title: title || 'Untitled Project',
      }),
    });

    let data;
    try {
      data = await response.json();
      console.log('Create project response:', data);
    } catch (error) {
      console.error('Failed to parse create project response:', error);
      data = {
        success: false,
        message: response.statusText || 'Failed to create project',
      };
    }

    return { response, data };
  }

  // ============================================================
  // ENHANCE IMAGE
  // Removes noise or motion blur using NAFNet AI model
  // 
  // Endpoint: POST /api/v1/adobe-ps/ai/enhance
  // 
  // Request Body:
  //   {
  //     "publicId": "adobe-ps-uploads/abc123xyz",
  //     "mode": "denoise" | "deblur"
  //   }
  // 
  // Parameters:
  //   - publicId (required): Cloudinary public ID of the uploaded image
  //   - mode (required): Enhancement mode
  //     - "denoise": Remove noise/grain from images (High ISO photos, scanned documents, old photos)
  //     - "deblur": Remove motion blur (Motion blur, camera shake, out-of-focus images)
  // 
  // Success Response (200):
  //   {
  //     "success": true,
  //     "message": "Image denoised successfully",
  //     "data": {
  //       "originalImageId": "...",
  //       "originalImageUrl": "...",
  //       "enhancedImageId": "...",
  //       "enhancedImageUrl": "...",
  //       "publicId": "...",
  //       "mode": "denoise",
  //       "format": "jpg",
  //       "width": 1920,
  //       "height": 1080,
  //       "size": 456789,
  //       "createdAt": "..."
  //     }
  //   }
  // 
  // Processing Time: 30-60 seconds
  // Backend: aiController.enhanceImage() -> Docker: nafnet-service (sameer513/nafnet-image)
  // ============================================================
  async enhanceImage(publicId: string, mode: 'denoise' | 'deblur'): Promise<{ response: Response; data: any }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    // Validate mode parameter according to API spec
    if (!['denoise', 'deblur'].includes(mode)) {
      throw new Error('Mode must be either "denoise" or "deblur"');
    }

    console.log('=== Enhance Image API Call ===');
    console.log('Endpoint: POST /api/v1/adobe-ps/ai/enhance');
    console.log('PublicId:', publicId);
    console.log('Mode:', mode);
    console.log('Use Cases:');
    console.log('  - denoise: High ISO photos, scanned documents, old photos');
    console.log('  - deblur: Motion blur, camera shake, out-of-focus images');

    // Call the enhance endpoint
    // Backend flow:
    // 1. Validates publicId and mode
    // 2. Finds image in database by publicId
    // 3. Ensures Docker container (nafnet-service) is running
    // 4. Copies image to container
    // 5. Runs NAFNet AI model with appropriate config:
    //    - denoise: options/test/SIDD/NAFNet-width64.yml
    //    - deblur: options/test/REDS/NAFNet-width64.yml
    // 6. Copies result back from container
    // 7. Uploads enhanced image to Cloudinary
    // 8. Saves to database
    // 9. Returns success response with enhancedImageUrl
    const response = await this.request('/ai/enhance', {
      method: 'POST',
      body: JSON.stringify({
        publicId,
        mode,
      }),
    });

    let data;
    try {
      // Try to parse JSON response
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
        console.log('Enhance image response:', data);
      } else {
        // Empty response
        data = {
          success: false,
          message: 'Empty response from server',
        };
      }
    } catch (error) {
      console.error('Failed to parse enhance image response:', error);
      // If JSON parsing fails, check if it's an error response
      // Backend error format: { status: 'fail', message: '...' } or { success: false, message: '...' }
      data = {
        success: false,
        message: response.statusText || 'Failed to enhance image',
      };
    }

    return { response, data };
  }

  // ============================================================
  // REMOVE BACKGROUND
  // Remove background from image using rembg
  // Route: POST /api/ai/remove-background
  // Backend: aiController.removeBackground
  // 
  // Parameters:
  //   - publicId: Cloudinary public ID of the image
  //   - mode: 'human' for subject removal, 'object' for object removal
  // 
  // Returns:
  //   - Image with background removed (transparent PNG)
  // ============================================================
  async removeBackground(publicId: string, mode: 'human' | 'object'): Promise<{ response: Response; data: any }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    // Validate mode parameter
    if (!['human', 'object'].includes(mode)) {
      throw new Error('Mode must be either "human" or "object"');
    }

    console.log('=== Remove Background API Call ===');
    console.log('PublicId:', publicId);
    console.log('Mode:', mode);

    // Call the remove-background route in aiRoutes.js
    // This route calls aiController.removeBackground which:
    // 1. Finds image in database by publicId
    // 2. Uses rembg tool with appropriate model:
    //    - human: u2net_human_seg (for subject removal)
    //    - object: u2netp (for object removal)
    // 3. Removes background and creates transparent PNG
    // 4. Uploads to Cloudinary
    // 5. Saves to database
    // 6. Returns processed image URL
    const response = await this.request('/ai/remove-background', {
      method: 'POST',
      body: JSON.stringify({
        publicId,
        mode,
      }),
    });

    let data;
    try {
      data = await response.json();
      console.log('Remove background response:', data);
    } catch (error) {
      console.error('Failed to parse remove background response:', error);
      data = {
        success: false,
        message: response.statusText || 'Failed to remove background',
      };
    }

    return { response, data };
  }

  // ============================================================
  // STYLE TRANSFER
  // Apply artistic style from one image to another
  // Route: POST /api/ai/style-transfer
  // Backend: aiController.styleTransfer
  // Docker: style-transfer-service (sameer513/pca-style-transfer-fixed)
  // 
  // Parameters:
  //   - contentPublicId: Cloudinary public ID of content image
  //   - stylePublicId: Cloudinary public ID of style image
  // 
  // Returns:
  //   - Styled image URL
  //   - Processing takes 30-90 seconds (Docker container processing)
  // ============================================================
  async styleTransfer(contentPublicId: string, stylePublicId: string): Promise<{ response: Response; data: any }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    console.log('=== Style Transfer API Call ===');
    console.log('Content PublicId:', contentPublicId);
    console.log('Style PublicId:', stylePublicId);

    // Call the style-transfer route in aiRoutes.js
    // This route calls aiController.styleTransfer which:
    // 1. Finds both images in database
    // 2. Ensures Docker container (style-transfer-service) is running
    // 3. Copies both images to container
    // 4. Runs style transfer AI model
    // 5. Copies result back from container
    // 6. Uploads to Cloudinary
    // 7. Saves to database
    // 8. Returns styled image URL
    const response = await this.request('/ai/style-transfer', {
      method: 'POST',
      body: JSON.stringify({
        contentPublicId,
        stylePublicId,
      }),
    });

    let data;
    try {
      data = await response.json();
      console.log('Style transfer response:', data);
    } catch (error) {
      console.error('Failed to parse style transfer response:', error);
      data = {
        success: false,
        message: response.statusText || 'Failed to transfer style',
      };
    }

    return { response, data };
  }
}

// Export singleton instance
export default new ApiService();

