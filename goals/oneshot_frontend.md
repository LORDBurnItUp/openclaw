# One-Shot Frontend Build — DESIGN-FIRST Workflow

## Goal

Build production-quality frontend sites, apps, and tools on the first attempt. This workflow combines **ui-ux-pro-max** design intelligence with the **ATLAS** build methodology to achieve near 100% first-try success.

**Why this works:** Most frontend failures happen because developers skip design decisions. This workflow forces design-first thinking, eliminating the "fix it later" loop.

---

## The ONE-SHOT Framework

| Phase | Action | Tool/Method |
|-------|--------|-------------|
| **1. DESIGN** | Generate complete design system | `ui-ux-pro-max --design-system` |
| **2. PLAN** | Define architecture (ATLAS: A-T) | Goals + Context |
| **3. VALIDATE** | Test connections before building (ATLAS: L) | Link validation |
| **4. BUILD** | Implement with design system (ATLAS: A) | Tools + Execution |
| **5. CHECK** | Pre-delivery quality checklist (ATLAS: S) | Stress-test |

---

## Phase 1: DESIGN (Required First Step)

**Never skip this.** The design system is your source of truth.

### Step 1.1: Analyze Requirements

Extract from user request:

- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page
- **Style keywords**: minimal, playful, professional, elegant, dark mode
- **Industry**: healthcare, fintech, gaming, education, beauty
- **Stack**: React, Vue, Next.js, or default to `html-tailwind`

### Step 1.2: Generate Design System

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system -p "Project Name"
```

**Example:**

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "saas dashboard analytics modern" --design-system -p "Analytics Pro"
```

**Output includes:**

- Recommended UI pattern
- Style (glassmorphism, minimalism, etc.)
- Color palette with hex codes
- Typography (heading + body fonts)
- Effects and shadows
- Anti-patterns to avoid

### Step 1.3: Persist Design System (Optional but Recommended)

For multi-page projects, save the design system:

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

Creates:

- `design-system/MASTER.md` — Global design rules
- `design-system/pages/` — Page-specific overrides

### Step 1.4: Get Stack Guidelines

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<keywords>" --stack html-tailwind
```

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

---

## Phase 2: PLAN (ATLAS: Architect + Trace)

### App Brief

```markdown
## App Brief
- **Problem:** [One sentence]
- **User:** [Who specifically]
- **Success:** [Measurable outcome]
- **Constraints:** [Budget, time, tech requirements]
```

### Data Schema (if applicable)

Define tables, relationships, and types BEFORE building.

### Tech Stack Confirmation

Based on design system and requirements:

- Frontend framework
- Component library
- State management
- API/backend (if needed)

---

## Phase 3: VALIDATE (ATLAS: Link)

Before writing any code:

```
[ ] Design system generated and saved
[ ] Color palette extracted (hex codes ready)
[ ] Typography imports ready (Google Fonts links)
[ ] Icon library chosen (Heroicons, Lucide, etc.)
[ ] Stack-specific guidelines reviewed
[ ] All API connections tested (if applicable)
[ ] Environment variables set (if applicable)
```

---

## Phase 4: BUILD (ATLAS: Assemble)

### Build Order

1. **Project setup** (framework, dependencies)
2. **Global styles** (colors, typography, spacing from design system)
3. **Layout components** (navbar, footer, containers)
4. **Page structure** (sections, grids)
5. **Interactive components** (buttons, forms, modals)
6. **Polish** (animations, hover states, responsive)

### Critical Rules During Build

**Icons & Visual Elements:**

- Use SVG icons (Heroicons, Lucide, Simple Icons)
- NEVER use emojis as UI icons
- Stable hover states (no layout shift)
- Consistent icon sizing (24x24 viewBox)

**Interaction & Cursor:**

- `cursor-pointer` on ALL clickable elements
- Hover feedback (color, shadow, border changes)
- Smooth transitions (150-300ms)

**Light/Dark Mode Contrast:**

- Light mode: `bg-white/80` or higher opacity for glass
- Text: `#0F172A` (slate-900) for body text
- Muted: `#475569` (slate-600) minimum
- Borders: `border-gray-200` in light mode

**Layout & Spacing:**

- Floating navbar: `top-4 left-4 right-4` spacing
- Account for fixed navbar height in content
- Consistent `max-w-6xl` or `max-w-7xl` containers

---

## Phase 5: CHECK (ATLAS: Stress-test)

### Pre-Delivery Checklist

**Visual Quality:**

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift
- [ ] Use theme colors directly (bg-primary) not var() wrapper

**Interaction:**

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

**Light/Dark Mode:**

- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

**Layout:**

- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

**Accessibility:**

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected

---

## Domain Search Reference

For additional design details:

| Need | Command |
|------|---------|
| More styles | `python3 .shared/ui-ux-pro-max/scripts/search.py "glassmorphism dark" --domain style` |
| Charts | `python3 .shared/ui-ux-pro-max/scripts/search.py "dashboard" --domain chart` |
| UX rules | `python3 .shared/ui-ux-pro-max/scripts/search.py "animation" --domain ux` |
| Typography | `python3 .shared/ui-ux-pro-max/scripts/search.py "elegant" --domain typography` |
| Landing | `python3 .shared/ui-ux-pro-max/scripts/search.py "hero" --domain landing` |
| Colors | `python3 .shared/ui-ux-pro-max/scripts/search.py "fintech" --domain color` |

---

## Anti-Patterns (What Kills One-Shot Success)

1. **Skipping design system** — You'll waste time on color/font decisions mid-build
2. **Using emojis as icons** — Looks amateur, inconsistent sizing
3. **Forgetting cursor-pointer** — Users don't know elements are clickable
4. **Low contrast in light mode** — Glass effects disappear
5. **No hover feedback** — Interface feels dead
6. **Inconsistent spacing** — Looks unpolished
7. **Building before validating connections** — Hours wasted on broken APIs

---

## Example: One-Shot Landing Page

**Request:** "Build a landing page for a SaaS analytics dashboard"

### Phase 1: DESIGN

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "saas analytics dashboard modern professional" --design-system -p "DataViz Pro"
```

### Phase 2: PLAN

- Problem: Users need to see analytics at a glance
- User: Marketing teams
- Success: Clear hero, features, pricing, CTA
- Stack: html-tailwind (single page, no framework needed)

### Phase 3: VALIDATE

- Design system: Generated
- Colors: Primary blue, neutral grays
- Typography: Inter for headings, system-ui for body
- Icons: Heroicons

### Phase 4: BUILD

1. Setup HTML + Tailwind CDN
2. Add Inter font from Google Fonts
3. Build hero section with gradient
4. Features grid with icon cards
5. Pricing table
6. Footer with CTA

### Phase 5: CHECK

Run through pre-delivery checklist. Ship it.

---

## Related Files

- **Design Tool:** `.shared/ui-ux-pro-max/` (search scripts + data)
- **Build Framework:** `goals/build_app.md` (ATLAS methodology)
- **Context:** `context/ui_patterns/` (design references)

---

## Changelog

- 2026-02-03: Initial version — Combined ui-ux-pro-max with ATLAS for one-shot builds
