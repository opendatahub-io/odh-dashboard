# Pre-commit Hook Setup

This repository uses `lint-staged` with Husky to automatically run lint checks on staged files before commits.

## What it does

- ✅ **Runs lint checks only on staged files** (not entire codebase)
- ✅ **Prevents commits with lint errors**
- ✅ **Shows enhanced error messages** with clear fix instructions
- ✅ **Works for both frontend and backend** code
- ✅ **Works from any directory** (root, frontend/, backend/)
- ✅ **Provides auto-fix suggestions** when lint fails

## Supported file types

- **Frontend**: `.js`, `.ts`, `.jsx`, `.tsx` files in `frontend/` directory
- **Backend**: `.js`, `.ts`, `.json` files in `backend/` directory

## How to use

### Normal workflow (no changes needed)

```bash
git add src/component.tsx
git commit -m "Add new component"
# → 🔍 Running lint-staged to check staged files...
# → 🎉 All lint checks passed!
# → Commit succeeds
```

### When lint errors are found

```bash
git commit -m "My changes"
# → 🔍 Running lint-staged to check staged files...
# → ✖ 5 problems (4 errors, 1 warning)
# →
# → 💥 Lint checks failed! Here's how to fix the issues:
# →
# → 🔧 Auto-fix many issues:
# →    Frontend: cd frontend && npm run test:fix
# →    Backend:  cd backend && npm run test:fix
# →
# → 🔍 Manual review of errors:
# →    Frontend: cd frontend && npm run test:lint
# →    Backend:  cd backend && npm run test:lint
# →
# → 💡 After fixing, stage your changes and commit again:
# →    git add .
# →    git commit -m "Your commit message"
```

### Recommended fix workflow

```bash
# 1. Auto-fix common issues
cd frontend && npm run test:fix
# or
cd backend && npm run test:fix

# 2. Review any remaining issues
cd frontend && npm run test:lint
# or
cd backend && npm run test:lint

# 3. Fix remaining issues manually, then commit
git add .
git commit -m "Fix lint issues and add feature"
```

## Works from any directory

The pre-commit hook works correctly whether you run `git commit` from:

- Repository root: `git commit -m "message"`
- Frontend directory: `cd frontend && git commit -m "message"`
- Backend directory: `cd backend && git commit -m "message"`

## Configuration

The pre-commit hook is configured in:

- **`.husky/pre-commit`** - The hook script with enhanced error messaging
- **`package.json`** - `lint-staged` configuration using bash path manipulation
- **`package-lock.json`** - `lint-staged` dependency

### lint-staged configuration

```json
"lint-staged": {
  "frontend/**/*.{js,ts,jsx,tsx}": [
    "bash -c 'cd frontend && npx eslint --max-warnings 0 \"${@#frontend/}\"' --"
  ],
  "backend/**/*.{js,ts,json}": [
    "bash -c 'cd backend && npx eslint --max-warnings 0 \"${@#backend/}\"' --"
  ]
}
```

This configuration:

- Uses bash parameter expansion `${@#frontend/}` to handle path conversion
- Runs ESLint from the correct subdirectory with proper config
- Only processes staged files (not entire directories)

## Benefits

- **⚡ Faster**: Only lints changed files, not entire codebase (2-5 seconds vs minutes)
- **🎯 Focused**: Shows errors only for files you're actually changing
- **🛠️ Helpful**: Enhanced error messages with fix instructions
- **🔄 Consistent**: Ensures all commits meet code quality standards
- **👥 Team-friendly**: Prevents lint errors from reaching the repository
- **📍 Location-agnostic**: Works from any directory in the repository

## Error message examples

### Success case

```bash
🔍 Running lint-staged to check staged files...
✔ Running tasks for staged files...
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
🎉 All lint checks passed!
```

### Error case with guidance

```bash
🔍 Running lint-staged to check staged files...
✖ 5 problems (4 errors, 1 warning)

💥 Lint checks failed! Here's how to fix the issues:

🔧 Auto-fix many issues:
   Frontend: cd frontend && npm run test:fix
   Backend:  cd backend && npm run test:fix

🔍 Manual review of errors:
   Frontend: cd frontend && npm run test:lint
   Backend:  cd backend && npm run test:lint

💡 After fixing, stage your changes and commit again:
   git add .
   git commit -m "Your commit message"

⚠️  To bypass this check (not recommended):
   git commit --no-verify
```

## Troubleshooting

### Hook not running?

```bash
# Check if git hooks are configured properly
git config core.hooksPath
# Should output: .husky/_

# Check if hook file exists and is executable
ls -la .husky/pre-commit
# Should show: -rwxr-xr-x ... .husky/pre-commit
```

### lint-staged not found?

```bash
# Install dependencies
npm install
# This should install lint-staged automatically via postinstall
```

### Memory issues with npm run test:fix?

For large codebases, if auto-fix runs out of memory:

```bash
# Fix specific files manually
cd frontend && npx eslint --fix src/specific-file.ts
cd backend && npx eslint --fix src/specific-file.ts
```

### Need to bypass temporarily?

```bash
# For emergencies only (not recommended)
git commit -m "Emergency fix" --no-verify
```

### Different behavior on Windows?

The bash commands should work on Windows with Git Bash. If you encounter issues:

- Ensure you're using Git Bash (not Command Prompt)
- Verify Node.js and npm are in your PATH

## Technical details

### Why lint-staged?

- **Industry standard**: Widely used, well-tested, maintained by the community
- **Automatic file filtering**: Handles path resolution and file type detection
- **Backup & restore**: Automatically handles staging state if linting fails
- **Better performance**: Optimized for large repositories

### Path handling magic

The configuration uses bash parameter expansion to handle monorepo paths:

```bash
# lint-staged passes: "frontend/src/component.tsx"
# ${@#frontend/} converts to: "src/component.tsx"
# Then runs: cd frontend && npx eslint src/component.tsx
```

This ensures ESLint runs with the correct configuration and relative paths.

## Best practices

1. **Fix issues immediately**: Don't bypass the hook unless absolutely necessary
2. **Use auto-fix first**: Run `npm run test:fix` before manual fixes
3. **Understand the errors**: Review what each lint rule is trying to prevent
4. **Keep commits clean**: The hook helps maintain high code quality standards

## Team setup

New team members need zero configuration:

1. Clone repository
2. Run `npm install`
3. Start committing - the hook works automatically!

The pre-commit hook is a **quality gate** that helps maintain consistent, high-quality code across the entire team. 🛡️
