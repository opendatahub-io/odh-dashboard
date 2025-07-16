import { Bullseye, Divider, Flex, FlexItem, MenuItem, Truncate } from '@patternfly/react-core';
import React from 'react';
import SearchSelector from '#~/components/searchSelector/SearchSelector.tsx';
import { FeatureStoreProjectContext } from '#~/concepts/featureStore/context/FeatureStoreProjectContext.tsx';
import { FeatureStoreProject } from '#~/concepts/featureStore/types.ts';

type FeatureStoreProjectSelectorProps = {
  featureStoreProject: string;
  onSelection: (featureStoreProject: string) => void;
};

const FeatureStoreProjectSelector: React.FC<FeatureStoreProjectSelectorProps> = ({
  featureStoreProject,
  onSelection,
}) => {
  const { featureStoreProjects } = React.useContext(FeatureStoreProjectContext);
  const [searchText, setSearchText] = React.useState('');
  const selection = featureStoreProjects.find(
    (project) => project.spec.name === featureStoreProject,
  );
  const selectionName = selection ? selection.spec.name : 'All projects';
  const bySearchText = React.useCallback(
    (project: FeatureStoreProject) =>
      !searchText || project.spec.name.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()),
    [searchText],
  );
  const filteredProjects = featureStoreProjects.filter(bySearchText);
  const toggleLabel = featureStoreProjects.length === 0 ? 'No projects' : selectionName;

  const selector = (
    <SearchSelector
      dataTestId="feature-store-project-selector"
      isFullWidth
      minWidth="250px"
      searchFocusOnOpen
      searchPlaceholder="Feature store project name"
      onSearchChange={(value) => setSearchText(value)}
      onSearchClear={() => setSearchText('')}
      searchValue={searchText}
      toggleContent={toggleLabel}
    >
      <>
        <MenuItem
          key="all-projects"
          isSelected={featureStoreProject === ''}
          onClick={() => {
            onSelection('');
          }}
        >
          All projects
        </MenuItem>
        <Divider component="li" />
        {filteredProjects.length === 0 && <MenuItem isDisabled>No matching results</MenuItem>}
        {filteredProjects.map((project) => (
          <MenuItem
            key={project.spec.name}
            isSelected={project.spec.name === selection?.spec.name}
            onClick={() => {
              setSearchText('');
              onSelection(project.spec.name);
            }}
          >
            <Truncate content={project.spec.name}>{project.spec.name}</Truncate>
          </MenuItem>
        ))}
      </>
    </SearchSelector>
  );
  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <Bullseye>Feature store projects</Bullseye>
      </FlexItem>
      <FlexItem>{selector}</FlexItem>
    </Flex>
  );
};

export default FeatureStoreProjectSelector;
