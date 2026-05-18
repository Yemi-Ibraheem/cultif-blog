# Cultif Blog Design System

Extracted from `https://www.cultif.com` on 18 May 2026.

## Brand Signals

- Product idea: food culture, global recipes, meal planning, and creator-led cooking.
- Tone: direct, creator-first, practical, and optimistic.
- Visual anchor: rounded food photography, creator success imagery, soft stat overlays, and global flag motion.
- Calls to action: rounded teal buttons with short action copy.

## Type

- Primary: Inter for headings, body, navigation, and UI.
- Headline behavior: bold 800 weight, compact line-height, large but product-led.
- Supporting text: muted grey, generous line-height, short paragraphs.

## Color Tokens

- Background: `#ffffff`
- Background alt: `#f4fcfb`
- Surface: `#ffffff`
- Text: `#111827`
- Muted text: `#6b7280`
- Border: `#e2e8f0`
- Cultif teal: `#00c0a3`
- Teal hover: `#00a88e`

## Layout Rules

- Use soft mint hero sections with a split content/image composition.
- Use 16-24px rounded media panels because the existing Cultif site uses that radius system.
- Use subtle shadows for article cards and stat overlays.
- Keep article lists readable while borrowing Cultif's creator-platform card language.
- Keep content creation simple: one Markdown file equals one post.

## SEO System

- Every page gets title, description, canonical URL, Open Graph, and Twitter card tags.
- Article pages include `BlogPosting` structured data.
- The build outputs `sitemap.xml`, `robots.txt`, `rss.xml`, `featured.json`, and `featured.js`.
