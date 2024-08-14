import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { ImageVersionSelectDataType } from '~/pages/projects/screens/spawner/types';
import {
  checkTagBuildValid,
  compareImageVersionOrder,
  getAvailableVersionsForImageStream,
  getImageVersionDependencies,
  getImageVersionSelectOptionObject,
  getImageVersionSoftwareString,
  isImageVersionSelectOptionObject,
} from '~/pages/projects/screens/spawner/spawnerUtils';
import { ImageStreamSpecTagType } from '~/k8sTypes';
import { isElyraVersionOutOfDate } from '~/concepts/pipelines/elyra/utils';
import SimpleSelect from '~/components/SimpleSelect';
import ImageVersionTooltip from './ImageVersionTooltip';

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
  const { imageStream, buildStatuses, imageVersions } = data;

  if (!imageStream || getAvailableVersionsForImageStream(imageStream, buildStatuses).length <= 1) {
    return null;
  }

  const selectOptionObjects = imageVersions
    .toSorted(compareImageVersionOrder)
    .map((imageVersion) => getImageVersionSelectOptionObject(imageStream, imageVersion));

  const options = selectOptionObjects.map((optionObject) => {
    const { imageVersion } = optionObject;
    // Cannot wrap the SelectOption with Tooltip because Select component requires SelectOption as the children
    // Can only wrap the SelectOption children with Tooltip
    // But in this way, you will only see the tooltip when you hover the option main text (excluding description), not the whole button
    return {
      key: `${imageStream.metadata.name}-${imageVersion.name}`,
      label: `${imageStream.metadata.name}-${imageVersion.name}`,
      dropdownLabel: (
        <ImageVersionTooltip dependencies={getImageVersionDependencies(imageVersion, false)}>
          {optionObject.toString()}
        </ImageVersionTooltip>
      ),
      description: getImageVersionSoftwareString(imageVersion),
      isDisabled: !checkTagBuildValid(buildStatuses, imageStream, imageVersion),
    };
  });

  const isSelectedImageVersionOutOfDate =
    selectedImageVersion && isElyraVersionOutOfDate(selectedImageVersion);

  return (
    <FormGroup isRequired label="Version selection" fieldId="workbench-image-version-selection">
      <SimpleSelect
        options={options}
        onChange={(selection) => {
          const selectedObject = selectOptionObjects.find(
            (o) => selection === `${imageStream.metadata.name}-${o.imageVersion.name}`,
          );
          // We know selection here is ImageVersionSelectOptionObjectType
          if (selectedObject && isImageVersionSelectOptionObject(selectedObject)) {
            setSelectedImageVersion(selectedObject.imageVersion);
          }
        }}
        id="workbench-image-version-selection"
        isFullWidth
        value={
          selectedImageVersion
            ? `${imageStream.metadata.name}-${selectedImageVersion.name}`
            : undefined
        }
        toggleLabel={selectedImageVersion?.name ?? 'Select one'}
        aria-label="Image version select"
      />
      <FormHelperText>
        {isSelectedImageVersionOutOfDate && (
          <Alert
            variant="info"
            isInline
            isPlain
            title="A new image version is available. Select the recommended version to use Elyra for pipelines."
          />
        )}

        <HelperText>
          <HelperTextItem>Hover over a version to view its included packages.</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ImageVersionSelector;
