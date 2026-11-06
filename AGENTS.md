# Agent guide

Read this before changing anything in the repo. The README has the human-facing docs; this file holds the rules that are easy to get wrong.

## Tooling

- Package manager is pnpm 12 only. Run tools with `pnpm exec <tool>`, never with `npx`, and add dependencies with `pnpm add`. Root dev dependencies take `-w`, package dependencies take `--filter <package>`.
- Node 22. Do not use APIs newer than Node 22 in published code.
- Packages are ESM (`"type": "module"`) compiled with `module: nodenext`. Relative imports inside a package need the `.js` extension, as in `import { x } from './x.js'`.
- Never run `tsc --init` anywhere in the repo. It overwrites `tsconfig.json`. The root `tsconfig.json` is a solution file with `files: []` and a `references` list, and the compiler options live in `tsconfig.base.json`.
- Do not add Nx, Turborepo, Lerna or semantic-release. Releases are Changesets, task running is pnpm.

## Checks

Run these before finishing a change. They are the same checks CI runs.

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm format:check
```

`pnpm format` and `pnpm lint:fix` fix formatting and auto-fixable lint. Commit hooks run lint-staged and commitlint, so a commit that fails them is rejected.

## Conventions

- Commit messages follow conventional commits with the package as scope: `fix(registry-sdk): handle empty response`. Types that trigger nothing in release tooling are still linted.
- Every change to a published package needs a changeset. Run `pnpm changeset`, or write `.changeset/<slug>.md` by hand:

    ```md
    ---
    'ilc-registry-sdk': minor
    ---

    One or two sentences a consumer of the package would want to read.
    ```

    Use `patch` for fixes, `minor` for additions, `major` for breaking changes. Docs, CI and test-only changes need no changeset.

- Do not edit package versions or `CHANGELOG.md` files by hand. The release workflow writes them.
- Tests live next to the code as `*.spec.ts` and use Vitest globals (`describe`, `it`, `expect`, `vi`). No imports from `vitest` are needed for those. Use `vi.fn` and `vi.spyOn` for mocks.
- Formatting is Prettier with the repo config: 4 spaces, single quotes, trailing commas, 120 columns. Do not hand-format.
- Lint is ESLint with typescript-eslint. Fix findings in code rather than adding disable comments. A disable comment needs a reason on the same line.

## Layout of a package

```
packages/<name>/
  package.json          exports map pointing at dist, files: ["dist"], publishConfig.access: public
  tsconfig.json         solution file referencing the two below
  tsconfig.lib.json     composite, src only, emits to dist
  tsconfig.test.json    noEmit, src plus tests, types node and vitest/globals
  vitest.config.ts      defineProject with the package name
  src/index.ts          public entry point
  README.md             shown on npm
```

To add a package, copy `packages/ilc-registry-sdk`, rename, add it to the `references` list in the root `tsconfig.json`, and run `pnpm install`.

## Dependencies

- `pnpm-workspace.yaml` refuses packages published less than two weeks ago and packages whose provenance got worse. If `pnpm add` or `pnpm install` fails for that reason, prefer an older version. Add an exclusion only when there is no alternative, with a comment saying why.
- Runtime dependencies of a published package go in `dependencies` of that package. Tooling goes in the root `devDependencies`.
- A package that uses another package from this repo depends on it with `workspace:^`.

## GitHub Actions

Workflows pin every action to a commit SHA with the version in a trailing comment. When updating one, change both.
