import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import {
  getApiFormatLabel,
  getProviderDisplayName,
  getProviderRefWeightPercentage,
} from './providerReferenceUtils';

type ProviderReferencesTableProps = {
  providerRefs: ProviderRef[];
  externalProviders: ExternalProvider[];
  onWeightChange: (index: number, weight: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
};

const WEIGHT_POPOVER_CONTENT =
  'Weights are relative integers that determine traffic distribution. The system calculates percentages from the ratio of all weights. Set to 0 to temporarily disable a provider without removing it. Example: weights of 5, 3, 2 result in 50%, 30%, 20% traffic split.';

const headerCellStyle = { verticalAlign: 'middle' } as const;
const bodyCellStyle = { verticalAlign: 'middle' } as const;

const WeightColumnHeader: React.FC = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--pf-t--global--spacer--xs)',
      whiteSpace: 'nowrap',
    }}
  >
    Weight
    <FieldGroupHelpLabelIcon
      content={WEIGHT_POPOVER_CONTENT}
      buttonTestId="provider-ref-weight-help"
    />
  </span>
);

const ProviderReferencesTable: React.FC<ProviderReferencesTableProps> = ({
  providerRefs,
  externalProviders,
  onWeightChange,
  onEdit,
  onRemove,
}) => (
  <Table aria-label="Provider references" variant="compact" data-testid="provider-references-table">
    <Thead>
      <Tr>
        <Th style={headerCellStyle}>Provider</Th>
        <Th modifier="nowrap" style={headerCellStyle}>
          Target model ID
        </Th>
        <Th modifier="nowrap" style={headerCellStyle}>
          API format
        </Th>
        <Th modifier="nowrap" style={headerCellStyle}>
          <WeightColumnHeader />
        </Th>
      </Tr>
    </Thead>
    <Tbody>
      {providerRefs.map((providerRef, index) => (
        <Tr key={`${providerRef.providerName}-${index}`} data-testid={`provider-ref-row-${index}`}>
          <Td dataLabel="Provider" style={bodyCellStyle}>
            {getProviderDisplayName(
              providerRef.providerName,
              externalProviders.find((item) => item.name === providerRef.providerName),
            )}
          </Td>
          <Td dataLabel="Target model ID" modifier="nowrap" style={bodyCellStyle}>
            {providerRef.targetModel}
          </Td>
          <Td dataLabel="API format" modifier="nowrap" style={bodyCellStyle}>
            {getApiFormatLabel(providerRef.apiFormat)}
          </Td>
          <Td dataLabel="Weight" modifier="nowrap" style={bodyCellStyle}>
            <Flex
              direction={{ default: 'column' }}
              gap={{ default: 'gapSm' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
            >
              <FlexItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  gap={{ default: 'gapSm' }}
                  flexWrap={{ default: 'nowrap' }}
                >
                  <NumberInput
                    id={`provider-ref-weight-${index}`}
                    data-testid={`provider-ref-weight-${index}`}
                    value={providerRef.weight}
                    widthChars={3}
                    min={0}
                    max={100}
                    onMinus={() => onWeightChange(index, Math.max(0, providerRef.weight - 1))}
                    onPlus={() => onWeightChange(index, Math.min(100, providerRef.weight + 1))}
                    onChange={(event: React.FormEvent<HTMLInputElement>) => {
                      const parsedValue = parseInt(event.currentTarget.value, 10);
                      if (!Number.isNaN(parsedValue)) {
                        onWeightChange(index, Math.min(100, Math.max(0, parsedValue)));
                      }
                    }}
                  />
                  <Button
                    variant="plain"
                    isInline
                    aria-label="Edit provider reference"
                    icon={<PencilAltIcon />}
                    onClick={() => onEdit(index)}
                    data-testid={`provider-ref-edit-${index}`}
                  />
                  <Button
                    variant="plain"
                    isInline
                    aria-label="Remove provider reference"
                    icon={<MinusCircleIcon />}
                    onClick={() => onRemove(index)}
                    data-testid={`provider-ref-remove-${index}`}
                  />
                </Flex>
              </FlexItem>
              <FlexItem>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem data-testid={`provider-ref-weight-percent-${index}`}>
                      {getProviderRefWeightPercentage(providerRefs, index)}%
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FlexItem>
            </Flex>
          </Td>
        </Tr>
      ))}
    </Tbody>
  </Table>
);

export default ProviderReferencesTable;
