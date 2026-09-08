# Contributing to Moss

Moss is maintained by [@ramzyraz](https://github.com/ramzyraz). This is a public repository, but changes to its branches and official releases are controlled by the owner. Public visibility does not grant push access.

## Suggest a change

Open an issue describing a bug or proposed improvement. Include your macOS version, Mac architecture, Moss version, and steps to reproduce a bug. For visual issues, a screenshot or short recording helps. Remove private information before uploading logs or screenshots. Discuss larger features before investing in a substantial implementation.

## Submit code

1. Fork the repository and create a focused branch in your fork, such as `fix/garden-animation`.
2. Follow the setup instructions in the README. Keep changes limited to one problem and preserve local progress compatibility.
3. Run `npm test`. For window, rendering, IPC, or native bridge changes, also run `npm run smoke` on macOS and manually check the affected behavior. Explain any checks you could not run.
4. Open a pull request targeting `main`. Describe the problem, resulting behavior, and validation. Include before/after screenshots for visual changes.
5. Wait for the owner's review. A pull request is a proposal; only the owner decides whether and when it is merged.

Do not request direct push access to contribute. Do not commit app bundles, `release/`, `dist/`, `node_modules/`, personal progress files, credentials, or generated test artifacts.

## Commit messages

Use a short, descriptive subject with an action, for example:

- `fix: hide floating Moss when controls open`
- `feat: animate watering during focus`
- `docs: clarify macOS installation`

Use `fix`, `feat`, `docs`, `refactor`, `test`, or `chore` where useful. Explain non-obvious reasons in the body. Avoid unrelated formatting changes and commits such as “updates” that do not describe the change. The owner may squash a pull request into one commit when merging.

## Ownership and releases

`.github/CODEOWNERS` assigns review ownership to @ramzyraz; it does not itself restrict pushes. GitHub repository permissions and the active owner-only branch ruleset enforce branch access. Contributors work in forks. Only repository administrators can bypass that ruleset; currently the owner is the sole administrator/collaborator.

Official releases are published by the owner using [RELEASING.md](RELEASING.md). Do not publish fork builds as official Moss releases. This guide does not grant a software license or change third-party license terms.
