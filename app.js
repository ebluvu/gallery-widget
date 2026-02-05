import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://eooudvssawtdtttrwyfr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sX69Y-P_n8QgAkrcb8gGtQ_FoKhG9mj";
const BUCKET = "album";
const MAX_IMAGE_SIZE = 1600;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  user: null,
  album: null,
  images: [],
};

const ui = {
  emailInput: document.getElementById("emailInput"),
  signInForm: document.getElementById("signInForm"),
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  userBadge: document.getElementById("userBadge"),
  newAlbumBtn: document.getElementById("newAlbumBtn"),
  albumTitle: document.getElementById("albumTitle"),
  albumList: document.getElementById("albumList"),
  fileInput: document.getElementById("fileInput"),
  uploadLog: document.getElementById("uploadLog"),
  embedCode: document.getElementById("embedCode"),
  shareLink: document.getElementById("shareLink"),
  themeSelect: document.getElementById("themeSelect"),
  bgColor: document.getElementById("bgColor"),
  addNewSelect: document.getElementById("addNewSelect"),
  imageList: document.getElementById("imageList"),
  status: document.getElementById("status"),
};

function setStatus(message) {
  ui.status.textContent = message || "";
}

function logUpload(message) {
  const p = document.createElement("p");
  p.textContent = message;
  ui.uploadLog.prepend(p);
}

function newId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes]
    .map((b, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? "-" : "") + b.toString(16).padStart(2, "0"))
    .join("");
}

function currentEmbedUrl() {
  if (!state.album) {
    return "";
  }
  const url = new URL("embed.html", window.location.href);
  url.searchParams.set("album", state.album.id);
  return url.toString();
}

async function refreshAuth() {
  const { data: sessionData } = await supabase.auth.getSession();
  state.user = sessionData.session?.user || null;
  renderAuth();
}

function renderAuth() {
  if (state.user) {
    ui.signInForm.classList.add("hidden");
    ui.signOutBtn.classList.remove("hidden");
    ui.userBadge.textContent = state.user.email || "Signed in";
  } else {
    ui.signInForm.classList.remove("hidden");
    ui.signOutBtn.classList.add("hidden");
    ui.userBadge.textContent = "Not signed in";
  }
}

async function loadAlbums() {
  ui.albumList.innerHTML = "";
  if (!state.user) {
    const info = document.createElement("div");
    info.className = "muted";
    info.textContent = "登入後會顯示相簿列表。";
    ui.albumList.appendChild(info);
    return;
  }

  const { data, error } = await supabase
    .from("albums")
    .select("id, title, created_at")
    .eq("owner_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    setStatus(error.message);
    return;
  }

  if (!data.length) {
    const info = document.createElement("div");
    info.className = "muted";
    info.textContent = "沒有相簿。請在登入狀態下建立新相簿。";
    ui.albumList.appendChild(info);
    return;
  }

  data.forEach((album) => {
    const btn = document.createElement("button");
    btn.textContent = album.title || "Untitled";
    if (state.album && state.album.id === album.id) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => loadAlbum(album.id));
    ui.albumList.appendChild(btn);
  });
}

async function createAlbum() {
  const title = ui.albumTitle.value.trim() || "Untitled";
  const payload = {
    id: newId(),
    title,
    owner_id: state.user ? state.user.id : null,
    theme: "grid",
    background_color: "#101828",
    add_new_first: false,
  };

  const { data, error } = await supabase
    .from("albums")
    .insert(payload)
    .select()
    .single();

  if (error) {
    setStatus(error.message);
    return;
  }

  state.album = data;
  ui.albumTitle.value = data.title || "";
  ui.themeSelect.value = data.theme || "grid";
  ui.bgColor.value = data.background_color || "#101828";
  ui.addNewSelect.value = data.add_new_first ? "first" : "last";
  await loadImages();
  updateEmbed();
  await loadAlbums();
  setStatus("Album created. Upload images to continue.");
}

async function loadAlbum(albumId) {
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("id", albumId)
    .single();

  if (error) {
    setStatus(error.message);
    return;
  }

  state.album = data;
  ui.albumTitle.value = data.title || "";
  ui.themeSelect.value = data.theme || "grid";
  ui.bgColor.value = data.background_color || "#101828";
  ui.addNewSelect.value = data.add_new_first ? "first" : "last";
  await loadImages();
  updateEmbed();
  await loadAlbums();
}

async function loadImages() {
  ui.imageList.innerHTML = "";
  if (!state.album) {
    return;
  }

  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("album_id", state.album.id)
    .order("sort_order", { ascending: true });

  if (error) {
    setStatus(error.message);
    return;
  }

  state.images = data;
  renderImages();
}

function renderImages() {
  ui.imageList.innerHTML = "";

  if (!state.images.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No images yet.";
    ui.imageList.appendChild(empty);
    return;
  }

  state.images.forEach((image) => {
    const card = document.createElement("div");
    card.className = "image-card";

    const img = document.createElement("img");
    img.src = supabase.storage.from(BUCKET).getPublicUrl(image.path).data.publicUrl;

    const input = document.createElement("input");
    input.className = "field";
    input.value = image.caption || "";
    input.placeholder = "Caption";
    input.addEventListener("change", () => updateCaption(image.id, input.value));

    const actions = document.createElement("div");
    if (state.user && state.album && state.album.owner_id === state.user.id) {
      const remove = document.createElement("button");
      remove.className = "btn ghost";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteImage(image));
      actions.appendChild(remove);
    }

    card.appendChild(img);
    card.appendChild(input);
    card.appendChild(actions);
    ui.imageList.appendChild(card);
  });
}

async function updateCaption(imageId, caption) {
  const { error } = await supabase
    .from("images")
    .update({ caption })
    .eq("id", imageId);

  if (error) {
    setStatus(error.message);
  }
}

async function deleteImage(image) {
  const { error: deleteRowError } = await supabase
    .from("images")
    .delete()
    .eq("id", image.id);

  if (deleteRowError) {
    setStatus(deleteRowError.message);
    return;
  }

  await supabase.storage.from(BUCKET).remove([image.path]);
  await loadImages();
}

async function updateSettings() {
  if (!state.album) {
    return;
  }

  const payload = {
    title: ui.albumTitle.value.trim() || "Untitled",
    theme: ui.themeSelect.value,
    background_color: ui.bgColor.value,
    add_new_first: ui.addNewSelect.value === "first",
  };

  const { error } = await supabase
    .from("albums")
    .update(payload)
    .eq("id", state.album.id);

  if (error) {
    setStatus(error.message);
    return;
  }

  state.album = { ...state.album, ...payload };
  updateEmbed();
  await loadAlbums();
}

function updateEmbed() {
  const url = currentEmbedUrl();
  if (!url) {
    ui.embedCode.value = "";
    ui.shareLink.value = "";
    return;
  }

  ui.shareLink.value = url;
  ui.embedCode.value = `<iframe src="${url}" width="700" height="420" frameborder="0" allowfullscreen></iframe>`;
}

async function prepareImage(file) {
  const image = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
  const targetWidth = Math.round(image.width * ratio);
  const targetHeight = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve({ blob, width: targetWidth, height: targetHeight });
      },
      "image/jpeg",
      0.85
    );
  });
}

async function uploadImages(files) {
  if (!state.album) {
    setStatus("Create an album first.");
    return;
  }

  const baseOrder = state.images.length
    ? state.images[state.images.length - 1].sort_order
    : 0;
  const addFirst = state.album.add_new_first;
  const minOrder = state.images.length ? state.images[0].sort_order : 0;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file.type.startsWith("image/")) {
      logUpload(`Skip ${file.name}`);
      continue;
    }

    setStatus(`Processing ${file.name}...`);
    const { blob, width, height } = await prepareImage(file);
    const path = `${state.album.id}/${newId()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/jpeg" });

    if (uploadError) {
      setStatus(uploadError.message);
      return;
    }

    const sortOrder = addFirst ? minOrder - (i + 1) : baseOrder + (i + 1);
    const { error: insertError } = await supabase
      .from("images")
      .insert({
        id: newId(),
        album_id: state.album.id,
        path,
        caption: "",
        sort_order: sortOrder,
        width,
        height,
      });

    if (insertError) {
      setStatus(insertError.message);
      return;
    }

    logUpload(`Uploaded ${file.name}`);
  }

  await loadImages();
  setStatus("Upload complete.");
}

ui.signInBtn.addEventListener("click", async () => {
  const email = ui.emailInput.value.trim();
  if (!email) {
    setStatus("Please enter your email");
    return;
  }
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href.split('#')[0].split('?')[0],
    },
  });
  
  if (error) {
    setStatus(error.message);
  } else {
    setStatus("Check your email for the magic link!");
    ui.emailInput.value = "";
  }
});

ui.signOutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  await refreshAuth();
  await loadAlbums();
});

ui.newAlbumBtn.addEventListener("click", createAlbum);
ui.fileInput.addEventListener("change", (event) => uploadImages([...event.target.files]));
ui.albumTitle.addEventListener("change", updateSettings);
ui.themeSelect.addEventListener("change", updateSettings);
ui.bgColor.addEventListener("change", updateSettings);
ui.addNewSelect.addEventListener("change", updateSettings);
ui.embedCode.addEventListener("click", () => ui.embedCode.select());
ui.shareLink.addEventListener("click", () => ui.shareLink.select());

supabase.auth.onAuthStateChange((event, session) => {
  state.user = session?.user || null;
  renderAuth();
  loadAlbums();
});

(async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    setStatus("Missing Supabase config.");
    return;
  }
  await refreshAuth();
  await loadAlbums();
})();
