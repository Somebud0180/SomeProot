# SomeProot
![Hackatime Tracking](https://hackatime-badge.hackclub.com/U079MU5B5R6/SomeProot)


<img style="width:100%; height:auto;" alt="Website Screenshot showing the homepage" src="https://github.com/user-attachments/assets/92f0b8ba-405a-4a90-a035-0d906547bdbb" />

[My personal website!](https://somebud0180.github.io/SomeProot/)
- A homepage!
  - A pointer tracking face!
  - A little excerpt about me
- A projects tab!
  - A few of my projects I made which are easily accessible
- A journals tab!
  - A few writeups I made, will be added upon!
- A socials tab!
  - My socials!
- A catch-all error page!
  - Shows a friendly 404 fallback for invalid routes

Repository Structure:
```
SomeProot/
├── README.md
├── LICENSE
├── 404.html
├── index.html
├── Assets
│   ├── CSS
│   │   ├── journal_styles.css
│   │   ├── journal_viewer_styles.css
│   │   ├── main_styles.css
│   │   ├── projects_styles.css
│   │   └── socials_styles.css
│   ├── JS
│   │   └── script.js
│   ├── Images
│   │   ├── Face
│   │   │   ├── Blush.svg
│   │   │   ├── Eye_L.svg
│   │   │   ├── Eye_R.svg
│   │   │   └── Mouth.svg
│   │   ├── Projects
│   │   │   ├── CritterSweeper.png
│   │   │   ├── Prism.png
│   │   │   └── SomeAppsWeb.jpeg
│   │   ├── Socials
│   │   │   ├── Fallback_Profile.png
│   │   │   ├── Github.png
│   │   │   ├── Instagram.png
│   │   │   ├── Slack.png
│   │   │   └── Twitter.png
│   │   ├── Background
│   │   │   ├── Backdrop.png
│   │   │   ├── Pattern_L.png
│   │   │   └── Pattern_R.png
│   │   └── Misc
│   │       ├── Footer.png
│   │       └── Somebud.png
│   └── Text
│       ├── Journals
│       │   ├── index.json
│       │   ├── Juice_1.md
│       │   └── Juice_2.md
│       ├── Home.md
│       ├── Journal.md
│       └── Socials.md
├── .gitignore
├── .prettierignore
├── .github
│   └── workflows
│       └── static.yml
└── .vscode
    └── launch.json
```

## Gallery + Hack Club CDN workflow

The gallery page reads data from `Assets/Text/gallery_collections.json`.

- Top level is `categories` (example: `photos`, `artwork`)
- Each category has `collections` (albums)
- Each collection has `items` with `url`, `title`, `caption`, and `alt`

### 1) Add image references directly

You can manually add CDN URLs to `Assets/Text/gallery_collections.json`.

### 2) Upload from URL using the API and auto-update collections

Use the helper script (keeps your API key out of frontend code):

```bash
CDN_API_KEY=sk_cdn_your_key_here node Local/Scripts/cdn_add_to_collection.mjs \
  --category photos \
  --collection-id juice-2025 \
  --collection-name "Juice 2025" \
  --collection-description "Juice in Shanghai, April 2025." \
  --source-url "https://example.com/image.jpg" \
  --title "Arrived" \
  --caption "First Group Pic" \
  --alt "Me along with other Hack Clubbers at the Airport"
```

This uses `POST https://cdn.hackclub.com/api/v4/upload_from_url`, then appends the returned CDN URL to your gallery manifest.

### 3) Sync local folders to CDN + manifest

Local source folders:

```text
Local/
  Gallery/
    Photos/
      <collection-folder>/
        image1.jpg
        image2.png
    Artwork/
      <collection-folder>/
        art1.jpg
  Scripts/
    sync_local_gallery_to_cdn.mjs
```

Run:

```bash
CDN_API_KEY=sk_cdn_your_key_here node Local/Scripts/sync_local_gallery_to_cdn.mjs
```

What it does:

- Treats each subfolder under `Local/Gallery/Photos` or `Local/Gallery/Artwork` as a collection
- Hashes each local image (`sha256`) and checks if that hash already has a valid CDN URL
- Reuses existing CDN URL when possible; uploads only missing images via `POST /api/v4/upload`
- Creates/updates matching collections and items inside `Assets/Text/gallery_collections.json`
- Stores local sync cache at `Local/.cache/cdn_upload_index.json`

`Local/Gallery/*` and local cache are git-ignored so image sources stay local.