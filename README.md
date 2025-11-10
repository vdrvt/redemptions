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

This copies the static HTML/CSS/JS into `dist/` and includes the entry selector (`index.html`) plus the landing and checkout variants.

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

7. **(Optional) GTM-only Landing**
   - Navigate to: `http://localhost:3001/landing-gtm.html?mid=M123`
   - No server-side call is made; MID is pushed to `dataLayer` with the event `mid_ready`
   - Configure a GTM Custom HTML tag to read the MID and call the API client-side

8. **(Optional) GTM-only Checkout**
   - From the GTM landing page, click “Proceed to GTM checkout” (URL includes the `mid` automatically)
   - Page pushes `{ event: 'bondai_redemption_ready', payload: { ... } }` to `dataLayer`
   - Use your GTM Custom HTML tag to perform the redemption call and invoke `window.updateBondaiStatus(result)`

## File Structure

```
/
├── index.html               # Entry point with MID selector and flow chooser
├── landing.html             # Landing page with MID capture (server-side flow)
├── landing-gtm.html         # Landing page for GTM-only API trigger
├── checkout-gtm.html        # Checkout page for GTM-only redemption flow
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
- All internal navigation uses absolute paths (`/checkout/`, `/landing.html`, `/landing-gtm.html`, `/checkout-gtm.html`)
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

## GTM Custom HTML Tag Setup (Landing/Checkout GTM variants)

> These instructions assume zero GTM experience—follow them step by step.

### Step 0 – Open GTM Preview
1. Log in to <https://tagmanager.google.com/>.
2. Pick the container that matches `GTM-5MHX3K7Q`.
3. Click **Preview** (top-right), enter your site URL (for example `https://YOUR-SITE.netlify.app/landing-gtm.html?mid=M123`), and press **Connect**.  
   This opens Tag Assistant in a new tab so you can watch events as they happen.

### Step 1 – Capture data from the dataLayer
We will make two simple variables so GTM can read the MID and payload objects we push.

1. In the GTM workspace click **Variables**.
2. Under *User-Defined Variables* click **New** → **Variable Configuration** → choose **Data Layer Variable**.
3. Name it `bondai_mid`, set **Data Layer Variable Name** to `mid`, leave everything else default, and save.
4. Repeat to create another Data Layer Variable named `bondai_payload` with **Data Layer Variable Name** `payload`.

### Step 2 – Listen for the checkout signal
The GTM-only checkout page emits the custom event `bondai_redemption_ready`. We need a trigger for it.

1. Go to **Triggers** → **New**.
2. Choose **Trigger Configuration** → **Custom Event**.
3. Set **Event name** to `bondai_redemption_ready`.  
4. Leave “This trigger fires on” set to **All Custom Events** and save it as `Bondai – Redemption Ready`.

### Step 3 – Build the Custom HTML tag
This tag will:
- read the payload,
- call the Netlify proxy (`/.netlify/functions/bondai-redemption`),
- tell the page what happened via `window.updateBondaiStatus(...)`,
- push a completion event back into the dataLayer.

1. Go to **Tags** → **New**.
2. Choose **Tag Configuration** → **Custom HTML**.
3. Paste the code below into the HTML box:
   ```html
   <script>
     (async function() {
       try {
         var payload = {{bondai_payload}} || {};

         if (!payload.member_partner_key) {
           throw new Error('Missing member_partner_key');
         }

         var response = await fetch('/.netlify/functions/bondai-redemption', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(payload)
         });

         var result = await response.json();

         if (window.updateBondaiStatus) {
           window.updateBondaiStatus(result);
         }

         window.dataLayer = window.dataLayer || [];
         window.dataLayer.push({ event: 'bondai_redemption_completed', result: result });
       } catch (error) {
         var failure = {
           ok: false,
           errors: [{ message: error && error.message ? error.message : 'Unknown error' }]
         };

         if (window.updateBondaiStatus) {
           window.updateBondaiStatus(failure);
         }

         window.dataLayer = window.dataLayer || [];
         window.dataLayer.push({ event: 'bondai_redemption_completed', result: failure });
       }
     })();
   </script>
   ```
4. Scroll down to **Triggering**, click **Add Trigger**, and pick `Bondai – Redemption Ready`.
5. Name the tag `Bondai – Redemption via Netlify Function` and save.

### Step 4 – (Optional) React when the MID first appears
On `landing-gtm.html` we push `event: 'mid_ready'`. You can repeat Steps 2–3 with that event if you want to run extra tags when the MID is captured (for analytics, debugging, etc.).

### Step 5 – Test it
1. With GTM preview still open, load `/landing-gtm.html?mid=M123`, then click through to `/checkout-gtm.html`.
2. In Tag Assistant you should see:
   - Event `mid_ready` on the landing page.
   - Events `purchase` and `bondai_redemption_ready` on the checkout page.
3. Confirm the **Bondai – Redemption via Netlify Function** tag fires on `bondai_redemption_ready`.
4. Back on the site, the “Bondai Redemption Status” panel should update with success/failure instead of “waiting for GTM”.
5. Once everything looks correct, click **Submit** in GTM to publish your changes.
