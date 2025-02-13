import React from 'react';
import {
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Title,
} from '@patternfly/react-core';
import InlineTruncatedClipboardCopy from '~/components/InlineTruncatedClipboardCopy';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';

type ModelDetailsViewProps = {
  model: CatalogModel;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({ model }) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <Flex
      direction={{ default: 'column', md: 'row' }}
      columnGap={{ default: 'columnGap4xl' }}
      rowGap={{ default: 'rowGapLg' }}
    >
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription data-testid="model-long-description">
            {model.longDescription}
          </DescriptionListDescription>
        </DescriptionList>
        <Title style={{ margin: '2em 0 1em 0' }} headingLevel={ContentVariants.h2}>
          Model card
        </Title>
        {/* TODO: RHOAIENG-18962 */}
        <div>Readme content</div>
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }}>
        <DescriptionList isFillColumns>
          <DashboardDescriptionListGroup title="Version" groupTestId="model-version">
            {model.artifacts?.map((artifact) => artifact.tags && artifact.tags[0])}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Label">
            {model.labels &&
              model.labels.map((label, index) => (
                <Label
                  color="blue"
                  data-testid="label"
                  key={index}
                  marginWidth={3}
                  style={{ marginRight: '3px' }}
                >
                  {label}
                </Label>
              ))}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="License" groupTestId="model-license">
            {model.license}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Provider" groupTestId="model-provider">
            {model.provider}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Source image location">
            <InlineTruncatedClipboardCopy
              testId="source-image-location"
              textToCopy={model.artifacts?.map((artifact) => artifact.uri)[0] || ''}
            />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Last modified at">
            <ModelTimestamp timeSinceEpoch={String(model.lastUpdateTimeSinceEpoch)} />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Published">
            <ModelTimestamp timeSinceEpoch={String(model.createTimeSinceEpoch)} />
          </DashboardDescriptionListGroup>
        </DescriptionList>
      </FlexItem>
    </Flex>
  </PageSection>
);

export default ModelDetailsView;
