import * as React from 'react';
import { FormGroup, Select, SelectOption, Text, Title } from '@patternfly/react-core';
import { ImageVersionSelectDataType, ImageVersionSelectOptionObjectType } from '../types';
import {
  checkTagBuildValid,
  compareImageVersionOptionOrder,
  getAvailableVersionsForImageStream,
  getImageVersionDependencies,
  getImageVersionSoftwareString,
  isImageVersionSelectOptionObject,
} from '../spawnerUtils';
import ImageVersionTooltip from './ImageVersionTooltip';

type ImageVersionSelectorProps = {
  data: ImageVersionSelectDataType;
  selectedImageVersion?: ImageVersionSelectOptionObjectType;
  onImageVersionSelect: (selection: ImageVersionSelectOptionObjectType) => void;
};

const ImageVersionSelector: React.FC<ImageVersionSelectorProps> = ({
  selectedImageVersion,
  onImageVersionSelect,
  data,
}) => {
  const [versionSelectionOpen, setVersionSelectionOpen] = React.useState<boolean>(false);

  const { imageStream, versionOptions, buildStatuses } = data;

  if (!imageStream || getAvailableVersionsForImageStream(imageStream, buildStatuses).length <= 1) {
    return null;
  }

  const options = [...versionOptions].sort(compareImageVersionOptionOrder).map((optionObject) => {
    const imageVersion = optionObject.imageVersion;
    // Cannot wrap the SelectOption with Tooltip because Select component requires SelectOption as the children
    // Can only wrap the SelectOption children with Tooltip
    // But in this way, you will only see the tooltip when you hover the option main text (excluding description), not the whole button
    return (
      <SelectOption
        key={`${imageStream.metadata.name}-${imageVersion.name}`}
        value={optionObject}
        description={getImageVersionSoftwareString(imageVersion)}
        isDisabled={!checkTagBuildValid(buildStatuses, imageStream, imageVersion)}
      >
        <ImageVersionTooltip dependencies={getImageVersionDependencies(imageVersion, false)}>
          {optionObject.toString()}
        </ImageVersionTooltip>
      </SelectOption>
    );
  });

  return (
    <FormGroup fieldId="workspace-image-version-selection">
      <Title headingLevel="h4" size="md">
        Version Selection
      </Title>
      <Text component="small">Hover an option to learn more information about the package.</Text>
      <Select
        id="workspace-image-version-selection"
        onToggle={(open) => setVersionSelectionOpen(open)}
        onSelect={(e, selection) => {
          // We know selection here is ImageVersionSelectOptionObjectType
          if (isImageVersionSelectOptionObject(selection)) {
            onImageVersionSelect(selection as ImageVersionSelectOptionObjectType);
            setVersionSelectionOpen(false);
          }
        }}
        isOpen={versionSelectionOpen}
        selections={selectedImageVersion}
        placeholderText="Select one"
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ImageVersionSelector;
