# Update Documentation

When asked to update documentation after code changes, read and follow the full workflow in
`.claude/skills/docs-update/SKILL.md`.

## Quick Reference

- **No arguments**: defaults to uncommitted changes and new untracked files (`HEAD`).
- **Git reference** (`HEAD~1`, `abc1234`, `abc1234..def5678`): diff-based update for those commits.
- **`--no-cache`**: skip git diff entirely; rewrite every section of all targeted docs from current
  source. Add a scope filter to limit the refresh (e.g., `--no-cache backend`,
  `--no-cache packages/model-registry`, `--no-cache frontend/docs/pipelines.md`).
- **Diff mode** (default): update only affected sections — do not rewrite unaffected content.
- Show a summary of proposed changes and ask for confirmation before writing any file.
- Verify any `BOOKMARKS.md` links to updated files still resolve correctly.
