import * as React from 'react';
import { Button, ClipboardCopy, DescriptionList, Flex, FlexItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import EditableTextDescriptionListGroup from '~/components/EditableTextDescriptionListGroup';
import EditableLabelsDescriptionListGroup from '~/components/EditableLabelsDescriptionListGroup';
import { getLabels } from '~/pages/modelRegistry/screens/utils';
import ModelTimestamp from '~/pages/modelRegistry/screens/ModelTimestamp';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';

type ModelVersionDetailsViewProps = {
  modelVersion: ModelVersion;
};

const ModelVersionDetailsView: React.FC<ModelVersionDetailsViewProps> = ({ modelVersion: mv }) => {
  const [modelArtifact] = useModelArtifactsByVersionId(mv.id);

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
            labels={getLabels(mv.customProperties)}
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
