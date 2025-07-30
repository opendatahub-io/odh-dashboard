# Pre-commit Hook Setup

This repository uses `lint-staged` with Husky to automatically run lint checks on staged files before commits.

## What it does

- ✅ **Runs lint checks only on staged files** (not entire codebase)
- ✅ **Prevents commits with lint errors**
- ✅ **Shows detailed error messages** with file locations
- ✅ **Works for both frontend and backend** code

## Supported file types

- **Frontend**: `.js`, `.ts`, `.jsx`, `.tsx` files in `frontend/` directory
- **Backend**: `.js`, `.ts`, `.json` files in `backend/` directory

## How to use

### Normal workflow (no changes needed)

```bash
git add src/component.tsx
git commit -m "Add new component"
# → Lint checks run automatically
# → Commit succeeds if no errors
```

### If lint errors are found

```bash
git commit -m "My changes"
# → Lint errors displayed
# → Commit is blocked

# Fix the errors and try again
git add .
git commit -m "My changes"
# → Commit succeeds
```

### Quick fixes

```bash
# Auto-fix some lint issues
cd frontend && npm run test:fix
# or
cd backend && npm run test:fix
```

## Configuration

The pre-commit hook is configured in:

- `.husky/pre-commit` - The hook script
- `package.json` - `lint-staged` configuration

## Benefits

- **Faster**: Only lints changed files, not entire codebase
- **Focused**: Shows errors only for files you're actually changing
- **Consistent**: Ensures all commits meet code quality standards
- **Team-friendly**: Prevents lint errors from reaching the repository

## Troubleshooting

If you need to bypass the hook temporarily (not recommended):

```bash
git commit -m "Emergency fix" --no-verify
```

For help with specific lint errors, check the project's ESLint configuration in `frontend/.eslintrc.js` or `backend/.eslintrc`.
