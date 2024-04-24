import * as React from 'react';
import { Button, ClipboardCopy, DescriptionList, Flex, FlexItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '~/components/EditableTextDescriptionListGroup';
import EditableLabelsDescriptionListGroup from '~/components/EditableLabelsDescriptionListGroup';
import RegisteredModelOwner from './RegisteredModelOwner';
import ModelTimestamp from './ModelTimestamp';
import { getLabels } from './utils';

type ModelDetailsViewProps = {
  registeredModel: RegisteredModel;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({ registeredModel: rm }) => (
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
          saveEditedValue={(value) => {
            // eslint-disable-next-line no-console
            console.log('TODO: save description', value); // TODO API patch and refetch
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve();
              }, 2000);
            });
          }}
        />
        <EditableLabelsDescriptionListGroup
          labels={getLabels(rm.customProperties)}
          saveEditedLabels={(editedLabels) => {
            // eslint-disable-next-line no-console
            console.log('TODO: save labels', editedLabels); // TODO API patch and refetch
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve();
              }, 2000);
            });
          }}
        />
        <DashboardDescriptionListGroup
          title="Properties"
          action={
            <Button isInline variant="link" icon={<PlusCircleIcon />} iconPosition="start">
              Add property
            </Button>
          }
          isEmpty // TODO
          contentWhenEmpty="No properties"
        >
          TODO properties here
        </DashboardDescriptionListGroup>
      </DescriptionList>
    </FlexItem>
    <FlexItem flex={{ default: 'flex_1' }}>
      <DescriptionList isFillColumns>
        <DashboardDescriptionListGroup
          title="Model ID"
          isEmpty={!rm.externalID}
          contentWhenEmpty="No model ID"
        >
          <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
            {rm.externalID}
          </ClipboardCopy>
        </DashboardDescriptionListGroup>
        <DashboardDescriptionListGroup title="Owner">
          <RegisteredModelOwner registeredModelId={rm.id} />
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

export default ModelDetailsView;
