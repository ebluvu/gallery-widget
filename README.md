Gallery Widget v1

What this is
- A minimal front-end that works with Supabase Auth + DB + Storage.
- Supports anonymous album creation + embeddable public page.
- Google login lets you edit/manage your albums.

Supabase setup checklist (very short)
1) Enable Google OAuth in Auth providers.
2) Create storage bucket: albums (public).
3) Create tables: albums, images.

Expected tables
albums
- id uuid primary key
- owner_id uuid (nullable, references auth.users)
- title text
- theme text
- background_color text
- add_new_first boolean default false
- created_at timestamp default now()

images
- id uuid primary key
- album_id uuid references albums(id)
- path text
- caption text
- sort_order int
- width int
- height int
- created_at timestamp default now()

RLS idea (simplified)
- Public can read albums/images.
- Public can insert albums/images when owner_id is null.
- Authenticated users can read their own albums.
- Authenticated users can update/delete their own albums/images.

Files
- index.html: builder UI
- embed.html: public viewer (use ?album=<id>)
- app.js / embed.js: Supabase logic
- styles.css: shared UI
