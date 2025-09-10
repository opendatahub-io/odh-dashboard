import * as React from 'react';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import ProjectIcon from '@odh-dashboard/internal/images/icons/ProjectIcon';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';

interface ChatbotHeaderProps {
  selectedProject: string;
  onProjectChange: (projectName: string) => void;
  // onProjectsLoaded: (projects: string[]) => void;
  isLoading?: boolean;
}

const ChatbotHeader: React.FunctionComponent<ChatbotHeaderProps> = ({
  selectedProject,
  onProjectChange,
  // onProjectsLoaded,
  isLoading = false,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  return (
    <Flex component="span" alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
      <FlexItem>
        <Title headingLevel="h1">AI playground</Title>
      </FlexItem>
      <FlexItem>
        <Flex
          spaceItems={{ default: 'spaceItemsXs' }}
          alignItems={{ default: 'alignItemsCenter' }}
          style={{ display: 'inline-flex' }}
        >
          <FlexItem>
            <ProjectIcon
              style={{ width: '20px', height: '20px', marginTop: '10px', marginLeft: '10px' }}
            />
          </FlexItem>
          <FlexItem>
            <span style={{ fontSize: '16px', marginRight: '10px' }}>Project</span>
          </FlexItem>
          <FlexItem>
            <ProjectSelector
              namespace={selectedProject}
              onSelection={onProjectChange}
              isLoading={isLoading}
              projectsOverride={projects}
            />
            {/* <ProjectDropdown
            selectedProject={selectedProject}
            onProjectChange={onProjectChange}
            onProjectsLoaded={onProjectsLoaded}
            isDisabled={isLoading}
          /> */}
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );
};
export default ChatbotHeader;
