# Supabase Integration Setup Guide

## Overview
Your portfolio now uses Supabase to store images in a cloud database and file storage, ensuring images persist across page reloads.

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `portfolio-images` (or your choice)
   - **Password**: Create a strong password
   - **Region**: Choose your region
5. Wait for the project to initialize (2-3 minutes)

## Step 2: Get Your Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon key** (public key under "Project API keys")
3. Open `script.js` in your editor
4. Replace the top of the file:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL'; // Paste Project URL here
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Paste anon key here
   ```

## Step 3: Create Database Table

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Paste this SQL:

```sql
CREATE TABLE portfolio_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  image_index INT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category, image_index)
);

ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON portfolio_images 
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON portfolio_images 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON portfolio_images 
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON portfolio_images 
  FOR DELETE USING (true);
```

4. Click **"Run"**
5. You should see the table created in the left sidebar

## Step 4: Create Storage Bucket

1. Go to **Storage** in the sidebar
2. Click **"New bucket"**
3. Name it: `portfolio-images`
4. Make it **Public** (toggle the switch)
5. Click **Create bucket**

## Step 5: Configure Bucket Permissions

1. Click on the `portfolio-images` bucket
2. Go to **Policies**
3. Click **"New Policy"** → **"For full customization, use custom policy editor"**
4. Set these permissions allowing operations for all users:
   - SELECT: `true`
   - INSERT: `true`
   - UPDATE: `true`
   - DELETE: `true`

## Step 6: Test the Integration

1. Open your `index.html` in a browser
2. Navigate to About section and test uploading a photo
3. Refresh the page - the image should still be there!
4. Try uploading portfolio images - they should persist

## Troubleshooting

### "403 Forbidden" or permission errors
- Make sure the storage bucket is **Public**
- Check that all RLS policies are set to `true`
- Verify your credentials are correct in script.js

### Images not loading
- Check browser console (F12) for errors
- Verify the Supabase credentials are correct
- Make sure the bucket name is exactly `portfolio-images`

### Images uploading but not showing up
- Check the **Storage** → `portfolio-images` bucket - files should be there
- Verify the table was created in **Table Editor** → `portfolio_images`
- Check browser console for error messages

## How It Works

1. **Upload**: When you upload an image, it:
   - Uploads the file to Supabase Storage
   - Gets a public URL
   - Saves metadata to the database

2. **Load**: When you refresh the page:
   - JavaScript loads all images from the database
   - Displays them in the portfolio

3. **Cache**: The app caches image URLs to reduce database queries

## Database Schema

The `portfolio_images` table has:
- `id` - Unique identifier
- `category` - Where image belongs (e.g., "social", "logo", "brand1")
- `image_index` - Which slot in the category (1-10)
- `image_url` - Public URL to the image
- `storage_path` - Path in storage bucket
- `created_at` - Upload timestamp

## File Structure

Images in storage are organized like:
```
portfolio-images/
  ├── social/
  │   ├── social-1-1708105200.jpg
  │   └── social-2-1708105205.jpg
  ├── logo/
  ├── brand1/
  ├── cat-stationery/
  └── ...
```

## Advanced: Add More Categories

To add a new category like "flyer" for example, just upload an image to that category and it will be stored automatically using the same naming convention.

## Environment Security Note

Never commit your Supabase credentials to GitHub. In production, you might want to:
- Store credentials in environment variables
- Use netlify.env or similar for deployment
- Use API routes to keep sensitive operations.

For now, the current setup works for a portfolio website!

## Support

If you get stuck:
1. Check the browser console (F12) for error messages
2. Verify your credentials in script.js
3. Check Supabase Dashboard for data in the tables and storage buckets
