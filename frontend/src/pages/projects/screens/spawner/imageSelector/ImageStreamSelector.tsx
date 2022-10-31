import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { BuildStatus } from '../types';
import {
  checkImageStreamAvailability,
  compareImageStreamOrder,
  getImageStreamSelectOptionObject,
  getRelatedVersionDescription,
  isImageStreamSelectOptionObject,
} from '../spawnerUtils';
import { ImageStreamKind } from '../../../../../k8sTypes';

type ImageStreamSelectorProps = {
  imageStreams: ImageStreamKind[];
  buildStatuses: BuildStatus[];
  selectedImageStream?: ImageStreamKind;
  onImageStreamSelect: (selection: ImageStreamKind) => void;
};

const ImageStreamSelector: React.FC<ImageStreamSelectorProps> = ({
  imageStreams,
  selectedImageStream,
  onImageStreamSelect,
  buildStatuses,
}) => {
  const [imageSelectionOpen, setImageSelectionOpen] = React.useState<boolean>(false);

  const selectOptionObjects = [...imageStreams]
    .sort(compareImageStreamOrder)
    .map((imageStream) => getImageStreamSelectOptionObject(imageStream));

  const options = selectOptionObjects.map((optionObject) => {
    const imageStream = optionObject.imageStream;
    const description = getRelatedVersionDescription(imageStream);
    return (
      <SelectOption
        key={imageStream.metadata.name}
        value={optionObject}
        description={description}
        isDisabled={!checkImageStreamAvailability(imageStream, buildStatuses)}
      />
    );
  });

  return (
    <FormGroup
      isRequired
      helperText="Preloaded notebook images maintained by Red Hat or independent software vendors."
      label="Image selection"
      fieldId="workbench-image-stream-selection"
    >
      <Select
        id="workbench-image-stream-selection"
        onToggle={(open) => setImageSelectionOpen(open)}
        onSelect={(e, selection) => {
          // We know selection here is ImageStreamSelectOptionObjectType
          if (isImageStreamSelectOptionObject(selection)) {
            onImageStreamSelect(selection.imageStream);
            setImageSelectionOpen(false);
          }
        }}
        isOpen={imageSelectionOpen}
        selections={selectOptionObjects.find(
          (optionObject) =>
            optionObject.imageStream.metadata.name === selectedImageStream?.metadata.name,
        )}
        placeholderText="Select one"
        maxHeight={250}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ImageStreamSelector;
