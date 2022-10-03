import * as React from 'react';
import { FormGroup, Select, SelectOption, Text, Title } from '@patternfly/react-core';
import { ImageStreamSelectDataType, ImageStreamSelectOptionObjectType } from '../types';
import {
  checkImageStreamAvailability,
  compareImageStreamOptionOrder,
  getExistingVersionsForImageStream,
  getImageVersionSoftwareString,
  isImageStreamSelectOptionObject,
} from '../spawnerUtils';
import { getDashboardMainContainer } from '../../../../../utilities/utils';

type ImageStreamSelectorProps = {
  selectedImageStream?: ImageStreamSelectOptionObjectType;
  onImageStreamSelect: (selection: ImageStreamSelectOptionObjectType) => void;
  data: ImageStreamSelectDataType;
};

const ImageStreamSelector: React.FC<ImageStreamSelectorProps> = ({
  selectedImageStream,
  onImageStreamSelect,
  data,
}) => {
  const [imageSelectionOpen, setImageSelectionOpen] = React.useState<boolean>(false);

  const { buildStatuses, imageOptions } = data;

  const options = [...imageOptions].sort(compareImageStreamOptionOrder).map((optionObject) => {
    const imageStream = optionObject.imageStream;
    const versions = getExistingVersionsForImageStream(imageStream);
    const description =
      versions.length === 1 ? getImageVersionSoftwareString(versions[0]) : undefined;
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
    <FormGroup fieldId="workspace-image-stream-selection">
      <Title headingLevel="h4" size="md">
        Image Selection
      </Title>
      <Text component="small">
        Preloaded notebook images maintained by Red Hat or independent software vendors.
      </Text>
      <Select
        id="workspace-image-stream-selection"
        onToggle={(open) => setImageSelectionOpen(open)}
        onSelect={(e, selection) => {
          // We know selection here is ImageStreamSelectOptionObjectType
          if (isImageStreamSelectOptionObject(selection)) {
            onImageStreamSelect(selection);
            setImageSelectionOpen(false);
          }
        }}
        isOpen={imageSelectionOpen}
        selections={selectedImageStream}
        placeholderText="Select one"
        menuAppendTo={getDashboardMainContainer}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ImageStreamSelector;
