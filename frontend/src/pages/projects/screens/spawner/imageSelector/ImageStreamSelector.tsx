import { FormGroup, MenuItem } from '@patternfly/react-core';
import * as React from 'react';
import ProjectScopedPopover from '#~/components/ProjectScopedPopover';
import { BuildStatus } from '#~/pages/projects/screens/spawner/types';
import {
  checkImageStreamAvailability,
  compareImageStreamOrder,
  getImageStreamDisplayName,
  getRelatedVersionDescription,
  isCompatibleWithIdentifier,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import { ImageStreamKind } from '#~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import ProjectScopedIcon from '#~/components/searchSelector/ProjectScopedIcon.tsx';
import { ImageStreamDropdownLabel } from '#~/pages/projects/screens/spawner/imageSelector/ImageStreamDropdownLabel';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '#~/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '#~/components/searchSelector/ProjectScopedToggleContent';
import { ScopedType } from '#~/pages/modelServing/screens/const.ts';

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
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [searchImageStreamName, setSearchImageStreamName] = React.useState('');

  const filteredCurrentImageStreams =
    currentProjectStreams?.filter((imageStream) =>
      imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
    ) || [];
  const filteredImageStreams = imageStreams.filter((imageStream) =>
    imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
  );

  const renderMenuItem = (
    imageStream: ImageStreamKind,
    index: number,
    scope: 'project' | 'global',
  ) => (
    <MenuItem
      key={`${index}-${scope}-imageStream-${imageStream.metadata.name}`}
      isSelected={
        selectedImageStream &&
        getImageStreamDisplayName(selectedImageStream) === getImageStreamDisplayName(imageStream) &&
        selectedImageStream.metadata.namespace === imageStream.metadata.namespace
      }
      onClick={() => onImageStreamSelect(imageStream)}
      icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
    >
      <ImageStreamDropdownLabel
        displayName={getImageStreamDisplayName(imageStream)}
        compatible={
          !!compatibleIdentifiers?.some((identifier) =>
            isCompatibleWithIdentifier(identifier, imageStream),
          )
        }
        content={isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
      />
    </MenuItem>
  );

  const options = imageStreams
    .toSorted(compareImageStreamOrder)
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
            compatible={compatible}
            content={isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
          />
        ),
      };
    });

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
          isFullWidth
        />
      ) : (
        <SimpleSelect
          isScrollable
          isFullWidth
          id="workbench-image-stream-selection"
          dataTestId="workbench-image-stream-selection"
          aria-label="Select an image"
          options={options}
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
