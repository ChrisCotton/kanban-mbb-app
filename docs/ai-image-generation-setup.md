# AI Image Generation Setup

This document describes how to configure AI image generation providers for the Vision Board feature.

## Supported Providers

The Vision Board supports two AI providers for image and video generation:

1. **Nano Banana** - Fast AI image generation
2. **Google Veo 3** - Google video/image generation (supports both images and videos)

## Environment Variables

Add the following environment variables to your `.env.local` file:

### Nano Banana

```bash
# Nano Banana API Key (required for nano_banana provider)
NANO_BANANA_API_KEY=your_nano_banana_api_key_here

# Optional: Custom Nano Banana API endpoint
# Default: https://api.nanobanana.ai/v1/generate
NANO_BANANA_API_ENDPOINT=https://api.nanobanana.ai/v1/generate
```

**How to get Nano Banana API Key:**
1. Sign up at [Nano Banana](https://nanobanana.ai)
2. Navigate to your API settings
3. Generate a new API key
4. Copy the key to your `.env.local` file

### Google Veo 3 / Imagen 3

```bash
# Google AI API Key (required for veo_3 provider)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Optional: Custom Google AI API endpoint
# Default: https://generativelanguage.googleapis.com/v1beta/models
GOOGLE_AI_API_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models
```

**How to get Google AI API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env.local` file

## Provider Selection

Users can select their preferred AI provider in their Profile settings:

1. Navigate to **Profile** page
2. Find the **Image Generation AI** dropdown
3. Select either:
   - **Nano Banana** - For fast image generation
   - **Veo 3** - For video generation or Google's image models

## Usage

### Image Generation

1. Go to **Vision Board** page
2. Fill in the AI Generator form:
   - **Prompt**: Describe the image you want
   - **Goal**: Required goal text (e.g., "Buy a house")
   - **Due Date**: Required due date (select from intervals or custom date)
   - **Media Type**: Select "Image"
3. Click **Generate Image**
4. The generated image will be saved with your goal and due date

### Video Generation

1. Go to **Vision Board** page
2. Fill in the AI Generator form:
   - **Prompt**: Describe the video you want
   - **Goal**: Required goal text
   - **Due Date**: Required due date
   - **Media Type**: Select "Video"
3. Click **Generate Video**
4. Note: Video generation requires Veo 3 provider (Nano Banana only supports images)

## Error Handling

If an API key is missing:
- The system will return a helpful error message
- Users will be prompted to configure the API key
- Generation will fail gracefully with user-friendly error messages

## Implementation Status

**Current Status**: API endpoint structure is in place, but actual API integrations need to be implemented:

- ✅ API endpoint created (`/api/vision-board/generate`)
- ✅ Provider routing logic implemented
- ✅ Error handling for missing API keys
- ⚠️ **Nano Banana API integration**: Needs actual API call implementation
- ⚠️ **Google Veo 3 API integration**: Needs actual API call implementation

**Next Steps:**
1. Review Nano Banana API documentation
2. Review Google Veo 3 / Imagen 3 API documentation
3. Implement actual API calls in `pages/api/vision-board/generate.ts`
4. Test with real API keys
5. Handle API-specific errors and rate limits

## Testing Without API Keys

For development/testing without API keys:
- The system will show helpful error messages
- You can test the UI flow without actual generation
- Mock responses can be added for testing purposes

## Security Notes

- ⚠️ **Never commit API keys to git**
- ✅ Add `.env.local` to `.gitignore` (should already be there)
- ✅ API keys are server-side only (not exposed to client)
- ✅ Use environment variables for all sensitive configuration
