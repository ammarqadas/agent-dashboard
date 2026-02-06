# Environment Setup Guide

## CORS Fix - Required Configuration

To fix CORS issues, you **must** create a `.env.local` file in the root directory with the following:

```env
# URL of your dadih-server API (backend)
DADIH_API_URL=http://localhost:3000/api

# Public API URL (frontend uses this - MUST be /api/proxy)
NEXT_PUBLIC_API_URL=/api/proxy
```

## Important Notes

1. **`NEXT_PUBLIC_API_URL` MUST be set to `/api/proxy`** - This ensures all API calls go through the Next.js proxy route, which handles CORS automatically.

2. **Do NOT set `NEXT_PUBLIC_API_URL` to `http://localhost:3000/api`** - This will cause CORS errors because the browser will try to call the dadih-server directly.

3. **After creating/updating `.env.local`**, you **MUST restart your Next.js dev server**:
   ```bash
   # Stop the server (Ctrl+C) and restart:
   npm run dev
   # or
   yarn dev
   ```

## How It Works

1. Frontend makes request to: `/api/proxy/users/login`
2. Next.js proxy route (`app/api/proxy/[...path]/route.ts`) receives the request
3. Proxy forwards to: `http://localhost:3000/api/users/login` (from `DADIH_API_URL`)
4. Proxy adds CORS headers and returns response
5. No CORS errors! ✅

## Troubleshooting

If you still see CORS errors:

1. ✅ Check that `.env.local` exists in the root directory
2. ✅ Verify `NEXT_PUBLIC_API_URL=/api/proxy` (not the full URL)
3. ✅ Restart the dev server after creating/updating `.env.local`
4. ✅ Clear browser cache or use incognito mode
5. ✅ Check browser console - requests should go to `/api/proxy/*` not `http://localhost:3000/api/*`

## Example `.env.local` file

Create this file at: `F:\nextjs\shadcn-dashboard\.env.local`

```env
DADIH_API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_URL=/api/proxy
```


