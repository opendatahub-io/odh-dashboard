import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type YamlViewSessionResult = {
  isYAMLViewerEnabled: boolean;
  isAutoFallback?: boolean;
  viewMode: ModelDeploymentWizardViewMode;
  switchToForm: () => void;
  switchToYaml: (edit?: boolean) => void;
};

export const useYamlViewSession = (
  initialViewMode: ModelDeploymentWizardViewMode,
  canEnterYAMLEditMode?: boolean,
): YamlViewSessionResult => {
  const isYAMLViewerEnabled = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;
  const isBidirectionalYamlWizardGaEnabled = useIsAreaAvailable('bidirectionalYamlWizardGa').status;

  const [viewMode, setViewMode] = React.useState<ModelDeploymentWizardViewMode>(initialViewMode);

  return {
    isYAMLViewerEnabled,
    isAutoFallback: initialViewMode === 'yaml-edit',
    viewMode,
    switchToForm: () => {
      setViewMode('form');
    },
    switchToYaml: (edit?: boolean) => {
      if (viewMode !== 'form' && !edit) {
        return;
      }

      if (isBidirectionalYamlWizardGaEnabled && canEnterYAMLEditMode) {
        setViewMode('yaml-edit');
      } else if (edit) {
        setViewMode('yaml-edit');
      } else {
        setViewMode('yaml-preview');
      }
    },
  };
};
