import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://eooudvssawtdtttrwyfr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sX69Y-P_n8QgAkrcb8gGtQ_FoKhG9mj";
const BUCKET = "album";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ui = {
  title: document.getElementById("embedTitle"),
  meta: document.getElementById("embedMeta"),
  grid: document.getElementById("embedGrid"),
  header: document.getElementById("embedHeader"),
};

function getAlbumId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("album");
}

async function loadAlbum(albumId) {
  const { data: album, error } = await supabase
    .from("albums")
    .select("*")
    .eq("id", albumId)
    .single();

  if (error || !album) {
    ui.grid.textContent = "Album not found.";
    return;
  }

  ui.title.textContent = album.title || "Gallery";
  ui.meta.textContent = `Theme: ${album.theme || "grid"}`;
  document.body.style.setProperty("--bg", album.background_color || "#0c1117");
  ui.grid.classList.add(album.theme || "grid");

  const { data: images, error: imageError } = await supabase
    .from("images")
    .select("*")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  if (imageError) {
    ui.grid.textContent = imageError.message;
    return;
  }

  if (!images.length) {
    ui.grid.textContent = "No images";
    return;
  }

  ui.grid.innerHTML = "";
  images.forEach((image) => {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = supabase.storage.from(BUCKET).getPublicUrl(image.path).data.publicUrl;
    img.alt = image.caption || "";
    const caption = document.createElement("figcaption");
    caption.textContent = image.caption || "";
    caption.className = "muted";
    figure.appendChild(img);
    if (image.caption) {
      figure.appendChild(caption);
    }
    ui.grid.appendChild(figure);
  });
}

const albumId = getAlbumId();
if (!albumId) {
  ui.grid.textContent = "Missing album id.";
} else {
  loadAlbum(albumId);
}
