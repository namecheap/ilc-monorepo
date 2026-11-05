# ilc-packages

Libraries, SDKs and helpers for [ILC](https://github.com/namecheap/ilc). Each package is versioned and published to npm on its own.

| Package                                         | Description                      | npm                                                                                                     |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`ilc-registry-sdk`](packages/ilc-registry-sdk) | Client for the ILC registry API. | [![npm](https://img.shields.io/npm/v/ilc-registry-sdk)](https://www.npmjs.com/package/ilc-registry-sdk) |

## Quick start

Node 22 and pnpm 12 are required. pnpm downloads itself on first use from the `packageManager` field, so only Node has to be installed.

```sh
pnpm install
```

Installs every package and sets up the git hooks.

```sh
pnpm build
```

Compiles every package to its `dist` folder.

```sh
pnpm test
```

Runs the tests of every package. `pnpm test:watch` keeps them running while you edit, and `pnpm test:coverage` adds a coverage report under `coverage/`.

```sh
pnpm lint
pnpm typecheck
pnpm format:check
```

Run the checks that CI runs. `pnpm lint:fix` and `pnpm format` fix what they can.

To work on one package only, run its scripts through a filter:

```sh
pnpm --filter ilc-registry-sdk test
```

## Making a change

1. Branch from `master` and make the change.
2. If a published package changed, add a changeset:

    ```sh
    pnpm changeset
    ```

    It asks which packages changed and whether the change is a patch, a minor or a major, and writes a short note that becomes the changelog entry. Commit the file it creates under `.changeset/` with your change.

3. Commit with a [conventional commit](https://www.conventionalcommits.org/) message, for example `feat(registry-sdk): add listApps`. The commit hook rejects other formats.
4. Open a pull request. CI runs lint, typecheck, build, tests and the format check.

Changes that touch no published code, such as docs or CI, need no changeset.

## Releasing

Releases are cut from `master` by the release workflow.

1. After every merge to `master`, the workflow collects the pending changesets into a pull request named "chore: version packages". The pull request bumps the versions, updates each package's `CHANGELOG.md` and removes the consumed changesets.
2. Merging that pull request publishes the bumped packages to npm and creates one GitHub release per package, tagged `<package>@<version>`.

Packages without a changeset are left untouched, so a release of one package never bumps the others.

### Publishing setup

The release workflow publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored. Each package needs this done once on npmjs.com:

1. Publish the first version by hand from a logged-in machine, because a trusted publisher can only be configured on a package that already exists:

    ```sh
    pnpm --filter <package> publish
    ```

2. On the package page, under Settings, add a trusted publisher of type GitHub Actions with organization `namecheap`, repository `ilc-packages`, workflow `release.yml` and environment `npm_publish`.

From then on the workflow publishes that package with provenance attestations.

## Adding a package

1. Create `packages/<name>` with a `package.json`, `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.test.json`, `vitest.config.ts`, `src/index.ts` and a `README.md`. Copy them from `packages/ilc-registry-sdk` and change the names.
2. Add `{ "path": "./packages/<name>" }` to the `references` list in the root `tsconfig.json`.
3. Run `pnpm install` so the workspace picks the package up.
4. Add a changeset for the first release and open a pull request.

A package that depends on another package in this repo declares it with the `workspace:` protocol, for example `"ilc-registry-sdk": "workspace:^"`. The version is replaced with the real one on publish.

## Repository layout

```
packages/<name>/         one npm package each
  src/                   sources and *.spec.ts tests next to them
  tsconfig.lib.json      what gets compiled to dist
  tsconfig.test.json     sources plus tests, for typecheck and the editor
.changeset/              pending release notes
.github/workflows/       ci.yml for pull requests, release.yml for master
tsconfig.base.json       compiler options shared by every package
eslint.config.js         one lint config for the whole repo
vitest.config.ts         runs every package's tests as one project each
```

## Troubleshooting

**`npx` fails with `EBADDEVENGINES`.** The repo pins pnpm, so npm refuses to run. Use `pnpm exec <tool>` for an installed tool and `pnpm dlx <package>` for one that is not.

**`pnpm install` fails with a trust downgrade or release age error.** The workspace refuses packages published less than two weeks ago and packages that dropped provenance. Wait, pick an older version, or add an entry to `minimumReleaseAgeExclude` or `trustPolicyExclude` in `pnpm-workspace.yaml` with a comment saying why.

**`tsc -b` reports a missing `tsconfig.json`.** The root `tsconfig.json` references every package. Check that each path in its `references` list exists.

**`.js` files appear next to the sources.** Something compiled with a config that has no `files` or `include` limit. Delete the stray files with `git clean -n packages` to preview and `git clean -f packages` to remove, and never run `tsc --init` inside the repo, since it overwrites the root `tsconfig.json`.

**The "chore: version packages" pull request shows no CI checks.** The release workflow authenticates as the [namecheap-i-app](https://github.com/apps/namecheap-i-app) GitHub App, through the `APP_CLIENT_ID` variable and the `APP_PRIVATE_KEY` secret. Check that both are set and that the App is installed on the repository. Pull requests opened with the default workflow token do not trigger other workflows.
