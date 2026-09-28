import { Divider, FormGroup, MenuItem } from '@patternfly/react-core';
import * as React from 'react';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import ProjectScopedPopover from '@odh-dashboard/ui-core/components/ProjectScopedPopover';
import ProjectScopedIcon from '@odh-dashboard/ui-core/components/searchSelector/ProjectScopedIcon';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '@odh-dashboard/ui-core/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '@odh-dashboard/ui-core/components/searchSelector/ProjectScopedToggleContent';
import { BuildStatus } from '#~/pages/projects/screens/spawner/types';
import {
  checkImageStreamAvailability,
  getImageStreamDisplayName,
  getRelatedVersionDescription,
  isCompatibleWithIdentifier,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import { ImageStreamKind } from '#~/k8sTypes';
import { ImageStreamDropdownLabel } from '#~/pages/projects/screens/spawner/imageSelector/ImageStreamDropdownLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const.ts';
import { compareImageStreamTier, getImageStreamTier } from './imageTierUtils';

type ImageStreamSelectorProps = {
  currentProjectStreams?: ImageStreamKind[];
  currentProject?: string;
  imageStreams: ImageStreamKind[];
  buildStatuses: BuildStatus[];
  selectedImageStream?: ImageStreamKind;
  onImageStreamSelect: (selection: ImageStreamKind) => void;
  compatibleIdentifiers?: string[];
};

const ImageStreamSelector: React.FC<ImageStreamSelectorProps> = ({
  currentProjectStreams,
  currentProject,
  imageStreams,
  selectedImageStream,
  onImageStreamSelect,
  buildStatuses,
  compatibleIdentifiers,
}) => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [searchImageStreamName, setSearchImageStreamName] = React.useState('');

  const filteredCurrentImageStreams =
    currentProjectStreams
      ?.toSorted(compareImageStreamTier)
      .filter((imageStream) =>
        imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
      ) || [];
  const sortedImageStreams = imageStreams.toSorted(compareImageStreamTier);
  const filteredImageStreams = sortedImageStreams.filter((imageStream) =>
    imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
  );

  const renderMenuItem = (
    imageStream: ImageStreamKind,
    index: number,
    scope: 'project' | 'global',
  ) => {
    const streams = scope === 'project' ? filteredCurrentImageStreams : filteredImageStreams;
    const tier = getImageStreamTier(imageStream);
    const startsNewTier = index > 0 && getImageStreamTier(streams[index - 1]) !== tier;

    return (
      <React.Fragment key={`${scope}-imageStream-${imageStream.metadata.name}`}>
        {startsNewTier ? <Divider component="li" /> : null}
        <MenuItem
          isSelected={
            selectedImageStream &&
            getImageStreamDisplayName(selectedImageStream) ===
              getImageStreamDisplayName(imageStream) &&
            selectedImageStream.metadata.namespace === imageStream.metadata.namespace
          }
          onClick={() => onImageStreamSelect(imageStream)}
          icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
          description={getRelatedVersionDescription(imageStream)}
        >
          <ImageStreamDropdownLabel
            displayName={getImageStreamDisplayName(imageStream)}
            tier={tier}
            compatible={
              !!compatibleIdentifiers?.some((identifier) =>
                isCompatibleWithIdentifier(identifier, imageStream),
              )
            }
            content="hardware profile"
          />
        </MenuItem>
      </React.Fragment>
    );
  };

  const tiers = Array.from(new Set(sortedImageStreams.map(getImageStreamTier)));
  const groupedOptions = tiers.map((tier) => ({
    key: tier,
    label: tier,
    options: sortedImageStreams
      .filter((imageStream) => getImageStreamTier(imageStream) === tier)
      .map((imageStream): SimpleSelectOption => {
        const description = getRelatedVersionDescription(imageStream);
        const displayName = getImageStreamDisplayName(imageStream);
        const compatible = !!compatibleIdentifiers?.some((identifier) =>
          isCompatibleWithIdentifier(identifier, imageStream),
        );
        return {
          key: imageStream.metadata.name,
          label: displayName,
          description,
          isDisabled: !checkImageStreamAvailability(imageStream, buildStatuses),
          dropdownLabel: (
            <ImageStreamDropdownLabel
              displayName={displayName}
              tier={tier}
              compatible={compatible}
              content="hardware profile"
            />
          ),
        };
      }),
  }));

  return (
    <FormGroup
      isRequired
      label="Image selection"
      fieldId="workbench-image-stream-selection"
      labelHelp={
        isProjectScopedAvailable && currentProjectStreams && currentProjectStreams.length > 0 ? (
          <ProjectScopedPopover title="Workbench image" item="images" />
        ) : undefined
      }
    >
      {isProjectScopedAvailable && currentProjectStreams && currentProjectStreams.length > 0 ? (
        <ProjectScopedSearchDropdown
          projectScopedItems={filteredCurrentImageStreams}
          globalScopedItems={filteredImageStreams}
          renderMenuItem={renderMenuItem}
          searchValue={searchImageStreamName}
          onSearchChange={setSearchImageStreamName}
          onSearchClear={() => setSearchImageStreamName('')}
          toggleContent={
            <ProjectScopedToggleContent
              displayName={
                selectedImageStream ? getImageStreamDisplayName(selectedImageStream) : undefined
              }
              isProject={
                selectedImageStream
                  ? selectedImageStream.metadata.namespace === currentProject
                  : false
              }
              projectLabel={ScopedType.Project}
              globalLabel={ScopedType.Global}
              fallback="Select one"
            />
          }
          projectGroupLabel={
            <ProjectScopedGroupLabel isProject>{ScopedType.Project} images</ProjectScopedGroupLabel>
          }
          globalGroupLabel={
            <ProjectScopedGroupLabel isProject={false}>
              {ScopedType.Global} images
            </ProjectScopedGroupLabel>
          }
          dataTestId="image-stream-selector"
          projectGroupTestId="project-scoped-notebook-images"
          globalGroupTestId="global-scoped-notebook-images"
          isFullWidth
        />
      ) : (
        <SimpleSelect
          isScrollable
          isFullWidth
          id="workbench-image-stream-selection"
          dataTestId="workbench-image-stream-selection"
          aria-label="Select an image"
          groupedOptions={groupedOptions}
          placeholder="Select one"
          value={
            selectedImageStream?.metadata.namespace !== currentProject
              ? selectedImageStream?.metadata.name
              : ''
          }
          popperProps={{ appendTo: 'inline' }}
          onChange={(key) => {
            const imageStream = imageStreams.find(
              (currentImageStream) => currentImageStream.metadata.name === key,
            );
            if (imageStream) {
              onImageStreamSelect(imageStream);
            }
          }}
        />
      )}
    </FormGroup>
  );
};

export default ImageStreamSelector;
