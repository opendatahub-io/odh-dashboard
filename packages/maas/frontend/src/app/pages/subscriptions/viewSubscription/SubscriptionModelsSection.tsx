import * as React from 'react';
import { Bullseye, Content, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr, type ThProps } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { MaaSModelRefSummary, ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenLimits } from '~/app/pages/subscriptions/viewSubscription/utils';

type ModelColumnKey = 'name' | 'project' | 'tokenLimits';

const COLUMNS: { key: ModelColumnKey; label: string; width?: ThProps['width'] }[] = [
  { key: 'name', label: 'Name', width: 50 },
  { key: 'project', label: 'Project', width: 25 },
  { key: 'tokenLimits', label: 'Token limits', width: 25 },
];

type SubscriptionModelsSectionProps = {
  modelRefSummaries: MaaSModelRefSummary[];
  subscriptionModelRefs: ModelSubscriptionRef[];
  hideColumns?: ModelColumnKey[];
  titleHeadingLevel?: React.ComponentProps<typeof Title>['headingLevel'];
  titleSize?: React.ComponentProps<typeof Title>['size'];
};

const SubscriptionModelsSection: React.FC<SubscriptionModelsSectionProps> = ({
  modelRefSummaries,
  subscriptionModelRefs,
  hideColumns = [],
  titleHeadingLevel = 'h2',
  titleSize = 'xl',
}) => {
  const visibleColumns = COLUMNS.filter((col) => !hideColumns.includes(col.key));

  return (
    <Stack hasGutter data-testid="subscription-models-section">
      <StackItem>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Title headingLevel={titleHeadingLevel} size={titleSize}>
              Models
            </Title>
          </FlexItem>
          <FlexItem>
            <Content component="p">Models that subscribers will be able to use.</Content>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        {modelRefSummaries.length === 0 ? (
          <Bullseye>
            <Content component="p">No models assigned to this subscription.</Content>
          </Bullseye>
        ) : (
          <Table
            aria-label="Subscription models"
            variant="compact"
            data-testid="subscription-models-table"
          >
            <Thead>
              <Tr>
                {visibleColumns.map((col) => (
                  <Th key={col.key} width={col.width}>
                    {col.label}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {modelRefSummaries.map((modelRef) => {
                const cellRenderers: Record<ModelColumnKey, React.ReactNode> = {
                  name: (
                    <Td key="name" dataLabel="Name">
                      <TableRowTitleDescription
                        title={
                          <Title headingLevel="h3" size="md">
                            {modelRef.displayName ?? modelRef.name}
                          </Title>
                        }
                        subtitle={<code>{modelRef.name}</code>}
                        description={modelRef.description}
                        truncateDescriptionLines={2}
                      />
                    </Td>
                  ),
                  project: (
                    <Td key="project" dataLabel="Project">
                      {modelRef.namespace}
                    </Td>
                  ),
                  tokenLimits: (
                    <Td key="tokenLimits" dataLabel="Token limits">
                      {formatTokenLimits(subscriptionModelRefs, modelRef.namespace, modelRef.name)}
                    </Td>
                  ),
                };

                return (
                  <Tr key={`${modelRef.namespace}/${modelRef.name}`}>
                    {visibleColumns.map((col) => cellRenderers[col.key])}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </StackItem>
    </Stack>
  );
};

export default SubscriptionModelsSection;
