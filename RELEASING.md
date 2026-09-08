# Publishing Moss

Official releases are owner-managed. Publish from a clean commit on `main` after reviewing its contents. Never move an existing release tag to different source code.

1. Update the version in `package.json`, the matching entries in `package-lock.json`, and the package command's versioned output directory. Update the README and release notes.
2. Run `npm ci`, `npm test`, and `npm run package` on an Apple Silicon Mac with the required Node headers and Apple Command Line Tools.
3. Run the packaged executable with `--smoke-test` using its versioned path. This uses an isolated profile. Manually check the garden, pause/resume, compact/full controls, and desktop visibility.
4. Commit and push the reviewed source. Create a GitHub release targeting that exact commit with a matching `v`-prefixed version tag.
5. Zip the `.app` with macOS `ditto -c -k --sequesterRsrc --keepParent` to preserve the app bundle. Generate a SHA-256 checksum with `shasum -a 256` and upload both files.
6. Verify the published tag points to the intended commit, the asset names and sizes match, and the uploaded checksum matches the local ZIP.

Current builds target macOS Apple Silicon only and are unsigned and not notarized. State this prominently in release notes. Do not describe them as signed, notarized, or tested on Intel Macs, Windows, or Linux. A signed distribution will need a separate owner-controlled Developer ID signing/notarization setup; never commit signing credentials.
