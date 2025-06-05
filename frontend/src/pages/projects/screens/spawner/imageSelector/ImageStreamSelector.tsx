import * as React from 'react';
import {
  Divider,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  MenuGroup,
  MenuItem,
  Split,
  SplitItem,
} from '@patternfly/react-core';
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
import GlobalIcon from '#~/images/icons/GlobalIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import ProjectScopedPopover from '#~/components/ProjectScopedPopover';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';

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

  const getFilteredImageStreams = () => {
    const filteredCurrentImageStreams =
      currentProjectStreams?.filter((imageStream) =>
        imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
      ) || [];
    const filteredImageStreams = imageStreams.filter((imageStream) =>
      imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
    );

    return (
      <>
        {filteredCurrentImageStreams.length > 0 && (
          <MenuGroup
            data-testid="project-scoped-notebook-images"
            label={
              <Flex
                spaceItems={{ default: 'spaceItemsXs' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ paddingBottom: '5px' }}
              >
                <FlexItem style={{ display: 'flex', paddingLeft: '12px' }}>
                  <TypedObjectIcon
                    style={{ height: '12px', width: '12px' }}
                    alt=""
                    resourceType={ProjectObjectType.project}
                  />
                </FlexItem>
                <FlexItem>Project-scoped images</FlexItem>
              </Flex>
            }
          >
            {filteredCurrentImageStreams.map((imageStream, index) => (
              <MenuItem
                key={`imageStream-${index}`}
                isSelected={
                  selectedImageStream &&
                  getImageStreamDisplayName(selectedImageStream) ===
                    getImageStreamDisplayName(imageStream) &&
                  selectedImageStream.metadata.namespace === imageStream.metadata.namespace
                }
                onClick={() => onImageStreamSelect(imageStream)}
              >
                <Flex
                  spaceItems={{ default: 'spaceItemsXs' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem>
                    <TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />
                  </FlexItem>
                  <FlexItem>{getImageStreamDisplayName(imageStream)}</FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    {compatibleIdentifiers?.some((identifier) =>
                      isCompatibleWithIdentifier(identifier, imageStream),
                    ) && (
                      <Label color="blue">
                        Compatible with
                        {isHardwareProfilesAvailable ? ' hardware profile' : ' accelerator'}
                      </Label>
                    )}
                  </FlexItem>
                </Flex>
              </MenuItem>
            ))}
          </MenuGroup>
        )}
        {filteredCurrentImageStreams.length > 0 && filteredImageStreams.length > 0 && (
          <Divider component="li" />
        )}
        {filteredImageStreams.length > 0 && (
          <MenuGroup
            data-testid="global-scoped-notebook-images"
            label={
              <Flex
                spaceItems={{ default: 'spaceItemsXs' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem style={{ display: 'flex', paddingLeft: '12px' }}>
                  <GlobalIcon style={{ height: '12px', width: '12px' }} />
                </FlexItem>
                <FlexItem> Global images </FlexItem>
              </Flex>
            }
          >
            {filteredImageStreams.map((imageStream, index) => (
              <MenuItem
                key={`imageStream-global-${index}`}
                isSelected={
                  selectedImageStream &&
                  getImageStreamDisplayName(selectedImageStream) ===
                    getImageStreamDisplayName(imageStream) &&
                  selectedImageStream.metadata.namespace === imageStream.metadata.namespace
                }
                onClick={() => onImageStreamSelect(imageStream)}
              >
                <Flex
                  spaceItems={{ default: 'spaceItemsXs' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem>
                    <GlobalIcon />
                  </FlexItem>
                  <FlexItem>{getImageStreamDisplayName(imageStream)}</FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    {compatibleIdentifiers?.some((identifier) =>
                      isCompatibleWithIdentifier(identifier, imageStream),
                    ) && (
                      <Label color="blue">
                        Compatible with
                        {isHardwareProfilesAvailable ? ' hardware profile' : ' accelerator'}
                      </Label>
                    )}
                  </FlexItem>
                </Flex>
              </MenuItem>
            ))}
          </MenuGroup>
        )}
        {filteredCurrentImageStreams.length === 0 && filteredImageStreams.length === 0 && (
          <MenuItem isDisabled>No results found</MenuItem>
        )}
      </>
    );
  };

  const options = imageStreams
    .toSorted(compareImageStreamOrder)
    .map((imageStream): SimpleSelectOption => {
      const description = getRelatedVersionDescription(imageStream);
      const displayName = getImageStreamDisplayName(imageStream);

      return {
        key: imageStream.metadata.name,
        label: displayName,
        description,
        isDisabled: !checkImageStreamAvailability(imageStream, buildStatuses),
        dropdownLabel: (
          <Split>
            <SplitItem>{displayName}</SplitItem>
            <SplitItem isFilled />
            <SplitItem>
              {compatibleIdentifiers?.some((identifier) =>
                isCompatibleWithIdentifier(identifier, imageStream),
              ) && (
                <Label color="blue">
                  Compatible with{' '}
                  {isHardwareProfilesAvailable ? ' hardware profile' : ' accelerator'}
                </Label>
              )}
            </SplitItem>
          </Split>
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
        <SearchSelector
          isFullWidth
          dataTestId="image-stream-selector"
          onSearchChange={(newValue) => setSearchImageStreamName(newValue)}
          onSearchClear={() => setSearchImageStreamName('')}
          searchValue={searchImageStreamName}
          toggleContent={
            selectedImageStream ? (
              <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>{getImageStreamDisplayName(selectedImageStream)}</FlexItem>
                <FlexItem>
                  {selectedImageStream.metadata.namespace === currentProject ? (
                    <Label
                      isCompact
                      variant="outline"
                      color="blue"
                      data-testid="project-scoped-label"
                      icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
                    >
                      Project-scoped
                    </Label>
                  ) : (
                    <Label
                      isCompact
                      variant="outline"
                      data-testid="global-scoped-label"
                      color="blue"
                      icon={<GlobalIcon />}
                    >
                      Global-scoped
                    </Label>
                  )}
                </FlexItem>
              </Flex>
            ) : (
              'Select one'
            )
          }
        >
          {getFilteredImageStreams()}
        </SearchSelector>
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
