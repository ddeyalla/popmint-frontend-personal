# Canvas Thumbnail Generation Implementation

This document describes the implementation of canvas thumbnail generation functionality for the PopMint project, following the specifications in `.cursor/docs/canvas-thumbnail.md`.

## Overview

The thumbnail system automatically generates and uploads preview images of canvas content to provide visual previews on project cards in the homepage. Thumbnails are generated client-side using React Konva's `toDataURL()` method and uploaded to Supabase Storage.

## Architecture

### Core Components

1. **Thumbnail Utilities** (`utils/thumbnail.ts`)
   - `generateThumbnail()` - Creates JPEG blob from Konva Stage
   - `uploadThumbnail()` - Uploads blob to API endpoint
   - `generateAndUploadThumbnail()` - Combined operation
   - `withRetry()` - Retry wrapper with exponential backoff
   - `createDebouncedThumbnailGenerator()` - Debounced generation

2. **Thumbnail Hook** (`hooks/useThumbnail.ts`)
   - Manages thumbnail generation lifecycle
   - Handles debounced triggers (2s after canvas changes)
   - Listens for navigation events (beforeunload, visibilitychange)
   - Provides rate limiting (10s minimum between generations)

3. **API Endpoint** (`app/api/projects/[projectId]/thumbnail/route.ts`)
   - `POST` - Upload thumbnail and update project
   - `GET` - Retrieve thumbnail URL
   - `DELETE` - Remove thumbnail

4. **Canvas Integration** (`components/playground/canvas/canvas-area.tsx`)
   - Integrates thumbnail hook with canvas
   - Triggers generation on canvas operations
   - Connects to canvas store for automatic triggers

5. **Project Cards** (`components/home/project-card.tsx`)
   - Displays thumbnails with fallback UI
   - Handles image loading errors gracefully

## Database Schema

### Projects Table Updates
```sql
ALTER TABLE projects
  ADD COLUMN thumbnail_url text,
  ADD COLUMN thumbnail_updated_at timestamptz;

CREATE INDEX idx_projects_thumb_updated ON projects(thumbnail_updated_at DESC);
```

### Supabase Storage
- **Bucket**: `project-thumbnails`
- **File Pattern**: `{project_id}.jpg`
- **Public Access**: Read-only
- **Size Limit**: 200KB max
- **MIME Types**: `image/jpeg`

## Configuration

### Thumbnail Generation Settings
```typescript
const THUMBNAIL_CONFIG = {
  pixelRatio: 0.5,        // 50% resolution for smaller file size
  quality: 0.6,           // 60% JPEG quality
  maxWidth: 512,          // Maximum width in pixels
  maxHeight: 512,         // Maximum height in pixels
  debounceDelay: 2000,    // 2 seconds after last change
  minInterval: 10000,     // 10 seconds minimum between generations
  maxRetries: 3,          // Retry attempts on failure
};
```

### Trigger Events
- Canvas object added/updated/deleted
- Canvas object dragged/transformed
- Page navigation (beforeunload)
- Page visibility change (hidden)
- Manual generation

## Usage

### Automatic Integration
The thumbnail system is automatically integrated into the canvas area. No manual setup required in playground components.

### Manual Generation
```typescript
import { useThumbnail } from '@/hooks/useThumbnail';

const { scheduleSnapshot, generateThumbnailNow } = useThumbnail({
  projectId: 'your-project-id',
  stageRef: yourStageRef,
  enabled: true,
  onSuccess: (url) => console.log('Thumbnail generated:', url),
  onError: (error) => console.error('Generation failed:', error),
});

// Schedule debounced generation
scheduleSnapshot();

// Generate immediately
await generateThumbnailNow();
```

### Direct API Usage
```typescript
import { generateAndUploadThumbnail } from '@/utils/thumbnail';

const thumbnailUrl = await generateAndUploadThumbnail(
  stageRef.current,
  projectId,
  { quality: 0.8, maxWidth: 300 }
);
```

## Testing

### Test Page
Visit `/test-thumbnails` to test thumbnail generation with a sample canvas.

### Setup Script
Run the storage setup script:
```bash
npx ts-node scripts/setup-thumbnail-storage.ts
```

### Manual Testing Steps
1. Create a project and add canvas objects
2. Verify thumbnail generates after 2s of inactivity
3. Navigate away and return - thumbnail should persist
4. Check project card displays thumbnail
5. Test with broken/missing thumbnails

## Error Handling

### Client-Side
- Retry logic with exponential backoff (3 attempts)
- Graceful degradation when generation fails
- Console logging for debugging
- Non-blocking errors (app continues to work)

### Server-Side
- File size validation (200KB limit)
- Project ownership verification
- Storage error handling
- Proper HTTP status codes

### UI Fallbacks
- Default placeholder when no thumbnail
- Error state handling for broken images
- Loading states during generation

## Performance Considerations

### Optimization Strategies
- Debounced generation (avoid excessive calls)
- Rate limiting (10s minimum interval)
- Compressed JPEG output (60% quality)
- Small file sizes (target <50KB)
- Efficient canvas-to-blob conversion

### Monitoring
- Generation success/failure rates
- File sizes and upload times
- Storage usage tracking
- Error frequency monitoring

## Security

### Access Control
- Project ownership verification
- User-scoped storage paths
- Public read-only access to thumbnails
- No authentication bypass

### File Validation
- MIME type restrictions (JPEG only)
- File size limits (200KB max)
- Malicious content prevention

## Deployment

### Prerequisites
1. Supabase Storage bucket `project-thumbnails` created
2. Bucket policies configured for public read access
3. Database migration applied
4. Environment variables configured

### Verification Steps
1. Test thumbnail generation in playground
2. Verify storage bucket accessibility
3. Check project cards display thumbnails
4. Test error scenarios (network failures, etc.)

## Troubleshooting

### Common Issues

**Thumbnails not generating:**
- Check console for errors
- Verify project ID is available
- Ensure canvas has content
- Check Supabase Storage configuration

**Upload failures:**
- Verify Supabase credentials
- Check storage bucket exists
- Validate file size limits
- Review network connectivity

**Display issues:**
- Check thumbnail URLs are accessible
- Verify CORS configuration
- Test image loading in browser
- Review fallback UI implementation

### Debug Tools
- Browser console logs
- Network tab for upload requests
- Supabase dashboard for storage files
- Test page at `/test-thumbnails`

## Future Enhancements

### Potential Improvements
- Server-side thumbnail generation for consistency
- Multiple thumbnail sizes (small, medium, large)
- Thumbnail versioning and history
- Batch thumbnail regeneration
- Advanced compression algorithms
- Real-time thumbnail updates during editing

### Performance Optimizations
- WebP format support for better compression
- Progressive JPEG loading
- Thumbnail caching strategies
- CDN integration for faster delivery
