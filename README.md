# deepDB · Database Design Toolkit

> Author: **NyxKy** · Mascot & helper: **Deepseek 🐋** · Repository: <https://github.com/NyxKy-N/deepDB.git>

A **pure-static** database-design teaching site, modelled on the tool set of [designerdb.io](https://designerdb.io/#tools):
ER modelling, NoSQL document modelling, relational-algebra expressions and an ER → relational-schema translator.
The interface is available in **English, 中文 and Italiano**, with **light / dark** themes.

No installation, no server: **double-click `index.html`** and it runs offline.
Models are stored in your own browser (localStorage) and are never uploaded anywhere.

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
| Motion lab (animation showcase) | `index.html#/lab` |

The language defaults to **English**; switch it in **Settings** (gear icon, top right) → Language.
Theme: Light / Dark / Follow system.

---

## The four tools

### 1. designER — relational model design

- Infinite canvas: draw **entities**, **attributes** (small circles attached around the entity), **relationships** (flat wide diamonds) and **ISA generalizations**;
- Attributes: single / multi-valued (`(0,N)`), composite (pill shape with sub-attributes fanned around it), primary keys (black circle; **white circles + a chain line with a dot = composite key**), plus a "plain attribute" option with no cardinality badge;
- Every element is editable: double-click to rename, click to open its menu (Rename / Link / Delete), drag to move, click a cardinality `(0,1)` chip to change it, click a `(t,e)` ISA label to pick one of the four generalization kinds (Total/Partial × Exclusive/Overlapping);
- **Automatic checks** (errors / warnings / notes, each points at the element), then refactor into a **logical schema** (keys, foreign keys, unique constraints) shown in *Logical schema*;
- **Auto layout** arranges entities by ISA hierarchy, keeps relationships near their participants, avoids overlaps and routes connection lines around other elements;
- Save / open models in the browser, export / import JSON.

### 2. translatER — ER → relational schema (hand-written)

- The left pane shows the source ER model: entities (with PK-marked attributes), relationships (participants + cardinality) and relationship attributes;
- Load a model with **Sample ER / Open saved ER / Import JSON**, or press **New** and type the schema yourself;
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

## Motion lab

A standalone, animation-heavy preview page at `index.html#/lab` (also linked from the hero and the footer):
floating model cards, self-drawing SVG connections, staggered entrances, pointer parallax, animated counters and a small
"move an attribute into the schema" demo. All motion is CSS + requestAnimationFrame and respects `prefers-reduced-motion`.

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
