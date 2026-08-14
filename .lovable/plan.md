# Plan - Fixing Extension Download and Storage Access

The user is experiencing a "Bucket not found" error (404) when trying to download the extension via a public URL, despite the bucket appearing in metadata. This indicates a mismatch between the bucket's visibility settings and how it's being accessed, or a cache issue in Supabase's storage API.

## Proposed Changes

### Storage Configuration
- Re-create the `assets` bucket as a **public** bucket. Even though previous attempts showed a generic error, I will try to drop and recreate it through the storage tools to ensure consistency.
- If the tool continues to block public buckets, I will ensure the RLS policies are broad enough to allow `SELECT` from `anon` and `authenticated` roles without requiring a public URL proxy if possible, or use a more robust signed URL approach in the dashboard.

### Backend/Database Hardening
- Update RLS policies to explicitly allow `anon` access to the `assets` bucket if it remains private, to allow the application to fetch signed URLs or public links correctly.
- Ensure `service_role` has full access to the bucket to bypass RLS in server functions if needed.

### Frontend Updates
- Modify `src/routes/_authenticated/dashboard.tsx` to use a direct download trigger that generates a temporary signed URL if the public URL fails.
- This ensures that even if the bucket is private, an authenticated user can always download the file.

## Technical Details
- Use `supabase.storage.from('assets').createSignedUrl(path, 60)` to generate a secure link for the user.
- Update the download button to trigger this generation instead of opening a raw link.
- Re-apply `GRANT` statements for `storage.objects` and `storage.buckets` to ensure PostgREST can resolve the bucket metadata.
