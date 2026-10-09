# Protect main

The CI workflow runs lint, all `*.test.mjs` suites in `scripts/` and `tests/`,
the production build, and account integration tests against the production server
and a disposable MongoDB service. No repository secrets are needed.
It runs on pull requests targeting `main`, pushes to `main` (including merges),
and merge queue groups. A failed command fails its check.

**The workflow alone does not block merges or direct pushes.** A repository
administrator must enable branch protection on GitHub:

1. Push this workflow on a feature branch and open a pull request into `main`.
   Let CI run so GitHub can discover its check names.
2. Open https://github.com/Awsome-obedeh/aba-craft/settings/branches and add
   a branch protection rule with the branch name pattern `main` (or edit the
   existing rule without removing its other protections).
3. Enable **Require a pull request before merging** to prevent direct pushes.
4. Enable **Require status checks to pass before merging** and select all three
   checks, choosing GitHub Actions as their source where available:
   - `Lint`
   - `Unit tests`
   - `Build and integration tests`
5. Enable **Require branches to be up to date before merging**.
6. Enable **Do not allow bypassing the above settings**, including administrators.
   Do not add any actors allowed to bypass required pull requests.
7. Leave force pushes and branch deletion disabled, then save the rule.

If using a repository ruleset instead, target `main`, set enforcement to Active,
use the same required pull request and status checks, block force pushes and
deletions, and leave the bypass list empty. Protection availability depends on
the repository visibility and GitHub plan.

Push-triggered CI runs after a push; the required pull request rule is what
prevents direct pushes. Existing test, lint, or build failures must be fixed
before a protected merge. Do not mark failed checks optional to bypass them.

Local checks (Node.js 24): `npm ci`, `npm run lint`, `npm test`, `npm run build`.
See `ACCOUNT_SETTINGS.md` for local integration test setup.

Reference: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
