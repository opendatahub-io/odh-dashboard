import {
  Divider,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { upperFirst } from 'lodash-es';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
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

  const matchesSearch = (imageStream: ImageStreamKind) =>
    [
      imageStream.metadata.name,
      getImageStreamDisplayName(imageStream),
      getImageStreamTier(imageStream),
    ].some((value) => value.toLowerCase().includes(searchImageStreamName.trim().toLowerCase()));
  const filteredCurrentImageStreams =
    currentProjectStreams?.toSorted(compareImageStreamTier).filter(matchesSearch) || [];
  const sortedImageStreams = imageStreams.toSorted(compareImageStreamTier);
  const filteredImageStreams = sortedImageStreams.filter(matchesSearch);

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

  const options: TypeaheadSelectOption[] = sortedImageStreams.map((imageStream) => ({
    value: imageStream.metadata.name,
    content: getImageStreamDisplayName(imageStream),
    group: upperFirst(getImageStreamTier(imageStream)),
    description: getRelatedVersionDescription(imageStream),
    isDisabled: !checkImageStreamAvailability(imageStream, buildStatuses),
    'data-testid': imageStream.metadata.name,
    dropdownLabel: (
      <ImageStreamDropdownLabel
        tier={getImageStreamTier(imageStream)}
        compatible={
          !!compatibleIdentifiers?.some((identifier) =>
            isCompatibleWithIdentifier(identifier, imageStream),
          )
        }
        content="hardware profile"
      />
    ),
  }));
  const selectedOption =
    selectedImageStream?.metadata.namespace !== currentProject
      ? options.find((option) => option.value === selectedImageStream?.metadata.name)
      : undefined;

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
          searchFocusOnOpen
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
        <>
          <TypeaheadSelect
            isScrollable
            id="workbench-image-stream-selection"
            dataTestId="workbench-image-stream-selection"
            aria-label="Select an image"
            selectOptions={options}
            selected={selectedOption?.value}
            placeholder="Select one"
            previewDescription={false}
            filterFunction={(query, selectOptions) =>
              selectOptions.filter((option) =>
                [option.content, option.value, option.group].some((text) =>
                  String(text ?? '')
                    .toLowerCase()
                    .includes(query.trim().toLowerCase()),
                ),
              )
            }
            popperProps={{ appendTo: 'inline' }}
            onSelect={(_event, key) => {
              if (key === selectedImageStream?.metadata.name) {
                return;
              }
              const imageStream = imageStreams.find(
                (currentImageStream) => currentImageStream.metadata.name === key,
              );
              if (imageStream) {
                onImageStreamSelect(imageStream);
              }
            }}
          />
          {selectedOption?.description ? (
            <FormHelperText>
              <HelperText isLiveRegion>
                <HelperTextItem>
                  <TruncatedText maxLines={2} content={selectedOption.description} />
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </>
      )}
    </FormGroup>
  );
};

export default ImageStreamSelector;
