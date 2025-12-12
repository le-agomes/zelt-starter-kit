# Edge Functions Deployment Guide

Your frontend is deployed at: **https://zelt-starter-kit.vercel.app/**

To make all features work (workflows, tasks, etc.), you need to deploy the 13 edge functions.

## Quick Deploy (Recommended)

If you have Supabase CLI installed on your local machine:

```bash
# 1. Install Supabase CLI (if not already installed)
npm install supabase --save-dev
# or
brew install supabase/tap/supabase  # macOS
# or visit: https://supabase.com/docs/guides/cli

# 2. Login to Supabase
npx supabase login

# 3. Run the deployment script
./deploy-functions.sh
```

That's it! All 13 functions will be deployed automatically.

---

## Manual Deploy (via Supabase Dashboard)

If you prefer to deploy via the web interface:

1. **Go to Functions page:**
   https://supabase.com/dashboard/project/qziltegbxmsmnsifuast/functions

2. **Deploy each function:**
   - Click "New Edge Function" or "Deploy"
   - Function name: (see list below)
   - Copy/paste the code from `supabase/functions/{function-name}/index.ts`
   - Click "Deploy"

### Functions to Deploy (13 total):

| # | Function Name | Purpose |
|---|---------------|---------|
| 1 | `create-run` | Create new workflow runs |
| 2 | `complete-step` | Mark workflow steps as complete |
| 3 | `skip-step` | Skip workflow steps |
| 4 | `cancel-run` | Cancel workflow runs |
| 5 | `toggle-run-pause` | Pause/resume workflow runs |
| 6 | `reassign-step` | Reassign tasks to different users |
| 7 | `reorder-steps` | Reorder workflow steps |
| 8 | `duplicate-workflow` | Clone workflows |
| 9 | `invite-user` | Send user invitations |
| 10 | `update-user-profile` | Update user profiles |
| 11 | `get-org-settings` | Retrieve organization settings |
| 12 | `save-org-settings` | Save organization settings |
| 13 | `post-signin` | Post-authentication setup |

---

## Verify Deployment

After deploying, test your app:

1. Visit: https://zelt-starter-kit.vercel.app/
2. Sign in
3. Try creating a workflow
4. Try starting a workflow run
5. Check the browser console for any errors

---

## Environment Configuration

**Supabase Settings** (already configured ✅):
- Site URL: `https://zelt-starter-kit.vercel.app`
- Redirect URL: `https://zelt-starter-kit.vercel.app/auth/callback`

**Vercel Environment Variables** (already configured ✅):
```
VITE_SUPABASE_PROJECT_ID=qziltegbxmsmnsifuast
VITE_SUPABASE_PUBLISHABLE_KEY=<your-key>
VITE_SUPABASE_URL=https://qziltegbxmsmnsifuast.supabase.co
```

---

## Troubleshooting

### Functions not working?
- Check function logs: https://supabase.com/dashboard/project/qziltegbxmsmnsifuast/logs/edge-functions
- Verify JWT settings in `supabase/config.toml`
- Check browser console for errors

### Authentication issues?
- Verify Site URL and Redirect URLs in Supabase dashboard
- Check that email/password providers are enabled

### Need help?
Open an issue or check the Supabase documentation:
- https://supabase.com/docs/guides/functions
