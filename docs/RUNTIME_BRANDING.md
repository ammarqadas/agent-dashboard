# Runtime branding

Set BRAND_DIRECTORY to an external folder containing brand.json, optional
theme.css, and assets/. Mount it read-only at /run/branding in Docker and set
BRAND_DIRECTORY=/run/branding. The backend can mount the same host folder.

The complete schema, example profile, Compose overlay and operating instructions
are maintained in the backend repository:

- branding/example/brand.json
- docker-compose.branding.yml
- docs/RUNTIME_BRANDING.md

The profile is read at runtime, not through NEXT_PUBLIC_* build variables.
Images/fonts are served from /branding/assets/..., and optional CSS from
/branding/custom.css. Refresh the page after changing the external files.

The portable lib/branding/runtime.mjs module shares the backend contract; keep
it synchronized with dadih-server/src/lib/branding/runtime.mjs when changing
validation, file serving or theme adaptation. The client BrandProvider receives
only display settings. Default branding remains available without the mount.

PDF/print slips: capture code resolves `--brand-font-family` from the generated
theme (BrandLocal when the profile supplies a font file, Almarai otherwise) and
`.print-slip` pins paper neutrals on the slip element, so dark sessions never
produce dark printed/PDF receipts. Brand accents, logo and name stay
profile-driven. Shipped profiles in the backend repository: `branding/shumul`
(deployment-active parity layer) and `branding/dadih` (prepared).
