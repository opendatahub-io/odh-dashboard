import { useCanDeployAgent } from '~/app/hooks/useCanDeployAgent';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// NOTE(double-auth POC): useCanDeployAgent uses a permissive local shim for
// useAccessReview because `@odh-dashboard/internal` does not export it on this
// RHOAI version (see the hook). The Kubernetes API / OpenShell gateway still
// enforce RBAC on the real action, so this only gates pre-emptive UI.
describe('useCanDeployAgent', () => {
  it('returns select-project message when namespace is missing', () => {
    const { result } = testHook(useCanDeployAgent)();

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: true,
      disabledReason: 'Select a project to deploy an agent',
    });
  });

  it('allows deploy once a namespace is selected (permissive shim)', () => {
    const { result } = testHook(useCanDeployAgent)('team1');

    expect(result.current).toEqual({
      canDeploy: true,
      loaded: true,
      disabledReason: '',
    });
  });
});
