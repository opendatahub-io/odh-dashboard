# Testing

Running all tests:
```bash
npm run test
```

## Unit Tests

Jest is used as the unit test runner. Unit tests should be written for all utility and hook functions; React Components do not require unit tests.

Running unit tests:
```bash
npm run test:unit
```

### Structure

Test files must be consistently named based on the name of the source code file being tested. Test files must use the `.spec.ts` file extension and be located in the `__tests__` directory adjacent the source code file.

Create a single test file per source code file. Use `describe('<function name>')` to group together tests related to the same function. Follow the pattern `it('should ...')` when naming unit tests.

```bash
# Source file:
/frontend/src/foo/bar/utils.ts

# Test file:
/frontend/src/foo/bar/__tests__/utils.spec.ts
```

_Example unit test file_

```ts
describe('getDisplayNameFromK8sResource', () => {
  it('should return the display name from resource metadata annotations', () => {
    // Test 1
  });
  it('should return the resource name if display name is not present', () => {
    // Test 2
  });
});
// Write similar test cases for other functions in the utils file
describe('getSecretDescription', () => {
  // Test case for getSecretDescription function
});
```

### Mocking

Mocks are required by some unit tests in order to deal with network calls, third party libraries, or to simplify the unit test.

Use `jest.mocked(...)` to create type safe mocks.

Mock out `@openshift/dynamic-plugin-sdk-utils` when dealing with the various `k8s` resource handlers.

When using mocks, make sure to assert the mock is called with the expected values for the test.

```ts
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<ProjectKind>);
...
k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockProjectK8sResource({})]));
...
expect(k8sListResourceMock).toHaveBeenCalledWith(...);
```

Always create mock data within the individual tests. Do not create a single mock data instance that is mutated for each test.

### Test Considerations

- Test variations of all inputs:
  - Zero, positive and negative numbers
  - Empty strings
  - Null and undefined
- Assert exceptions that are expected to be thrown.
- Assert return values.
- HTTP errors 4xx and 5xx may result in different handling.
- Re-use and contribute new mock data in the `__mocks__` folder.
- Tests should not depend on running in sequence, but instead all tests must be able to run by themselves in isolation.

### Testing Hooks

Testing hooks differs from normal functions because there is a lifecycle aspect to them wherein state can be updated asynchronously. Also, hooks have an expectation to return the same identity equal values when given the same inputs as the previous execution. Testing hook stability is a requirement.

To render a hook, use the `testHook` utility function. This utility returns a hook result object that can be used directly with custom hook assertion functions as well as provides additional ways to work with that hook.

```ts
// simple example hook
const useSayHello = (who: string) => `Hello ${who}!`;

const renderResult = testHook(useSayHello)('world');
expect(renderResult).hookToBe('Hello world!');
```

To get direct access to the return value of hook:
```ts
renderResult.current
```

To re-render the hook with new inputs:
```ts
renderResult.rerender('new value')
```

Sometimes it's necessary to wait for a hook to perform an async operation on its own. For example, if there is a timeout or network operation. The update count can be observed to have increased after waiting.

```ts
expect(renderResult).toHaveUpdateCount(1);
await renderResult.waitForNextUpdate();
expect(renderResult).toHaveUpdateCount(2);
```

Hook specific assertions:

* `hookToBe(e: any)`: Assertion wrapper equivalent to `expect(renderResult.current).toBe(...)`.
* `hookToStrictEqual(e: any)`: Assertion wrapper equivalent to `expect(renderResult.current).toStrictEqual(...)`.
* `hookToHaveUpdateCount(e: number)`: Update count refers to the number of times the hook function has been executed. An update occurs whenever the hook function is first rendered, subsequently rerendered, and whenever internal state is set asynchronously.
* `hookToBeStable(e: BooleanValues)`: Stability refers to whether or not the return value of the hook is identical to the previous return value. Stability should be asserted after each render. A hook should be stable when the same inputs are provided.

## Cypress Tests

Cypress is used to run tests against the frontend by either mocking all network requests or directly interacting with a live cluster.

### E2E Tests

Cypress e2e tests run against a live cluster.

Before running the Cypress e2e tests, you must populate the test variables by first creating a copy of the `test-variables.yml.example` file and setting the `CY_TEST_CONFIG` env variable value to be the path to this file. Update the variables according to your testing environment.

```bash
CY_TEST_CONFIG=./test-variables.yml
```

Cypress e2e tests can make use of the `oc` command line tool. This is useful for test setup and tear down. When run in CI, the default user will be a cluster admin.
```ts
cy.exec(`oc new-project test-project`);
```

Prior to running the Cypress e2e tests, run `oc login` to login as a cluster admin to ensure the test env matches that of our CI and provides a default user for all `oc` commands executed in tests.

To run all Cypress e2e tests, a specific test, or open the Cypress GUI:
```bash
npm run cypress:run

npm run cypress:run -- --spec "**/testfile.cy.ts"

npm run cypress:open
```

Use the custom command `cy.visitWithLogin` to visit a page and perform the login procedure steps if the user is not already logged in. The default user is not an ODH admin. `cy.visitWithLogin` can be used to login with different users by supplying the user auth configuration as a parameter.

### Mocked Tests

Cypress mocked tests run against a standalone frontend while mocking all network requests.

Single command to run all Cypress mock tests or a specific test (build frontend, start HTTP server, run Cypress):
```bash
npm run test:cypress-ci

npm run test:cypress-ci -- --spec "**/testfile.cy.ts"
```

Cypress tests require a frontend server to be running.

Using the webpack development server allows for auto rebuilding the dashboard frontend as code changes are made.

```bash
npm run cypress:server:dev
```

To best match production, build the frontend and use a lightweight HTTP server to host the files. This method will require manual rebuilds when changes are made to the dashboard frontend code.
```bash
npm run cypress:server:build
npm run cypress:server
```

There are two commands to run Cypress mock tests (always use the `:mock` variants).
- `open`: Open the Cypress GUI
  ```bash
  npm run cypress:open:mock
  ```
- `run`: Run all Cypress tests or a specific test headless
  ```bash
  npm run cypress:run:mock

  npm run cypress:run:mock -- --spec "**/testfile.cy.ts"
  ```

Running out of memory using the GUI? Cypress keeps track of a lot of data while testing. If you experience memory issues or crashes, use the following command to adjust the number of tests kept in memory:
```bash
npm run cypress:open:mock -- --config numTestsKeptInMemory=0
```

### Structure
```
/frontend/src/__tests__/cypress
  /tests         - Tests
    /e2e         - Live cluster tests
    /mocked      - Mocked tests
  /pages         - Page objects
    /components  - Generic objects eg. modal, table
  /support       - Custom commands and test wrappers
  /utils         - All other utilities
```

All Cypress test files use the `.cy.ts` file extension.

_Note that some files may use the `.scy.ts` file extension. This file extensions represents a [snapshot test case](#snapshot-testing)._

### Snapshot Testing

_This is an experimental feature._

Snapshot testing involves running tests against a live cluster, recording network responses on the fly and saving them to disk in JSON format. The the same test can then run off cluster where the snapshot is used to respond to network requests.

Use one of the following commands to run Cypress in record mode:
```bash
npm run cypress:open:record
npm run cypress:run:record
```

### Cypress Environment Variables

Cypress uses several environment variables to control test behavior and configuration. These can be set in your shell or passed directly to the Cypress commands.

#### CY_TEST_CONFIG
- **Purpose**: Path to test configuration YAML file
- **Values**: File path to YAML configuration (e.g., `./test-variables.yml`)
- **Effect**: Loads test variables and configuration from a YAML file
- **Usage**: `export CY_TEST_CONFIG='PATH_TO_YOUR_TEST_VARIABLES'`
- **Required**: Yes, for e2e tests

#### CY_MOCK
- **Purpose**: Enables mocked test mode
- **Values**: `1` (enabled) or `0`/unset (disabled)
- **Effect**:
  - Runs tests from `cypress/tests/mocked/` directory instead of `cypress/tests/e2e/`
  - Changes results directory to `results/mocked/`
  - Disables test retries by default
  - Loads different environment files (`.env.cypress.mock`)
- **Usage**: `CY_MOCK=1 npm run cypress:run`

#### CY_RETRY
- **Purpose**: Controls test retry behavior
- **Values**: Number of retries (e.g., `0`, `1`, `2`)
- **Default**: `2` retries for e2e tests, `0` for mocked tests
- **Effect**: Sets the number of additional attempts a test will retry if it fails
- **Usage**: `CY_RETRY=0 npm run cypress:run` (no retries)

#### CY_RECORD
- **Purpose**: Enables snapshot recording mode
- **Values**: `1` (enabled) or `0`/unset (disabled)
- **Effect**: Records network responses for snapshot testing
- **Usage**: `CY_RECORD=1 npm run cypress:run`

#### CY_WATCH
- **Purpose**: Controls file watching behavior
- **Values**: `false` to disable, any other value to enable
- **Effect**: Enables/disables watching for file changes during test execution
- **Usage**: `CY_WATCH=false npm run cypress:open`

#### CY_WS_PORT
- **Purpose**: Sets the WebSocket server port for mocked tests
- **Values**: Port number (e.g., `9002`)
- **Default**: Used in mocked test scripts
- **Effect**: Configures the WebSocket server port for real-time communication in mocked tests
- **Usage**: Set automatically in npm scripts like `cypress:run:mock`

#### CY_COVERAGE
- **Purpose**: Enables code coverage collection
- **Values**: `true` (enabled) or `false`/unset (disabled)
- **Effect**: Enables code coverage reporting during test execution
- **Usage**: `CY_COVERAGE=true npm run cypress:run`

#### CY_RESULTS_DIR
- **Purpose**: Sets the directory for test results
- **Values**: Directory path (e.g., `results`, `custom-results`)
- **Default**: `results`
- **Effect**: Changes where test results (screenshots, videos, reports) are stored
- **Usage**: `CY_RESULTS_DIR=custom-results npm run cypress:run`

#### CY_TEST_TIMEOUT_SECONDS
- **Purpose**: Sets global test timeout
- **Values**: Number of seconds
- **Effect**: Configures the global timeout for all tests
- **Usage**: `CY_TEST_TIMEOUT_SECONDS=300 npm run cypress:run`

### Page Objects

Page Objects are TypeScript objects / classes used to encapsulate all the selectors and functions related to a particular page or UI element. The functions exposed by a page object use the following prefixes:

- `visit`: Navigate directly to the URL associated with the UI element.
- `navigate`: Navigate to a page as defined by a link in the left navigation.
- `find`:
  - Without prefix (`find()`): Establish a scope for command chaining.
  - As prefix (`findFooButton(...)`): Selects a specific UI element.
    - Returns the result of the selector for command chaining.
    - The suffix should refer to the type of the selector element:
      - Eg. `Button`, `Checkbox`, `Input`, `Option`, `Select`, `Table` ...
- `should`: Performs an assertion.
  - Returns `this` to support chaining additional assertions exposed by the page object.
- `get`: Returns another page object that scopes selectors within the context of this object.
  - Eg. `getRow(...)` would return an object for working with a specific row of a table.

_All selectors should reside in page objects and not individual tests._

### Selectors and Test IDs

The primary method for selecting elements on a page is through the use of test IDs using the `data-testid` attribute. Update the frontend code as needed when a new part of the UI needs to be selected by a test. Where test IDs cannot be applied, role based selectors may be used. For example when attempting to select a link is derived from data.

- `cy.findByTestId('<test-id>')`
- `cy.findByRole('link', { name: '<name>' })`

Test IDs must be unique within a specific context but are not required to be globally unique. For example the same test ID may appear per table row.

Append meaningful descriptive words to test IDs to help with discovery and understanding. eg `delete-button`, `project-section`

`data-testid` must contain at least one static string identifier. Do not solely assign dynamic identifiers (a value which is only known at runtime) to `data-testid`. It may be useful to assign multiple values to the `data-testid` attribute using whitespace separated values. eg `data-testid="card <dynamic-identifier>"`

For example, if we had a gallery of cards where each card is populated from a k8s resource. We can select all cards, or select individual cards.

```ts
<Card data-testid={`card ${resource.metdata.name}`} ...>

// Use array matchers to invoke the equivalent of the `~=` CSS selector operator.
cy.findByTestId(['card', resource.metadata.name]);
cy.findAllByTestId(['card']).should('have.length', 5)
```

When querying the DOM within a modal, all queries must be scoped to the modal to avoid assertions that may match the DOM underneath the modal.

### Intercept

While it is possible to use `cy.intercept` for all use cases, this command doesn't provide type safety for the URL and response data structure. Use the following commands in place of `cy.intercept`:

- Kubernetes API
  - `interceptK8s` and `interceptK8sList`
- All other Dashboard API
  - `interceptOdh`
  - Add additional APIs to this custom command interface as required.

### Watching Kubernetes and Websockets

When the frontend opens a websocket to watch Kubernetes resources, it will connect to a websocket server hosted by the cypress test infrastructure. This allows for a test to push updates through the websocket to be received by the frontend. Use the custom command `wsK8s` to simulate Kubernetes resource updates. The simplest form of this command accepts a Kubernetes model object. See the `wsK8s` API for more options.

```ts
cy.wsK8s('ADDED', ProjectModel, <project resource>);
cy.wsK8s('MODIFIED', ProjectModel, <project resource>);
cy.wsK8s('DELETED', ProjectModel, <project resource>);
```

### Test Considerations

Always start a new test with a `visit` to the page being tested.

Use variants of `intercept` to mock network requests.

When a UI action results in a network request, the test must wait to ensure the request was issued:
```ts
cy.interceptOdh(...).as('some-request');
...
cy.wait('@some-request');
```

When a payload is sent as part of the network request, the test should assert the payload is the expected value. For example after filling out and submitting a form, assert the form values are present in the network request:
```ts
cy.wait('@create-project').then((interception) => {
  expect(interception.request.body).to.eql({
    apiVersion: 'project.openshift.io/v1',
    description: 'Test project description.',
    displayName: 'My Test Project',
    kind: 'ProjectRequest',
    metadata: {
      name: 'test-project',
    },
  });
});
```

Use chai's [containSubset](https://www.chaijs.com/plugins/) command to perform object equality assertions on a subset of an object. The above example can be simplified if all we wanted to check was the `displayName` and `name`:
```ts
cy.wait('@create-project').then((interception) => {
  expect(interception.request.body).to.containSubset({
    displayName: 'My Test Project',
    metadata: {
      name: 'test-project',
    },
  });
});
```

## Accessibility Testing

Accessibility testing is done as part of our Cypress tests. The process isn't automatic, however Cypress tests which following the existing patterns will get good coverage of accessibility testing for free.

By default, when visiting a new page or when a model is first opened, the DOM will be checked for accessibility errors. If any other point in time accessibility should be tested, run the `cy.testA11y()` command.
