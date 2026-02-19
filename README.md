# Photoshop Canvas Generator (Artboards)

A Photoshop **ExtendScript (.jsx)** tool that builds a single PSD containing multiple **artboards** from selectable presets, with standardized naming and a **live preview**.

## Features

- ScriptUI dialog (no plugins required)
- Standardized document naming: `SEASON_COLLECTION_PLATFORM_VERSION`
- **Live preview** of:
  - Document name
  - Selected artboards list
  - Estimated parent document size
- Auto-layout artboards in a grid (3 per row by default)

## Requirements

- Adobe Photoshop **CC 2015.5+** (artboards supported)

## Install

1. Copy `CanvasGenerator.jsx` into Photoshop Scripts folder:

**macOS**
`/Applications/Adobe Photoshop [version]/Presets/Scripts/`

**Windows**
`C:\Program Files\Adobe\Adobe Photoshop [version]\Presets\Scripts\`

2. Restart Photoshop
3. Run: **File → Scripts → CanvasGenerator**

## Usage

1. Choose Season / Collection / Platform / Version
2. Select the canvas presets you need
3. Confirm the live preview
4. Click **Create**

## Notes

- Name parts are sanitized for safe filenames (invalid characters replaced).
- Layout defaults: 50px margins, 50px spacing, 3 artboards per row.

## License

MIT
