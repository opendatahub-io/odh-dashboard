import * as React from 'react';
import { ClipboardCopy, DescriptionList, Flex, FlexItem, Content } from '@patternfly/react-core';
import { RegisteredModel } from '#~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '#~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '#~/components/EditableTextDescriptionListGroup';
import { EditableLabelsDescriptionListGroup } from '#~/components/EditableLabelsDescriptionListGroup';
import ModelTimestamp from '#~/pages/modelRegistry/screens/components/ModelTimestamp';
import { getLabels, mergeUpdatedLabels } from '#~/pages/modelRegistry/screens/utils';
import ModelPropertiesDescriptionListGroup from '#~/pages/modelRegistry/screens/ModelPropertiesDescriptionListGroup';
import { ModelRegistryPageContext } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

type ModelDetailsViewProps = {
  registeredModel: RegisteredModel;
  refresh: () => void;
  isArchiveModel?: boolean;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({
  registeredModel: rm,
  refresh,
  isArchiveModel,
}) => {
  const { apiState } = React.useContext(ModelRegistryPageContext);
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
            title="Description"
            isArchive={isArchiveModel}
            contentWhenEmpty="No description"
            value={rm.description || ''}
            saveEditedValue={(value) =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  {
                    description: value,
                  },
                  rm.id,
                )
                .then(refresh)
            }
          />
          <EditableLabelsDescriptionListGroup
            labels={getLabels(rm.customProperties)}
            isArchive={isArchiveModel}
            allExistingKeys={Object.keys(rm.customProperties)}
            title="Labels"
            contentWhenEmpty="No labels"
            onLabelsChange={(editedLabels) =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  {
                    customProperties: mergeUpdatedLabels(rm.customProperties, editedLabels),
                  },
                  rm.id,
                )
                .then(refresh)
            }
          />
          <ModelPropertiesDescriptionListGroup
            isArchive={isArchiveModel}
            customProperties={rm.customProperties}
            saveEditedCustomProperties={(editedProperties) =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  {
                    customProperties: editedProperties,
                  },
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
          <DashboardDescriptionListGroup
            title="Owner"
            popover="The owner is the user who registered the model."
          >
            <Content component="p" data-testid="registered-model-owner">
              {rm.owner || '-'}
            </Content>
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
