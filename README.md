# Partner Demo Site - Landing + Checkout

A clean static demo site that proves the Bondai redemption flow:

1. User lands on `/landing.html?mid=...`
2. MID is persisted to a first-party cookie `bondai_mid` (30 days, SameSite=Lax)
3. User "browses" simulated internal pages (pushState; no reload)
4. User goes to `/checkout/` (no ?mid), which pushes a single purchase event to dataLayer
5. GTM container `GTM-5MHX3K7Q` is included on both pages

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Build static assets
```bash
npm run build
```

This copies the static HTML/CSS/JS into `dist/`.

### 3. Preview the static build
```bash
npm run dev
```

Serves `dist/` at `http://localhost:3001`. The redemption status panel will warn that the redemption service is unavailable because serverless functions are not running in this mode.

### 4. Preview with Netlify Functions (for live Bondai calls)
Requires the Netlify CLI (`npm install -g netlify-cli`).

- Create a `.env` file in the project root:
```bash
BONDAI_API_URL=https://api.dev.our-projects.info/api/redemptions
BONDAI_API_KEY=YOUR_TEST_KEY
```
- Run `netlify dev` to serve both the static site and the Netlify function at `http://localhost:8888`.
- Visit `http://localhost:8888/landing.html?mid=M123` to exercise the full flow with real API responses.

### Test Steps

1. **Open Landing Page**
   - Navigate to: `http://localhost:3001/landing.html?mid=M123`
   - Self-Check shows: URL mid: M123, cookie bondai_mid: M123, GTM loaded: true with GTM-5MHX3K7Q

2. **Test Browsing Simulation**
   - Click "Simulate Browsing" button
   - Path changes a few times (no reload): `/collections`, `/product/123`, `/cart`
   - Buttons remain interactive throughout

3. **Run Landing Self-Check**
   - Click "Run Self-Check" button in the validation panel
   - All landing checks should PASS

4. **Go to Checkout**
   - Click "Go to Checkout" button
   - Navigate to: `http://localhost:3001/checkout/` (or `http://localhost:8888/checkout/` when using `netlify dev`)
   - Self-Check shows: cookie bondai_mid: M123 and no URL mid
   - The redemption status panel calls `/.netlify/functions/bondai-redemption` and displays `{ ok, data, errors }`.

5. **Verify Purchase Event**
   - dataLayer contains exactly one `{event: 'purchase', value: 79.99, currency: 'USD', transaction_id: 'A123456'}`
   - Click "Run Self-Check" button
   - All checkout checks should PASS and the redemption status should show the live API response.

6. **Test Reset MID**
   - Click "Reset MID" button on checkout page
   - Refresh page
   - Cookie should be empty (for GTM later, the Bondai tag would be gated out)
   - Triggering checkout again sends a new request through the Netlify function proxy

## File Structure

```
/
├── landing.html              # Landing page with MID capture
├── checkout/
│   └── index.html            # Checkout page (accessible at /checkout/)
├── netlify/
│   └── functions/
│       └── bondai-redemption.js # Serverless proxy keeps Bondai secrets server-side
├── assets/
│   ├── validate.css          # Self-check panel styles
│   └── validate.js           # Self-check validation logic
└── README.md                # This file
```

## Important Notes

### Trailing Slash for /checkout/
The checkout page is accessible at `/checkout/` (with trailing slash) because it's served from `/checkout/index.html`. Most static servers automatically map the route to that HTML file.

### GTM Visibility
GTM visibility may be blocked by browser extensions (ad blockers, privacy tools). For testing:
- Disable ad blockers for localhost
- Check browser console for any blocked requests
- The Self-Check panel will show if GTM is loaded correctly

### MID Persistence
- MID is captured from URL parameter `?mid=...`
- Stored in cookie `bondai_mid` for 30 days
- Also backed up to `localStorage.bondai_mid`
- Cookie uses `SameSite=Lax` and `Secure` (only on HTTPS)

### Navigation
- All internal navigation uses absolute paths (`/checkout/`, `/landing.html`)
- Browsing simulation uses `history.pushState()` to change paths without reload
- MID parameter is intentionally lost during browsing simulation (realistic behavior)
- Checkout calls the Netlify function proxy which forwards to the Bondai API

## Self-Check Panel

The validation panel (bottom-right) provides real-time monitoring:

- **Current URL**: Shows the current location.href
- **URL mid**: Shows MID from query parameters
- **Cookie bondai_mid**: Shows stored MID value
- **GTM loaded**: Shows if Google Tag Manager is loaded
- **GTM containers**: Lists detected container IDs

### Validation Tests

**Landing Page Tests:**
- MID Capture: URL mid should be captured in cookie
- GTM Loaded: GTM should be loaded with containers
- Checkout Link: Link should point to `/checkout/`

**Checkout Page Tests:**
- No URL MID: URL should not contain mid parameter
- Cookie Present: Cookie should contain MID value
- Purchase Event: dataLayer should contain exactly 1 purchase event
- GTM Loaded: GTM should be loaded with containers
- Redemption API: Network tab shows `POST /.netlify/functions/bondai-redemption` (or proxied URL in Netlify logs) returning the live result

## Troubleshooting

### Console Errors
- Ensure no JavaScript errors in browser console
- Check that all assets load correctly

### MID Not Captured
- Verify URL contains `?mid=...` parameter
- Check browser cookie settings
- Use Reset MID button to clear and retry

### GTM Not Loading
- Disable browser extensions that block tracking
- Check network tab for blocked requests
- Verify container ID `GTM-5MHX3K7Q` is correct

### Navigation Issues
- All links use absolute paths to avoid relative URL problems
- Use `netlify dev` when testing the redemption path locally so the function endpoint resolves

### Configure Secrets for Deploy
- In Netlify → Site settings → Environment variables, set `BONDAI_API_URL` and `BONDAI_API_KEY`
- The Netlify function reads secrets at runtime, so they are never written to the build output
- Rotate secrets immediately if they were ever exposed in commits or build artifacts
