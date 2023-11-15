import * as React from 'react';
import { Bullseye, Split, SplitItem } from '@patternfly/react-core';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';

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
      <ProjectSelectorNavigator
        getRedirectPath={getRedirectPath}
        invalidDropdownPlaceholder="All projects"
        selectAllProjects
      />
    </SplitItem>
  </Split>
);

export default ModelServingProjectSelection;
