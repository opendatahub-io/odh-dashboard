import * as React from 'react';
import { Bullseye, Split, SplitItem } from '@patternfly/react-core';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';
import { KnownLabels } from '~/k8sTypes';

type ModelServingProjectSelectionProps = {
  getRedirectPath: (namespace: string) => string;
};

const ModelServingProjectSelection: React.FC<ModelServingProjectSelectionProps> = ({
  getRedirectPath,
}) => (
  <Split hasGutter>
    <SplitItem>
      <Bullseye>Project</Bullseye>
    </SplitItem>
    <SplitItem>
      {/* Maybe we want to filter the projects with no deployed models that's why I added the filterLable prop */}
      <ProjectSelectorNavigator
        getRedirectPath={getRedirectPath}
        invalidDropdownPlaceholder={'All projects'}
        selectAllProjects
        filterLabel={KnownLabels.DASHBOARD_RESOURCE}
      />
    </SplitItem>
  </Split>
);

export default ModelServingProjectSelection;
