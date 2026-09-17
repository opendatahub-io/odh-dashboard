# PatternFly React Breaking Changes Report

**Generated:** 2026-09-17  
**Scan path:** `frontend/src`, `packages`, `distributions`  
**Version range:** PatternFly React `6.5.1` → `6.6.1`

## Executive summary

The PF React migration dry run found no codemod-detected breaking API changes for PR #9500. No source files were modified.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |

## Findings

No findings.

## Validation

```bash
npx @patternfly/pf-codemods@latest --v6 --no-cache --format json frontend/src packages distributions
```

Result: exit code 0; no source changes.

## Out of scope

- PatternFly CSS classes and custom properties
- `@patternfly/patternfly`
- `@patternfly/chatbot`

## References

- [PatternFly upgrade guide](https://www.patternfly.org/get-started/upgrade)
- [pf-codemods](https://github.com/patternfly/pf-codemods)
