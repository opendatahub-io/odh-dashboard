import * as React from 'react';
import { ClipboardCopy, DescriptionList, Flex, FlexItem } from '@patternfly/react-core';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '~/components/EditableTextDescriptionListGroup';
import EditableLabelsDescriptionListGroup from '~/components/EditableLabelsDescriptionListGroup';
import ModelPropertiesDescriptionListGroup from '~/pages/modelRegistry/screens/ModelPropertiesDescriptionListGroup';
import {
  getLabels,
  getPatchBodyForModelVersion,
  mergeUpdatedLabels,
} from '~/pages/modelRegistry/screens/utils';
import ModelTimestamp from '~/pages/modelRegistry/screens/ModelTimestamp';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';

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

  return (
    <Flex
      direction={{ default: 'column', md: 'row' }}
      columnGap={{ default: 'columnGap4xl' }}
      rowGap={{ default: 'rowGapLg' }}
    >
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <EditableTextDescriptionListGroup
            title="Description"
            contentWhenEmpty="No description"
            value={mv.description || ''}
            saveEditedValue={(value) =>
              apiState.api
                .patchModelVersion(
                  {},
                  // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                  getPatchBodyForModelVersion(mv, { description: value }),
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
                  // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                  getPatchBodyForModelVersion(mv, {
                    customProperties: mergeUpdatedLabels(mv.customProperties, editedLabels),
                  }),
                  mv.id,
                )
                .then(refresh)
            }
          />
          <ModelPropertiesDescriptionListGroup
            customProperties={mv.customProperties}
            saveEditedCustomProperties={(editedProperties) =>
              apiState.api
                .patchModelVersion(
                  {},
                  // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                  getPatchBodyForModelVersion(mv, { customProperties: editedProperties }),
                  mv.id,
                )
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
            <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
              {mv.id}
            </ClipboardCopy>
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Storage location"
            isEmpty={modelArtifact.size === 0}
            contentWhenEmpty="No storage location"
          >
            <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
              {modelArtifact.items[0]?.uri}
            </ClipboardCopy>
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Source model format"
            isEmpty={modelArtifact.size === 0}
            contentWhenEmpty="No source model format"
          >
            {modelArtifact.items[0]?.modelFormatName}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Owner">{mv.author}</DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Last modified at"
            isEmpty={!mv.lastUpdateTimeSinceEpoch}
            contentWhenEmpty="Unknown"
          >
            <ModelTimestamp timeSinceEpoch={mv.lastUpdateTimeSinceEpoch} />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Created at"
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
