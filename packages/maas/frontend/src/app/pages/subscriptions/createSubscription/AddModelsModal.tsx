import React from 'react';
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, ThProps } from '@patternfly/react-table';
import {
  MaaSModelRefSummary,
  MaaSSubscription,
  SubscriptionModelEntry,
} from '~/app/types/subscriptions';

type AddModelsModalProps = {
  availableModelRefs: MaaSModelRefSummary[];
  allSubscriptions: MaaSSubscription[];
  currentModels: SubscriptionModelEntry[];
  onAdd: (refs: MaaSModelRefSummary[]) => void;
  onRemove: (ref: MaaSModelRefSummary) => void;
  onClose: () => void;
};

type SortColumn = 'name' | 'namespace' | 'modelId';

const AddModelsModal: React.FC<AddModelsModalProps> = ({
  availableModelRefs,
  allSubscriptions,
  currentModels,
  onAdd,
  onRemove,
  onClose,
}) => {
  const [filter, setFilter] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [pendingAdds, setPendingAdds] = React.useState<Set<string>>(new Set());

  const currentModelNames = React.useMemo(
    () => new Set(currentModels.map((m) => m.modelRefSummary.name)),
    [currentModels],
  );

  const subscriptionsByModel = React.useMemo(() => {
    const map = new Map<string, string[]>();
    allSubscriptions.forEach((sub) => {
      sub.modelRefs.forEach((ref) => {
        const existing = map.get(ref.name) ?? [];
        existing.push(sub.name);
        map.set(ref.name, existing);
      });
    });
    return map;
  }, [allSubscriptions]);

  const isInSubscription = (name: string) => currentModelNames.has(name) || pendingAdds.has(name);

  const filteredModels = React.useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    const filtered = lowerFilter
      ? availableModelRefs.filter(
          (ref) =>
            ref.name.toLowerCase().includes(lowerFilter) ||
            ref.modelRef.name.toLowerCase().includes(lowerFilter) ||
            ref.namespace.toLowerCase().includes(lowerFilter),
        )
      : [...availableModelRefs];

    return filtered.toSorted((a, b) => {
      let valA: string;
      let valB: string;
      switch (sortColumn) {
        case 'name':
          valA = a.displayName ?? a.name;
          valB = b.displayName ?? b.name;
          break;
        case 'namespace':
          valA = a.namespace;
          valB = b.namespace;
          break;
        case 'modelId':
          valA = a.modelRef.name;
          valB = b.modelRef.name;
          break;
        default:
          valA = a.name;
          valB = b.name;
      }
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [availableModelRefs, filter, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortParams = (column: SortColumn): ThProps['sort'] => ({
    sortBy: {
      index: column === sortColumn ? 0 : undefined,
      direction: sortDirection,
    },
    onSort: () => handleSort(column),
    columnIndex: 0,
  });

  const handleToggleModel = (ref: MaaSModelRefSummary) => {
    if (currentModelNames.has(ref.name)) {
      onRemove(ref);
    } else if (pendingAdds.has(ref.name)) {
      setPendingAdds((prev) => {
        const next = new Set(prev);
        next.delete(ref.name);
        return next;
      });
    } else {
      setPendingAdds((prev) => new Set(prev).add(ref.name));
    }
  };

  const handleConfirm = () => {
    const refsToAdd = availableModelRefs.filter((ref) => pendingAdds.has(ref.name));
    if (refsToAdd.length > 0) {
      onAdd(refsToAdd);
    }
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} variant="large" aria-label="Add models to subscription">
      <ModalHeader title="Add models to subscription" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            Select model endpoints that are available as a service to add to this subscription.
          </StackItem>
          <StackItem>
            <SearchInput
              placeholder="Filter by name or description"
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClear={() => setFilter('')}
              data-testid="add-models-filter"
            />
          </StackItem>
          <StackItem>
            <Table aria-label="Available models" data-testid="add-models-table">
              <Thead>
                <Tr>
                  <Th sort={getSortParams('name')}>Model name</Th>
                  <Th sort={getSortParams('namespace')}>Project</Th>
                  <Th sort={getSortParams('modelId')}>Model ID</Th>
                  <Th>Subscriptions</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {filteredModels.map((ref) => {
                  const inSub = isInSubscription(ref.name);
                  const subs = subscriptionsByModel.get(ref.name) ?? [];

                  return (
                    <Tr key={ref.name}>
                      <Td dataLabel="Model name">
                        <strong>{ref.displayName ?? ref.name}</strong>
                        <br />
                        <small>{ref.description ?? ''}</small>
                      </Td>
                      <Td dataLabel="Project">{ref.namespace}</Td>
                      <Td dataLabel="Model ID">{ref.modelRef.name}</Td>
                      <Td dataLabel="Subscriptions">
                        {inSub && (
                          <Label color="green" isCompact>
                            This subscription
                          </Label>
                        )}
                        {subs.map((sub) => (
                          <div key={sub}>{sub}</div>
                        ))}
                        {!inSub && subs.length === 0 && 'None'}
                      </Td>
                      <Td isActionCell>
                        <Button
                          variant={inSub ? 'secondary' : 'link'}
                          isDanger={inSub}
                          onClick={() => handleToggleModel(ref)}
                          data-testid={`toggle-model-${ref.name}`}
                        >
                          {inSub ? 'Remove model' : 'Add model'}
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
                {filteredModels.length === 0 && (
                  <Tr>
                    <Td colSpan={5}>No models match the filter criteria.</Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleConfirm} data-testid="confirm-add-models">
          Add models
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddModelsModal;
