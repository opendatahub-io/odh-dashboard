import * as React from 'react';
import {
  ClipboardCopy,
  DescriptionList,
  Flex,
  FlexItem,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '~/components/EditableTextDescriptionListGroup';
import EditableLabelsDescriptionListGroup from '~/components/EditableLabelsDescriptionListGroup';
import ModelPropertiesDescriptionListGroup from '~/pages/modelRegistry/screens/ModelPropertiesDescriptionListGroup';
import { getLabels, mergeUpdatedLabels } from '~/pages/modelRegistry/screens/utils';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { uriToObjectStorageFields } from '~/concepts/modelRegistry/utils';

type ModelVersionDetailsViewProps = {
  modelVersion: ModelVersion;
  refresh: () => void;
};

const ModelVersionDetailsView: React.FC<ModelVersionDetailsViewProps> = ({
  modelVersion: mv,
  refresh,
}) => {
  const [modelArtifact] = useModelArtifactsByVersionId(mv.id);
  const { apiState } = React.useContext(ModelRegistryContext);
  const storageFields = uriToObjectStorageFields(modelArtifact.items[0]?.uri || '');

  return (
    <Flex
      direction={{ default: 'column', md: 'row' }}
      columnGap={{ default: 'columnGap4xl' }}
      rowGap={{ default: 'rowGapLg' }}
    >
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <EditableTextDescriptionListGroup
            testid="model-version-description"
            title="Description"
            contentWhenEmpty="No description"
            value={mv.description || ''}
            saveEditedValue={(value) =>
              apiState.api
                .patchModelVersion(
                  {},
                  {
                    description: value,
                  },
                  mv.id,
                )
                .then(refresh)
            }
          />
          <EditableLabelsDescriptionListGroup
            labels={getLabels(mv.customProperties)}
            allExistingKeys={Object.keys(mv.customProperties)}
            saveEditedLabels={(editedLabels) =>
              apiState.api
                .patchModelVersion(
                  {},
                  {
                    customProperties: mergeUpdatedLabels(mv.customProperties, editedLabels),
                  },
                  mv.id,
                )
                .then(refresh)
            }
          />
          <ModelPropertiesDescriptionListGroup
            customProperties={mv.customProperties}
            saveEditedCustomProperties={(editedProperties) =>
              apiState.api
                .patchModelVersion({}, { customProperties: editedProperties }, mv.id)
                .then(refresh)
            }
          />
        </DescriptionList>
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <DashboardDescriptionListGroup
            title="Version ID"
            isEmpty={!mv.id}
            contentWhenEmpty="No model ID"
          >
            <ClipboardCopy
              data-testid="model-version-id"
              hoverTip="Copy"
              clickTip="Copied"
              variant="inline-compact"
            >
              {mv.id}
            </ClipboardCopy>
          </DashboardDescriptionListGroup>
          <Title headingLevel={TextVariants.h3}>Model location</Title>
          {storageFields && (
            <>
              <DashboardDescriptionListGroup
                title="Endpoint"
                isEmpty={modelArtifact.size === 0 || !storageFields.endpoint}
                contentWhenEmpty="No endpoint"
              >
                <ClipboardCopy
                  data-testid="storage-endpoint"
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant="inline-compact"
                >
                  {storageFields.endpoint}
                </ClipboardCopy>
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Region"
                isEmpty={modelArtifact.size === 0 || !storageFields.region}
                contentWhenEmpty="No region"
              >
                <ClipboardCopy
                  data-testid="storage-region"
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant="inline-compact"
                >
                  {storageFields.region}
                </ClipboardCopy>
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Bucket"
                isEmpty={modelArtifact.size === 0 || !storageFields.bucket}
                contentWhenEmpty="No bucket"
              >
                <ClipboardCopy
                  data-testid="storage-bucket"
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant="inline-compact"
                >
                  {storageFields.bucket}
                </ClipboardCopy>
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Path"
                isEmpty={modelArtifact.size === 0 || !storageFields.path}
                contentWhenEmpty="No path"
              >
                <ClipboardCopy
                  data-testid="storage-path"
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant="inline-compact"
                >
                  {storageFields.path}
                </ClipboardCopy>
              </DashboardDescriptionListGroup>
            </>
          )}
          {!storageFields && (
            <>
              <DashboardDescriptionListGroup
                title="URI"
                isEmpty={modelArtifact.size === 0 || !modelArtifact.items[0].uri}
                contentWhenEmpty="No URI"
              >
                <ClipboardCopy
                  data-testid="storage-uri"
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant="inline-compact"
                >
                  {modelArtifact.items[0]?.uri}
                </ClipboardCopy>
              </DashboardDescriptionListGroup>
            </>
          )}
          <DashboardDescriptionListGroup
            title="Source model format"
            isEmpty={modelArtifact.size === 0 || !modelArtifact.items[0].modelFormatName}
            contentWhenEmpty="No source model format"
          >
            {modelArtifact.items[0]?.modelFormatName}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Author"
            tooltip={
              <DashboardHelpTooltip content="The author is the user who registered the model version." />
            }
          >
            {mv.author}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Last modified at"
            isEmpty={!mv.lastUpdateTimeSinceEpoch}
            contentWhenEmpty="Unknown"
          >
            <ModelTimestamp timeSinceEpoch={mv.lastUpdateTimeSinceEpoch} />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Registered"
            isEmpty={!mv.createTimeSinceEpoch}
            contentWhenEmpty="Unknown"
          >
            <ModelTimestamp timeSinceEpoch={mv.createTimeSinceEpoch} />
          </DashboardDescriptionListGroup>
        </DescriptionList>
      </FlexItem>
    </Flex>
  );
};
export default ModelVersionDetailsView;
