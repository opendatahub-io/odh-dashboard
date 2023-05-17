import * as React from 'react';
import { Bullseye, Split, SplitItem } from '@patternfly/react-core';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';

type PipelineCoreProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
}) => (
  <Split hasGutter>
    <SplitItem>
      <Bullseye>Project</Bullseye>
    </SplitItem>
    <SplitItem>
      <ProjectSelectorNavigator getRedirectPath={getRedirectPath} />
    </SplitItem>
  </Split>
);

export default PipelineCoreProjectSelector;
