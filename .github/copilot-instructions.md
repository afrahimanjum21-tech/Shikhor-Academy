# Shikhor Academy UI Rules

- Treat the public navbar as a shared component. Never add page-specific height, padding, logo sizing, or vertical spacing to make it wider or taller.
- Match the approved public navbar reference: white strip, compact height from `Navbar.jsx` (`h-12 sm:h-14`), existing logo sizing, and existing navigation spacing.
- Treat navy page title bands as separate hero sections, not navbars. Match Faculty/Courses/Success Stories: centered content, `py-10`, `lg:py-12`, compact display heading, brass divider, and restrained supporting text.
- Before finishing any public-page UI change, compare the rendered navbar and navy title band against Faculty/Gallery/Courses at mobile and desktop widths. Do not approve a visibly taller or wider variant without an explicit requirement.
- For every requested UI change, use premium product and editorial website patterns as the quality bar: mobile-first spacing, clear hierarchy, restrained shadows, consistent touch targets, readable line lengths, and intentional responsive composition. Do not simply shrink desktop layouts; recompose them for phone widths while preserving the existing data and actions.
- Before marking a public page complete, verify at 360px and 390px mobile widths plus tablet and desktop widths. Check button/card proportions, section rhythm, text wrapping, focus states, and page-level horizontal overflow. Keep mobile controls at comfortable touch size (minimum 44px where practical) without making every element oversized.
