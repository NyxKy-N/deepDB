# deepDB · Database Design Toolkit

> Author: **NyxKy** · Mascot & helper: **Deepseek 🐋** · Web: <https://deepdbweb.vercel.app/#/>

A **pure-static** database-design teaching site, modelled on the tool set of [designerdb.io](https://designerdb.io/#tools):
ER modelling, NoSQL document modelling, relational-algebra expressions and an ER → relational-schema translator.
The interface is available in **English, 中文 and Italiano**, with **light / dark** themes.

No installation, no server: **double-click `index.html`** and it runs offline.
Models are stored in your own browser (localStorage) and are never uploaded anywhere.

---

## Home

The landing page is an editorial, **Alt Shift–inspired** experience built from scratch with deepDB's own content:

- **Hero**: a cream → coral → violet scroll gradient, a full-bleed `DEEP.DB` wordmark set in Anton, a floating reel that cycles through the four tool previews, and a live grain layer.
- **Workflow marquee**: two counter-scrolling display bands ("SKETCH IT. · CHECK IT. · SHIP IT.") plus a live browser clock.
- **Tools, pinned**: a four-step scroll story (`designER → translatER → noER → designQT`), each with its own preview window and a link into the tool.
- **Statement**: halftone dot-matrix typography ("MODELS DRIFT. SCHEMAS ALIGN. DEEP.DB MAKES THEM TALK.") with floating UI objects, followed by a capabilities table.
- **Built on / exports to**: a display-type marquee of the formats the tools speak (PostgreSQL, MySQL, SQLite, JSON Schema, MongoDB, Mongoose…).
- **Tools stack + footer**: a dimmed giant word stack that brightens as you scroll, then a cream → lavender → magenta footer with live X/Y coordinates, `HELLO@ DEEPDB.APP`, floating keycaps and every link in one place.

Interactions: scroll-scrubbed gradients, pinned sections, marquee bands, halftone reveals, pointer parallax, live clock and cursor coordinates. All copy stays in the three supported languages (tool names and code samples stay as-is), and every animation respects `prefers-reduced-motion`.

The halftone statement reveals **word by word** as the section scrolls through the viewport, and the whole page shares the editorial type and colour system described below.

---

## Editorial interface

The Alt Shift–inspired language is applied to **every page**, not just the landing page (`assets/css/editorial-ui.css`, loaded after `style.css`):

- **Navigation** — floating pill links, an active pill, a rounded Settings pill and a **Menu** pill; the header floats over the content with a frosted-glass bar.
- **Menu pill** — the header keeps only the brand and a single Menu pill. Hover or click it to unfold designER, translatER, noER, designQT, **Settings** and **About** inside the same pill; click Menu again (or press `Esc`) to fold it back. Phones open the same list as a full-height drawer.
- **Buttons & controls** — every button is a pill with a translucent, backdrop-blurred surface; primary actions use the electric blue accent, destructive actions red; inputs, selects and segmented controls follow the same glass treatment.
- **Panels, cards, tables, canvas** — translucent frosted panels with hairline borders and generous radii; the ER/RA/noER canvases sit inside an inset rounded frame.
- **Menus, modals & toasts** — node menus, chip menus, the settings modal and toasts all use heavy gaussian blur (`backdrop-filter`) over the page.
- **Typography** — Space Grotesk for UI, SF Mono for labels and counters (small uppercase, wide tracking), Anton reserved for display type. Same tokens drive light and dark themes: warm paper cream in light, near-black in dark.
- **About page** (`index.html#/about`) — editorial hero with an `ABOUT` display title, cards for **the author (NyxKy)** and **the helper (Deepseek)** with avatars and links, followed by a project fact table (what it is, tools, stack, inspiration, source, licence).

All new interface strings are translated into Chinese and Italian; the English build has no CJK leaks. Layouts are verified at 1440 / 1024 / 390 px with no horizontal overflow.

---

## Quick start

1. Open this folder;
2. Double-click `index.html` (Chrome / Edge / Firefox; phones and tablets work too);
3. Pick a tool from the navigation bar, or deep-link directly:

| Page | URL |
| --- | --- |
| Home | `index.html#/` |
| designER | `index.html#/tools/er` |
| translatER | `index.html#/tools/translater` |
| noER | `index.html#/tools/noer` |
| designQT basic | `index.html#/tools/ra` |

The language defaults to **English**; open the header **Menu** pill → **Settings** → Language.
Theme: Light / Dark / Follow system, plus seven accent colours that retint buttons, links, canvas edges and highlights.

---

## The four tools

### 1. designER — relational model design

- Infinite canvas: draw **entities**, **attributes** (small circles attached around the entity), **relationships** (flat wide diamonds) and **ISA generalizations**;
- Attributes: single / multi-valued (`(0,N)`), composite (pill shape with sub-attributes fanned around it), primary keys (black circle; **white circles + a chain line with a dot = composite key**), plus a "plain attribute" option with no cardinality badge;
- **Foreign keys**: in the entity's *Foreign key* section choose the primary key of the entity on the other end of a relationship (`+ Add foreign key`); it is stored on the entity and shown inside the entity box as a `FK Entity.attribute` chip next to the composite-key chip, and removed automatically when the referenced key, entity or relationship disappears;
- Every element is editable: double-click to rename, click to open its menu (Rename / Link / Delete), drag to move, click a cardinality `(0,1)` chip to change it, click a `(t,e)` ISA label to pick one of the four generalization kinds (Total/Partial × Exclusive/Overlapping);
- **Automatic checks** (errors / warnings / notes, each points at the element), then refactor into a **logical schema** (keys, foreign keys, unique constraints) shown in *Logical schema*;
- **Auto layout** arranges entities by ISA hierarchy, keeps relationships near their participants, avoids overlaps and routes connection lines around other elements;
- Save / open models in the browser; export JSON, or import a saved deepDB JSON **and designerdb.io-style `.er` files** (entities, relationships, participations and attributes are converted automatically);
- Generalizations: select an entity and press **Link entity (create ISA)**, then click another entity ? the selected one becomes its **child**; an entity can have many children but only one parent, chains are allowed, cycles are rejected, and the connector is always drawn from the centre line of both entities.

### 2. translatER — ER → relational schema (hand-written)

- The left pane shows the source ER model: entities (with PK-marked attributes), relationships (participants + cardinality) and relationship attributes;
- Load a model with **Sample ER / Open saved ER / Import JSON** (`.json` or designerdb.io `.er`) and press **Translate** for a one-click conversion, or press **New** and type the schema yourself;
- Type a table name: it is matched **case-insensitively** against entity/relationship names, upper-cased, and the opening parenthesis is added for you;
- Type attribute names separated by `,` (or press Enter) to add them as chips;
- Click a chip to toggle **PK** / **FK** / delete — **an attribute can be both PK and FK at the same time**;
- Attribute order is automatic: PKs first (in the order you set them), then FKs, then the rest;
- **PK** is drawn as one continuous underline (multiple PKs share a single line); **FK** is appended as `(FK)`; copy/download prints `NAME (a(PK), b(FK))`;
- **Done** validates the schema and lists problems below it: unnamed/duplicate tables, no attributes, duplicate attributes, no PK, tables that do not exist in the ER model, **and a column-by-column comparison with the ER model** — extra columns are errors, missing model columns are errors, but **FK columns are exempt from the name comparison** (FKs may be renamed).

### 3. noER — NoSQL document model design

- Design collections as cards: fields with types (`string / number / boolean / date / objectId / object / array / ref / mixed`), nested objects, arrays of objects, references between collections;
- Automatic checks for naming, references and nesting; reference lines drawn between cards;
- Save / open, export / import JSON.

### 4. designQT basic — relational algebra

- Build an expression tree with σ (select), π (project), ρ (rename), ⋈ (join), × (product), ∪, ∩, − and γ (aggregate);
- Drag nodes or whole subtrees; click a dashed placeholder then an operator to fill it; selecting an existing node wraps it into a new operator;
- Output fields are inferred live; the standard expression text can be copied or downloaded; checks report missing parameters.

---

## Interface details

- **Settings** (gear): language and theme; the panel grows out of the button and shrinks back into it;
- The theme switch reveals the new theme radially from the clicked point;
- Toasts, modals, menus and drawers animate in and out with a matching reverse animation (all 250–420 ms, respecting `prefers-reduced-motion`);
- Side panels collapse with the `‹` `›` buttons on the canvas edge; on tablets they become slide-in drawers (one at a time), on phones they become bottom sheets;
- On tablets/phones a quick-action bar (add entity / relationship / attribute, etc.) sits at the bottom of the canvas;
- The left panel can be resized by dragging its right edge (desktop, minimum = default width);
- Footer: project author, avatar, GitHub link and shortcuts.

## Responsive

- **Phone sheets**: panels slide up from the bottom with a grip bar - drag the bar down to close them (they cannot be expanded further). The circular sidebar buttons sit at the bottom corners and show **↓** when the panel is closed (tap to open) and **↑** when it is open (tap to close).

- **Desktop** (> 1024 px): three columns — tools, canvas, properties; both side panels collapsible;
- **Tablet** (641–1024 px): full-width canvas, side panels are exclusive drawers, left-panel groups become accordions, bottom quick-action bar;
- **Phone** (≤ 640 px): panels become bottom sheets, the quick-action bar spans the bottom, the canvas auto-fits the model (down to 20 % zoom so nothing is clipped), navigation scrolls horizontally.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Delete` | Delete the selected element (or attribute) |
| `Esc` | Cancel selection / linking / close menus |
| Double-click | Rename inline |
| Mouse wheel | Zoom the canvas |
| Drag empty canvas | Pan |

## Autosave

Every tool keeps a **draft** in `localStorage`, so refreshing the page does not lose work:

- `designerdb:v1:draft:er` — ER model + viewport
- `designerdb:v1:draft:noer` — document model + viewport
- `designerdb:v1:draft:ra` — expression tree + viewport
- `designerdb:v1:lang`, `designerdb:v1:theme`, `designerdb:v1:panels`, `designerdb:v1:lbw` — preferences
- `designerdb:v1:store:<kind>:<name>` — named saves created with Save

Exported / saved file names use English defaults (`untitled-er-model.json`, `.noer.json`, `.ra.json`, `schema.txt`).

## Project structure

```
deepDB/
├─ index.html               single entry page
├─ README.md
└─ assets/
   ├─ css/style.css         all styles (themes, responsive, animations)
   ├─ img/avatar.jpg        author avatar
   └─ js/
      ├─ core.js            utilities, UI (toast/modal/prompt), storage, IO
      ├─ i18n-dict.js       translation dictionary (zh / en / it)
      ├─ i18n.js            DOM translation engine (exact match, patterns, mutation observer)
      ├─ er.js              designER canvas editor
      ├─ er-schema.js       ER checks + logical-schema refactoring
      ├─ translater.js      translatER handwritten schema editor
      ├─ noer.js            noER document model editor
      ├─ ra.js              designQT relational-algebra editor
      └─ app.js             routing, home page, settings, panels, animations
```

## Exported files on Windows

Browsers normally write exported files through the **Save dialog** (File System Access API), and those files open
normally. If you ever get an *"Windows cannot open this file because of security settings"* or *"This file came from
another computer"* message, the file carries the "downloaded from the internet" mark:

1. Right-click the file → **Properties** → tick **Unblock** → **OK**; or
2. Open it with a text editor (Notepad / VS Code) and save a copy under a new name; or
3. Use **Copy** in the app and paste the content into your own file.

## Notes

- The site is a teaching implementation inspired by [designerdb.io](https://designerdb.io/#tools); it is not affiliated with the official project.
- No tracking, no network requests, no build step — everything (icons, illustrations and animations included) is plain HTML/CSS/JS.
- Data lives only in your browser; use **Export / Download** to keep a copy.
