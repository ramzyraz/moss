# Publishing Moss

Releases run automatically when the owner pushes a new stable version tag such as `v0.2.2`. Ordinary commits and pull requests do not publish releases. The `v*` tag ruleset restricts tag creation, updates, and deletion to repository administrators; the owner is currently the sole administrator. Never move an existing release tag.

## Publish a version

From a clean checkout of the latest `main`:

```sh
npm version patch --no-git-tag-version
# Review the version change and update release documentation if needed.
npm test
git add package.json package-lock.json
git commit -m "chore: prepare next release"
git push origin main
moss_tag="v$(node -p 'require("./package.json").version')"
git tag "$moss_tag"
git push origin "$moss_tag"
```

Use `minor` instead of `patch` for a feature release, or an explicit version when appropriate. Review and commit any other release documentation separately before tagging. The package output directory is derived from the package version automatically.

[Release Moss in Actions](https://github.com/ramzyraz/moss/actions/workflows/release.yml) checks that the tag matches both package files and points to a commit contained in `main`. On a standard Apple Silicon macOS runner it installs locked dependencies, runs tests, packages the app, runs the packaged native smoke test, creates a ZIP and checksum, and publishes a GitHub release with generated change notes plus `.github/release-notes.md`.

No personal access token is needed: publication uses the workflow's GitHub token. It cannot change protected branches or create protected release tags; the owner creates the tag first. The workflow refuses mismatched versions and does not overwrite an existing release.

## Test automation without publishing

Open Actions → Release Moss → Run workflow → select `main`. This runs the same build and validation but skips publishing. The temporary ZIP is discarded with the runner; no retained Actions artifacts are uploaded. Check the run summary and logs.

## Costs and distribution

Standard GitHub-hosted runner usage is free for public repositories, including the `macos-15` runner used here. Larger runners and private-repository billing differ. This workflow uses no larger runners or paid services.

Builds remain unsigned and not notarized. Apple Developer ID signing/notarization requires a separate owner-controlled setup. Never commit signing credentials. Manually check the garden, pause/resume, compact/full controls, and desktop visibility before a release intended for others; automated native checks are not a substitute for all manual behavior checks.
