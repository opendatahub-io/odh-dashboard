import React from 'react';
import { Radio, Stack, StackItem, Title } from '@patternfly/react-core';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetId,
} from '../../../extension-points/runtime-image-install-target';

type RuntimeImageInstallWizardTargetStepProps = {
  installTargets: RuntimeImageInstallTargetExtension[];
  selected: RuntimeImageInstallTargetId | undefined;
  onSelect: (targetId: RuntimeImageInstallTargetId) => void;
};

const RuntimeImageInstallWizardTargetStep: React.FC<RuntimeImageInstallWizardTargetStepProps> = ({
  installTargets,
  selected,
  onSelect,
}) => (
  <Stack hasGutter>
    <StackItem>
      <Title headingLevel="h2">Choose install target</Title>
    </StackItem>
    <StackItem>Select where this runtime image should be available after installation.</StackItem>
    {installTargets.map((target) => {
      const { id, label, description, selectedState } = target.properties;
      return (
        <StackItem key={id}>
          <Radio
            id={`install-target-${id}`}
            name="install-target"
            label={label}
            description={description}
            isChecked={selected === id}
            onChange={() => onSelect(id)}
            data-testid={`install-target-${id}`}
          />
          {selected === id ? (
            <p className="pf-v6-u-mt-sm">
              Appears under <strong>{selectedState.listName}</strong> {selectedState.description}
            </p>
          ) : null}
        </StackItem>
      );
    })}
  </Stack>
);

export default RuntimeImageInstallWizardTargetStep;
