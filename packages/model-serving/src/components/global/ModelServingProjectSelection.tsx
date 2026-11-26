import * as React from 'react';
import { Button, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectSelectorNavigator } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import FindProjectByName from './FindProjectByName';

type ModelServingProjectSelectionProps = {
  getRedirectPath: (namespace: string) => string;
};

const ModelServingProjectSelection: React.FC<ModelServingProjectSelectionProps> = ({
  getRedirectPath,
}) => {
  const navigate = useNavigate();
  // Set where the host could not list every project the caller may use: the
  // selector then offers only the projects known so far, so any other one is
  // opened by name from here.
  const { findProject } = React.useContext(ProjectsContext);
  const [isFindOpen, setFindOpen] = React.useState(false);
  const selector = (
    <ProjectSelectorNavigator
      getRedirectPath={getRedirectPath}
      invalidDropdownPlaceholder="All projects"
      selectAllProjects
      showTitle
    />
  );
  if (!findProject) {
    return selector;
  }
  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <FlexItem>{selector}</FlexItem>
      <FlexItem>
        <Popover
          isVisible={isFindOpen}
          shouldOpen={() => setFindOpen(true)}
          shouldClose={() => setFindOpen(false)}
          headerContent="Open a project by name"
          bodyContent={
            <FindProjectByName
              findProject={findProject}
              onFound={(projectName) => {
                setFindOpen(false);
                navigate(getRedirectPath(projectName));
              }}
            />
          }
        >
          <Button variant="link" isInline data-testid="open-project-by-name">
            Open project by name
          </Button>
        </Popover>
      </FlexItem>
    </Flex>
  );
};

export default ModelServingProjectSelection;
