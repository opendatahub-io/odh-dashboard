import * as React from 'react';
import { Bullseye, Flex, FlexItem } from '@patternfly/react-core';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core/deprecated';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';

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
    ? getProjectDisplayName(selection)
    : invalidDropdownPlaceholder ?? namespace;

  const filteredProjects = filterLabel
    ? projects.filter((project) => project.metadata.labels?.[filterLabel] !== undefined)
    : projects;

  const toggleLabel = projects.length === 0 ? 'No projects' : selectionDisplayName;

  const selector = (
    <Dropdown
      toggle={
        <DropdownToggle
          isDisabled={projects.length === 0}
          onToggle={() => setDropdownOpen(!dropdownOpen)}
          toggleVariant={primary ? 'primary' : undefined}
          aria-label={`Project: ${toggleLabel}`}
        >
          {toggleLabel}
        </DropdownToggle>
      }
      isOpen={dropdownOpen}
      dropdownItems={[
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
            {getProjectDisplayName(project)}
          </DropdownItem>
        )),
      ]}
      data-testid="project-selector-dropdown"
    />
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
