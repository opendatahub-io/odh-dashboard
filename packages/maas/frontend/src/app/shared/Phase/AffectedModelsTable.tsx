import * as React from 'react';
import { Flex, FlexItem, Label, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { getPhaseProps, normalizePhase } from '~/app/utilities/phaseLabelUtils';
import type { AffectedModel } from '~/app/types/maas-model';

type AffectedModelsTableProps = {
  models: AffectedModel[];
};

const columns = [
  {
    title: 'Model name',
    key: 'name',
  },
  {
    title: 'Project',
    key: 'namespace',
  },
  {
    title: 'Status',
    key: 'phase',
  },
  {
    title: 'Description',
    key: 'statusMessage',
  },
];

const getStatusLabel = (phase: string) => {
  const normalized = normalizePhase(phase);
  const labelProps = getPhaseProps(normalized);
  return (
    <Label status={labelProps.status} color={labelProps.color} icon={labelProps.icon}>
      {normalized}
    </Label>
  );
};

const AffectedModelsTable: React.FC<AffectedModelsTableProps> = ({ models }) => (
  <Stack hasGutter data-testid="affected-models-table">
    <StackItem>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Title headingLevel="h2" size="xl">
            Affected models{' '}
            <Label variant="filled" color="grey">
              {models.length}
            </Label>
          </Title>
        </FlexItem>
      </Flex>
    </StackItem>
    <StackItem>
      <Table aria-label="Affected models" variant="compact">
        <Thead>
          <Tr>
            {columns.map((column) => (
              <Th key={column.key}>{column.title}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {models.map((model) => (
            <Tr
              key={model.namespace ? `${model.namespace}/${model.name}` : model.name}
              data-testid="affected-model-row"
            >
              <Td dataLabel="Model name">
                <span data-testid={`affected-model-name-${model.name}`}>
                  {model.displayName ?? model.name}
                </span>
              </Td>
              <Td dataLabel="Project">
                <span data-testid={`affected-model-namespace-${model.name}`}>
                  {model.namespace ?? "Couldn't determine namespace"}
                </span>
              </Td>
              <Td dataLabel="Status">
                <span data-testid={`affected-model-status-${model.name}`}>
                  {getStatusLabel(model.phase ?? '')}
                </span>
              </Td>
              <Td dataLabel="Description">
                <span data-testid={`affected-model-status-message-${model.name}`}>
                  {model.statusMessage ?? 'No status message.'}
                </span>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </StackItem>
  </Stack>
);

export default AffectedModelsTable;
