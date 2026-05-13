<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Agent Workflow

Always use these skills when working on frontend, UI, UX, navigation, interaction, layout, component, or visual design tasks:

- `frontend-ui-component-generation`
- `ui-ux-pro-max`
- `shadcn` skill for component selection, composition, and shadcn/Base UI patterns

Always use these skills when writing, reviewing, or refactoring code:

- `karpathy-guidelines`
- `vercel-react-best-practices` when writing, reviewing, or refactoring React code
- `vercel-composition-patterns` when designing, reviewing, or refactoring React component architecture and reusable APIs

Always use these skills when brainstorming, shaping product behavior, writing specs, or preparing implementation plans:

- `brainstorming`

Use the `imagegen` skill when the frontend task needs raster visual assets, generated imagery, UI mockups, or bitmap edits. Do not force `imagegen` for normal code-native UI work.

## Instructor Dashboard Optimization Workflow

When optimizing instructor dashboard components, use this loop for each component:

1. Start with a short discussion of the observed UI or product issue.
2. Explain the reasoning and tradeoffs behind the proposed direction.
3. Write a concrete implementation plan and get alignment before changing code.
4. Execute the approved plan, keeping edits scoped to the component and its direct data contract.
