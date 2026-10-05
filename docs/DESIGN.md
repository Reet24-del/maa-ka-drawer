# Implementation design spec

Reference: design-concept.png (1505×1045), generated with the built-in Image Gen tool and selected as the implementation direction. No extra approval gate.

Palette: warm ivory #f6f3eb, text #292c25, olive #435238, selected row #e9eddf, rules #d6d1c6, evidence #efece3, paper white. Georgia serif brand/headline, system sans-serif controls, monospace receipt. 72px desktop gutters; 74px header; centered hero 60px heading, 22px subtitle, 875px search and 58px controls. Main content starts near y380: 1.1fr/1fr columns with 28px gap; 82px list rows. Outline drawer/file/search/plus/chevron icons.

Locked copy: Maa ka Drawer; Add receipt; A little less searching.; Your household bills, right where you need them.; Try “washing machine warranty”; Search; Try a search:; Washing machine; RO service; Mixer bill; Sample drawer · Fictional receipts for trying things out; Your receipts; 6 saved; All; Appliances; Services; Sample receipt; Saved receipt text. No original attached.; Archive.

Functional additions: real loading/errors, result counts/excerpts, Clear search, add dialog, original attachment preview, supplied dates, archive/undo, no-match. Sample-only footer says 'Fictional sample · dates supplied in demo text' to avoid a false human-verification claim. The receipt is real HTML text; no need for production image assets. At 760px columns stack; 390px viewport has readable controls and an evidence jump link. Reduced-motion support.

Add form: title/text required, optional source image/PDF and category/merchant/dates. Clearly state that text must be entered separately; no OCR claim. User confirms facts were checked against source. Labelled fields, keyboard/Escape support, focus restored to Add receipt.

## October 5 update: 3D receipt flashcards

User requested an image-led landing page with cards that enlarge on pointer hover. This replaces the original list/detail split. Reference: `flashcard-concept.png`. Production art: `public/images/appliances.png`, generated as six equal square tiles and selected using CSS background positions. Art is illustrative, not a photograph of the user's actual item or receipt.

The existing cream, olive, serif heading, search, examples and receipt data remain. Three columns on desktop, two on tablets, one on narrow phones. Native buttons open a native modal containing the existing receipt evidence, original source viewer and archive action. Unrecognized item names use a generic receipt illustration rather than a misleading appliance image.

Motion: stationary wrappers measure pointer position; the card surface tilts up to 6° vertically / 7° horizontally, lifts 12px and grows to 106.5%. Pointer leave resets the angle. Keyboard focus also lifts the card. Reduced-motion removes transforms. Touch users tap to open without needing hover.

### Visual verification and intentional differences

- Compared generated concept with full-page IAB screenshots: cream/olive palette, serif hierarchy, six image subjects, card shadows/rotation, search and category controls.
- Fixed initial stylesheet ordering which incorrectly kept the old two-column workspace.
- Square artwork areas intentionally replace the concept's wide image areas, preserving complete appliance silhouettes and original proportions. This increases page height; the gallery scrolls naturally.
- Kept the real seeded merchants/dates, existing search placeholder and truthful sample notice instead of the concept's invented merchant/date text.
- Tabs remain aligned right; sample notice remains above the collection for visibility. Existing outline drawer icon retained.
- Desktop 1280px and phone 390×844 inspected with no horizontal overflow. Concept native-size check recorded separately in VERIFICATION.md.
- Browser screenshots were visually inspected through the CUA image output. The concept was also opened with view_image. CUA does not expose a documented screenshot-to-local-file API, so a second local view_image inspection of the render is unavailable; no claim of pixel-identical comparison is made.
