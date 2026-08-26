// NOTE(double-auth POC): @odh-dashboard/internal's `useAccessReview` is not
// exported by the host's shared singleton on this RHOAI version (it crashed the
// whole Agents page: "useAccessReview is not a function"). Use a permissive
// local shim — the Kubernetes API / OpenShell gateway still enforce RBAC on the
// actual action, so this only affects pre-emptive button gating.
const useAccessReview = (
  _resourceAttributes: unknown,
  _shouldCheck?: boolean,
): [boolean, boolean] => [true, true];

type UseCanDeployAgentResult = {
  canDeploy: boolean;
  loaded: boolean;
  disabledReason: string;
};

const sandboxAccessReview = (namespace: string, verb: 'create' | 'get') => ({
  group: 'agents.x-k8s.io',
  resource: 'sandboxes',
  verb,
  namespace,
});

export const useCanDeployAgent = (namespace?: string): UseCanDeployAgentResult => {
  const shouldCheck = !!namespace;
  const [canCreateSandbox, createLoaded] = useAccessReview(
    sandboxAccessReview(namespace ?? '', 'create'),
    shouldCheck,
  );
  const [canGetSandbox, getLoaded] = useAccessReview(
    sandboxAccessReview(namespace ?? '', 'get'),
    shouldCheck,
  );

  if (!namespace) {
    return {
      canDeploy: false,
      loaded: true,
      disabledReason: 'Select a project to deploy an agent',
    };
  }

  if (!createLoaded || !getLoaded) {
    return {
      canDeploy: false,
      loaded: false,
      disabledReason: 'Checking access...',
    };
  }

  if (!canCreateSandbox || !canGetSandbox) {
    return {
      canDeploy: false,
      loaded: true,
      disabledReason: 'You do not have permission to deploy agents in this project',
    };
  }

  return {
    canDeploy: true,
    loaded: true,
    disabledReason: '',
  };
};
