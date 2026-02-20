# URL Structure

This site now uses clean URLs without `.html` extensions.

## Live URLs (after deployment)
- Home: `/` or `/index.html`
- Projects: `/projects/`
- Journal: `/journal/`
- Socials: `/socials/`
- Journal Viewer: `/journal-viewer/?entry=<slug>`

## Folder Structure
```
/
├── index.html              (root homepage)
├── 404.html                (error page)
├── projects/
│   └── index.html
├── journal/
│   └── index.html
├── socials/
│   └── index.html
├── journal-viewer/
│   └── index.html
└── Assets/
    ├── CSS/
    ├── JS/
    ├── Images/
    └── Text/
```

## Implementation Notes
- All navigation links use root-relative paths starting with `/`
- GitHub Pages automatically serves `index.html` from folders
- `.nojekyll` file ensures proper static file serving
- All internal links updated to use clean URLs
