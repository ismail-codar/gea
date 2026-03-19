# Gea Repository Guide

## Scope

These instructions apply to the full repository.

## Repo Shape

This repo is an npm workspaces monorepo.

- `packages/gea`: `@geajs/core`
- `packages/vite-plugin-gea`: `@geajs/vite-plugin`
- `packages/gea-ui`: `@geajs/ui`
- `packages/gea-mobile`: `@geajs/mobile`
- `packages/create-gea`: `create-gea`
- `packages/gea-tools`: `gea-tools`
- `docs`: VitePress documentation
- `examples`: sample apps
- `skills`: repo-local Codex skills for Gea and benchmark workflows

## Default Workflow

- Install with `npm install`.
- Build all packages with `npm run build`.
- Run tests with `npm run test`.
- Lint with `npm run lint`.
- Format with `npm run format`.
- Build docs with `npm run docs:build`.

Prefer targeted workspace commands when a task is isolated to one package.

## Skills

Use the repo-local skills when the task matches them:

- `skills/gea-framework`: building or refactoring Gea apps, stores, components, router usage, or JSX patterns
- `skills/gea-ui-components`: using `@geajs/ui` components, theming, forms, dialogs, tabs, toast, or other UI widgets
- `skills/js-framework-benchmark-report`: rebuilding or updating the local js-framework-benchmark HTML report

Read only the relevant skill and its referenced material.

## Gea Conventions

- Gea stores are singleton instances. Export `new MyStore()`, not the class.
- Favor direct property mutation on stores and component state. Gea reactivity tracks those writes automatically.
- Use getters for derived state.
- Use class components for local UI state and lifecycle needs.
- Use function components for stateless presentational UI.

## Benchmark Report Rule

When updating the js-framework-benchmark report, do not run the upstream result builder directly for normal repo work. Use:

```bash
node scripts/update-js-framework-benchmark-report.mjs
```

Do not pass `--framework` when regenerating the normal shared report. The curated framework list comes from `benchmark-report.config.json`. Passing `--framework` narrows the report and is only correct for an explicitly requested one-off view.

If you run a narrowed report such as `--framework keyed/gea`, rerun the default command immediately afterward to restore the normal multi-framework report.

## Changesets

This repo uses `@changesets/cli` for versioning and publishing.

- Do not hand-edit package versions.
- Add a changeset for changes that affect published package output.
- The linked packages `@geajs/core` and `@geajs/vite-plugin` must receive the same minor or major bump level.
- `gea-tools` is ignored by changesets.
- Push commits before `changeset version` so the GitHub changelog plugin can resolve metadata.

Release sequence:

```bash
npx changeset
git push
GITHUB_TOKEN=$(gh auth token) npx changeset version
npx changeset publish
git push --follow-tags
./scripts/create-github-releases.sh
```
