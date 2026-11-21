# KINEXIS Client Portal — asset pack

Copy the `assets` folder into `kinexis-client-portal/`, merging folders. The exact requested drop-in paths are included:
- assets/logo/kinexis-logo.svg — dark-bordered KINEXIS artwork for light backgrounds
- assets/logo/kinexis-logo-dark.svg — light-bordered KINEXIS artwork for dark mode
- assets/logo/favicon.svg — K monogram
- assets/img/login-hero.jpg — 1200×1600, under 400 KB

Also included: PNG logo fallbacks, ICO/16/32 favicons, Apple/PWA icons, editable SVG and WebP login artwork, 12 feature/navigation SVG icons, 7 onboarding/account illustrations and 6 empty-state SVGs. Open asset-preview.html to inspect all artwork; this is an asset gallery, not the portal application.

## Brand reference
The earlier supplied KINEXIS Connect WebP is the reference. KINEXIS lettering is taken from its reconstructed vector and the Connect subline is excluded. The standalone K is redrawn from that reference. These are reconstructed assets, not the original brand master. The logo SVG contains true paths and no embedded bitmap. Review its identity against the original source before replacing your official logo.

## Integration
Keep existing `index.html`, `css/styles.css`, `js/config.js`, `js/api.js` and `js/app.js`. This pack does not replace them. Merge config-assets.example.js values using the property names your app expects; it is a reference object, not a replacement config. Merge brand-tokens.css only if useful.

The login illustration uses abstract analytics and collaboration shapes without customer names, invented figures, testimonials or third-party marks. It is branded illustration rather than photography. Keep real dashboard tables, charts, metrics and copy as HTML/live UI. Illustrations contain no headings or button copy, so place these in HTML. For decorative images use alt=""; for meaningful images use a brief context-specific alt. Empty states reserve the lower area for surrounding copy. The icon set has native 96×96 viewBoxes and consistent 3.5-unit outlines; use 24–32 px display sizes for navigation.

The pack includes no Google or Meta logos, client-upload placeholders pretending to be real businesses, authentication logic, backend connections or font binaries. Keep the portal's existing Manrope/Sora loading. Fonts and data sources are unchanged.
