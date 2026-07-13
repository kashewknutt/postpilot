# Chrome Web Store Release

## Build package

```bash
pnpm install
pnpm --filter @postpilot/chrome-extension build
cd apps/chrome-extension/dist
zip -r ../../../postpilot-extension.zip .
```

## Pre-submission checklist

- Verify permissions are minimal: `storage`, `identity`, `sidePanel`, `activeTab`, `alarms`, `scripting`
- Confirm host permissions are limited to LinkedIn, X, and YouTube Studio
- Test side panel open on action click
- Test Google OAuth PKCE sign-in flow
- Validate inline widget rendering on all three platforms
- Confirm production bundle size is under 5 MB

## Upload

1. Open Chrome Web Store Developer Dashboard
2. Upload `postpilot-extension.zip`
3. Provide privacy policy and screenshots
4. Submit for review
