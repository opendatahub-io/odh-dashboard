import { useAccessReview } from '@odh-dashboard/internal/api/index';

type UseCanDeployAgentResult = {
  canDeploy: boolean;
  loaded: boolean;
  disabledReason: string;
};

export const useCanDeployAgent = (namespace?: string): UseCanDeployAgentResult => {
  const shouldCheck = !!namespace;
  const [canCreateAgentRuntime, accessLoaded] = useAccessReview(
    {
      group: 'agent.kagenti.dev',
      resource: 'agentruntimes',
      verb: 'create',
      namespace: namespace ?? '',
    },
    shouldCheck,
  );

  if (!namespace) {
    return {
      canDeploy: false,
      loaded: true,
      disabledReason: 'Select a project to deploy an agent',
    };
  }

  if (!accessLoaded) {
    return {
      canDeploy: false,
      loaded: false,
      disabledReason: 'Checking access...',
    };
  }

  if (!canCreateAgentRuntime) {
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
