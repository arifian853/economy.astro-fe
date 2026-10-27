# SUBTLE DESIGN SYSTEM
## Soft Editorial Materialism

> A soft, elegant, modern interface language that combines editorial composition, tonal materiality, rounded geometry, and Material-inspired product ergonomics.
>
> **One design system. Eight moods. One visual grammar.**

**Status:** Canonical design specification
**Target site:** `subtle.arifian.web.id`
**Primary direction:** Soft Editorial Materialism
**Primary modes:** Editorial / Product
**Typography:** Lexend Deca + Inclusive Sans + JetBrains Mono
**Interaction foundation:** Base UI / shadcn-compatible primitives
**Motion direction:** Quiet, responsive, purposeful
**Mood count:** 8

---

# 1. North Star

Subtle is not a rounded dashboard theme.

Subtle is a complete interface language that can move between landing pages, portfolios, product marketing, documentation, SaaS interfaces, AI applications, dashboards, CRUD tools, internal software, and data-heavy interfaces without losing its identity.

The system should feel modern without becoming generic, soft without becoming childish, rounded without turning everything into pills, expressive without becoming noisy, premium without depending on glassmorphism, Material-inspired without imitating Google's visual language, calm enough for tools, and confident enough for editorial websites.

The canonical design statement is:

> **Rounded, tonal, softly elevated interfaces with editorial composition and Material-inspired product ergonomics.**

---

# 2. Core Design DNA

Subtle is built around three pillars.

## 2.1 Quiet Expressiveness

Expression comes from shape, proportion, scale, typography, spacing, composition, controlled motion, and tonal contrast.

Expression must not depend on excessive gradients, neon, particles, constant animation, decorative glass, unnecessary 3D, or every element having a special effect.

The interface should remain calm even when it is visually distinctive.

## 2.2 Editorial Composition

Typography and composition come before containers.

The default layout strategy is:

```text
content
→ hierarchy
→ whitespace
→ composition
→ surface only when needed
```

Not:

```text
section
→ card
→ card
→ card
→ card
```

A section does not automatically require a card. A group does not automatically require a border. A landing page should be able to feel spacious, editorial, and intentional while still using the same design language as an operational dashboard.

## 2.3 Tonal Materiality

Subtle creates hierarchy primarily through tonal surface differences, containment, shape, scale, controlled elevation, and semantic color.

Borders and shadows support the hierarchy rather than define it.

---

# 3. Shared DNA Across All Eight Moods

All eight moods MUST share typography, type hierarchy, shape logic, spacing system, component anatomy, interaction behavior, motion language, responsive behavior, accessibility rules, composition principles, signature components, and editorial/product modes.

Mood switching MUST NOT change page structure, replace components, change typography families, arbitrarily change radius, change spacing density, change interaction patterns, or create a second component implementation.

Mood switching changes the atmosphere, not the design grammar.

---

# 4. The Eight Moods

The canonical mood set is:

1. **Teal**
2. **Graphite**
3. **Slate**
4. **Forest**
5. **Beige**
6. **Sky Night**
7. **Lavender**
8. **Rosewood**

Recommended default mood for the public showcase:

> **Beige**

Graphite and Sky Night are native dark moods. The other six are native light moods. Do not force every light mood to have a dark equivalent in the first version.

---

# 5. Mood Token Contract

Every mood exposes the same semantic token contract:

```css
--bg-main
--bg-surface
--bg-surface-variant
--bg-surface-hover

--primary
--primary-hover
--primary-container
--on-primary-container

--secondary
--secondary-container
--on-secondary-container

--text-main
--text-muted
--text-light

--border-subtle
--border-active

--status-pending-text
--status-pending-bg
--status-info-text
--status-info-bg
--status-success-text
--status-success-bg
--status-error-text
--status-error-bg
--status-available-text
--status-available-bg
--status-unavailable-text
--status-unavailable-bg

--priority-high-text
--priority-high-bg
--priority-normal-text
--priority-normal-bg
--priority-low-text
--priority-low-bg
```

A mood may introduce an accessibility correction token when necessary. Bookshelf keeps all semantic text pairs at WCAG AA: its `text-muted` and `status-available-text` values are darkened where the canonical swatches fell below 4.5:1. Rosewood retains `--text-subtle-readable` and `--status-available-text-aa` for additional use.

---

# 6. Bookshelf Mood Tokens (Subtle Adaptation)

These eight palettes follow the canonical Subtle moods. The `text-muted` and `status-available-text` values include the Bookshelf contrast corrections noted above; layout and component geometry do not vary by mood.

## Teal

```css
--bg-main:#F3F8F7; --bg-surface:#FFFFFF; --bg-surface-variant:#E5F0EE; --bg-surface-hover:#D9E9E6;
--primary:#3F6B67; --primary-hover:#345B57; --primary-container:#D5E7E4; --on-primary-container:#1F3835;
--secondary:#687A77; --secondary-container:#E5ECEB; --on-secondary-container:#303D3B;
--text-main:#22302F; --text-muted:#5D6E6C; --text-light:#83918F;
--border-subtle:#D7E4E1; --border-active:#3F6B67;

--status-pending-text:#7B5D18; --status-pending-bg:#F8F1DD;
--status-info-text:#3D7080; --status-info-bg:#E7F2F4;
--status-success-text:#3F7653; --status-success-bg:#E5F1E8;
--status-error-text:#A64545; --status-error-bg:#F7E9E9;
--status-available-text:#3F7653; --status-available-bg:#E4F1E7;
--status-unavailable-text:#A64B4B; --status-unavailable-bg:#F6E8E8;

--priority-high-text:#913D3D; --priority-high-bg:#F5E5E5;
--priority-normal-text:#303D3B; --priority-normal-bg:#E5ECEB;
--priority-low-text:#526460; --priority-low-bg:#E4ECEA;
```

**Mood:** Fresh, balanced, composed, modern.

## Graphite

```css
--bg-main:#111315; --bg-surface:#171A1D; --bg-surface-variant:#202428; --bg-surface-hover:#2A3035;
--primary:#B8C0C8; --primary-hover:#CBD2D9; --primary-container:#31373D; --on-primary-container:#E8EDF1;
--secondary:#929DA7; --secondary-container:#2A2F34; --on-secondary-container:#DCE2E7;
--text-main:#EEF1F4; --text-muted:#A6AFB7; --text-light:#7D8790;
--border-subtle:#30363C; --border-active:#B8C0C8;

--status-pending-text:#E3C06A; --status-pending-bg:#3C331D;
--status-info-text:#A3BDD0; --status-info-bg:#253442;
--status-success-text:#82C79B; --status-success-bg:#20392A;
--status-error-text:#E9A0A0; --status-error-bg:#44282A;
--status-available-text:#82C79B; --status-available-bg:#1F392A;
--status-unavailable-text:#E9A0A0; --status-unavailable-bg:#422729;

--priority-high-text:#F0B0B0; --priority-high-bg:#42282A;
--priority-normal-text:#DCE2E7; --priority-normal-bg:#2A2F34;
--priority-low-text:#AAB4BD; --priority-low-bg:#262C31;
```

**Mood:** Neutral, technical, restrained, premium-dark.

## Slate

```css
--bg-main:#F6F7F8; --bg-surface:#FFFFFF; --bg-surface-variant:#ECEFF2; --bg-surface-hover:#E2E6EA;
--primary:#4D5D6C; --primary-hover:#3E4D5A; --primary-container:#DDE4E9; --on-primary-container:#26323C;
--secondary:#6B7680; --secondary-container:#E9ECEF; --on-secondary-container:#343B42;
--text-main:#252B31; --text-muted:#626C76; --text-light:#89939C;
--border-subtle:#DEE3E7; --border-active:#4D5D6C;

--status-pending-text:#7B5C17; --status-pending-bg:#F8F1DD;
--status-info-text:#3F6B86; --status-info-bg:#E9F1F5;
--status-success-text:#43744E; --status-success-bg:#E7F1E8;
--status-error-text:#A54343; --status-error-bg:#F7E9E9;
--status-available-text:#43744E; --status-available-bg:#E6F1E7;
--status-unavailable-text:#A64B4B; --status-unavailable-bg:#F6E8E8;

--priority-high-text:#913D3D; --priority-high-bg:#F5E5E5;
--priority-normal-text:#343B42; --priority-normal-bg:#E9ECEF;
--priority-low-text:#53606B; --priority-low-bg:#E9EDF0;
```

**Mood:** Professional, neutral, clear, enterprise-friendly.

## Forest

```css
--bg-main:#F4F7F1; --bg-surface:#FFFFFF; --bg-surface-variant:#EAF0E6; --bg-surface-hover:#E0E9DC;
--primary:#49644B; --primary-hover:#3C563E; --primary-container:#DDE9D8; --on-primary-container:#223524;
--secondary:#6D7868; --secondary-container:#E7ECE4; --on-secondary-container:#323B30;
--text-main:#253025; --text-muted:#636E61; --text-light:#7F8B7D;
--border-subtle:#DCE4D8; --border-active:#49644B;

--status-pending-text:#80621A; --status-pending-bg:#F8F2DD;
--status-info-text:#3F6F84; --status-info-bg:#E9F2F4;
--status-success-text:#3F7450; --status-success-bg:#E7F1E8;
--status-error-text:#A9433F; --status-error-bg:#F7E9E7;
--status-available-text:#3F7450; --status-available-bg:#E6F1E7;
--status-unavailable-text:#A64C48; --status-unavailable-bg:#F6E8E6;

--priority-high-text:#913936; --priority-high-bg:#F6E5E3;
--priority-normal-text:#323B30; --priority-normal-bg:#E7ECE4;
--priority-low-text:#536052; --priority-low-bg:#E8EDE7;
```

**Mood:** Natural, grounded, calm, quietly organic.

## Beige

```css
--bg-main:#FAF8F5; --bg-surface:#FFFFFF; --bg-surface-variant:#F4EFEA; --bg-surface-hover:#ECE4DC;
--primary:#6B5040; --primary-hover:#574032; --primary-container:#EDE3DA; --on-primary-container:#332317;
--secondary:#7D6B5D; --secondary-container:#EFE8E1; --on-secondary-container:#362D26;
--text-main:#2A231F; --text-muted:#766961; --text-light:#A4978E;
--border-subtle:#E8E0D7; --border-active:#6B5040;

--status-pending-text:#8C6D1F; --status-pending-bg:#FEF7E6;
--status-info-text:#2B6CB0; --status-info-bg:#EBF4FF;
--status-success-text:#2F7A4D; --status-success-bg:#E8F5EC;
--status-error-text:#B83232; --status-error-bg:#FDF0F0;
--status-available-text:#2F7A4D; --status-available-bg:#E8F4EC;
--status-unavailable-text:#B04242; --status-unavailable-bg:#FDECEC;

--priority-high-text:#9B1C1C; --priority-high-bg:#FDE8E8;
--priority-normal-text:#362D26; --priority-normal-bg:#EFE8E1;
--priority-low-text:#4A5568; --priority-low-bg:#EDF2F7;
```

**Mood:** Warm, elegant, neutral, calm, approachable.

## Sky Night

```css
--bg-main:#0B1220; --bg-surface:#111A2B; --bg-surface-variant:#18243A; --bg-surface-hover:#21314B;
--primary:#8FB7FF; --primary-hover:#A4C5FF; --primary-container:#1B355B; --on-primary-container:#D6E5FF;
--secondary:#A9B6CA; --secondary-container:#263349; --on-secondary-container:#E3EBF7;
--text-main:#EAF1FF; --text-muted:#A8B4C7; --text-light:#76869D;
--border-subtle:#29384F; --border-active:#8FB7FF;

--status-pending-text:#E6C26A; --status-pending-bg:#40351B;
--status-info-text:#8DBDFF; --status-info-bg:#19375A;
--status-success-text:#79C69A; --status-success-bg:#173A2A;
--status-error-text:#F09A9A; --status-error-bg:#482323;
--status-available-text:#7ED3A1; --status-available-bg:#153829;
--status-unavailable-text:#F0A0A0; --status-unavailable-bg:#442326;

--priority-high-text:#FFB4B4; --priority-high-bg:#452629;
--priority-normal-text:#E3EBF7; --priority-normal-bg:#263349;
--priority-low-text:#AAB8CC; --priority-low-bg:#202C3F;
```

**Mood:** Atmospheric, technical, nocturnal, calm.

## Lavender

```css
--bg-main:#F7F5FA; --bg-surface:#FFFFFF; --bg-surface-variant:#EEEAF4; --bg-surface-hover:#E5DFEC;
--primary:#665A7A; --primary-hover:#554A68; --primary-container:#E5DDED; --on-primary-container:#332B40;
--secondary:#766E80; --secondary-container:#ECE8F0; --on-secondary-container:#37323D;
--text-main:#2C2833; --text-muted:#6D6775; --text-light:#90889A;
--border-subtle:#E0DAE7; --border-active:#665A7A;

--status-pending-text:#7B5D18; --status-pending-bg:#F8F1DC;
--status-info-text:#526D99; --status-info-bg:#EDF1F8;
--status-success-text:#467652; --status-success-bg:#E8F1E9;
--status-error-text:#A74650; --status-error-bg:#F8E9EC;
--status-available-text:#467652; --status-available-bg:#E7F1E8;
--status-unavailable-text:#A84B52; --status-unavailable-bg:#F7E8EA;

--priority-high-text:#943D49; --priority-high-bg:#F6E5E8;
--priority-normal-text:#37323D; --priority-normal-bg:#ECE8F0;
--priority-low-text:#665F70; --priority-low-bg:#EEEAF3;
```

**Mood:** Soft, thoughtful, refined, slightly expressive.

## Rosewood

```css
--bg-main:#FAF5F5; --bg-surface:#FFFFFF; --bg-surface-variant:#F3E9E9; --bg-surface-hover:#EADDDD;
--primary:#7A4F55; --primary-hover:#684147; --primary-container:#EEDCDD; --on-primary-container:#3D262A;
--secondary:#806C6E; --secondary-container:#F0E7E7; --on-secondary-container:#3D3334;
--text-main:#312628; --text-muted:#746567; --text-light:#96878A; --text-subtle-readable:#6E6062;
--border-subtle:#E7DADA; --border-active:#7A4F55;

--status-pending-text:#7B5C18; --status-pending-bg:#F8F1DD;
--status-info-text:#4C6F88; --status-info-bg:#EAF1F5;
--status-success-text:#477552; --status-success-bg:#E8F1E9;
--status-error-text:#A2434B; --status-error-bg:#F8E8EA;
--status-available-text:#477552; --status-available-text-aa:#477552; --status-available-bg:#E7F1E8;
--status-unavailable-text:#A64A52; --status-unavailable-bg:#F6E7E9;

--priority-high-text:#913B44; --priority-high-bg:#F6E4E6;
--priority-normal-text:#3D3334; --priority-normal-bg:#F0E7E7;
--priority-low-text:#6B5D5F; --priority-low-bg:#EFE8E8;
```

**Mood:** Warm, mature, intimate, restrained.

---

# 7. Typography

```css
--font-heading:"Lexend Deca",sans-serif;
--font-body:"Inclusive Sans",sans-serif;
--font-mono:"JetBrains Mono",monospace;
```

Lexend Deca is used for display typography, hero headings, page titles, section headings, card headings and prominent values. Inclusive Sans is used for body copy, navigation, controls, labels, buttons, captions and supporting information. JetBrains Mono is reserved for technical metadata, IDs, code, logs and machine-readable information.

---

# 8. Dual Typography Scale

## Editorial Scale

```text
Display XL   72–104px
Display      56–80px
H1           44–60px
H2           32–44px
H3           24–30px
Lead         18–22px
Body         16–18px
Meta         12–14px
```

Use responsive `clamp()` rather than abrupt breakpoint jumps.

## Product Scale

```text
Page Title    28–36px
Section       20–24px
Card Title    16–18px
Body          14–16px
Label         12–14px
Metadata      11–13px
```

The product scale may be denser, but it must remain calm and readable.

---

# 9. Shape System

```css
--radius-xs:6px;
--radius-sm:10px;
--radius-md:16px;
--radius-lg:24px;
--radius-xl:32px;
--radius-full:9999px;
```

| Radius | Typical use |
|---|---|
| `xs` | tiny technical elements, small badges |
| `sm` | buttons, inputs, compact controls |
| `md` | cards, list items, small surfaces |
| `lg` | major cards, panels, sheets |
| `xl` | hero media, signature surfaces, Soft Mosaic anchors |
| `full` | chips, avatars, segmented controls, intentional capsules |

Do not make every element a pill. Do not give every surface the largest radius. Shape communicates hierarchy. Nested surfaces should usually step down in radius.

---

# 10. Surface System

Canonical hierarchy:

```text
Canvas
→ Surface Low
→ Surface
→ Surface High
→ Floating
```

Recommended semantic roles:

```css
--surface-canvas
--surface-low
--surface
--surface-high
--surface-floating
```

These are derived from each mood's canonical tokens.

---

# 11. Elevation

**Level 0:** no shadow; default for open sections and tonal grouping.
**Level 1:** almost invisible soft shadow for cards that genuinely need separation or sticky surfaces.
**Level 2:** restrained floating depth for popovers, inspectors, menus and hover surfaces.
**Level 3:** foreground depth for dialogs, command palettes and modal sheets.

Tonal difference comes before shadow. Normal cards should not all cast obvious shadows. Shadow tint should harmonize with the mood.

---

# 12. Spacing

```text
4
8
12
16
24
32
48
64
96
128
```

Typical usage:

- control internals: `8–12`
- control gaps: `8–16`
- card internals: `16–32`
- component groups: `16–24`
- section gaps: `64–128`
- major editorial whitespace: `96–160` where appropriate

Editorial layouts use substantially more negative space than Product layouts.

---

# 13. Composition Principles

## Open Layout First

A surface is justified by grouping, hierarchy, interaction, containment or elevation. A section alone does not justify a card.

## Asymmetry With Discipline

Use offset media, uneven columns, staggered blocks, changing vertical rhythm and intentional negative space. Avoid random overlap or arbitrary alignment.

## Scale Creates Hierarchy

Use one dominant region rather than making every element equally prominent.

---

# 14. Signature Composition: Soft Mosaic

Soft Mosaic combines unequal surface sizes, different tonal levels, different content densities, hierarchical radius, asymmetry, and a shared underlying grid.

```text
╭──────────────────────────────╮
│ Primary story / content      │
│                              │
│                   visual     │
╰──────────────────────────────╯

       ╭─────────────╮ ╭─────────────╮
       │ Context     │ │ Metric      │
       ╰─────────────╯ ╰─────────────╯

╭────────────────────────────────────╮
│ Secondary supporting composition   │
╰────────────────────────────────────╯
```

Never make every tile equal. Never give every tile identical elevation.

---

# 15. Two Usage Modes

## Editorial Mode

For landing pages, portfolio, docs, product marketing and showcase.

Characteristics: large typography, wide whitespace, fewer containers, large media, asymmetry, narrative flow, Soft Mosaic, and quiet expressive motion.

## Product Mode

For tools, dashboards, SaaS, AI apps, CRUD, LMS and internal software.

Characteristics: denser spacing, smaller type, more containment, persistent navigation, tables/forms/status, inspectors, and functional surfaces.

Both modes use the same components and tokens.

---

# 16. Signature Components

Subtle should become recognizable through:

- **Tonal Hero**
- **Soft Mosaic**
- **Floating Inspector**
- **Soft Command Bar**
- **Context Capsule**
- **Layered Sheet**
- **Adaptive App Header**
- **Media Surface**

These should be authored specifically for Subtle rather than copied wholesale from an external kit.

---

# 17. Component Philosophy

Recommended behavioral foundation:

```text
Base UI
+
shadcn-style owned source
+
Subtle presentation layer
```

Take behavior, accessibility, interaction logic and useful composition ideas. Normalize all appearance into Subtle.

---

# 18. Core Component Families

**Actions:** Button, Icon Button, Button Group, Split Button, Segmented Control, Toggle, Copy Action.
**Forms:** Text Field, Textarea, Select, Combobox, Multi Select, Number Field, Slider, Checkbox, Radio, Switch, Calendar, Date Picker, Date Range, Tags Input, Dropzone, Color Picker, Rating, Validation Pattern.
**Navigation:** Adaptive Header, Breadcrumb, Tabs, Navigation Menu, Sidebar, Pagination, Step Navigation, Command, Search, Scroll Area, Back to Top.
**Feedback:** Alert, Toast, Status Badge, Progress, Spinner, Skeleton, Empty State, Inline Message, Error State.
**Overlays:** Dialog, Popover, Hover Card, Dropdown Menu, Context Menu, Drawer, Sheet, Tooltip, Command Palette.
**Data:** Data Table, Chart Family, Metric, Timeline, Tree, Activity Feed, Description List, Code Block, Terminal.
**Media:** Media Surface, Carousel, Gallery, Image Crop, Image Zoom, Before/After, Avatar, Media Player.
**Surfaces:** Card, Tonal Card, Soft Mosaic Tile, Floating Inspector, Context Capsule, Resizable Panel.

---

# 19. Motion Language

Subtle motion should feel:

> **softly responsive**

```text
micro interaction     120–180ms
control transition    160–220ms
overlay               180–280ms
layout transition     220–360ms
editorial reveal      350–650ms
```

Use opacity, 4–8px translation, subtle scale, soft container morph, indicator movement, tonal crossfade and height expansion.

Avoid large bounce, long travel, cursor trails, endless floating, long parallax and scroll hijacking. All animation must support reduced motion.

---

# 20. Material-Inspired, Not Material-Copied

Subtle takes inspiration from Material principles: hierarchy, semantic color, containment, elevation, adaptive composition, expressive shape, meaningful motion and accessible interaction.

Subtle does not require exact Google component shapes or exact Material UI anatomy.

> **Material philosophy, Arifian composition.**

---

# 21. External Inspiration Policy

High-value research sources:

- Material 3 Expressive — design theory
- Base UI — accessible behavior
- shadcn — source-owned component architecture
- Tailark — editorial / marketing composition
- Kibo UI — advanced application functionality
- Dice UI — serious application patterns
- coss UI — anatomy and dense product research
- Animate UI — component motion
- Motion Primitives — editorial motion
- React Bits — selective interaction ideas
- Kokonut UI — tactile micro-interactions
- Magic UI — selective visual utilities
- 21st.dev / Aceternity — discovery only

Never copy a supplier's visual identity wholesale. Always review licenses before copying source.

---

# 22. Accessibility

Minimum requirements:

- WCAG AA text contrast,
- visible keyboard focus,
- semantic labels,
- keyboard-operable overlays,
- focus restoration,
- reduced-motion support,
- practical touch targets around 44px,
- status cannot rely only on color,
- dark moods tested independently,
- every mood tested independently.

Do not preserve a palette value if it fails critical readability.

---

# 23. Responsive Philosophy

Subtle adapts composition rather than merely shrinking.

**Desktop:** asymmetry, open whitespace, Soft Mosaic, contextual floating surfaces.
**Tablet:** fewer columns, preserved hierarchy, flexible surfaces.
**Mobile:** one dominant reading flow, sheets/drawers may replace side inspectors, typography remains confident.

---

# 24. What Subtle Is Not

Subtle is NOT a dashboard template, a shadcn skin, a Material 3 clone, a library of rounded cards, eight unrelated themes, a glassmorphism system, a neon UI kit, a pill-everything design, a system where every section has a container, or a system where every container has a shadow.

---

# 25. Canonical Summary

> **Subtle is a soft editorial design system built around rounded hierarchy, tonal surfaces, deliberate whitespace, quiet expressiveness, and Material-inspired product ergonomics. Its eight moods change atmosphere while preserving one shared visual grammar.**

Short version:

> **Quiet expression. Tonal depth. Editorial composition. Product rigor.**
