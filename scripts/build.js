const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "posts");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const site = {
  name: "Cultif Journal",
  url: "https://blog.cultif.com",
  mainUrl: "https://www.cultif.com",
  description: "Food culture, meal planning, creator guides, and global recipes from Cultif.",
  logo: "https://www.cultif.com/assets/Black-kDyR76cE.png",
  favicon: "https://www.cultif.com/favicon.ico.png",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  ensureDir(dir);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  ensureDir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function parseFrontMatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} is missing front matter`);
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    data[key.trim()] = parseValue(value);
  }
  return { data, body: match[2].trim() };
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

function slugFromFile(file) {
  return path.basename(file, ".md");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
    } else if (/^- /.test(trimmed)) {
      flushParagraph();
      list.push(trimmed.slice(2));
    } else {
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function readPosts() {
  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => {
      const full = path.join(contentDir, file);
      const { data, body } = parseFrontMatter(full);
      const slug = slugFromFile(file);
  const url = `/posts/${slug}/`;
      return {
        ...data,
        slug,
        url,
        href: `posts/${slug}/`,
        canonical: `${site.url}${url}`,
        body,
        html: markdownToHtml(body),
        readingMinutes: Math.max(1, Math.ceil(body.split(/\s+/).length / 220)),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function pageShell({ title, description, image, canonical, body, extraHead = "", assetPrefix = ".", homeHref = ".", latestHref = "#latest" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="icon" type="image/png" href="${site.favicon}">
  <link rel="shortcut icon" href="${site.favicon}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="stylesheet" href="${assetPrefix}/assets/styles.css">
  <script defer src="${assetPrefix}/assets/site.js"></script>
  ${extraHead}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="${homeHref}">
      <img src="${site.logo}" alt="Cultif">
      <span>Journal</span>
    </a>
    <nav aria-label="Primary">
      <a href="${homeHref}">Journal</a>
      <a href="${latestHref}">Latest</a>
      <a href="${site.mainUrl}">Cultif app</a>
    </nav>
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer">
    <p>The global platform for food creators. Turn your culinary knowledge into real revenue.</p>
    <a href="${site.mainUrl}">Start Cooking</a>
  </footer>
</body>
</html>`;
}

function articleStructuredData(post) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.image,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author || "Cultif" },
    publisher: { "@type": "Organization", name: "Cultif", url: site.mainUrl },
    mainEntityOfPage: post.canonical,
  });
}

function homepage(posts) {
  const featured = posts.slice(0, 3);
  return pageShell({
    title: `${site.name} | Food Culture, Recipes and Meal Planning`,
    description: site.description,
    image: featured[0].image,
    canonical: site.url,
    assetPrefix: ".",
    homeHref: ".",
    latestHref: "#latest",
    extraHead: `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: site.name,
      url: site.url,
      description: site.description,
    })}</script>`,
    body: `
<section class="intro-band first-section reveal">
  <div class="mission-copy">
    <h1>Our goal is to have every <span>culture represented under one roof.</span></h1>
    <p>The Cultif Journal extends that mission with practical stories people can read, search, share, and return to before they cook.</p>
    <a class="button" href="#latest">Read the latest</a>
  </div>
  <div class="mission-feature" aria-label="Featured article">
    ${postCard(featured[0])}
  </div>
</section>
<section class="culture-marquee" aria-label="Cultures represented">
  <div class="flags-track">
    ${["ng","in","mx","it","jp","br","gb","us","gh","ke","eg","pk","sa","ae","pt","gr","za","es","tr","ma","fr","de","nl","be"].map(flagIcon).join("")}
    ${["ng","in","mx","it","jp","br","gb","us","gh","ke","eg","pk","sa","ae","pt","gr","za","es","tr","ma","fr","de","nl","be"].map(flagIcon).join("")}
  </div>
</section>
<section class="featured-strip" aria-label="Featured articles">
  ${featured.slice(1).map(postCard).join("")}
</section>
<section class="article-index" id="latest">
  <div class="section-heading">
    <p class="eyebrow">Latest</p>
    <h2>Guides for curious cooks</h2>
  </div>
  <div class="index-list">
    ${posts.map(postListItem).join("")}
  </div>
</section>`,
  });
}

function flagIcon(code) {
  return `<img src="https://flagcdn.com/32x24/${code}.png" alt="" loading="lazy">`;
}

function postCard(post) {
  return `<article class="post-card">
  <a href="${post.href || post.url}" aria-label="${escapeHtml(post.title)}">
    <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy">
    <span>${escapeHtml(post.category)}</span>
    <h2>${escapeHtml(post.title)}</h2>
  </a>
</article>`;
}

function postListItem(post) {
  return `<article class="post-row reveal">
  <a class="post-row-media" href="${post.href || post.url}">
    <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy">
  </a>
  <div>
    <p class="meta">${escapeHtml(post.category)} &middot; ${formatDate(post.date)} &middot; ${post.readingMinutes} min read</p>
    <h3><a href="${post.href || post.url}">${escapeHtml(post.title)}</a></h3>
    <p>${escapeHtml(post.description)}</p>
  </div>
</article>`;
}

function articlePage(post, related) {
  return pageShell({
    title: `${post.title} | ${site.name}`,
    description: post.description,
    image: post.image,
    canonical: post.canonical,
    assetPrefix: "../..",
    homeHref: "../..",
    latestHref: "../../#latest",
    extraHead: `<script type="application/ld+json">${articleStructuredData(post)}</script>`,
    body: `
<article class="article">
  <header class="article-hero">
    <div class="article-hero-text reveal">
      <a class="back-link" href="../..">Journal</a>
      <p class="eyebrow">${escapeHtml(post.category)}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.description)}</p>
      <div class="meta">${formatDate(post.date)} &middot; ${post.readingMinutes} min read &middot; ${escapeHtml(post.author || "Cultif")}</div>
    </div>
    <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}">
  </header>
  <div class="article-body">
    ${post.html}
  </div>
</article>
<aside class="related" aria-label="Related articles">
  <div class="section-heading">
    <p class="eyebrow">Keep exploring</p>
    <h2>More from Cultif</h2>
  </div>
  <div class="featured-strip compact">
    ${related.map((item) => postCard({ ...item, href: `../${item.slug}/` })).join("")}
  </div>
</aside>`,
  });
}

function writeIntegration() {
  ensureDir(path.join(root, "integration"));
  fs.writeFileSync(
    path.join(root, "integration", "cultif-featured-articles.html"),
    `<style>
  .cultif-blog-highlights {
    background: #fffaf4;
    color: #17130f;
    padding: clamp(56px, 8vw, 112px) 5vw;
  }
  .cultif-blog-heading {
    border-bottom: 1px solid #eaded1;
    margin-bottom: 28px;
  }
  .cultif-blog-heading p {
    color: #e85f22;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: .12em;
    margin: 0 0 12px;
    text-transform: uppercase;
  }
  .cultif-blog-heading h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(36px, 5vw, 76px);
    line-height: 1;
    margin: 0 0 22px;
  }
  .cultif-blog-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .cultif-blog-grid article {
    background: #17130f;
    min-height: 430px;
    overflow: hidden;
    position: relative;
  }
  .cultif-blog-grid a {
    color: #fff;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: flex-end;
    min-height: inherit;
    padding: 28px;
    position: relative;
    text-decoration: none;
  }
  .cultif-blog-grid img {
    height: 100%;
    inset: 0;
    object-fit: cover;
    position: absolute;
    transition: transform 450ms ease;
    width: 100%;
  }
  .cultif-blog-grid article::after {
    background: linear-gradient(0deg, rgba(23, 19, 15, .86), rgba(23, 19, 15, .1));
    content: "";
    inset: 0;
    position: absolute;
  }
  .cultif-blog-grid span,
  .cultif-blog-grid h3,
  .cultif-blog-grid p {
    position: relative;
    z-index: 1;
  }
  .cultif-blog-grid span {
    color: #f2bd54;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: .1em;
    text-transform: uppercase;
  }
  .cultif-blog-grid h3 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(26px, 2.8vw, 44px);
    line-height: 1;
    margin: 10px 0;
  }
  .cultif-blog-grid p {
    color: rgba(255, 255, 255, .82);
    line-height: 1.5;
    margin: 0;
  }
  .cultif-blog-grid article:hover img {
    transform: scale(1.05);
  }
  @media (max-width: 860px) {
    .cultif-blog-grid {
      grid-template-columns: 1fr;
    }
    .cultif-blog-grid article {
      min-height: 340px;
    }
  }
</style>
<section class="cultif-blog-highlights">
  <div class="cultif-blog-heading">
    <p>From the journal</p>
    <h2>Food culture for your next meal plan</h2>
  </div>
  <div class="cultif-blog-grid" aria-live="polite"></div>
</section>
<script src="https://blog.cultif.com/featured.js" defer></script>
<script>
(() => {
  const section = document.querySelector(".cultif-blog-highlights");
  const grid = section.querySelector(".cultif-blog-grid");
  function render(posts) {
    grid.innerHTML = posts.slice(0, 3).map((post) => \`
      <article>
        <a href="\${post.canonical}">
          <img src="\${post.image}" alt="\${post.imageAlt}" loading="lazy">
          <span>\${post.category}</span>
          <h3>\${post.title}</h3>
          <p>\${post.description}</p>
        </a>
      </article>
    \`).join("");
  }
  if (window.CultifFeaturedArticles) render(window.CultifFeaturedArticles);
  window.addEventListener("cultif:featured-articles", (event) => render(event.detail));
})();
</script>`
  );
}

function writeFeeds(posts) {
  const featured = posts
    .filter((post) => post.featured)
    .slice(0, 3)
    .map(({ title, description, date, category, image, imageAlt, url, canonical }) => ({
      title,
      description,
      date,
      category,
      image,
      imageAlt,
      url,
      canonical,
    }));

  fs.writeFileSync(path.join(distDir, "featured.json"), JSON.stringify(featured, null, 2));
  fs.writeFileSync(
    path.join(distDir, "featured.js"),
    `window.CultifFeaturedArticles = ${JSON.stringify(featured, null, 2)};
window.dispatchEvent(new CustomEvent("cultif:featured-articles", { detail: window.CultifFeaturedArticles }));
`
  );
  fs.writeFileSync(
    path.join(distDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.url}/</loc></url>
${posts.map((post) => `  <url><loc>${post.canonical}</loc><lastmod>${post.date}</lastmod></url>`).join("\n")}
</urlset>`
  );
  fs.writeFileSync(
    path.join(distDir, "robots.txt"),
    `User-agent: *
Allow: /
Sitemap: ${site.url}/sitemap.xml
`
  );
  fs.writeFileSync(
    path.join(distDir, "rss.xml"),
    `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${escapeHtml(site.name)}</title>
  <link>${site.url}</link>
  <description>${escapeHtml(site.description)}</description>
${posts.map((post) => `  <item>
    <title>${escapeHtml(post.title)}</title>
    <link>${post.canonical}</link>
    <guid>${post.canonical}</guid>
    <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${escapeHtml(post.description)}</description>
  </item>`).join("\n")}
</channel>
</rss>`
  );
}

function build() {
  const posts = readPosts();
  emptyDir(distDir);
  copyDir(publicDir, distDir);
  fs.writeFileSync(path.join(distDir, "index.html"), homepage(posts));
  for (const post of posts) {
    const postDir = path.join(distDir, "posts", post.slug);
    ensureDir(postDir);
    const related = posts.filter((item) => item.slug !== post.slug).slice(0, 3);
    fs.writeFileSync(path.join(postDir, "index.html"), articlePage(post, related));
  }
  writeFeeds(posts);
  writeIntegration();
  console.log(`Built ${posts.length} posts into ${distDir}`);
}

if (require.main === module) {
  build();

  if (process.argv.includes("--watch")) {
    console.log("Watching content and public files...");
    fs.watch(contentDir, { recursive: false }, build);
    fs.watch(publicDir, { recursive: true }, build);
  }
}

module.exports = {
  build,
  readPosts,
  markdownToHtml,
  parseFrontMatter,
  site,
};
