# Update Google Client ID in Backend

## Quick Fix

### Step 1: Open .env File

**Location**: `Arclight_backend/Inter-IIT-tech-Adobe-PS/backend/.env`

If the file doesn't exist, create it in the `backend/` directory.

### Step 2: Add or Update This Line

Add or find this line in your `.env` file:

```env
Google_client_id=139703726697-514pq0plg1k7qommvlj6eheftvsp8otf.apps.googleusercontent.com
```

**Important**:
- Variable name must be exactly: `Google_client_id` (case-sensitive)
- No spaces around the `=` sign
- No quotes needed
- Use the exact Client ID from Google Cloud Console

### Step 3: Save the File

Save the `.env` file after making changes.

### Step 4: Restart Backend Server

**CRITICAL**: Environment variables are only loaded when the server starts.

1. **Stop the backend server** (if running): Press `Ctrl+C` in the terminal
2. **Start it again**:
   ```bash
   cd Arclight_backend/Inter-IIT-tech-Adobe-PS/backend
   npm start
   ```

### Step 5: Verify

Check the backend console. You should see:
- `MongoDB Connection Successful !! 🎉`
- `Server is running on port 4000`
- No errors about `Google_client_id`

## Complete .env File Template

If you need to create the `.env` file from scratch, here's a template:

```env
# Database
DATABASE=mongodb+srv://username:<PASSWORD>@cluster.mongodb.net/dbname
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Google OAuth - UPDATE THIS!
Google_client_id=139703726697-514pq0plg1k7qommvlj6eheftvsp8otf.apps.googleusercontent.com

# Email (for OTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloudinary (for images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_key

# Server
PORT=4000
NODE_ENV=development
```

## Troubleshooting

### "Google_client_id is undefined"

**Fix**: 
1. Make sure `.env` file exists in `backend/` directory
2. Check variable name is exactly `Google_client_id` (not `GOOGLE_CLIENT_ID` or `google_client_id`)
3. Restart the server after changing `.env`

### "Invalid client" error

**Fix**:
1. Make sure Client ID matches Google Cloud Console exactly
2. No extra spaces or characters
3. Copy-paste directly from Google Console

### Server won't start

**Fix**:
1. Check all required environment variables are set
2. Check for syntax errors in `.env` file
3. Make sure no quotes around values (unless needed)

## Current Required Value

**Use the Client ID from your `.env` file**. The backend should use the same Client ID that matches what the frontend is using.

**Important**: 
- If frontend uses Web Client ID → Backend should use Web Client ID
- If frontend uses Android Client ID → Backend should use Android Client ID
- Both frontend and backend must use the **same Client ID** for token verification to work

The variable name in backend `.env` is:
```env
Google_client_id=YOUR_CLIENT_ID_HERE
```

Copy the Client ID from your frontend `.env` file (the one being used) into the backend `.env` file.

