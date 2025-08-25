# Modular Architecture Quality Gates

This document explains the Quality Gates system for the ODH Dashboard's modular architecture. The system helps ensure consistent quality standards across all modules while remaining flexible enough to accommodate different module types and development stages. 
- Note the standards are modelled on the Modular Architecture Golden Paths (currently in draft).

## Overview

The Quality Gates system automatically assesses modules when changes are made, checking for:
- Testing implementation
- Module structure validation
- BFF (Backend-For-Frontend) capabilities

## How It Works

### Module Detection

The system identifies valid modules by checking for either:
- `module-federation` in package.json (indicates BFF/API capabilities)
- `exports` of "./extensions" (indicates Modular Architecture usage)

Example of a valid module:
```json
{
  "module-federation": {
    "name": "myModule",
    // ... other module federation config
  },
  "exports": {
    "./extensions": "./extensions.ts"
  }
}
```

### Quality Checks

Currently enabled checks:

1. **Unit Tests**
   - Looks for tests in `__tests__` directories (immediate children or nested)
   - Matches files with `.test.*` or `.spec.*` patterns
   - Excludes E2E and mocked tests

2. **E2E Tests**
   - Checks for Cypress E2E tests in the global E2E structure
   - Tests must be in `frontend/src/__tests__/cypress/cypress/tests/e2e/`
   - Module-specific tests should be in a directory matching the module name

### Disabled Checks (Coming Soon)

These checks are currently disabled but will be enabled as common functionality becomes available:

3. **Mock Tests**
   - Will be enabled once standardized mocking approach is defined
   - Expected location: `cypress/tests/mocked/`

4. **Contract Testing**
   - Will be enabled once contract testing is implemented
   - For API contract validation

5. **API Functional Testing**
   - Only relevant for modules with BFF capabilities
   - Will be enabled once common API testing functions are available
   - Skipped for UI-only modules

6. **API Performance Testing**
   - Only relevant for modules with BFF capabilities
   - Will be enabled once common performance testing functions are available
   - Skipped for UI-only modules

7. **Bundle Size Monitoring**
   - Will be enabled once monitoring tools are implemented
   - For tracking frontend bundle sizes

## Configuration

### Silent Mode

You can enable silent mode for modules that are in early development or don't need detailed reporting. Create a `.quality-gates-config.yml` file in your module's root:

```yaml
# .quality-gates-config.yml
silent_notifications: true
```

When silent mode is enabled:
- The module is still assessed
- Results are not included in PR comments
- Results are still available in workflow artifacts

### Future Configuration Options

The following options will be available in future versions:

```yaml
# .quality-gates-config.yml
silent_notifications: false
test_coverage_threshold: 80
performance_threshold: 2000ms
bundle_size_limit: 500KB
custom_checks:
  - name: "Custom Check"
    enabled: true
```

## Quality Thresholds

- **RHOAI Quality Threshold**: 75% of enabled checks must pass
- Currently, with 2 enabled checks:
  - ✅ PASSED = 2/2 checks implemented
  - ❌ NEEDS IMPROVEMENT = 0-1/2 checks implemented

## Understanding Results

### Check Status Indicators
- ✅ PRESENT - Check passed
- ❌ MISSING - Check failed
- 🔕 DISABLED - Check not currently active
- 🚫 SKIPPED - Check not applicable (e.g., API checks for UI-only modules)

### BFF Detection
- Modules with `module-federation` are identified as having BFF capabilities
- API-specific checks are marked as "SKIPPED" for modules without BFF
- This prevents noise from irrelevant checks in UI-only modules
