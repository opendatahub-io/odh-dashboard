import * as React from 'react';
import { Bullseye, Flex, FlexItem } from '@patternfly/react-core';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import { useAppSelector } from '~/redux/hooks';

type PipelineCoreProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
}) => {
  const alternateUI = useAppSelector((state) => state.alternateUI);

  return (
    <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
      {alternateUI ? (
        <FlexItem>
          <img
            src={projectIcon}
            alt="project"
            style={{ height: 24, position: 'relative', top: 3 }}
          />
        </FlexItem>
      ) : null}
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Bullseye>Project</Bullseye>
        </FlexItem>
        <FlexItem>
          <ProjectSelectorNavigator getRedirectPath={getRedirectPath} />
        </FlexItem>
      </Flex>
    </Flex>
  );
};

export default PipelineCoreProjectSelector;
