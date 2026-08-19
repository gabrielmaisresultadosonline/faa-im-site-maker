---
name: Fix Free Trial Activation and Video Playback
description: Resolve RLS bypass failures in trial creation and ensure persistent public domain normalization for video assets on VPS.
type: feature
---

## Analysis
The "Não foi possível ativar o teste" (Could not activate trial) error occurs because:
1.  **RLS Timing/Permissions:** Even with `supabaseAdmin`, the `subscriptions` table has a `user_id` FK to `auth.users`. In `handle_new_user` (Postgres trigger), the trial insertion might fail if the `auth.users` row isn't fully visible or if RLS policies on `profiles` (required by trigger logic or FKs) interfere.
2.  **Server Function Execution:** The `startTrial` server function uses `requireSupabaseAuth`. If the user session isn't fully propagated to the database yet, the admin client might fail to link the subscription to a non-existent `user_id` profile.
3.  **Video 500 Errors:** Occur when the VPS server (Node-server) returns a local IP (127.0.0.1) in signed URLs, which the client cannot reach.

## Proposed Changes

### 1. Database & RLS Stabilization
- Update `handle_new_user` trigger to be more resilient, ensuring the profile exists before inserting the trial.
- Add a direct `GRANT ALL` on `subscriptions` to `service_role`.
- Refine RLS on `subscriptions` to ensure `service_role` (admin client) has total bypass.

### 2. Trial Logic Refactoring (`src/lib/trial.functions.ts`)
- Refactor `startTrial` to explicitly check for the profile existence before insertion.
- Use a retry mechanism or a small delay if the profile isn't found immediately after signup.
- Improve error reporting to distinguish between "Database busy" and "Already used".

### 3. Video Assets Resiliency (`src/lib/video.functions.ts`)
- Ensure `publicDomain` normalization is applied not just to signed URLs but also to fallback public URLs.
- Add a safety check for the `assets` bucket existence.

### 4. UI Feedback (`src/routes/_authenticated/dashboard.tsx` & `AuthModal.tsx`)
- Standardize the error message and add a "Retry" state.
- Ensure the `isTrial` flag in `AuthModal` correctly triggers the backend logic via metadata.

## Technical Details
- **RLS Bypass:** `getSupabaseAdmin` will be verified to ensure it uses the Service Role Key correctly from environment variables (`process.env`).
- **Storage Normalization:** Forced string replacement of `localhost`/`127.0.0.1` in all storage-related URLs.
- **Trigger Integrity:** The `handle_new_user` trigger will be hardened to avoid silent failures that leave the user without a profile.
