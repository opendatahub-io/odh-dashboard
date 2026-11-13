import React from 'react';
import {
  Bullseye,
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import type { RuntimeImageInstallTargetProps } from '@odh-dashboard/model-serving/extension-points/runtime-image-install-target';
import { RuntimeImageInstallTrackingEvent } from '@odh-dashboard/model-serving/components/runtimeImageInstall/tracking/runtimeImageInstallTracking';
import { parseLlmInferenceServiceConfig } from './parseLlmInferenceServiceConfig';
import LlmInferenceServiceConfigFormBody from '../settings/llmInferenceServiceConfigs/LlmInferenceServiceConfigFormBody';
import { fireLlmInferenceServiceConfigCreated } from '../tracking/llmdTrackingConstants';
import LlmInferenceServiceConfigAccessGate from '../settings/LlmInferenceServiceConfigAccessGate';

const LlmInferenceServiceConfigInstallTargetBody: React.FC<RuntimeImageInstallTargetProps> = ({
  targetData,
  onBack,
  cancelReturnRoute,
}) => {
  const trackEvent = useTrackEvent();
  const navigate = useNavigate();
  const parsed = React.useMemo(() => {
    try {
      if (typeof targetData !== 'string') {
        throw new Error(
          'The Runtime image does not contain an LLM inference service configuration.',
        );
      }
      return { config: parseLlmInferenceServiceConfig(targetData) };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unable to read the configuration.',
      };
    }
  }, [targetData]);

  if (parsed.error || !parsed.config) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to configure LLM inference service configuration"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{parsed.error}</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={onBack}>
                Back
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  fireLlmInferenceServiceConfigCreated(trackEvent, {
                    outcome: TrackingOutcome.cancel,
                    mode: 'install',
                  });
                  trackEvent(RuntimeImageInstallTrackingEvent.CREATE_COMPLETED, {
                    outcome: TrackingOutcome.cancel,
                    configurationType: 'llm-inference-service-configuration',
                  });
                  navigate(cancelReturnRoute);
                }}
              >
                Cancel
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h2">Configure</Title>
      </StackItem>
      <StackItem>
        <Content>
          <p>Review or customize the pre-filled configuration.</p>
        </Content>
      </StackItem>
      <StackItem>
        <LlmInferenceServiceConfigFormBody
          key={typeof targetData === 'string' ? targetData : undefined}
          mode="install"
          sourceConfig={parsed.config}
          onBack={onBack}
          cancelReturnRoute={cancelReturnRoute}
        />
      </StackItem>
    </Stack>
  );
};

const LlmInferenceServiceConfigInstallTarget: React.FC<RuntimeImageInstallTargetProps> = (
  props,
) => (
  <LlmInferenceServiceConfigAccessGate>
    <LlmInferenceServiceConfigInstallTargetBody {...props} />
  </LlmInferenceServiceConfigAccessGate>
);

export default LlmInferenceServiceConfigInstallTarget;
