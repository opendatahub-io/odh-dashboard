import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeployAgentMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { agentOpsDeploymentDetailRoute } from '~/app/utilities/routes';
import { buildDeployAgentRequest } from './mapDeployAgentRequest';
import type { DeployAgentWizardFormData } from './types';
import { DEPLOY_FORM_INCOMPLETE_ERROR } from './utils';

type UseDeployAgentSubmitOptions = {
  formData: DeployAgentWizardFormData;
  isDeployFormValid: boolean;
};

type UseDeployAgentSubmitReturn = {
  submitDeploy: () => Promise<void>;
  isDeploying: boolean;
  deployError: string | null;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to deploy agent.';

export const useDeployAgentSubmit = ({
  formData,
  isDeployFormValid,
}: UseDeployAgentSubmitOptions): UseDeployAgentSubmitReturn => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { mutateAsync, isPending, error, reset } = useDeployAgentMutation();
  const [buildError, setBuildError] = React.useState<string | null>(null);
  const [isSubmitLocked, setIsSubmitLocked] = React.useState(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    setBuildError(null);
    reset();
  }, [formData, reset]);

  const submitDeploy = React.useCallback(async () => {
    if (!isDeployFormValid) {
      setBuildError(DEPLOY_FORM_INCOMPLETE_ERROR);
      return;
    }

    if (isPending || isSubmitLocked) {
      return;
    }

    setIsSubmitLocked(true);

    try {
      const { request, error: requestBuildError } = buildDeployAgentRequest(formData);
      if (requestBuildError || !request) {
        if (mountedRef.current) {
          setBuildError(requestBuildError || 'Unable to build deploy request.');
        }
        return;
      }

      if (mountedRef.current) {
        setBuildError(null);
        reset();
      }

      const response = await mutateAsync(request);
      if (!response.success) {
        const message = response.message ?? 'Deploy was rejected by the server.';
        if (mountedRef.current) {
          setBuildError(message);
        }
        notification.error('Deploy failed', message);
        return;
      }
      notification.success(
        'Agent deployed',
        response.message ?? `${response.name} was deployed to ${response.namespace}.`,
      );
      navigate(agentOpsDeploymentDetailRoute(response.namespace, response.name));
    } catch (mutationError) {
      const message = getErrorMessage(mutationError);
      if (mountedRef.current) {
        setBuildError(message);
      }
      notification.error('Deploy failed', message);
    } finally {
      if (mountedRef.current) {
        setIsSubmitLocked(false);
      }
    }
  }, [
    formData,
    isDeployFormValid,
    isPending,
    isSubmitLocked,
    mutateAsync,
    navigate,
    notification,
    reset,
  ]);

  const deployError = buildError ?? (error ? getErrorMessage(error) : null);

  return {
    submitDeploy,
    isDeploying: isPending || isSubmitLocked,
    deployError,
  };
};
