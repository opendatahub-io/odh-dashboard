import * as React from 'react';
import { Bullseye, Split, SplitItem } from '@patternfly/react-core';
import ProjectSelector from '~/concepts/projects/ProjectSelector';

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
      <ProjectSelector getRedirectPath={getRedirectPath} />
    </SplitItem>
  </Split>
);

export default PipelineCoreProjectSelector;
