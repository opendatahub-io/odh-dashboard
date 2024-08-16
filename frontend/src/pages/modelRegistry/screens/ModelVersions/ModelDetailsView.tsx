import * as React from 'react';
import { ClipboardCopy, DescriptionList, Flex, FlexItem, Text } from '@patternfly/react-core';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '~/components/EditableTextDescriptionListGroup';
import EditableLabelsDescriptionListGroup from '~/components/EditableLabelsDescriptionListGroup';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
import {
  getLabels,
  getPatchBodyForRegisteredModel,
  mergeUpdatedLabels,
} from '~/pages/modelRegistry/screens/utils';
import ModelPropertiesDescriptionListGroup from '~/pages/modelRegistry/screens/ModelPropertiesDescriptionListGroup';

type ModelDetailsViewProps = {
  registeredModel: RegisteredModel;
  refresh: () => void;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({ registeredModel: rm, refresh }) => {
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
            value={rm.description || ''}
            saveEditedValue={(value) =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                  getPatchBodyForRegisteredModel(rm, { description: value }),
                  rm.id,
                )
                .then(refresh)
            }
          />
          <EditableLabelsDescriptionListGroup
            labels={getLabels(rm.customProperties)}
            allExistingKeys={Object.keys(rm.customProperties)}
            saveEditedLabels={(editedLabels) =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                  getPatchBodyForRegisteredModel(rm, {
                    customProperties: mergeUpdatedLabels(rm.customProperties, editedLabels),
                  }),
                  rm.id,
                )
                .then(refresh)
            }
          />
          <ModelPropertiesDescriptionListGroup
            customProperties={rm.customProperties}
            saveEditedCustomProperties={(editedProperties) =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                  getPatchBodyForRegisteredModel(rm, { customProperties: editedProperties }),
                  rm.id,
                )
                .then(refresh)
            }
          />
        </DescriptionList>
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <DashboardDescriptionListGroup title="Model ID">
            <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
              {rm.id}
            </ClipboardCopy>
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Owner">
            <Text data-testid="registered-model-owner">{rm.owner || '-'}</Text>
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Last modified at"
            isEmpty={!rm.lastUpdateTimeSinceEpoch}
            contentWhenEmpty="Unknown"
          >
            <ModelTimestamp timeSinceEpoch={rm.lastUpdateTimeSinceEpoch} />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Created at"
            isEmpty={!rm.createTimeSinceEpoch}
            contentWhenEmpty="Unknown"
          >
            <ModelTimestamp timeSinceEpoch={rm.createTimeSinceEpoch} />
          </DashboardDescriptionListGroup>
        </DescriptionList>
      </FlexItem>
    </Flex>
  );
};

export default ModelDetailsView;
