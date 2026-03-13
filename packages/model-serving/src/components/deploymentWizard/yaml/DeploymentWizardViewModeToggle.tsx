import React from 'react';
import { Flex, FlexItem, Label, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type DeploymentWizardViewModeToggleProps = {
  viewMode: ModelDeploymentWizardViewMode;
  setViewMode: (mode: ModelDeploymentWizardViewMode) => void;
};

export const DeploymentWizardViewModeToggle: React.FC<DeploymentWizardViewModeToggleProps> = ({
  viewMode,
  setViewMode,
}) => (
  <Flex>
    <FlexItem>
      <Label isCompact color="yellow" variant="outline">
        YAML feature is in tech preview
      </Label>
    </FlexItem>
    <FlexItem>
      <ToggleGroup aria-label="Deployment view mode">
        <ToggleGroupItem
          data-testid="form-view"
          text="Form"
          buttonId="form-view"
          isSelected={viewMode === 'form'}
          onChange={() => setViewMode('form')}
          isDisabled={viewMode === 'yaml-edit'}
        />
        <ToggleGroupItem
          data-testid="yaml-view"
          text="YAML"
          buttonId="yaml-view"
          isSelected={viewMode !== 'form'}
          onChange={() => (viewMode === 'form' ? setViewMode('yaml-preview') : undefined)}
        />
      </ToggleGroup>
    </FlexItem>
  </Flex>
);
