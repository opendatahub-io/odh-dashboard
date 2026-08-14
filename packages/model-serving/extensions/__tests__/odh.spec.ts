import extensions from '../odh';

const routeExtensions = extensions.filter((extension) => extension.type === 'app.route');

// Guards the two legacy v2 serving-runtime redirect aliases restored in
// RHOAIENG-80077 (`/servingRuntimes/addServingRuntime` and
// `/servingRuntimes/editServingRuntime/*`). These are covered end-to-end by
// `packages/cypress/cypress/tests/mocked/customServingRuntimes/customServingRuntimes.cy.ts`,
// but that spec is slow and has shown flakiness unrelated to these routes — this cheap,
// deterministic assertion catches accidental deletion or flag drift without needing
// cypress. It intentionally does not (and cannot cheaply) assert the redirect's `to`
// target, since `component` is a lazy import thunk (createRedirectComponent) that
// can't be invoked synchronously here.
describe('legacy serving runtime redirect routes', () => {
  it('should register the legacy /servingRuntimes/addServingRuntime redirect', () => {
    const addAlias = routeExtensions.find(
      (extension) => extension.properties.path === '/servingRuntimes/addServingRuntime',
    );

    expect(addAlias).toBeDefined();
    expect(addAlias?.type).toBe('app.route');
    expect(addAlias?.flags).toEqual({
      required: ['custom-serving-runtimes', 'ADMIN_USER'],
    });
  });

  it('should register the legacy /servingRuntimes/editServingRuntime/* redirect', () => {
    const editAlias = routeExtensions.find(
      (extension) => extension.properties.path === '/servingRuntimes/editServingRuntime/*',
    );

    expect(editAlias).toBeDefined();
    expect(editAlias?.type).toBe('app.route');
    expect(editAlias?.flags).toEqual({
      required: ['custom-serving-runtimes', 'ADMIN_USER'],
    });
  });

  // Guards against reintroducing the exact Round-1 bug: a `:servingRuntimeName`-param
  // path for the edit alias resolves to AbsoluteRedirect (no param substitution), not
  // WildcardRedirect — the path must stay in the `/*` wildcard form to preserve the
  // captured runtime name.
  it('should not register the edit alias with a :servingRuntimeName param path', () => {
    const paramFormAlias = routeExtensions.find(
      (extension) =>
        extension.properties.path === '/servingRuntimes/editServingRuntime/:servingRuntimeName',
    );

    expect(paramFormAlias).toBeUndefined();
  });
});
