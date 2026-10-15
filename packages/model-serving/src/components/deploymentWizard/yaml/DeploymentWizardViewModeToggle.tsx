import React from 'react';
import { Flex, FlexItem, Label, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type DeploymentWizardViewModeToggleProps = {
  viewMode: ModelDeploymentWizardViewMode;
  switchToForm: () => void;
  switchToYaml: () => void;
};

export const DeploymentWizardViewModeToggle: React.FC<DeploymentWizardViewModeToggleProps> = ({
  viewMode,
  switchToForm,
  switchToYaml,
}) => {
  const [isBidirectionalYamlWizardGaEnabled] = useFeatureFlag('bidirectionalYamlWizardGa');

  return (
    <Flex>
      {isBidirectionalYamlWizardGaEnabled ? null : (
        <FlexItem>
          <Label isCompact color="yellow" variant="outline">
            YAML feature is in tech preview
          </Label>
        </FlexItem>
      )}
      <FlexItem>
        <ToggleGroup aria-label="Deployment view mode">
          <ToggleGroupItem
            data-testid="form-view"
            text="Form"
            buttonId="form-view"
            isSelected={viewMode === 'form'}
            onChange={() => switchToForm()}
            isDisabled={isBidirectionalYamlWizardGaEnabled ? false : viewMode === 'yaml-edit'}
          />
          <ToggleGroupItem
            data-testid="yaml-view"
            text="YAML"
            buttonId="yaml-view"
            isSelected={viewMode !== 'form'}
            onChange={() => switchToYaml()}
          />
        </ToggleGroup>
      </FlexItem>
    </Flex>
  );
};
