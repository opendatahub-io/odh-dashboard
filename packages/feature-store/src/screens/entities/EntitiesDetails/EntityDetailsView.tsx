import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  PageSection,
  Content,
  Title,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import FeatureStoreTags from '../../../components/FeatureStoreTags';
import FeatureStoreCodeBlock from '../../../components/FeatureStoreCodeBlock';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';
import { hasContent } from '../../../const';
import { Entity } from '../../../types/entities';

type DetailsItemProps = {
  label: string;
  value: React.ReactNode;
  testId?: string;
  className?: string;
};

const DetailsItem: React.FC<DetailsItemProps> = ({ label, value, testId, className }) => (
  <DescriptionListGroup>
    <DescriptionListTerm data-testid={testId ? `${testId}-label` : undefined}>
      {label}
    </DescriptionListTerm>
    <DescriptionListDescription
      data-testid={testId ? `${testId}-value` : undefined}
      className={className}
    >
      {value}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

type EntityDetailsViewProps = {
  entity: Entity;
};
const getDisabledClassName = (value: string | undefined) =>
  value && hasContent(value) ? '' : text.textColorDisabled;

const getContentValue = (value: string | undefined, fallback: string) =>
  value && hasContent(value) ? value : fallback;

const EntityDetailsView: React.FC<EntityDetailsViewProps> = ({ entity }) => (
  <PageSection
    hasBodyWrapper={false}
    isFilled
    padding={{ default: 'noPadding' }}
    isWidthLimited
    style={{ maxWidth: '75%' }}
  >
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItems2xl' }}
      className="pf-v6-u-mt-xl"
    >
      <FlexItem>
        <DescriptionList isCompact isHorizontal>
          <DetailsItem
            label="Join key"
            value={getContentValue(entity.spec.joinKey, 'No join key')}
            testId="entity-join-key"
            className={getDisabledClassName(entity.spec.joinKey)}
          />
          <DetailsItem
            label="Value type"
            value={getContentValue(entity.spec.valueType, 'No value type')}
            testId="entity-value-type"
            className={getDisabledClassName(entity.spec.valueType)}
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
          <Content component="p" className={text.textColorDisabled}>
            No data sources
          </Content>
        )}
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h3" data-testid="entity-tags" style={{ margin: '1em 0' }}>
          Tags
        </Title>
        {Object.keys(entity.spec.tags ?? {}).length > 0 ? (
          <FeatureStoreTags tags={entity.spec.tags ?? {}} showAllTags />
        ) : (
          <Content component="p" className={text.textColorDisabled}>
            No tags
          </Content>
        )}
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
