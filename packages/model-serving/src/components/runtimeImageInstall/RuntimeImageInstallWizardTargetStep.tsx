import React from 'react';
import { Alert, Radio, Stack, StackItem, Title } from '@patternfly/react-core';
import { useTrackEvent } from '@odh-dashboard/plugin-core/host-api';
import {
  fireConfigurationSelected,
  toConfigurationType,
} from './tracking/runtimeImageInstallTracking';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetId,
} from '../../../extension-points/runtime-image-install-target';

type RuntimeImageInstallWizardTargetStepProps = {
  installTargets: RuntimeImageInstallTargetExtension[];
  availableTargetIds: RuntimeImageInstallTargetId[];
  selected: RuntimeImageInstallTargetId | undefined;
  onSelect: (targetId: RuntimeImageInstallTargetId) => void;
};

const RuntimeImageInstallWizardTargetStep: React.FC<RuntimeImageInstallWizardTargetStepProps> = ({
  installTargets,
  availableTargetIds,
  selected,
  onSelect,
}) => {
  const trackEvent = useTrackEvent();
  const soleAvailableTarget =
    availableTargetIds.length === 1
      ? installTargets.find((target) => target.properties.id === availableTargetIds[0])
      : undefined;
  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h2">Choose install target</Title>
      </StackItem>
      <StackItem>Select where this runtime image should be available after installation.</StackItem>
      {soleAvailableTarget && (
        <StackItem>
          <Alert
            isInline
            variant="info"
            title={`This runtime image only supports the ${soleAvailableTarget.properties.installTargetName} install target.`}
            data-testid="runtime-image-single-target-alert"
          />
        </StackItem>
      )}
      {availableTargetIds.length === 0 && (
        <StackItem>
          <Alert
            isInline
            variant="warning"
            title="This runtime image does not support any available install target"
          />
        </StackItem>
      )}
      {installTargets.map((target) => {
        const { id, label, description, selectedState } = target.properties;
        return (
          <StackItem key={id}>
            <Radio
              id={`install-target-${id}`}
              name="install-target"
              label={label}
              description={description}
              body={
                selected === id ? (
                  <p>
                    Appears under <strong>{selectedState.listName}</strong>{' '}
                    {selectedState.description}
                  </p>
                ) : undefined
              }
              isChecked={selected === id}
              isDisabled={!availableTargetIds.includes(id)}
              onChange={() => {
                onSelect(id);
                fireConfigurationSelected(trackEvent, {
                  configurationType: toConfigurationType(id),
                });
              }}
              data-testid={`install-target-${id}`}
            />
          </StackItem>
        );
      })}
    </Stack>
  );
};

export default RuntimeImageInstallWizardTargetStep;
