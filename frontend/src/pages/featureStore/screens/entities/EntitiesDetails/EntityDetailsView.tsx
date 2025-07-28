import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Entity } from '#~/pages/featureStore/types/entities.ts';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags.tsx';
import FeatureStoreCodeBlock from '#~/pages/featureStore/components/FeatureStoreCodeBlock.tsx';
import FeatureStoreTimestamp from '#~/pages/featureStore/components/FeatureStoreTimestamp.tsx';

type DetailsItemProps = {
  label: string;
  value: React.ReactNode;
  testId?: string;
};

const DetailsItem: React.FC<DetailsItemProps> = ({ label, value, testId }) => (
  <DescriptionListGroup>
    <DescriptionListTerm data-testid={testId ? `${testId}-label` : undefined}>
      {label}
    </DescriptionListTerm>
    <DescriptionListDescription data-testid={testId ? `${testId}-value` : undefined}>
      {value}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

type EntityDetailsViewProps = {
  entity: Entity;
};

const EntityDetailsView: React.FC<EntityDetailsViewProps> = ({ entity }) => (
  <PageSection
    hasBodyWrapper={false}
    isFilled
    padding={{ default: 'noPadding' }}
    isWidthLimited
    style={{ maxWidth: '75%' }}
  >
    <Flex direction={{ default: 'column' }} gap={{ default: 'gap2xl' }}>
      <FlexItem>
        <DescriptionList isCompact isHorizontal>
          <DetailsItem label="Join key" value={entity.spec.joinKey} testId="entity-join-key" />
          <DetailsItem
            label="Value type"
            value={entity.spec.valueType || '-'}
            testId="entity-value-type"
          />
        </DescriptionList>
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h3" data-testid="entity-data-source" style={{ margin: '1em 0' }}>
          Data source
        </Title>
        {entity.dataSources && entity.dataSources.length > 0 ? (
          <Table aria-label="Properties table" data-testid="properties-table" variant="compact">
            <Thead>
              <Tr>
                <Th>Source Type</Th>
                <Th>File Url</Th>
                <Th>Created date</Th>
                <Th>Last modified date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {entity.dataSources.map((dataSource) => (
                <Tr key={dataSource.name}>
                  <Td>{dataSource.type.split('_')[0]}</Td>
                  <Td>{dataSource.fileOptions?.uri || '-'}</Td>
                  <Td>
                    <FeatureStoreTimestamp date={dataSource.meta.createdTimestamp} />
                  </Td>
                  <Td>
                    <FeatureStoreTimestamp date={dataSource.meta.lastUpdatedTimestamp} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <>-</>
        )}
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h3" data-testid="entity-tags" style={{ margin: '1em 0' }}>
          Tags
        </Title>
        <FeatureStoreTags tags={entity.spec.tags ?? {}} />
      </FlexItem>
      <FlexItem>
        <Title
          headingLevel="h3"
          data-testid="entity-interactive-example"
          style={{ margin: '1em 0' }}
        >
          Interactive example
        </Title>
        {entity.featureDefinition && (
          <FeatureStoreCodeBlock content={entity.featureDefinition} id={entity.spec.name} />
        )}
      </FlexItem>
    </Flex>
  </PageSection>
);

export default EntityDetailsView;
