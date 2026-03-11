import React from 'react';
import { Label, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type DeploymentWizardViewModeToggleProps = {
  viewMode: ModelDeploymentWizardViewMode;
  setViewMode: (mode: ModelDeploymentWizardViewMode) => void;
};

// The label text color doesn't inherit the toggled state text color updates (it inverts)
// `currentColor` tracks the toggled state text color so make the label text match.
const techPreviewLabelStyle: React.CSSProperties & { '--pf-v6-c-label--Color'?: string } = {
  marginLeft: '4px',
  '--pf-v6-c-label--Color': 'currentColor',
};

export const DeploymentWizardViewModeToggle: React.FC<DeploymentWizardViewModeToggleProps> = ({
  viewMode,
  setViewMode,
}) => (
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
      text={
        <>
          YAML
          <Label isCompact color="yellow" variant="outline" style={techPreviewLabelStyle}>
            Tech preview
          </Label>
        </>
      }
      buttonId="yaml-view"
      isSelected={viewMode !== 'form'}
      onChange={() => (viewMode === 'form' ? setViewMode('yaml-preview') : undefined)}
    />
  </ToggleGroup>
);
