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
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  SubscriptionModelEntry,
} from '~/app/types/subscriptions';

export type AddModelsModalSource = 'subscription' | 'policy';

const CURRENT_SELECTION_LABEL: Record<AddModelsModalSource, string> = {
  subscription: 'This subscription',
  policy: 'This policy',
};

export type AddModelsModalProps = {
  availableModelRefs: MaaSModelRefSummary[];
  allSubscriptions: MaaSSubscription[];
  allPolicies: MaaSAuthPolicy[];
  currentModels: Pick<SubscriptionModelEntry, 'modelRefSummary'>[];
  onAdd: (refs: MaaSModelRefSummary[]) => void;
  onRemove: (refs: MaaSModelRefSummary[]) => void;
  onClose: () => void;
  modalSource: AddModelsModalSource;
  ariaLabel?: string;
  title?: string;
  description?: React.ReactNode;
};

type SortColumn = 'name' | 'namespace' | 'modelId';

const modelRefKey = (namespace: string, name: string): string => `${namespace}/${name}`;

const defaultDescription =
  'Select model endpoints that are available as a service to add to this subscription.';

const AddModelsModal: React.FC<AddModelsModalProps> = ({
  availableModelRefs,
  allSubscriptions,
  allPolicies,
  currentModels,
  onAdd,
  onRemove,
  onClose,
  modalSource,
  ariaLabel = 'Add models to subscription',
  title = 'Add models to subscription',
  description = defaultDescription,
}) => {
  const fromSubscription = modalSource === 'subscription';

  const [filter, setFilter] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [pendingAdds, setPendingAdds] = React.useState<Set<string>>(new Set());
  const [pendingRemoves, setPendingRemoves] = React.useState<Set<string>>(new Set());

  const currentModelKeys = React.useMemo(
    () =>
      new Set(
        currentModels.map((m) => modelRefKey(m.modelRefSummary.namespace, m.modelRefSummary.name)),
      ),
    [currentModels],
  );

  const subscriptionsByModel = React.useMemo(() => {
    const map = new Map<string, string[]>();
    allSubscriptions.forEach((sub) => {
      sub.modelRefs.forEach((ref) => {
        const key = modelRefKey(ref.namespace, ref.name);
        const existing = map.get(key) ?? [];
        existing.push(sub.name);
        map.set(key, existing);
      });
    });
    return map;
  }, [allSubscriptions]);

  const policiesByModel = React.useMemo(() => {
    const map = new Map<string, string[]>();
    allPolicies.forEach((policy) => {
      policy.modelRefs.forEach((ref) => {
        const key = modelRefKey(ref.namespace, ref.name);
        const existing = map.get(key) ?? [];
        existing.push(policy.displayName ?? policy.name);
        map.set(key, existing);
      });
    });
    return map;
  }, [allPolicies]);

  const isInCurrentSelection = (ref: MaaSModelRefSummary) => {
    const key = modelRefKey(ref.namespace, ref.name);
    return (currentModelKeys.has(key) && !pendingRemoves.has(key)) || pendingAdds.has(key);
  };

  const filteredModels = React.useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    const filtered = lowerFilter
      ? availableModelRefs.filter(
          (ref) =>
            ref.name.toLowerCase().includes(lowerFilter) ||
            (ref.displayName?.toLowerCase().includes(lowerFilter) ?? false) ||
            (ref.description?.toLowerCase().includes(lowerFilter) ?? false) ||
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

  const sortColumnIndex: Record<SortColumn, number> = { name: 0, namespace: 1, modelId: 2 };

  const getSortParams = (column: SortColumn): ThProps['sort'] => ({
    sortBy: {
      index: sortColumnIndex[sortColumn],
      direction: sortDirection,
    },
    onSort: () => handleSort(column),
    columnIndex: sortColumnIndex[column],
  });

  const handleToggleModel = (ref: MaaSModelRefSummary) => {
    const key = modelRefKey(ref.namespace, ref.name);
    if (currentModelKeys.has(key)) {
      setPendingRemoves((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    } else {
      setPendingAdds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    }
  };

  const handleConfirm = () => {
    const refsToAdd = availableModelRefs.filter((ref) =>
      pendingAdds.has(modelRefKey(ref.namespace, ref.name)),
    );
    const refsToRemove = currentModels
      .filter((m) =>
        pendingRemoves.has(modelRefKey(m.modelRefSummary.namespace, m.modelRefSummary.name)),
      )
      .map((m) => m.modelRefSummary);
    if (refsToRemove.length > 0) {
      onRemove(refsToRemove);
    }
    if (refsToAdd.length > 0) {
      onAdd(refsToAdd);
    }
    onClose();
  };

  const currentSelectionLabel = CURRENT_SELECTION_LABEL[modalSource];

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="large"
      aria-label={ariaLabel}
      data-testid="add-models-modal"
    >
      <ModalHeader title={title} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>{description}</StackItem>
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
                  <Th width={20}>Subscriptions</Th>
                  <Th width={20}>Policies</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {filteredModels.map((ref) => {
                  const key = modelRefKey(ref.namespace, ref.name);
                  const selected = isInCurrentSelection(ref);
                  const subs = subscriptionsByModel.get(key) ?? [];
                  const policies = policiesByModel.get(key) ?? [];

                  return (
                    <Tr key={key}>
                      <Td dataLabel="Model name">
                        <strong>{ref.displayName ?? ref.name}</strong>
                        <br />
                        <small>{ref.description ?? ''}</small>
                      </Td>
                      <Td dataLabel="Project">{ref.namespace}</Td>
                      <Td dataLabel="Model ID">{ref.modelRef.name}</Td>
                      <Td dataLabel="Subscriptions" modifier="breakWord">
                        {selected && fromSubscription && (
                          <Label color="green" isCompact>
                            {currentSelectionLabel}
                          </Label>
                        )}
                        {subs.map((sub) => (
                          <div key={sub}>{sub}</div>
                        ))}
                        {(fromSubscription ? !selected && subs.length === 0 : subs.length === 0) &&
                          'None'}
                      </Td>
                      <Td dataLabel="Policies" modifier="breakWord">
                        {selected && !fromSubscription && (
                          <Label color="green" isCompact>
                            {currentSelectionLabel}
                          </Label>
                        )}
                        {policies.map((policy) => (
                          <div key={policy}>{policy}</div>
                        ))}
                        {(fromSubscription || !selected) && policies.length === 0 && 'None'}
                      </Td>
                      <Td isActionCell style={{ textAlign: 'center' }}>
                        <Button
                          variant={selected ? 'secondary' : 'link'}
                          size={selected ? 'sm' : 'default'}
                          isDanger={selected}
                          onClick={() => handleToggleModel(ref)}
                          data-testid={`toggle-model-${ref.name}`}
                        >
                          {selected ? 'Remove model' : 'Add model'}
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
                {filteredModels.length === 0 && (
                  <Tr>
                    <Td colSpan={6}>No models match the filter criteria.</Td>
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
