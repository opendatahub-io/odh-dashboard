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
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import type { RuntimeImageInstallTargetProps } from '@odh-dashboard/model-serving/extension-points/runtime-image-install-target';
import { parseLlmInferenceServiceConfig } from './parseLlmInferenceServiceConfig';
import LlmAcceleratorConfigFormBody from '../settings/llmAcceleratorConfigs/LlmAcceleratorConfigFormBody';
import { fireLlmAcceleratorConfigCreated } from '../tracking/llmdTrackingConstants';
import LlmInferenceServiceConfigAccessGate from '../settings/LlmInferenceServiceConfigAccessGate';

const LlmAcceleratorInstallTargetBody: React.FC<RuntimeImageInstallTargetProps> = ({
  targetData,
  onBack,
  cancelReturnRoute,
}) => {
  const navigate = useNavigate();
  const parsed = React.useMemo(() => {
    try {
      if (typeof targetData !== 'string') {
        throw new Error('The Runtime image does not contain an LLM accelerator configuration.');
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
          titleText="Unable to configure LLM accelerator configuration"
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
                  fireLlmAcceleratorConfigCreated({
                    outcome: TrackingOutcome.cancel,
                    mode: 'create',
                    source: 'install',
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
        <Title headingLevel="h2">Add LLM accelerator configuration</Title>
      </StackItem>
      <StackItem>
        <Content>
          <p>
            Review the pre-filled configuration for this runtime image. Edit any fields before
            creating it on this cluster.
          </p>
        </Content>
      </StackItem>
      <StackItem>
        <LlmAcceleratorConfigFormBody
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

const LlmAcceleratorInstallTarget: React.FC<RuntimeImageInstallTargetProps> = (props) => (
  <LlmInferenceServiceConfigAccessGate>
    <LlmAcceleratorInstallTargetBody {...props} />
  </LlmInferenceServiceConfigAccessGate>
);

export default LlmAcceleratorInstallTarget;
