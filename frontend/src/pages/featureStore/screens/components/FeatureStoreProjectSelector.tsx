import { Bullseye, Divider, Flex, FlexItem, MenuItem, Truncate } from '@patternfly/react-core';
import React from 'react';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import { FeatureStoreProject } from '#~/pages/featureStore/types/featureStoreProjects';
import useFeatureStoreProjects from '#~/pages/featureStore/apiHooks/useFeatureStoreProjects';
import { FeatureStoreObject } from '#~/pages/featureStore/const';

type FeatureStoreProjectSelectorProps = {
  featureStoreProject: string;
  featureStoreObject: FeatureStoreObject;
  onSelection: (featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => void;
};

const FeatureStoreProjectSelector: React.FC<FeatureStoreProjectSelectorProps> = ({
  featureStoreProject,
  featureStoreObject,
  onSelection,
}) => {
  const { data: featureStoreProjects } = useFeatureStoreProjects();
  const [searchText, setSearchText] = React.useState('');
  const selection = featureStoreProjects.projects.find(
    (project) => project.spec.name === featureStoreProject,
  );
  const selectionName = selection ? selection.spec.name : 'All projects';
  const bySearchText = React.useCallback(
    (project: FeatureStoreProject) =>
      !searchText || project.spec.name.toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );
  const filteredProjects = featureStoreProjects.projects.filter(bySearchText);
  const toggleLabel = featureStoreProjects.projects.length === 0 ? 'No projects' : selectionName;

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
            onSelection(featureStoreObject);
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
              onSelection(featureStoreObject, project.spec.name);
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
