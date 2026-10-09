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
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import type { RuntimeImageInstallTargetProps } from '@odh-dashboard/model-serving/extension-points/runtime-image-install-target';
import { parseServingRuntimeTemplate } from './parseServingRuntimeTemplate';
import { fireServingRuntimeTemplateCreated } from '../settings/servingRuntimeTemplates/tracking/servingRuntimeTemplateTracking';
import ServingRuntimeTemplateFormBody from '../settings/servingRuntimeTemplates/ServingRuntimeTemplateFormBody';

const ServingRuntimeInstallTarget: React.FC<RuntimeImageInstallTargetProps> = ({
  targetData,
  onBack,
  cancelReturnRoute,
}) => {
  const navigate = useNavigate();
  const parsed = React.useMemo(() => {
    try {
      if (typeof targetData !== 'string') {
        throw new Error('The Runtime image does not contain a Serving runtime Template.');
      }
      return { template: parseServingRuntimeTemplate(targetData) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to read the Template.' };
    }
  }, [targetData]);

  if (parsed.error || !parsed.template) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to configure serving runtime"
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
                  fireServingRuntimeTemplateCreated({
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
        <Title headingLevel="h2">Add serving runtime template</Title>
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
        <ServingRuntimeTemplateFormBody
          key={typeof targetData === 'string' ? targetData : undefined}
          mode="install"
          sourceTemplate={parsed.template}
          onBack={onBack}
          cancelReturnRoute={cancelReturnRoute}
        />
      </StackItem>
    </Stack>
  );
};

export default ServingRuntimeInstallTarget;
