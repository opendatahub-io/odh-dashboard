import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
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
  const [versionSelectionOpen, setVersionSelectionOpen] = React.useState(false);

  const { imageStream, buildStatuses, imageVersions } = data;

  if (!imageStream || getAvailableVersionsForImageStream(imageStream, buildStatuses).length <= 1) {
    return null;
  }

  const selectOptionObjects = [...imageVersions]
    .sort(compareImageVersionOrder)
    .map((imageVersion) => getImageVersionSelectOptionObject(imageStream, imageVersion));

  const options = selectOptionObjects.map((optionObject) => {
    const { imageVersion } = optionObject;
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

  const isSelectedImageVersionOutOfDate =
    selectedImageVersion && isElyraVersionOutOfDate(selectedImageVersion);

  return (
    <FormGroup isRequired label="Version selection" fieldId="workbench-image-version-selection">
      <Select
        id="workbench-image-version-selection"
        toggle={(toggleRef) => (
          <MenuToggle
            isFullWidth
            ref={toggleRef}
            onClick={() => setVersionSelectionOpen(!versionSelectionOpen)}
            isExpanded={versionSelectionOpen}
          >
            {selectedImageVersion?.name ?? 'Select one'}
          </MenuToggle>
        )}
        onSelect={(e, selection) => {
          // We know selection here is ImageVersionSelectOptionObjectType
          if (isImageVersionSelectOptionObject(selection)) {
            setSelectedImageVersion(selection.imageVersion);
            setVersionSelectionOpen(false);
          }
        }}
        aria-label="Image version select"
        isOpen={versionSelectionOpen}
        selected={selectedImageVersion}
        onOpenChange={(isOpen) => setVersionSelectionOpen(isOpen)}
        shouldFocusToggleOnSelect
      >
        <SelectList>{options}</SelectList>
      </Select>
      <FormHelperText>
        {isSelectedImageVersionOutOfDate && (
          <Alert
            variant="info"
            isInline
            isPlain
            title="A new image version is available. Select the latest image version to use Elyra for pipelines."
          />
        )}

        <HelperText>
          <HelperTextItem>
            Hover an option to learn more information about the packages included.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ImageVersionSelector;
