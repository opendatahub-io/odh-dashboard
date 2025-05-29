import * as React from 'react';
import {
  Alert,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Timestamp,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { ImageVersionSelectDataType } from '~/pages/projects/screens/spawner/types';
import {
  checkTagBuildValid,
  compareImageVersionOrder,
  getAvailableVersionsForImageStream,
  getImageVersionBuildDate,
  getImageVersionDependencies,
  getImageVersionSelectOptionObject,
  getImageVersionSoftwareString,
  isImageVersionSelectOptionObject,
} from '~/pages/projects/screens/spawner/spawnerUtils';
import { ImageStreamSpecTagType } from '~/k8sTypes';
import { isElyraVersionOutOfDate } from '~/concepts/pipelines/elyra/utils';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
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

  const options = selectOptionObjects.map((optionObject): SimpleSelectOption => {
    const { imageVersion, imageStreamTag } = optionObject;
    const imageBuildDate = getImageVersionBuildDate(imageVersion, imageStreamTag);

    // Cannot wrap the SelectOption with Tooltip because Select component requires SelectOption as the children
    // Can only wrap the SelectOption children with Tooltip
    // But in this way, you will only see the tooltip when you hover the option main text (excluding description), not the whole button
    return {
      key: `${imageStream.metadata.name}-${imageVersion.name}`,
      label: `${imageStream.metadata.name}-${imageVersion.name}`,
      dropdownLabel: (
        <ImageVersionTooltip dependencies={getImageVersionDependencies(imageVersion, false)}>
          <Flex>
            <FlexItem>
              {`${optionObject.imageVersion.name} ${
                optionObject.imageVersion.annotations?.['opendatahub.io/notebook-build-commit']
                  ? `(${optionObject.imageVersion.annotations['opendatahub.io/notebook-build-commit']})`
                  : ''
              }`}
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              {optionObject.imageVersion.annotations?.[
                'opendatahub.io/workbench-image-recommended'
              ] === 'true' && (
                <Label
                  data-testid="notebook-image-availability"
                  isCompact
                  color="green"
                  icon={<CheckCircleIcon />}
                >
                  Latest
                </Label>
              )}
            </FlexItem>
          </Flex>
        </ImageVersionTooltip>
      ),
      description: (
        <div>
          <div data-testid="workbench-image-version-software">
            Software: {getImageVersionSoftwareString(imageVersion)}
          </div>
          {imageBuildDate && (
            <div data-testid="workbench-image-version-build-date">
              Build date: <Timestamp date={new Date(imageBuildDate)} shouldDisplayUTC />
            </div>
          )}
        </div>
      ),
      isDisabled: !checkTagBuildValid(buildStatuses, imageStream, imageVersion),
    };
  });

  const isSelectedImageVersionOutOfDate =
    selectedImageVersion && isElyraVersionOutOfDate(selectedImageVersion);

  return (
    <FormGroup isRequired label="Version selection" fieldId="workbench-image-version-selection">
      <SimpleSelect
        data-testid="workbench-image-version-dropdown"
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
        dataTestId="workbench-image-version-selection"
        isFullWidth
        value={
          selectedImageVersion
            ? `${imageStream.metadata.name}-${selectedImageVersion.name}`
            : undefined
        }
        toggleLabel={selectedImageVersion?.name}
        placeholder="Select one"
        aria-label="Image version select"
        popperProps={{ appendTo: 'inline' }}
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
