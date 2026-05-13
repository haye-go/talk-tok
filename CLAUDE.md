<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Frontend skills

**Always invoke** when writing or modifying any React code:

- `vercel-react-best-practices` — required for all React work
- `vercel-composition-patterns` — React composition and component patterns

When doing UI/design work, also invoke:
- `frontend-design:frontend-design` — for any new component, layout, or visual change
- `web-design-guidelines` — for web design decisions
- `superpowers:brainstorming` — before any creative/design work
- `ui-ux-pro-max` — UI/UX design expertise
- `shadcn` — when working with shadcn/ui components

## shadcn/ui Components
This project uses shadcn/ui. Before assuming a component doesn't exist, check `src/components/ui/` for existing installs. If a component is missing, install it with `npx shadcn@latest add <component>` — do not use native HTML elements as substitutes. And always use the BaseUI version.