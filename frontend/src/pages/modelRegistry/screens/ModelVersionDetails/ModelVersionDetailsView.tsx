import * as React from 'react';
import { DescriptionList, Flex, FlexItem, TextVariants, Title } from '@patternfly/react-core';
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
import InlineTruncatedClipboardCopy from '~/components/InlineTruncatedClipboardCopy';

type ModelVersionDetailsViewProps = {
  modelVersion: ModelVersion;
  isArchiveVersion?: boolean;
  refresh: () => void;
};

const ModelVersionDetailsView: React.FC<ModelVersionDetailsViewProps> = ({
  modelVersion: mv,
  isArchiveVersion,
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
            isArchive={isArchiveVersion}
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
            isArchive={isArchiveVersion}
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
            isArchive={isArchiveVersion}
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
            <InlineTruncatedClipboardCopy testId="model-version-id" textToCopy={mv.id} />
          </DashboardDescriptionListGroup>
        </DescriptionList>
        <Title style={{ marginTop: '1em' }} headingLevel={TextVariants.h3}>
          Model location
        </Title>
        <DescriptionList isFillColumns>
          {storageFields && (
            <>
              <DashboardDescriptionListGroup
                title="Endpoint"
                isEmpty={modelArtifact.size === 0 || !storageFields.endpoint}
                contentWhenEmpty="No endpoint"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-endpoint"
                  textToCopy={storageFields.endpoint}
                />
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Region"
                isEmpty={modelArtifact.size === 0 || !storageFields.region}
                contentWhenEmpty="No region"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-region"
                  textToCopy={storageFields.region || ''}
                />
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Bucket"
                isEmpty={modelArtifact.size === 0 || !storageFields.bucket}
                contentWhenEmpty="No bucket"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-bucket"
                  textToCopy={storageFields.bucket}
                />
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Path"
                isEmpty={modelArtifact.size === 0 || !storageFields.path}
                contentWhenEmpty="No path"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-path"
                  textToCopy={storageFields.path}
                />
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
                <InlineTruncatedClipboardCopy
                  testId="storage-uri"
                  textToCopy={modelArtifact.items[0]?.uri || ''}
                />
              </DashboardDescriptionListGroup>
            </>
          )}
        </DescriptionList>
        <Title style={{ marginTop: '1em' }} headingLevel={TextVariants.h3}>
          Source model format
        </Title>
        <DescriptionList isFillColumns>
          <DashboardDescriptionListGroup
            title="Name"
            isEmpty={modelArtifact.size === 0 || !modelArtifact.items[0].modelFormatName}
            contentWhenEmpty="No source model format"
          >
            {modelArtifact.items[0]?.modelFormatName}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Version"
            isEmpty={modelArtifact.size === 0 || !modelArtifact.items[0].modelFormatVersion}
            contentWhenEmpty="No source model format version"
          >
            {modelArtifact.items[0]?.modelFormatVersion}
          </DashboardDescriptionListGroup>
        </DescriptionList>
        <DescriptionList isFillColumns style={{ marginTop: '2em' }}>
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
