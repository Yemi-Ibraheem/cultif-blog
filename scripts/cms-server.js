const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { build, readPosts, markdownToHtml } = require("./build");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "posts");
const publicDir = path.join(root, "public");
const uploadsDir = path.join(publicDir, "uploads");
const distDir = path.join(root, "dist");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(type.includes("json") ? JSON.stringify(body, null, 2) : body);
}

function sendError(res, status, message) {
  send(res, status, { error: message });
}

function safeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function safeFileName(value) {
  const parsed = path.parse(String(value || "image"));
  const base = safeSlug(parsed.name) || "image";
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return `${base}${ext}`;
}

function postPath(slug) {
  const safe = safeSlug(slug);
  if (!safe) throw new Error("Missing post slug");
  return path.join(contentDir, `${safe}.md`);
}

function serializePost(post) {
  const tags = Array.isArray(post.tags)
    ? post.tags
    : String(post.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
  const data = {
    title: post.title,
    description: post.description,
    date: post.date,
    author: post.author || "Cultif",
    category: post.category || "Culture guide",
    tags,
    image: post.image,
    imageAlt: post.imageAlt || "",
    featured: Boolean(post.featured),
  };
  const frontMatter = [
    "---",
    `title: "${escapeYaml(data.title)}"`,
    `description: "${escapeYaml(data.description)}"`,
    `date: "${escapeYaml(data.date)}"`,
    `author: "${escapeYaml(data.author)}"`,
    `category: "${escapeYaml(data.category)}"`,
    `tags: [${data.tags.map((tag) => `"${escapeYaml(tag)}"`).join(", ")}]`,
    `image: "${escapeYaml(data.image)}"`,
    `imageAlt: "${escapeYaml(data.imageAlt)}"`,
    `featured: ${data.featured ? "true" : "false"}`,
    "---",
    "",
    String(post.body || "").trim(),
    "",
  ];
  return frontMatter.join("\n");
}

function escapeYaml(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function publicPost(post) {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    author: post.author || "Cultif",
    category: post.category || "Culture guide",
    tags: post.tags || [],
    image: post.image,
    imageAlt: post.imageAlt || "",
    featured: Boolean(post.featured),
    body: post.body || "",
    url: post.url,
    href: post.href,
    html: post.html,
    readingMinutes: post.readingMinutes,
  };
}

function savePost(payload) {
  const slug = safeSlug(payload.slug || payload.title);
  if (!payload.title || !payload.description || !payload.date || !payload.image || !payload.body) {
    throw new Error("Title, description, date, image, and body are required.");
  }
  const oldSlug = safeSlug(payload.originalSlug || slug);
  const oldPath = oldSlug ? postPath(oldSlug) : null;
  const nextPath = postPath(slug);
  ensureDir(contentDir);
  if (oldPath && oldPath !== nextPath && fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
  }
  fs.writeFileSync(nextPath, serializePost({ ...payload, slug }), "utf8");
  build();
  return publicPost(readPosts().find((post) => post.slug === slug));
}

function deletePost(slug) {
  const target = postPath(slug);
  if (!fs.existsSync(target)) throw new Error("Post not found.");
  fs.unlinkSync(target);
  build();
}

function saveUpload(payload) {
  const match = String(payload.dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml));base64,(.+)$/);
  if (!match) throw new Error("Upload must be a base64 image data URL.");
  const mime = match[1].replace("image/jpg", "image/jpeg");
  const extByMime = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  const cleanName = safeFileName(payload.filename || `image${extByMime[mime]}`);
  const parsed = path.parse(cleanName);
  const filename = `${parsed.name}-${Date.now()}${extByMime[mime] || parsed.ext || ".png"}`;
  ensureDir(uploadsDir);
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(match[2], "base64"));
  build();
  return { url: `/uploads/${filename}`, filename };
}

function serveFile(res, filePath) {
  if (!filePath.startsWith(distDir)) {
    sendError(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendError(res, 404, "Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(res);
}

async function route(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);

  try {
    if (url.pathname === "/api/posts" && req.method === "GET") {
      send(res, 200, readPosts().map(publicPost));
      return;
    }

    if (url.pathname === "/api/posts" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      send(res, 200, savePost(payload));
      return;
    }

    if (url.pathname.startsWith("/api/posts/") && req.method === "DELETE") {
      deletePost(decodeURIComponent(url.pathname.replace("/api/posts/", "")));
      send(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/uploads" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      send(res, 200, saveUpload(payload));
      return;
    }

    if (url.pathname === "/api/preview" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      send(res, 200, { html: markdownToHtml(payload.body || "") });
      return;
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/admin") pathname = "/admin/";
    if (pathname === "/admin/") pathname = "/admin/index.html";
    if (pathname === "/") pathname = "/index.html";
    const filePath = path.normalize(path.join(distDir, pathname));
    serveFile(res, filePath);
  } catch (error) {
    sendError(res, 400, error.message || "Request failed");
  }
}

ensureDir(uploadsDir);
build();

http.createServer(route).listen(port, () => {
  console.log(`Cultif CMS running at http://localhost:${port}/admin`);
  console.log(`Blog preview running at http://localhost:${port}/`);
});
