import * as React from 'react';
import {
  DescriptionList,
  Divider,
  Flex,
  FlexItem,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '~/components/EditableTextDescriptionListGroup';
import { EditableLabelsDescriptionListGroup } from '~/components/EditableLabelsDescriptionListGroup';
import ModelPropertiesDescriptionListGroup from '~/pages/modelRegistry/screens/ModelPropertiesDescriptionListGroup';
import { getLabels, mergeUpdatedLabels } from '~/pages/modelRegistry/screens/utils';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
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
  // TODO handle loading state / error for artifacts here?
  const [modelArtifacts, , , refreshModelArtifacts] = useModelArtifactsByVersionId(mv.id);
  const modelArtifact = modelArtifacts.items.length ? modelArtifacts.items[0] : null;
  const { apiState } = React.useContext(ModelRegistryContext);
  const storageFields = uriToObjectStorageFields(modelArtifact?.uri || '');

  return (
    <Flex
      direction={{ default: 'column', md: 'row' }}
      columnGap={{ default: 'columnGap4xl' }}
      rowGap={{ default: 'rowGapLg' }}
    >
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <EditableTextDescriptionListGroup
            editableVariant="TextArea"
            baseTestId="model-version-description"
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
            title="Labels"
            contentWhenEmpty="No labels"
            onLabelsChange={(editedLabels) =>
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
            data-testid="model-version-labels"
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
        <Title style={{ margin: '1em 0' }} headingLevel={TextVariants.h3}>
          Model location
        </Title>
        <DescriptionList>
          {storageFields && (
            <>
              <DashboardDescriptionListGroup
                title="Endpoint"
                isEmpty={modelArtifacts.size === 0 || !storageFields.endpoint}
                contentWhenEmpty="No endpoint"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-endpoint"
                  textToCopy={storageFields.endpoint}
                />
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Region"
                isEmpty={modelArtifacts.size === 0 || !storageFields.region}
                contentWhenEmpty="No region"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-region"
                  textToCopy={storageFields.region || ''}
                />
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Bucket"
                isEmpty={modelArtifacts.size === 0 || !storageFields.bucket}
                contentWhenEmpty="No bucket"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-bucket"
                  textToCopy={storageFields.bucket}
                />
              </DashboardDescriptionListGroup>
              <DashboardDescriptionListGroup
                title="Path"
                isEmpty={modelArtifacts.size === 0 || !storageFields.path}
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
                isEmpty={modelArtifacts.size === 0 || !modelArtifact?.uri}
                contentWhenEmpty="No URI"
              >
                <InlineTruncatedClipboardCopy
                  testId="storage-uri"
                  textToCopy={modelArtifact?.uri || ''}
                />
              </DashboardDescriptionListGroup>
            </>
          )}
        </DescriptionList>
        <Divider style={{ marginTop: '1em' }} />
        <Title style={{ margin: '1em 0' }} headingLevel={TextVariants.h3}>
          Source model format
        </Title>
        <DescriptionList>
          <EditableTextDescriptionListGroup
            editableVariant="TextInput"
            baseTestId="source-model-format"
            isArchive={isArchiveVersion}
            value={modelArtifact?.modelFormatName || ''}
            saveEditedValue={(value) =>
              apiState.api
                .patchModelArtifact({}, { modelFormatName: value }, modelArtifact?.id || '')
                .then(() => {
                  refreshModelArtifacts();
                })
            }
            title="Model Format"
            contentWhenEmpty="No model format specified"
          />
          <EditableTextDescriptionListGroup
            editableVariant="TextInput"
            baseTestId="source-model-version"
            value={modelArtifact?.modelFormatVersion || ''}
            isArchive={isArchiveVersion}
            saveEditedValue={(newVersion) =>
              apiState.api
                .patchModelArtifact({}, { modelFormatVersion: newVersion }, modelArtifact?.id || '')
                .then(() => {
                  refreshModelArtifacts();
                })
            }
            title="Version"
            contentWhenEmpty="No source model format version"
          />
        </DescriptionList>
        <Divider style={{ marginTop: '1em' }} />
        <DescriptionList isFillColumns style={{ marginTop: '1em' }}>
          <DashboardDescriptionListGroup
            title="Author"
            popover="The author is the user who registered the model version."
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
