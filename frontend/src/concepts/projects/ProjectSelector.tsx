import * as React from 'react';
import {
  Bullseye,
  Flex,
  FlexItem,
  Dropdown,
  MenuToggle,
  DropdownItem,
  DropdownList,
} from '@patternfly/react-core';

import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  primary?: boolean;
  filterLabel?: string;
  showTitle?: boolean;
  selectorLabel?: string;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  invalidDropdownPlaceholder,
  selectAllProjects,
  primary,
  filterLabel,
  showTitle = false,
  selectorLabel = 'Project',
}) => {
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  const selection = projects.find(byName(namespace));
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const selectionDisplayName = selection
    ? getDisplayNameFromK8sResource(selection)
    : invalidDropdownPlaceholder ?? namespace;

  const filteredProjects = filterLabel
    ? projects.filter((project) => project.metadata.labels?.[filterLabel] !== undefined)
    : projects;

  const toggleLabel = projects.length === 0 ? 'No projects' : selectionDisplayName;

  const selector = (
    <Dropdown
      onOpenChange={(isOpenChange) => setDropdownOpen(isOpenChange)}
      shouldFocusToggleOnSelect
      toggle={(toggleRef) => (
        <MenuToggle
          isDisabled={projects.length === 0}
          ref={toggleRef}
          aria-label={`Project: ${toggleLabel}`}
          variant={primary ? 'primary' : undefined}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          isExpanded={dropdownOpen}
          data-testid="project-selector-dropdown"
        >
          {toggleLabel}
        </MenuToggle>
      )}
      isOpen={dropdownOpen}
    >
      <DropdownList>
        {[
          ...(selectAllProjects
            ? [
                <DropdownItem
                  key="all-projects"
                  onClick={() => {
                    setDropdownOpen(false);
                    onSelection('');
                    updatePreferredProject(null);
                  }}
                >
                  All projects
                </DropdownItem>,
              ]
            : []),
          ...filteredProjects.map((project) => (
            <DropdownItem
              key={project.metadata.name}
              onClick={() => {
                setDropdownOpen(false);
                onSelection(project.metadata.name);
              }}
            >
              {getDisplayNameFromK8sResource(project)}
            </DropdownItem>
          )),
        ]}
      </DropdownList>
    </Dropdown>
  );
  if (showTitle) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
        <img
          src={typedObjectImage(ProjectObjectType.project)}
          alt=""
          style={{ height: 'var(--pf-v5-global--icon--FontSize--lg)' }}
        />
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Bullseye>{selectorLabel}</Bullseye>
          </FlexItem>
          <FlexItem>{selector}</FlexItem>
        </Flex>
      </Flex>
    );
  }
  return selector;
};

export default ProjectSelector;
