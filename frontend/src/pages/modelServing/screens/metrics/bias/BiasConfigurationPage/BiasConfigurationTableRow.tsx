import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';

type BiasConfigurationTableRowProps = {
  obj: BiasMetricConfig;
  rowIndex: number;
  onCloneConfiguration: (obj: BiasMetricConfig) => void;
  onDeleteConfiguration: (obj: BiasMetricConfig) => void;
};

const BiasConfigurationTableRow: React.FC<BiasConfigurationTableRowProps> = ({
  obj,
  rowIndex,
  onCloneConfiguration,
  onDeleteConfiguration,
}) => {
  const [isExpanded, setExpanded] = React.useState(false);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          data-testid="bias-configuration-expand-cell"
          expand={{
            rowIndex,
            expandId: 'bias-configuration-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">{obj.name}</Td>
        <Td dataLabel="Metric">{obj.metricType}</Td>
        <Td dataLabel="Protected attribute">{obj.protectedAttribute}</Td>
        <Td dataLabel="Privileged value">{obj.privilegedAttribute}</Td>
        <Td dataLabel="Unprivileged value">{obj.unprivilegedAttribute}</Td>
        <Td dataLabel="Output">{obj.outcomeName}</Td>
        <Td dataLabel="Output value">{obj.favorableOutcome}</Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Duplicate',
                onClick: () => {
                  onCloneConfiguration(obj);
                },
              },
              { isSeparator: true },
              {
                title: 'Delete',
                onClick: () => {
                  onDeleteConfiguration(obj);
                },
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Other configurations" colSpan={4}>
          <ExpandableRowContent>
            <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '24ch' }}>
              <DescriptionListGroup>
                <DescriptionListTerm>Violation threshold</DescriptionListTerm>
                <DescriptionListDescription>{obj.thresholdDelta}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Metric batch size</DescriptionListTerm>
                <DescriptionListDescription>{obj.batchSize}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default BiasConfigurationTableRow;
