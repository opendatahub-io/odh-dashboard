import * as React from 'react';
import { AgentDeploymentCreateResponse, AgentDeploymentSummary } from '~/app/agentProfile/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { useNotification } from '~/app/hooks/useNotification';
import { isApiError } from '~/app/types';

const POLL_INTERVAL_MS = 3000;
const INITIAL_POLL_ATTEMPTS = 3;
const MAX_POLL_ATTEMPTS = 100;

type StartAgentDeploymentOptions = {
  name: string;
  agentProfileId: string;
  namespace: string;
  mcpServerAuth?: Record<string, string>;
  onCreated?: () => void;
  onStarted: () => void;
  onComplete: () => void;
};

type UseAgentDeploymentPollingReturn = {
  isDeploying: boolean;
  startAgentDeployment: (options: StartAgentDeploymentOptions) => Promise<void>;
  resetDeploymentLoading: () => void;
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const useAgentDeploymentPolling = (): UseAgentDeploymentPollingReturn => {
  const { api, apiAvailable } = useGenAiAPI();
  const notification = useNotification();
  const [isDeploying, setIsDeploying] = React.useState(false);
  const timeoutIdsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const isUnmountedRef = React.useRef(false);

  React.useEffect(() => {
    isUnmountedRef.current = false;

    return () => {
      isUnmountedRef.current = true;
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  const startAgentDeployment = React.useCallback(
    async ({
      name,
      agentProfileId,
      namespace,
      mcpServerAuth,
      onCreated,
      onStarted,
      onComplete,
    }: StartAgentDeploymentOptions) => {
      if (!apiAvailable) {
        notification.error(`Unable to deploy ${name}`, 'The deployment API is not available.');
        onComplete();
        return;
      }

      setIsDeploying(true);
      let deployment: AgentDeploymentCreateResponse;
      try {
        deployment = await api.createAgentDeployment({
          name,
          agentProfileId,
          ...(mcpServerAuth ? { mcpServerAuth } : {}),
        });
      } catch (error) {
        notification.error(
          `Unable to deploy ${name}`,
          errorMessage(error, 'An unexpected error occurred.'),
        );
        setIsDeploying(false);
        onComplete();
        return;
      }

      if (isUnmountedRef.current) {
        return;
      }

      onCreated?.();

      const poll = async (attempt: number, notifiedStarted: boolean): Promise<void> => {
        let deploymentStatus: AgentDeploymentSummary | undefined;
        try {
          deploymentStatus = await api.getAgentDeployment({ id: deployment.sandboxName });
        } catch (error) {
          if (isApiError(error) && error.error.code === 'not_found') {
            notification.error(
              `${name} failed to deploy`,
              'The deployment could not be found. It may have been deleted.',
            );
            if (!isUnmountedRef.current) {
              setIsDeploying(false);
            }
            onComplete();
            return;
          }
          // A transient GET failure should not stop creation monitoring. The next poll may succeed.
        }

        if (isUnmountedRef.current) {
          return;
        }

        if (deploymentStatus?.state === 'ready') {
          notification.success(`${name} deployed successfully`);
          setIsDeploying(false);
          onComplete();
          return;
        }

        if (deploymentStatus?.state === 'failed') {
          notification.error(
            `${name} failed to deploy`,
            deploymentStatus.lastError ?? 'The deployment could not be created.',
          );
          setIsDeploying(false);
          onComplete();
          return;
        }

        if (attempt >= MAX_POLL_ATTEMPTS) {
          notification.warning(`${name} is still deploying`, 'Check the deployment status later.');
          setIsDeploying(false);
          onComplete();
          return;
        }

        const shouldNotifyStarted = !notifiedStarted && attempt >= INITIAL_POLL_ATTEMPTS;
        if (shouldNotifyStarted) {
          notification.info(`Deploying ${name} to ${namespace}...`);
          setIsDeploying(false);
          onStarted();
        }

        const scheduleNextPoll = () => {
          if (isUnmountedRef.current) {
            return;
          }
          const timeoutId = setTimeout(() => {
            timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
            void poll(attempt + 1, notifiedStarted || shouldNotifyStarted);
          }, POLL_INTERVAL_MS);
          timeoutIdsRef.current.push(timeoutId);
        };
        scheduleNextPoll();
      };

      await poll(1, false);
    },
    [api, apiAvailable, notification],
  );

  const resetDeploymentLoading = React.useCallback(() => {
    setIsDeploying(false);
  }, []);

  return { isDeploying, startAgentDeployment, resetDeploymentLoading };
};

export default useAgentDeploymentPolling;
