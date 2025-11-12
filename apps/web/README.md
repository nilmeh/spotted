Web App (Next.js)
=================

Bootstrap the web app:
----------------------
Run:

1) `npx create-next-app@latest apps/web`
   - Typescript: Yes
   - ESLint: Yes
   - Tailwind: Yes (recommended)
   - Src dir: Yes
   - App router: Yes
   - Import alias: @/*

2) `cd apps/web && npm run dev`

Notes
-----
- Keep UI minimal: unified feed with toggle for Events/People.
- Use a single card component with variants (event/person).
- Add swipe actions (keyboard/mouse/touch) and the same affordances for both.


