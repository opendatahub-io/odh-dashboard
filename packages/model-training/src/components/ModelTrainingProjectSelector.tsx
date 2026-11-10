import * as React from 'react';
import ProjectSelectorNavigator from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator';

import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

type ModelTrainingProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const ModelTrainingProjectSelector: React.FC<ModelTrainingProjectSelectorProps> = ({
  getRedirectPath,
}) => {
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;

  if (isUnifiedProjectSelectorEnabled) {
    return null;
  }

  return (
    <ProjectSelectorNavigator
      getRedirectPath={getRedirectPath}
      invalidDropdownPlaceholder="All projects"
      selectAllProjects
      showTitle
    />
  );
};

export default ModelTrainingProjectSelector;
