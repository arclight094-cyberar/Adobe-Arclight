# Fix: "Client wasn't found" Error

## The Problem

The backend can't find the Google Client ID. This means the `.env` file is either:
- Missing the `Google_client_id` variable
- Has the wrong Client ID
- Not being loaded properly

## Solution: Update Backend .env File

### Step 1: Locate the .env File

**File location**: `Arclight_backend/Inter-IIT-tech-Adobe-PS/backend/.env`

### Step 2: Add or Update Google_client_id

Open the `.env` file and add/update this line:

```env
Google_client_id=139703726697-514pq0plg1k7qommvlj6eheftvsp8otf.apps.googleusercontent.com
```

**Important**: 
- Use the exact Client ID from your Google Cloud Console
- No spaces around the `=`
- No quotes needed

### Step 3: Verify .env File Format

Your `.env` file should look something like this:

```env
# Database
DATABASE=mongodb+srv://username:<PASSWORD>@cluster.mongodb.net/dbname
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Google OAuth
Google_client_id=139703726697-514pq0plg1k7qommvlj6eheftvsp8otf.apps.googleusercontent.com

# Other environment variables...
```

### Step 4: Restart Backend Server

After updating `.env`:

1. **Stop the backend server** (Ctrl+C)
2. **Start it again**:
   ```bash
   cd Arclight_backend/Inter-IIT-tech-Adobe-PS/backend
   npm start
   ```

**Important**: Environment variables are only loaded when the server starts, so you must restart after changing `.env`.

### Step 5: Verify It's Loaded

Check the backend console for any errors. The server should start without "Google_client_id not found" errors.

## Troubleshooting

### Error: "Google_client_id is undefined"

**Cause**: The `.env` file doesn't have the variable or isn't being loaded.

**Fix**:
1. Make sure `.env` file exists in `backend/` directory
2. Check the variable name is exactly: `Google_client_id` (case-sensitive)
3. Make sure there are no spaces: `Google_client_id=value` (not `Google_client_id = value`)
4. Restart the server

### Error: "Invalid client"

**Cause**: The Client ID in `.env` doesn't match the one in Google Cloud Console.

**Fix**:
1. Copy the exact Client ID from Google Cloud Console
2. Paste it in `.env` file
3. Make sure there are no extra characters or spaces
4. Restart the server

### .env File Not Found

**Cause**: The `.env` file might not exist.

**Fix**:
1. Create `.env` file in `backend/` directory
2. Add all required environment variables
3. Make sure it's in the same directory as `server.js`

## Quick Checklist

- [ ] `.env` file exists in `backend/` directory
- [ ] `Google_client_id` is in `.env` file
- [ ] Client ID matches Google Cloud Console exactly
- [ ] No spaces around `=` sign
- [ ] Backend server restarted after changes
- [ ] No errors in backend console

## Current Required Value

```env
Google_client_id=139703726697-514pq0plg1k7qommvlj6eheftvsp8otf.apps.googleusercontent.com
```

Copy this exactly into your `.env` file.

