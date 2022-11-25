import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { ImageVersionSelectDataType } from '../types';
import {
  checkTagBuildValid,
  compareImageVersionOrder,
  getAvailableVersionsForImageStream,
  getImageVersionDependencies,
  getImageVersionSelectOptionObject,
  getImageVersionSoftwareString,
  isImageVersionSelectOptionObject,
} from '../spawnerUtils';
import ImageVersionTooltip from './ImageVersionTooltip';
import { ImageStreamSpecTagType } from '../../../../../k8sTypes';

type ImageVersionSelectorProps = {
  data: ImageVersionSelectDataType;
  selectedImageVersion?: ImageStreamSpecTagType;
  setSelectedImageVersion: (selection: ImageStreamSpecTagType) => void;
};

const ImageVersionSelector: React.FC<ImageVersionSelectorProps> = ({
  selectedImageVersion,
  setSelectedImageVersion,
  data,
}) => {
  const [versionSelectionOpen, setVersionSelectionOpen] = React.useState(false);

  const { imageStream, buildStatuses, imageVersions } = data;

  if (!imageStream || getAvailableVersionsForImageStream(imageStream, buildStatuses).length <= 1) {
    return null;
  }

  const selectOptionObjects = [...imageVersions]
    .sort(compareImageVersionOrder)
    .map((imageVersion) => getImageVersionSelectOptionObject(imageStream, imageVersion));

  const options = selectOptionObjects.map((optionObject) => {
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
    <FormGroup
      isRequired
      label="Version selection"
      helperText="Hover an option to learn more information about the package."
      fieldId="workbench-image-version-selection"
    >
      <Select
        id="workbench-image-version-selection"
        onToggle={(open) => setVersionSelectionOpen(open)}
        onSelect={(e, selection) => {
          // We know selection here is ImageVersionSelectOptionObjectType
          if (isImageVersionSelectOptionObject(selection)) {
            setSelectedImageVersion(selection.imageVersion);
            setVersionSelectionOpen(false);
          }
        }}
        isOpen={versionSelectionOpen}
        selections={selectOptionObjects.find(
          (optionObject) => optionObject.imageVersion.name === selectedImageVersion?.name,
        )}
        placeholderText="Select one"
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ImageVersionSelector;
