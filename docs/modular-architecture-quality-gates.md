# Modular Architecture Quality Gates

This document outlines the automated quality gates for the ODH Dashboard modular architecture, designed to enforce standards while being practical for teams integrating through the BFF into ODH/RHOAI.

## Overview

We have **three focused quality gates** that automatically run on PRs affecting `frontend/packages/**`:

1. **Code Quality Gate** *(Hard Requirement)* - Ensures modular architecture compliance
2. **Deployment Quality Gate** *(Assessment & Guidance)* - Validates deployment readiness for ODH/RHOAI integration
3. **Application Quality Gate** *(Assessment & Guidance)* - Evaluates testing maturity and provides recommendations

## Benefits

### For Platform Teams:
- ✅ **Automatic enforcement** of modular architecture standards
- ✅ **Clear ODH vs RHOAI guidance** - different quality bars for different audiences
- ✅ **RHOAI quality protection** - 75% test coverage requirement prevents low-quality enterprise releases
- ✅ **Codecov integration** maintains coverage tracking
- ✅ **Educational feedback** guides teams toward better practices

### For Development Teams:
- ✅ **Clear requirements** - know exactly what's expected for each platform
- ✅ **Gradual adoption** - can start in ODH, improve quality for RHOAI
- ✅ **Practical feedback** - specific instructions for RHOAI readiness
- ✅ **Existing patterns** - follow proven implementations (Model Registry)

### For the Architecture:
- ✅ **Quality differentiation** - experimental features in ODH, enterprise-grade in RHOAI
- ✅ **Scalable standards** - works for any number of teams/modules
- ✅ **Enterprise protection** - RHOAI maintains high quality standards
- ✅ **Upstream enablement** - external contributors get clear guidance for both platforms

### For QE/Product Teams:
- ✅ **Enterprise quality assurance** - RHOAI modules must meet 75% test coverage
- ✅ **Risk mitigation** - API and UI testing requirements prevent production issues
- ✅ **Clear metrics** - quantifiable quality standards across platforms
- ✅ **Automated assessment** - no manual quality reviews needed

This approach balances **innovation velocity** (ODH) with **enterprise quality** (RHOAI), ensuring the right quality standards for each audience.

## Silencing Quality Gate Notifications for RHOAI Modules 🔕

Once your module is promoted to RHOAI production, the constant quality gate notifications become unnecessary noise. You can silence quality gate notifications for RHOAI modules to speed up PRs and reduce clutter.

### How to Silence Quality Gate Notifications

Add your module to `.quality-gates-config.yml`:
```yaml
modules:
  your-module-name:
    status: silent
    reason: "Module is in RHOAI production - reduce notification noise"
    rhoai_promotion_date: "2024-03-15"
```

### When to Silence Quality Gate Notifications

**Recommended for modules that are:**
- ✅ **In RHOAI production** - Already proven to meet enterprise standards
- ✅ **Stable and mature** - No longer under active quality improvement

**Keep quality gate notifications active for modules that are:**
- 🔍 **Still improving** - Need guidance and quality feedback
- 🔍 **Not yet in RHOAI** - Quality standards still being established

### Example Output

**Module with Notifications Silenced:**
```
🔕 Quality Gate Notifications SILENCED for model-registry
📋 Reason: Module is in RHOAI production

ℹ️  Quality checks may still run in background for metrics
ℹ️  To restore notifications, update .quality-gates-config.yml

⏱️ Total runtime: ~15 seconds (vs 3-4 minutes with full notifications)
```

**Module with Notifications Active:**
```
🔍 Running quality gates with full notifications for llama-stack-modular-ui

[Full quality gate analysis and notifications shown...]
```

### Re-enabling Quality Gate Notifications

To restore quality gate notifications, remove the module entry from `.quality-gates-config.yml`.

This simple approach ensures **quality gate notifications help where needed** and **stay silent for proven modules**.

## Quality Gate 1: Code Quality Gate ✅⚠️

**Purpose**: Enforce modular architecture standards from the documentation  
**Status**: **Module deployment control** - Determines if module is enabled or toggled off in deployment

### What it checks:

#### Modular Architecture Compliance
- ✅ `mod-arch-shared` dependency is present
- ✅ `ModularArchContextProvider` usage in entry point (bootstrap.tsx/index.tsx)
- ✅ Required PatternFly dependencies (`@patternfly/react-core`, `@patternfly/react-icons`, `react`, `react-dom`)
- ✅ BFF structure compliance (if BFF exists): `go.mod`, `Makefile`, `cmd/` directory

#### Code Quality Standards
- ✅ TypeScript compilation (`npm run test:type-check`)
- ✅ ESLint validation (`npm run test:lint`) 
- ✅ Build verification (`npm run build`)
- ✅ Go formatting and build (if BFF exists)

### Example Output:

**Model Registry (Quality Gate PASSED - Module ENABLED):**
```
🔍 Checking modular architecture compliance for: model-registry
✅ mod-arch-shared dependency - FOUND (v0.1.8)
✅ ModularArchContextProvider usage - IMPLEMENTED  
✅ PatternFly dependencies - FOUND
✅ BFF structure compliant

✅ Code Quality Gate PASSED - Module can be ENABLED in deployment!
📋 Status: Module appears in federation-configmap.yaml
```

**Llama Stack (Quality Gate FAILED - Module TOGGLED OFF):**
```  
🔍 Checking modular architecture compliance for: llama-stack-modular-ui
❌ mod-arch-shared dependency - MISSING
✅ ModularArchContextProvider usage - IMPLEMENTED
✅ PatternFly dependencies - FOUND  
✅ BFF structure compliant

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
🚨                                                        🚨
🚨    ⛔ DO NOT ENABLE THIS MODULE IN DEPLOYMENT ⛔     🚨
🚨                                                        🚨
🚨         CODE QUALITY GATE FAILED - MODULE            🚨
🚨         DOES NOT MEET ARCHITECTURE STANDARDS         🚨
🚨                                                        🚨
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

❌ Code Quality Gate FAILED - Module must be TOGGLED OFF

🚫 PLATFORM TEAM ACTION REQUIRED:
   ❌ DO NOT add this module to federation-configmap.yaml
   ❌ DO NOT add container to deployment.yaml
   ❌ DO NOT add image to kustomization.yaml

🛠️  DEVELOPMENT TEAM - Fix these issues to enable module:
   ❌ Add mod-arch-shared dependency
   ❌ Ensure ModularArchContextProvider usage
   ❌ Fix any missing architectural requirements

✅ PR can still merge - but module MUST remain disabled until fixed
```

## Quality Gate 2: Deployment Quality Gate 🚀⚠️

**Purpose**: Validate deployment readiness for ODH/RHOAI integration based on [Model Registry enablement patterns (PR #4540)](https://github.com/opendatahub-io/odh-dashboard/pull/4540)
**Status**: **Assessment only** - Provides guidance for ODH deployment readiness
**Current State**: Model Registry ✅ ODH (Enabled) | ⏳ RHOAI (Planned)

### What it evaluates:

Based on real ODH integration requirements from the Model Registry deployment:

#### Deployment Readiness Checks:
1. **Dockerfile** - Container deployment configuration
2. **Module Federation** - Federated deployment setup
3. **Production Build** - ODH/RHOAI manifest compatibility
4. **Health Check Endpoint** - Kubernetes readiness/liveness probes

### Example Output:
```
🚀 Assessing deployment readiness for: model-registry
Based on Model Registry ODH enablement patterns (PR #4540)

✅ Dockerfile - PRESENT
   ✅ Multi-stage build detected (Node.js + Go)
   ✅ Non-root user configuration found
   ✅ Port exposure documented

✅ Module Federation Config - PRESENT
   ✅ Remote entry configured
   ✅ API proxy configuration found
   ✅ Authorization setting configured

✅ Production Build Support - PRESENT
✅ Health Check Endpoint - PRESENT

📊 Deployment Readiness Summary:
   Ready: 4/4 checks (100%)

✅ Deployment Quality Gate: HIGH READINESS (100%)
   Ready for ODH/RHOAI integration!
```

### Readiness Levels:
- **< 50%**: LOW READINESS - Not ready for ODH/RHOAI deployment
- **50-74%**: MODERATE READINESS - Good foundation, complete remaining items
- **≥ 75%**: HIGH READINESS - Ready for ODH/RHOAI integration!

### Container Security Analysis:
- ✅ **Distroless/Alpine base images** - Enhanced security
- ✅ **Multi-stage optimization** - Reduced attack surface
- ✅ **Port documentation** - Clear deployment requirements
- ✅ **Health check instructions** - Container health monitoring

## Quality Gate 3: Application Quality Gate 📊⚠️

**Purpose**: Assess testing maturity across 7 QE categories and provide **ODH vs RHOAI enablement guidance**

**Status**: Assessment only - provides recommendations for different deployment targets

**ODH vs RHOAI Standards**:
- **ODH (Upstream)**: ✅ Ready at any maturity level (experimental features welcome)
- **RHOAI (Enterprise)**: ❌ Requires **75% coverage + API/UI testing standards**

#### Checks Performed:
1. **Unit Testing** (Jest/Go test coverage)
2. **Mock Testing** (Cypress with intercepts/mocking)  
3. **Integration Testing** (Comprehensive E2E workflows like Model Registry)
4. **API Functional Testing** (BFF endpoint tests)
5. **API Contract Testing** (Pact consumer-driven contracts)
6. **API Performance Testing** (K6/JMeter/Taurus load testing)
7. **Bundle Size Monitoring** (size-limit/bundlewatch budget enforcement)

#### RHOAI Enablement Requirements:
- **Overall Coverage**: ≥75% (5-6 categories implemented)
- **API Testing**: 2+ of 3 categories (BFF tests, Performance, Contract)
- **UI Testing**: 2+ of 3 categories (Unit, E2E workflows, Mock)

#### Example Output:

**Model Registry (RHOAI Ready):**
```
🧪 Assessing testing maturity for: model-registry
Based on Modular Architecture QE Requirements (7 test categories)
🎯 Model Registry Example: Comprehensive Cypress e2e tests with workflows

1️⃣ Unit Testing (Components/Utilities)
   ✅ Frontend Unit Tests - IMPLEMENTED (Jest)
2️⃣ Mock Testing (Clusterless/BFF Mocking)  
   ✅ Mock Tests - IMPLEMENTED (Cypress intercepts)
3️⃣ Integration Testing (E2E User Workflows)
   ✅ E2E Integration Tests - IMPLEMENTED (Comprehensive workflows)
4️⃣ API Functional Testing (BFF Endpoints)
   ✅ API Functional Tests - IMPLEMENTED (Go tests)
5️⃣ API Contract Testing (Consumer-Driven)
   ✅ API Contract Tests - IMPLEMENTED (Schema validation)
6️⃣ API Performance Testing (Load/Stress)
   ❌ API Performance Tests - MISSING
7️⃣ Bundle Size Monitoring (Performance Budget)
   ❌ Bundle Size Monitoring - MISSING

📊 Testing Maturity Summary:
   Implemented: 5/7 tests (71%)

🎯 Platform Readiness Assessment:
   📍 ODH (Upstream): ✅ Ready at any maturity level
   📍 RHOAI (Enterprise): ✅ Ready for enablement
     - API Testing: ✅ (3/3 categories)
     - UI Testing: ✅ (3/3 categories)  
     - Overall Coverage: ✅ (71% ≥ 75%)

✅ Application Quality Gate: MODERATE MATURITY (71%)
```

**Llama Stack (RHOAI Not Ready):**
```
🧪 Assessing testing maturity for: llama-stack-modular-ui

📊 Testing Maturity Summary:
   Implemented: 2/7 tests (29%)

🎯 Platform Readiness Assessment:
   📍 ODH (Upstream): ✅ Ready at any maturity level
   📍 RHOAI (Enterprise): ❌ NOT READY - Quality standards not met
     - API Testing: ❌ (1/3 categories) - Need 2+ of: BFF tests, Performance, Contract
     - UI Testing: ❌ (1/3 categories) - Need 2+ of: Unit, E2E, Mock
     - Overall Coverage: ❌ (29% - Need ≥75%)

   🚫 DO NOT ENABLE IN RHOAI until these requirements are met!

⚠️ Application Quality Gate: LOW MATURITY (29%)
```

#### Maturity Ratings:
- **HIGH** (75%+): ✅ Ready for both ODH and RHOAI 
- **MODERATE** (50-74%): ✅ ODH Ready | ⚠️ RHOAI needs improvement
- **LOW** (<50%): ✅ ODH Ready | ❌ RHOAI not ready

#### Reference Implementation:
Model Registry's Cypress tests in `frontend/src/__tests__/cypress/cypress/tests/e2e/modelRegistry/`:
- `testCreateModelRegistry.cy.ts` - Complete registry creation workflow
- `testRegisterModel.cy.ts` - Model registration flow  
- `testManageRegistryPermissions.cy.ts` - Permission management
- `testArchiveModels.cy.ts` - Model lifecycle operations
- `testAdminEditRegistry.cy.ts` - Admin configuration workflows

## Codecov Integration

The quality gates integrate with your existing Codecov setup:

- **Coverage Collection**: Runs tests with coverage where available
- **Report Combination**: Uses `nyc` to merge coverage reports (like your main `test.yml`)
- **Codecov Upload**: Uploads to Codecov with `modular-arch` flag
- **No Coverage Required**: Modules without coverage don't fail the gates

## Workflow Integration

### Automatic Triggers
```yaml
on:
  pull_request:
    paths:
      - 'frontend/packages/**'
  push:
    paths:
      - 'frontend/packages/**'
    branches:
      - main
      - stable
```

### PR Summary Report
Each PR gets a quality gates summary in the GitHub UI:

```
🚦 Modular Architecture Quality Gates Report

🚨 CODE QUALITY GATE: FAILED

### ⛔ DO NOT ENABLE THIS MODULE IN DEPLOYMENT ⛔

**MODULE DOES NOT MEET ARCHITECTURE STANDARDS**

🚫 **Platform Team:** DO NOT add to federation-configmap.yaml

🛠️ **Development Team:** Fix quality issues to enable module

## ✅ Deployment Quality Gate: COMPLETED
- Deployment readiness assessed (100%)
- Container and ODH integration requirements checked
- Status: ✅ ODH Ready | ⏳ RHOAI Planned

## ✅ Application Quality Gate: COMPLETED  
- Testing maturity assessed (4/7 categories - 57%)
- Unit, Mock, Integration, API tests implemented
- Missing: Contract, Performance, Bundle monitoring

## 📚 Resources
- Modular Architecture Guide
- QE Testing Requirements (7 categories)
- Model Registry Example (PR #4540)
```

## For Development Teams

### Getting Started
1. **Follow the patterns** in existing modules like `llama-stack-modular-ui`
2. **Ensure mod-arch-shared integration** in your entry point
3. **Start with basic tests** - even partial coverage helps
4. **Review the PR feedback** for specific guidance

### Common Issues & Fixes

#### Code Quality Gate Failures:
```bash
# Missing mod-arch-shared
npm install mod-arch-shared

# Missing ModularArchContextProvider
# Add to your bootstrap.tsx/index.tsx:
import { ModularArchContextProvider } from 'mod-arch-shared';

# TypeScript/ESLint errors
npm run test:type-check
npm run test:lint
```

#### Application Quality Gate Low Scores:
- **Start small**: Add basic Jest unit tests
- **Use existing patterns**: Copy test setup from llama-stack-modular-ui
- **Iterate gradually**: Don't try to implement all 4 test types at once

### Testing Implementation Guide

#### 1. Unit Tests (Jest)
```json
{
  "scripts": {
    "test:unit": "jest",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.5.14",
    "@testing-library/react": "^16.2.0",
    "@testing-library/jest-dom": "^6.6.3"
  }
}
```

#### 2. Mock Tests (Cypress + Mocking)
```json
{
  "scripts": {
    "cypress:run:mock": "CY_MOCK=1 npm run cypress:run"
  }
}
```

#### 3. Integration Tests (Cypress E2E)
```json
{
  "scripts": {
    "test:cypress-ci": "npx concurrently -k \"npm run cypress:server:dev\" \"npx wait-on http://localhost:8080 && npm run cypress:run\""
  }
}
```

#### 4. API Tests (Go BFF)
```makefile
test: fmt vet
	go test ./...
```

#### 5. API Contract Tests (Pact)
```javascript
// Frontend consumer test
const { Pact } = require('@pact-foundation/pact');

const provider = new Pact({
  consumer: 'YourMicroFrontend',
  provider: 'YourBFF',
});

describe('API Contract Tests', () => {
  it('should get model data', async () => {
    await provider
      .given('models exist')
      .uponReceiving('a request for models')
      .withRequest({
        method: 'GET',
        path: '/api/models',
      })
      .willRespondWith({
        status: 200,
        body: { models: [] },
      });
  });
});
```

#### 6. API Performance Tests (K6)
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let response = http.get('http://localhost:8080/api/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

#### 7. Bundle Size Monitoring
```json
{
  "scripts": {
    "size": "size-limit",
    "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js"
  },
  "size-limit": [
    {
      "path": "build/static/js/*.js",
      "limit": "500 KB"
    }
  ]
}
```