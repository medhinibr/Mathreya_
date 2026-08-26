# Mathreya Task Instructions

## 1. Purpose

This is the short operational instruction for AI coding agents working on Mathreya.

Before any task:

1. Read `context.md` once.
2. Read this file.
3. Identify the exact requested task.
4. Inspect only relevant existing files.
5. Reuse existing Mathreya architecture and UI patterns.
6. Make the smallest clean change that fully solves the task.
7. Preserve existing working features.
8. Keep TypeScript type-safe.
9. Preserve existing Mathreya visual style and responsive behaviour.
10. Run verification when practical.

Do not repeatedly ask for the full project context when `context.md` already contains it.

---

# 2. Core Engineering Rules

Always:

- Prefer existing project patterns over new architecture.
- Keep changes task-specific.
- Preserve existing functionality.
- Keep mobile + desktop responsive.
- Keep TypeScript strict and type-safe.
- Use existing components, utilities, icons, animations and styles where possible.
- Fix errors caused by your changes.
- Avoid unnecessary dependencies.

Never:

- Rewrite the whole project for a small task.
- Refactor unrelated files.
- Redesign the UI unless explicitly requested.
- Remove working features unless explicitly requested.
- Add libraries without a real need.
- Create duplicate systems when an existing system already exists.
- Use `any` to hide TypeScript problems.
- Use fake APIs or fake success states.
- Claim a real booking/payment/medical action happened when it did not.
- Modify Flutter for a React-only task.
- Change backend architecture for a UI-only task.

---

# 3. Authentication — Appwrite

Mathreya uses Appwrite Cloud for authentication.

Existing configuration:

```text
VITE_APPWRITE_ENDPOINT
VITE_APPWRITE_PROJECT_ID