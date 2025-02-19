import * as React from 'react';
import { FormGroup, Label, Split, SplitItem } from '@patternfly/react-core';
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

type ImageStreamSelectorProps = {
  imageStreams: ImageStreamKind[];
  buildStatuses: BuildStatus[];
  selectedImageStream?: ImageStreamKind;
  onImageStreamSelect: (selection: ImageStreamKind) => void;
  compatibleIdentifiers?: string[];
};

const ImageStreamSelector: React.FC<ImageStreamSelectorProps> = ({
  imageStreams,
  selectedImageStream,
  onImageStreamSelect,
  buildStatuses,
  compatibleIdentifiers,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

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
                Compatible with {isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
              </Label>
            )}
          </SplitItem>
        </Split>
      ),
    };
  });

  return (
    <FormGroup isRequired label="Image selection" fieldId="workbench-image-stream-selection">
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
    </FormGroup>
  );
};

export default ImageStreamSelector;
