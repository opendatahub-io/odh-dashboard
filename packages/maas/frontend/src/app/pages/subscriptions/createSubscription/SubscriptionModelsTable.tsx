import React from 'react';
import { Button, Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SubscriptionModelEntry, TokenRateLimit } from '~/app/types/subscriptions';
import { formatWindow } from '~/app/utilities/rateLimits';

type SubscriptionModelsTableProps = {
  models: SubscriptionModelEntry[];
  onRemoveModel: (index: number) => void;
  onEditLimits: (index: number) => void;
};

const RateLimitsDisplay: React.FC<{ limits: TokenRateLimit[] }> = ({ limits }) => {
  if (limits.length === 0) {
    return <>Unlimited</>;
  }
  return (
    <>
      {limits.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {l.limit} / {formatWindow(l.window)}
        </React.Fragment>
      ))}
    </>
  );
};

const SubscriptionModelsTable: React.FC<SubscriptionModelsTableProps> = ({
  models,
  onRemoveModel,
  onEditLimits,
}) => (
  <Table aria-label="Subscription models" data-testid="subscription-models-table">
    <Thead>
      <Tr>
        <Th>Name</Th>
        <Th>Project</Th>
        <Th>Token limits</Th>
        <Th screenReaderText="Actions" />
      </Tr>
    </Thead>
    <Tbody>
      {models.map((entry, index) => (
        <SubscriptionModelRow
          key={entry.modelRefSummary.name}
          entry={entry}
          onRemove={() => onRemoveModel(index)}
          onEditTokenLimits={() => onEditLimits(index)}
        />
      ))}
    </Tbody>
  </Table>
);

type SubscriptionModelRowProps = {
  entry: SubscriptionModelEntry;
  onRemove: () => void;
  onEditTokenLimits: () => void;
};

const SubscriptionModelRow: React.FC<SubscriptionModelRowProps> = ({
  entry,
  onRemove,
  onEditTokenLimits,
}) => {
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const { modelRefSummary, tokenRateLimits } = entry;

  return (
    <Tr>
      <Td dataLabel="Name">
        <strong>{modelRefSummary.displayName ?? modelRefSummary.name}</strong>
        <br />
        <small>{modelRefSummary.description ?? ''}</small>
      </Td>
      <Td dataLabel="Project">{modelRefSummary.namespace}</Td>
      <Td dataLabel="Token limits">
        <Button
          variant="link"
          isInline
          onClick={onEditTokenLimits}
          style={{ textDecoration: 'none' }}
        >
          <RateLimitsDisplay limits={tokenRateLimits} />
        </Button>
      </Td>
      <Td isActionCell>
        <Dropdown
          isOpen={isKebabOpen}
          onOpenChange={setIsKebabOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              variant="plain"
              onClick={() => setIsKebabOpen(!isKebabOpen)}
              isExpanded={isKebabOpen}
              aria-label={`Actions for ${modelRefSummary.name}`}
            >
              <EllipsisVIcon />
            </MenuToggle>
          )}
          popperProps={{ position: 'right' }}
        >
          <DropdownList>
            <DropdownItem
              key="edit-token-limits"
              onClick={() => {
                onEditTokenLimits();
                setIsKebabOpen(false);
              }}
            >
              Edit token limits
            </DropdownItem>
            <DropdownItem
              key="remove"
              onClick={() => {
                onRemove();
                setIsKebabOpen(false);
              }}
              isDanger
            >
              Remove model
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </Td>
    </Tr>
  );
};

export default SubscriptionModelsTable;
