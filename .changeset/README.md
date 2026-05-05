# Changesets

This directory contains changeset files that track version bumps and changelog entries for the checkout SDK.

## Adding a Changeset

When you make changes that should be released, add a changeset:

```bash
npx changeset add
```

This will prompt you to:
1. Select which packages changed (choose `@swiftpayfi/checkout-sdk`)
2. Select the bump type:
   - `patch` — Bug fixes, internal improvements (0.1.0 → 0.1.1)
   - `minor` — New features, backwards compatible (0.1.0 → 0.2.0)
   - `major` — Breaking changes (0.1.0 → 1.0.0)
3. Write a summary of the change

A `.md` file will be created automatically in this directory.

## Release Process

### On `main` branch (Production Release)
When the "Version Packages" PR is merged:
1. Changelog is generated
2. Version bumped in `package.json`
3. Published to npm as `@swiftpayfi/checkout-sdk@X.Y.Z` (latest)
4. IIFE uploaded to S3 as `checkout@X.Y.Z/` and `checkout@latest/`

### On `dev` branch (Beta Release)
When changes are pushed with changesets:
1. Changelog is generated with beta tag
2. Version bumped with beta suffix
3. Published to npm as `@swiftpayfi/checkout-sdk@X.Y.Z-beta.N`
4. IIFE uploaded to S3 as `checkout@X.Y.Z-beta.N/` and `checkout@beta/`

## Workflow

1. **Create feature branch** from `dev` or `main`
2. **Make changes** to the SDK
3. **Add changeset**: `npx changeset add`
4. **Commit changeset**: `git add .changeset && git commit -m "docs: changeset for feature X"`
5. **Open PR** targeting `dev` or `main`
6. **Merge PR** — CI runs
   - On `main`: Opens "Version Packages" PR
   - On `dev`: Publishes beta release immediately
7. **Review & merge Version PR** (main only) to publish production release

## Notes

- Changesets are committed to the repository (`.md` files in this directory)
- Multiple changesets can accumulate before a release
- Use `npx changeset status` to see pending changes
- Use `npx changeset version` to dry-run version bumping
