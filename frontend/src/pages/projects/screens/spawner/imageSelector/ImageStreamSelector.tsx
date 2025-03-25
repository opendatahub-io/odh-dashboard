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
import { BuildStatus } from '~/pages/projects/screens/spawner/types';
import {
  checkImageStreamAvailability,
  compareImageStreamOrder,
  getImageStreamDisplayName,
  getRelatedVersionDescription,
  isCompatibleWithIdentifier,
} from '~/pages/projects/screens/spawner/spawnerUtils';
import { ImageStreamKind } from '~/k8sTypes';
import SimpleSelect from '~/components/SimpleSelect';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import GlobalIcon from '~/images/icons/GlobalIcon';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import ProjectScopedPopover from '~/components/ProjectScopedPopover';

type ImageStreamSelectorProps = {
  currentProjectStreams?: ImageStreamKind[];
  imageStreams: ImageStreamKind[];
  buildStatuses: BuildStatus[];
  selectedImageStream?: ImageStreamKind;
  onImageStreamSelect: (selection: ImageStreamKind) => void;
  compatibleIdentifiers?: string[];
};

const ImageStreamSelector: React.FC<ImageStreamSelectorProps> = ({
  currentProjectStreams,
  imageStreams,
  selectedImageStream,
  onImageStreamSelect,
  buildStatuses,
  compatibleIdentifiers,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [searchImageStreamName, setSearchImageStreamName] = React.useState('');

  const getFilteredImageStreams = () => (
    <>
      <MenuGroup
        label={
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
            style={{ paddingBottom: '5px' }}
          >
            <FlexItem
              style={{ display: 'flex', paddingLeft: '12px' }}
              data-testid="project-scoped-image"
            >
              <img
                style={{ height: 20, paddingTop: '3px' }}
                src={typedObjectImage(ProjectObjectType.project)}
                alt=""
              />
            </FlexItem>
            <FlexItem>Project-scoped images</FlexItem>
          </Flex>
        }
      >
        {currentProjectStreams &&
          currentProjectStreams
            .filter((imageStream) =>
              imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
            )
            .map((imageStream, index) => (
              <MenuItem
                key={`imageStream-${index}`}
                onClick={() => onImageStreamSelect(imageStream)}
                icon={
                  <img
                    style={{ height: 25 }}
                    src={typedObjectImage(ProjectObjectType.project)}
                    alt=""
                  />
                }
              >
                <Split>
                  {getImageStreamDisplayName(imageStream)}
                  <SplitItem isFilled />
                  <SplitItem>
                    {compatibleIdentifiers?.some((identifier) =>
                      isCompatibleWithIdentifier(identifier, imageStream),
                    ) && (
                      <Label color="blue">
                        Compatible with
                        {isHardwareProfilesAvailable ? ' hardware profile' : ' accelerator'}
                      </Label>
                    )}
                  </SplitItem>
                </Split>
              </MenuItem>
            ))}
      </MenuGroup>
      <Divider />
      <MenuGroup
        label={
          <Flex>
            <FlexItem style={{ paddingLeft: '12px', paddingRight: 0 }}>
              <GlobalIcon />
            </FlexItem>
            <FlexItem> Global images </FlexItem>
          </Flex>
        }
      >
        {imageStreams
          .filter((imageStream) =>
            imageStream.metadata.name.toLowerCase().includes(searchImageStreamName.toLowerCase()),
          )
          .map((imageStream, index) => (
            <MenuItem
              key={`imageStream-global-${index}`}
              onClick={() => onImageStreamSelect(imageStream)}
              icon={<GlobalIcon />}
            >
              <Split>
                {getImageStreamDisplayName(imageStream)}
                <SplitItem isFilled />
                <SplitItem>
                  {compatibleIdentifiers?.some((identifier) =>
                    isCompatibleWithIdentifier(identifier, imageStream),
                  ) && (
                    <Label color="blue">
                      Compatible with
                      {isHardwareProfilesAvailable ? ' hardware profile' : ' accelerator'}
                    </Label>
                  )}
                </SplitItem>
              </Split>
            </MenuItem>
          ))}
      </MenuGroup>
    </>
  );

  const options = imageStreams.toSorted(compareImageStreamOrder).map((imageStream) => {
    const description = getRelatedVersionDescription(imageStream);
    const displayName = getImageStreamDisplayName(imageStream);

    return {
      key: imageStream.metadata.name,
      label: displayName,
      description,
      disabled: !checkImageStreamAvailability(imageStream, buildStatuses),
      dropdownLabel: (
        <Split>
          <SplitItem>{displayName}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {compatibleIdentifiers?.some((identifier) =>
              isCompatibleWithIdentifier(identifier, imageStream),
            ) && (
              <Label color="blue">
                Compatible with {isHardwareProfilesAvailable ? ' hardware profile' : ' accelerator'}
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
        isProjectScopedAvailable ? (
          <ProjectScopedPopover title="Workbench image" item="images" />
        ) : (
          <></>
        )
      }
    >
      {isProjectScopedAvailable && currentProjectStreams && currentProjectStreams.length > 0 ? (
        <SearchSelector
          isFullWidth
          dataTestId="image-stream-selector"
          onSearchChange={(newValue) => setSearchImageStreamName(newValue)}
          onSearchClear={() => setSearchImageStreamName('')}
          searchValue={searchImageStreamName}
          toggleText={
            selectedImageStream && (
              <Flex>
                {getImageStreamDisplayName(selectedImageStream)}
                <FlexItem>
                  {currentProjectStreams.includes(selectedImageStream) ? (
                    <Label
                      isCompact
                      variant="outline"
                      color="blue"
                      icon={
                        <img
                          style={{ height: 20 }}
                          src={typedObjectImage(ProjectObjectType.project)}
                          alt=""
                        />
                      }
                    >
                      Project-scoped
                    </Label>
                  ) : (
                    <Label isCompact variant="outline" color="blue" icon={<GlobalIcon />}>
                      Global-scoped
                    </Label>
                  )}
                </FlexItem>
              </Flex>
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
          value={selectedImageStream?.metadata.name ?? ''}
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
