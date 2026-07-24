# Sign in with Apple — Supabase setup

Quippr uses **native Sign in with Apple on iOS** (`signInWithIdToken`) and **OAuth on web**.  
`invalid_client` almost always means the Apple / Supabase Client IDs or secret JWT are wrong.

## Critical: Supabase Client IDs

In **Authentication → Providers → Apple**, set **Client IDs** to (comma-separated, order matters):

```
com.quippr.app.web, com.quippr.app
```

1. **`com.quippr.app.web`** (Services ID) — must be **first** (used for web OAuth)
2. **`com.quippr.app`** (App Bundle ID) — required for native iOS token audience

If the App ID is listed first, native may work but web OAuth shows `invalid_client`.

## 1. Apple Developer

### App ID
1. **Certificates, Identifiers & Profiles → Identifiers → App IDs**
2. Select `com.quippr.app` (or create it).
3. Enable **Sign in with Apple** and save.

### Services ID (for web OAuth only)
1. **Identifiers → + → Services IDs**
2. Description: `Quippr Web Auth`
3. Identifier: `com.quippr.app.web`
4. Enable **Sign in with Apple → Configure**
5. **Primary App ID:** `com.quippr.app`
6. **Domains and Subdomains:** `bdnfxsqixsbrlvfjgkmi.supabase.co`
7. **Return URLs:**  
   `https://bdnfxsqixsbrlvfjgkmi.supabase.co/auth/v1/callback`
8. Save.

### Sign in with Apple key (for web OAuth secret)
1. **Keys → +**
2. Name: `Quippr Sign in with Apple`
3. Enable **Sign in with Apple**, configure with Primary App ID `com.quippr.app`
4. Register, download the `.p8` file (one-time download), and note the **Key ID**
5. Note your **Team ID** (top-right of Apple Developer account)

## 2. Supabase Dashboard

### Enable Apple provider
1. **Authentication → Providers → Apple**
2. Enable Apple
3. Fill in:
   - **Client IDs:** `com.quippr.app.web, com.quippr.app`
   - **Secret Key:** generate a client secret JWT (see below) — `sub` must be **`com.quippr.app.web`**
4. Save

#### Generate the client secret JWT

```bash
npm run apple:client-secret -- \
  --team-id YOUR_TEAM_ID \
  --key-id YOUR_KEY_ID \
  --client-id com.quippr.app.web \
  --key-file ./AuthKey_XXXXXXXXXX.p8
```

Or set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, and `APPLE_PRIVATE_KEY_PATH` in `.env` and run:

```bash
npm run apple:client-secret
```

Copy the printed JWT into **Secret Key** in the Supabase Apple provider settings. The JWT expires after 180 days — regenerate before it expires.

Decode the JWT at jwt.io and verify:
- `iss` = your Team ID
- `sub` = `com.quippr.app.web` (Services ID, **not** the App ID)
- `aud` = `https://appleid.apple.com`
- header `kid` = your Key ID

### Redirect URLs
1. **Authentication → URL Configuration**
2. Add these **Redirect URLs**:
   - `https://quippr.app/app`
   - `http://localhost:5173/app`
   - `com.quippr.app://auth/callback`
3. **Site URL:** `https://quippr.app`

## 3. Xcode

1. Open the iOS project (`npm run cap:open:ios`)
2. Select the **App** target → **Signing & Capabilities**
3. Confirm **Sign in with Apple** is present (repo includes `App.entitlements`)
4. Ensure the App ID `com.quippr.app` has Sign in with Apple enabled in the Apple Developer portal and your provisioning profile includes it

## 4. Verify

1. Rebuild: `npm run cap:sync:ios`
2. On a real device or simulator signed into an Apple ID, tap **Continue with Apple**
3. You should see the native Apple sheet (not a Safari “invalid_client” page)
4. After approving, you land in the app signed in

## App Store note

Apple requires Sign in with Apple when other third-party sign-in options (e.g. Google) are offered. The auth screen shows **Continue with Apple** above **Continue with Google** to meet this guideline.
