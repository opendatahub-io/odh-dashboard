# Open Data Hub Dashboard Cypress e2e Tests

This guide provides instructions for setting up Cypress for end-to-end (e2e) testing in your local development environment and guidelines for contributing to the testing framework.

## Table of Contents
- [Contributing](#contributing)
- [Documentation](#documentation)
- [Prerequisites](#prerequisites)
- [Setting Up Cypress](#setting-up-cypress)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Contribution Guidelines](#contribution-guidelines)
- [Styling and Code Standards](#styling-and-code-standards)
- [Troubleshooting](#troubleshooting)

## Contributing

Individual contributions are welcome! To propose a new test for the Dashboard, please open a new test request [issue][issue].

Please also follow our general Dashboard [contributing guidelines][contributing guidelines].

## Documentation

Learn more about the Dashboard through our documentation:

* [Dev setup & Requirements][Dev setup & Requirements]
* [Dashboard documentation][Dashboard documentation]

## Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: Version 14 or higher
* **npm**: Comes with Node.js, ensure it's up to date
* **Cypress**: This will be installed as part of the project setup

## Setting Up Cypress

1. **Clone the ODH Dashboard repository:**

   ```bash
   git clone https://github.com/opendatahub-io/odh-dashboard.git
   cd odh-dashboard
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Export the test variables:**

   ```bash
   export CY_TEST_CONFIG='PATH_TO_YOUR_TEST_VARIABLES'
   ```

4. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

   > **NOTE:** Test variables are required to execute tests. Contact the QE Dashboard team for access.

5. **Run Cypress:**

   This command launches the Cypress Test Runner, where you can run your tests interactively.

   ```bash
   npm run cypress:open
   ```

## Running Tests

### Run Tests in Interactive Mode

Use the Cypress Test Runner for an interactive GUI:

```bash
npm run cypress:open
```

### Run Tests Headlessly

Run tests from the command line:

```bash
npm run cypress:run --env grepTags="@<Test-Case-Tag>",skipTags="@<Flaky-Bug>" --browser chrome
```

**Examples:**

* Run Smoke Tests, skipping tests tagged with `Bug`:

  ```bash
  npm run cypress:run --env grepTags="@Smoke",skipTags="@Bug" --browser chrome
  ```

* Run Smoke Tests, skipping tests tagged with `Bug` or `ModelServing`:

  ```bash
  npm run cypress:run --env grepTags="@Smoke",skipTags="@Bug @Modelserving" --browser chrome
  ```

* Run Individual tests, in this example by test case ID `ODS-1234`:

  ```bash
  npm run cypress:run --env grepTags="@ODS-1234" --browser chrome
  ```

### Run Tests by Test Spec

Run tests by Test Spec from the command line:

**Examples:**

* Run Individual Test Spec:

  ```bash
  npm run cypress:run --spec "cypress/tests/e2e/<test-Name>.cy.ts" --browser chrome
  ```

* Run Multiple Test Specs:

  ```bash
  npm run cypress:run --spec "cypress/tests/e2e/<test-Name1>.ts,cypress/tests/e2e/<test-Name2>.cy.ts" --browser chrome
  ```

### Running Tests Concurrently

When running tests concurrently against the same cluster (e.g., in multiple terminals/prs), it's important to skip certain tests to prevent conflicts:

```bash
npm run cypress:run \
  --env grepTags="@Smoke" \
  --env skipTags="@Bug @Maintain @NonConcurrent" \
  --browser chrome
```

**Skip Tags Explanation:**
- `@Bug`: Skip tests that are currently failing due to product bugs
- `@Maintain`: Skip tests that require maintenance
- `@NonConcurrent`: Skip tests that cannot run concurrently (to prevent resource conflicts)

## Environment Variables

For comprehensive documentation of all Cypress environment variables, see the [Cypress Environment Variables section in the main testing documentation](../../../../../docs/testing.md#cypress-environment-variables).

The most commonly used environment variable is `CY_TEST_CONFIG`, which is required for e2e tests:

```bash
export CY_TEST_CONFIG='PATH_TO_YOUR_TEST_VARIABLES'
```

## Writing Tests

e2e tests should focus on user journeys through the application, validating that features work as intended from the user's perspective.

e2e tests should not be overly broad or attempt to cover all functionalities in a single test, as this leads to complexity, flakiness, and maintenance challenges.

e2e tests should not replace lower-level testing methods, used in conjunction with these methods service specific and integration issues can be uncovered:
- Unit testing
- Mock testing


## Important Contribution Note

All created tests will be automatically added to the Nightly Test Execution on the e2e Cluster. The latest operator is deployed, and the Cypress e2e Tests are executed. The results are sent to the entire Dashboard team, and tasks are created to analyze failures. Flaky tests are quarantined; see the E2E Test Remediation workflow.

Ensure that all tests are thoroughly planned and executed following the guidelines below. If a test fails and cannot be reproduced manually or locally, it will be immediately quarantined, and a Critical Task will be created.

## Styling and Code Standards

Below are some general coding standards and advice when creating an e2e Test.

### Page Objects

Page Objects should be added to `frontend/src/__tests__/cypress/cypress/pages`.

### Hooks

Use `retryableBefore`. If using an `after` method, include `if (!wasSetupPerformed()) return;`. This ensures that test retries are supported for your test.

### Test Data

Test Data should be referenced from fixture files and loaded into the test in the hook (`retryableBefore`). Typically, testData is then assigned a type, and a custom function is created to assign values to a variable.

### Test IDs

It's recommended to use `testIDs` when referencing page objects. If an element does not have a `testID`, please add one:

```javascript
findActions() {
  return cy.findByTestId('project-actions');
}
```

### Tags

Tests are parameterized using tags and applied to the 'it' block:

* `Smoke`: P1/2 Critical Priority Test Cases
* `Sanity`: P3 Normal Priority Test Cases
* `Tier1`: P4 Low Priority Test Cases
* `ODS-1234`: Test Case ID (if applicable)
* `Dashboard/NIM etc.`: High-Level Team
* `Workbenches/Pipelines etc.`: Functional Area
* `Destructive`: Tests that have the potential to break other tests (changing configuration etc.) 
* `Bug`: Tests that are currently failing due to a Product Bug
* `Maintain`: Tests that are currently failing and require maintenance
* `NonConcurrent`: Tests that cannot run concurrently (to prevent resource conflicts)

**Usage in tests:**
```javascript
{ tags: ['@Sanity', '@SanitySet1', '@ODS-1931', '@Dashboard', '@Workbenches'] },
```

### Test Contents

`cy.step` is used to explain the test behavior in a human-readable format:

```javascript
cy.step('Log into the application');
cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
```

Common actions are performed within the test referencing page objects:

```javascript
createSpawnerPage.findSubmitButton().click();
createSpawnerPage.getDescriptionInput().type(editedTestDescription);
projectDetails.findSectionTab('permissions').should('not.exist');
```

Utility functions like `checkResources` are designed to simplify repetitive tasks and make tests cleaner and more reusable.

### Test Variables

Test variables mentioned above are created in the ODS-CI repo. We retrieve secrets from GitLab since these cannot be stored upstream.

New test variables should also be added to `frontend/src/__tests__/cypress/test-variables.yml.example`.

## Contribution Guidelines

Initially, please refer to the general ODH-Dashboard contribution guidelines, which explain processes such as linting required for individual contributions.

* **Branching Strategy:** Create a new branch for each feature or bug fix.

  ```bash
  git checkout -b feature/my-new-feature
  ```

* **Test the test:**
  * Execute the test locally against a PSI Cluster and/or the ODH-Nightly cluster
  * Execute the test headlessly, which imitates the execution in Jenkins
  * Future - test via Jenkins (TODO - Update this)

* **Submitting Changes:** Once your changes are ready, run the linter, commit them and push to your branch:

  ```bash
  npm run test:lint/npm run test:fix
  git add .
  git commit -m "Add my new test"
  git push origin feature/my-new-feature
  ```

* **Creating a Pull Request:** Open a pull request against the main branch of the repository and provide a clear description of your changes.

## Troubleshooting

While running mocked tests after running the e2e tests, if your Cypress tests screen is still pointing to the live cluster when you are trying to run mocked tests (when it should point to localhost instead), you may have to unset the exported `CY_TEST_CONFIG` using:

```bash
unset CY_TEST_CONFIG
```

---

[Dev setup & Requirements]: docs/dev-setup.md
[Dashboard documentation]: docs/README.md
[contributing guidelines]: CONTRIBUTING.md
[issue]: https://github.com/opendatahub-io/odh-dashboard/issues/new/choose
[definition of ready]: docs/definition-of-ready.md
