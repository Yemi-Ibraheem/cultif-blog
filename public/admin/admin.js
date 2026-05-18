const state = {
  posts: [],
  activeSlug: "",
  dirtySlugEdited: false,
  filter: "all",
};

const fields = {
  originalSlug: document.querySelector("#originalSlug"),
  title: document.querySelector("#title"),
  slug: document.querySelector("#slug"),
  description: document.querySelector("#description"),
  date: document.querySelector("#date"),
  author: document.querySelector("#author"),
  category: document.querySelector("#category"),
  featured: document.querySelector("#featured"),
  tags: document.querySelector("#tags"),
  image: document.querySelector("#image"),
  imageAlt: document.querySelector("#imageAlt"),
  body: document.querySelector("#body"),
};

const els = {
  postList: document.querySelector("#postList"),
  postCount: document.querySelector("#postCount"),
  totalPosts: document.querySelector("#totalPosts"),
  featuredPosts: document.querySelector("#featuredPosts"),
  latestDate: document.querySelector("#latestDate"),
  searchInput: document.querySelector("#searchInput"),
  filterTabs: document.querySelectorAll("[data-filter]"),
  newPostButton: document.querySelector("#newPostButton"),
  saveButton: document.querySelector("#saveButton"),
  deleteButton: document.querySelector("#deleteButton"),
  imageUpload: document.querySelector("#imageUpload"),
  imagePreview: document.querySelector("#imagePreview"),
  imagePreviewCaption: document.querySelector("#imagePreviewCaption"),
  saveStatus: document.querySelector("#saveStatus"),
  editorTitle: document.querySelector("#editorTitle"),
  editorState: document.querySelector("#editorState"),
  descriptionCount: document.querySelector("#descriptionCount"),
  tabs: document.querySelectorAll("[data-tab]"),
  writePanel: document.querySelector("#writePanel"),
  previewPanel: document.querySelector("#previewPanel"),
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function setStatus(message) {
  els.saveStatus.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || "Request failed");
  return body;
}

async function loadPosts() {
  state.posts = await api("/api/posts");
  renderMetrics();
  renderPostList();
  if (!state.activeSlug && state.posts[0]) {
    loadPost(state.posts[0].slug);
  } else if (!state.posts.length) {
    newPost();
  }
}

function renderMetrics() {
  els.totalPosts.textContent = String(state.posts.length);
  els.featuredPosts.textContent = String(state.posts.filter((post) => post.featured).length);
  els.latestDate.textContent = state.posts[0] ? formatShortDate(state.posts[0].date) : "-";
}

function filteredPosts() {
  const query = els.searchInput.value.trim().toLowerCase();
  return state.posts.filter((post) => {
    const haystack = [post.title, post.description, post.category, ...(post.tags || [])].join(" ").toLowerCase();
    const matchesSearch = haystack.includes(query);
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "featured" && post.featured) ||
      (state.filter === "standard" && !post.featured);
    return matchesSearch && matchesFilter;
  });
}

function renderPostList() {
  const posts = filteredPosts();
  els.postCount.textContent = String(posts.length);
  els.postList.innerHTML = posts.length
    ? posts.map(postListItem).join("")
    : `<div class="empty-state">
        <strong>No posts found</strong>
        <span>Try a different search or filter.</span>
      </div>`;
}

function postListItem(post) {
  const image = post.image ? escapeHtml(post.image) : "";
  const tags = (post.tags || []).slice(0, 2).map((tag) => `<em>${escapeHtml(tag)}</em>`).join("");
  return `<button type="button" class="post-item ${post.slug === state.activeSlug ? "active" : ""}" data-slug="${post.slug}">
    <img src="${image}" alt="">
    <span class="post-item-content">
      <strong>${escapeHtml(post.title)}</strong>
      <small>${escapeHtml(post.category)} &middot; ${formatShortDate(post.date)}${post.featured ? " &middot; Featured" : ""}</small>
      <span class="tag-row">${tags}</span>
    </span>
  </button>`;
}

function loadPost(slug) {
  const post = state.posts.find((item) => item.slug === slug);
  if (!post) return;
  state.activeSlug = slug;
  state.dirtySlugEdited = false;
  fields.originalSlug.value = post.slug;
  fields.title.value = post.title || "";
  fields.slug.value = post.slug || "";
  fields.description.value = post.description || "";
  fields.date.value = post.date || today();
  fields.author.value = post.author || "Cultif";
  fields.category.value = post.category || "Culture guide";
  fields.featured.checked = Boolean(post.featured);
  fields.tags.value = (post.tags || []).join(", ");
  fields.image.value = post.image || "";
  fields.imageAlt.value = post.imageAlt || "";
  fields.body.value = post.body || "";
  els.editorTitle.textContent = post.title || "Untitled post";
  els.editorState.textContent = post.featured ? "Featured article" : "Editing article";
  updateDescriptionCount();
  updateImagePreview();
  renderPostList();
  renderPreview();
  setStatus("Ready");
}

function newPost() {
  state.activeSlug = "";
  state.dirtySlugEdited = false;
  fields.originalSlug.value = "";
  fields.title.value = "";
  fields.slug.value = "";
  fields.description.value = "";
  fields.date.value = today();
  fields.author.value = "Cultif";
  fields.category.value = "Culture guide";
  fields.featured.checked = false;
  fields.tags.value = "";
  fields.image.value = "";
  fields.imageAlt.value = "";
  fields.body.value = "Start with a sharp opening paragraph.\n\n## Section Heading\n\nWrite the article here.";
  els.editorTitle.textContent = "Create a post";
  els.editorState.textContent = "Draft article";
  updateDescriptionCount();
  updateImagePreview();
  renderPostList();
  renderPreview();
  setStatus("Ready");
}

function collectPost() {
  return {
    originalSlug: fields.originalSlug.value,
    title: fields.title.value.trim(),
    slug: fields.slug.value.trim(),
    description: fields.description.value.trim(),
    date: fields.date.value,
    author: fields.author.value.trim() || "Cultif",
    category: fields.category.value.trim() || "Culture guide",
    featured: fields.featured.checked,
    tags: fields.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    image: fields.image.value.trim(),
    imageAlt: fields.imageAlt.value.trim(),
    body: fields.body.value.trim(),
  };
}

async function savePost() {
  try {
    setStatus("Saving...");
    const saved = await api("/api/posts", {
      method: "POST",
      body: JSON.stringify(collectPost()),
    });
    state.activeSlug = saved.slug;
    fields.originalSlug.value = saved.slug;
    await loadPosts();
    loadPost(saved.slug);
    setStatus("Saved and rebuilt");
  } catch (error) {
    setStatus(error.message);
  }
}

async function deletePost() {
  const slug = fields.originalSlug.value || fields.slug.value;
  if (!slug) {
    newPost();
    return;
  }
  if (!confirm(`Delete "${fields.title.value || slug}"?`)) return;
  try {
    setStatus("Deleting...");
    await api(`/api/posts/${encodeURIComponent(slug)}`, { method: "DELETE" });
    state.activeSlug = "";
    await loadPosts();
    setStatus("Deleted and rebuilt");
  } catch (error) {
    setStatus(error.message);
  }
}

async function uploadImage(file) {
  if (!file) return;
  try {
    setStatus("Uploading image...");
    const dataUrl = await fileToDataUrl(file);
    const result = await api("/api/uploads", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, dataUrl }),
    });
    fields.image.value = result.url;
    if (!fields.imageAlt.value) {
      fields.imageAlt.value = fields.title.value || file.name.replace(/\.[^.]+$/, "");
    }
    updateImagePreview();
    setStatus("Image uploaded");
  } catch (error) {
    setStatus(error.message);
  } finally {
    els.imageUpload.value = "";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderPreview() {
  try {
    const result = await api("/api/preview", {
      method: "POST",
      body: JSON.stringify({ body: fields.body.value }),
    });
    els.previewPanel.innerHTML = result.html || "<p>No preview yet.</p>";
  } catch {
    els.previewPanel.innerHTML = "<p>Preview unavailable.</p>";
  }
}

function setTab(tab) {
  els.tabs.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  els.writePanel.hidden = tab !== "write";
  els.previewPanel.hidden = tab !== "preview";
  if (tab === "preview") renderPreview();
}

function updateDescriptionCount() {
  els.descriptionCount.textContent = `${fields.description.value.length}/170`;
}

function updateImagePreview() {
  const image = fields.image.value.trim();
  els.imagePreview.hidden = !image;
  els.imagePreview.src = image || "";
  els.imagePreview.alt = fields.imageAlt.value || "";
  els.imagePreviewCaption.textContent = image ? fields.imageAlt.value || "Hero image preview" : "No image selected";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

els.postList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-slug]");
  if (button) loadPost(button.dataset.slug);
});

els.searchInput.addEventListener("input", renderPostList);
els.newPostButton.addEventListener("click", newPost);
els.saveButton.addEventListener("click", savePost);
els.deleteButton.addEventListener("click", deletePost);
els.imageUpload.addEventListener("change", (event) => uploadImage(event.target.files[0]));

els.filterTabs.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    els.filterTabs.forEach((item) => item.classList.toggle("active", item === button));
    renderPostList();
  });
});

fields.title.addEventListener("input", () => {
  els.editorTitle.textContent = fields.title.value || "Create a post";
  if (!state.dirtySlugEdited) fields.slug.value = slugify(fields.title.value);
});

fields.slug.addEventListener("input", () => {
  state.dirtySlugEdited = true;
  fields.slug.value = slugify(fields.slug.value);
});

fields.description.addEventListener("input", updateDescriptionCount);
fields.image.addEventListener("input", updateImagePreview);
fields.imageAlt.addEventListener("input", updateImagePreview);
fields.featured.addEventListener("change", () => {
  els.editorState.textContent = fields.featured.checked ? "Featured article" : "Editing article";
});
fields.body.addEventListener("input", () => {
  if (!els.previewPanel.hidden) renderPreview();
});

els.tabs.forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

loadPosts().catch((error) => setStatus(error.message));
