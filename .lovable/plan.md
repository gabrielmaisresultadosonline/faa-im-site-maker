# Plan: Unified Admin Navigation and VPS Deployment Script

Update the admin dashboard with a persistent navigation sidebar and update the VPS deployment scripts to resolve the Nginx "000-lovblack" configuration conflict.

## User Review Required
> [!IMPORTANT]
> This plan modifies the `/admin` navigation and fixes a critical Nginx configuration error on the VPS.

- **Admin UI**: A new sidebar will be added to the Admin Dashboard for easier navigation between Users, Sales, Settings, and Documentation.
- **VPS Fix**: The deployment scripts will be updated to handle the missing symlink error reported in the terminal logs.

## Technical Details

### 1. Admin Dashboard Refactor (`src/routes/admin/dashboard.tsx`)
- Replace the current `Tabs` layout with a vertical navigation sidebar for better usability.
- Ensure state persistence between sections.

### 2. VPS Deployment Script Update (`nuclear_wipe.sh` template)
- Fix the `000-lovblack` error by checking for file existence before attempting to remove or link.
- Improve error handling in the master Nginx configuration generator.

### 3. Navigation Links
- Add explicit admin navigation links in the footer of both the Portuguese and English homepages.
