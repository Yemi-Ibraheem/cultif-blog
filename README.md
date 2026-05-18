# Cultif Blog

Dependency-free static blog for Cultif. Posts live in `content/posts` as Markdown with front matter, then `npm run build` generates the SEO-ready site into `dist`.

## Create a Post

1. Copy `content/posts/_template.md` to `content/posts/my-post-slug.md`.
2. Fill in the front matter.
3. Write the article in Markdown.
4. Run:

```bash
npm run build
```

The newest three posts are also written to `dist/featured.json` and can be embedded on `www.cultif.com` with the snippet in `integration/cultif-featured-articles.html`.

## Use the CMS

Run the local CMS:

```bash
npm run admin
```

Then open:

```text
http://localhost:4173/admin
```

The CMS can create, edit, delete, preview, feature, and upload images for posts. Saves write Markdown files into `content/posts`, images into `public/uploads`, and automatically rebuild `dist`.

This is a local admin system. Before making it public on a real domain, add authentication and deploy the CMS behind a backend or protected admin route.

## Publish

Upload the contents of `dist` to your blog host or deploy the folder with any static hosting provider.
