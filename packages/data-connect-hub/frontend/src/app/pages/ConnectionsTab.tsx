import React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateVariant,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  PageSection,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, FilterIcon, InProgressIcon, SearchIcon } from '@patternfly/react-icons';
import { t_global_icon_color_status_info_default as InfoIconColor } from '@patternfly/react-tokens';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { DeleteModal } from '@odh-dashboard/ui-core';
import { deleteConnection, verifyConnection } from '~/app/api/dch';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { useConnections } from '~/app/hooks/useConnections';
import type { Connection } from '~/app/types';
import emptyStateImage from '~/images/RH-API-Illustration-Gray_20-2024_07-RGB.svg';

type ConnectionsTabProps = { namespace: string; isActive?: boolean };

export const synchronizeTypeSelection = (
  current: string[] | null,
  previousIds: string[],
  availableIds: string[],
): string[] | null => {
  if (current === null) {
    return availableIds.length > 0 ? availableIds : null;
  }
  const newIds = availableIds.filter((id) => !previousIds.includes(id));
  const next = Array.from(new Set([...current, ...newIds])).filter((id) =>
    availableIds.includes(id),
  );
  return next.length === current.length && next.every((id, index) => id === current[index])
    ? current
    : next;
};

const statusVariant = {
  ready: 'success',
  ingestion_not_ready: 'danger',
  not_ready: 'danger',
} as const;

const isValidTimestamp = (timestamp?: string): timestamp is string =>
  Boolean(timestamp && !Number.isNaN(new Date(timestamp).getTime()));

const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ namespace, isActive = true }) => {
  const [connections, loaded, error, refresh] = useConnections(namespace, isActive);
  const [connectionTypes, typesLoaded, typesError] = useConnectionTypes(namespace, isActive);
  const [nameFilter, setNameFilter] = React.useState('');
  const [selectedTypes, setSelectedTypes] = React.useState<string[] | null>(null);
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [actionsFor, setActionsFor] = React.useState<string>();
  const [verifying, setVerifying] = React.useState<Set<string>>(new Set());
  const [verificationErrors, setVerificationErrors] = React.useState<Map<string, Error>>(new Map());
  const [verificationResponses, setVerificationResponses] = React.useState<Set<string>>(new Set());
  const verifyingIdsRef = React.useRef<Set<string>>(new Set());
  const [verificationBaselines, setVerificationBaselines] = React.useState<
    Map<string, string | undefined>
  >(new Map());
  const [deleteTarget, setDeleteTarget] = React.useState<Connection>();
  const [deleteError, setDeleteError] = React.useState<Error>();
  const [deleting, setDeleting] = React.useState(false);
  const [sortColumn, setSortColumn] = React.useState<'name' | 'type' | 'status'>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const deleteOperationRef = React.useRef(0);

  const typeNames = new Map(connectionTypes.map((type) => [type.metadata.id, type.resource.name]));
  const typeIds = React.useMemo(
    () =>
      Array.from(
        new Set(connections.map((connection) => connection.resource.data_connection_type_id)),
      ),
    [connections],
  );
  const activeTypes = (selectedTypes ?? typeIds).filter((typeId) => typeIds.includes(typeId));
  const previousTypeIds = React.useRef<string[]>([]);
  React.useEffect(() => {
    const previousIds = previousTypeIds.current;
    previousTypeIds.current = typeIds;

    setSelectedTypes((current) => synchronizeTypeSelection(current, previousIds, typeIds));
  }, [typeIds]);

  const previousConnections = React.useRef(connections);
  React.useEffect(() => {
    if (previousConnections.current !== connections) {
      previousConnections.current = connections;
      setVerifying((current) => {
        const next = new Set(current);
        let changed = false;
        current.forEach((id) => {
          const connection = connections.find((item) => item.metadata.id === id);
          const baseline = verificationBaselines.get(id);
          if (
            verificationResponses.has(id) ||
            (connection?.status.updated_at && connection.status.updated_at !== baseline)
          ) {
            next.delete(id);
            verifyingIdsRef.current.delete(id);
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }
  }, [connections, verificationBaselines, verificationResponses]);

  if (!namespace) {
    return null;
  }
  if (error || typesError) {
    return (
      <PageSection isFilled hasBodyWrapper={false}>
        <EmptyState
          headingLevel="h2"
          titleText="Unable to load data connections"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{(error ?? typesError)?.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }
  if (!loaded || !typesLoaded) {
    return (
      <PageSection isFilled hasBodyWrapper={false}>
        <EmptyState
          headingLevel="h2"
          titleText="Loading data connections"
          variant={EmptyStateVariant.lg}
        >
          <Spinner size="xl" />
        </EmptyState>
      </PageSection>
    );
  }

  if (connections.length === 0) {
    return (
      <PageSection isFilled hasBodyWrapper={false}>
        <p className="pf-v6-u-mb-md">
          View and manage the data connections available in this project. This registry provides a
          structured way to store and configure namespace-scoped connections for use by catalog
          assets and workloads.
        </p>
        <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-md">
          Data connections
        </Title>
        <EmptyState
          headingLevel="h3"
          icon={() => <img src={emptyStateImage} alt="" width={108} height={108} />}
          titleText="Get started with data connections"
        >
          <EmptyStateBody>
            Create a connection in this project to link storage credentials to catalog assets and
            workloads.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const getTypeName = (id: string) => typeNames.get(id) ?? id;

  const filtered = connections.filter(
    (connection) =>
      connection.resource.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
      activeTypes.includes(connection.resource.data_connection_type_id),
  );

  const sorted = filtered.toSorted((left, right) => {
    const leftValue =
      sortColumn === 'name'
        ? left.resource.name
        : sortColumn === 'type'
          ? getTypeName(left.resource.data_connection_type_id)
          : left.status.state;
    const rightValue =
      sortColumn === 'name'
        ? right.resource.name
        : sortColumn === 'type'
          ? getTypeName(right.resource.data_connection_type_id)
          : right.status.state;
    const result = leftValue.localeCompare(rightValue);
    return sortDirection === 'asc' ? result : -result;
  });

  const getSort = (index: number) => ({
    sortBy: { index: ['name', 'type', 'status'].indexOf(sortColumn), direction: sortDirection },
    onSort: (_event: unknown, columnIndex: number, direction: 'asc' | 'desc') => {
      setSortColumn(['name', 'type', 'status'][columnIndex] as 'name' | 'type' | 'status');
      setSortDirection(direction);
    },
    columnIndex: index,
  });
  const hasFilters = nameFilter !== '' || activeTypes.length < typeIds.length;
  const toggleType = (id: string) =>
    setSelectedTypes((current) => {
      const values = current ?? typeIds;
      return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
    });

  const handleVerify = async (id: string) => {
    if (verifyingIdsRef.current.has(id)) {
      return;
    }
    verifyingIdsRef.current.add(id);
    const connection = connections.find((item) => item.metadata.id === id);
    setVerificationBaselines((current) => new Map(current).set(id, connection?.status.updated_at));
    setVerificationErrors((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    setVerificationResponses((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setVerifying((current) => new Set(current).add(id));
    setActionsFor(undefined);
    try {
      await verifyConnection('')({}, namespace, id);
      refresh();
      setVerificationErrors((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
      setVerificationResponses((current) => new Set(current).add(id));
    } catch (verificationFailure) {
      verifyingIdsRef.current.delete(id);
      refresh();
      setVerifying((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setVerificationBaselines((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
      setVerificationErrors((current) => {
        const next = new Map(current);
        next.set(
          id,
          verificationFailure instanceof Error
            ? verificationFailure
            : new Error('Unable to verify connection'),
        );
        return next;
      });
      setVerificationResponses((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const operation = ++deleteOperationRef.current;
    const requestNamespace = namespace;
    const connectionId = deleteTarget.metadata.id;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteConnection('')({}, requestNamespace, connectionId);
      if (deleteOperationRef.current !== operation || namespace !== requestNamespace) {
        return;
      }
      setDeleteTarget(undefined);
      refresh();
    } catch (deleteFailure) {
      if (deleteOperationRef.current !== operation || namespace !== requestNamespace) {
        return;
      }
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure : new Error('Unable to delete connection'),
      );
    } finally {
      if (deleteOperationRef.current === operation && namespace === requestNamespace) {
        setDeleting(false);
      }
    }
  };

  return (
    <PageSection isFilled>
      <p className="pf-v6-u-mb-md">
        View and manage the data connections available in this project. This registry provides a
        structured way to store and configure namespace-scoped connections for use by catalog assets
        and workloads.
      </p>
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-md">
        Data connections
      </Title>
      <Toolbar isStatic>
        <ToolbarContent>
          <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <Dropdown
                  isOpen={typeOpen}
                  onOpenChange={setTypeOpen}
                  onSelect={() => setTypeOpen(true)}
                  toggle={(ref) => (
                    <MenuToggle
                      ref={ref}
                      icon={<FilterIcon />}
                      onClick={() => setTypeOpen((open) => !open)}
                    >
                      {activeTypes.length === typeIds.length
                        ? 'Type'
                        : `Type: ${activeTypes.length} selected`}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    {typeIds.map((id) => (
                      <DropdownItem
                        key={id}
                        value={id}
                        hasCheckbox
                        isSelected={activeTypes.includes(id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleType(id);
                        }}
                      >
                        {getTypeName(id)}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarToggleGroup>
          <ToolbarItem>
            <SearchInput
              aria-label="Filter by name"
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter('')}
            />
          </ToolbarItem>
        </ToolbarContent>
        {activeTypes.length < typeIds.length && (
          <ToolbarContent>
            <ToolbarItem>
              <LabelGroup categoryName="Type">
                {activeTypes.map((id) => (
                  <Label key={id} variant="outline" onClose={() => toggleType(id)}>
                    {getTypeName(id)}
                  </Label>
                ))}
              </LabelGroup>
            </ToolbarItem>
          </ToolbarContent>
        )}
      </Toolbar>
      <Table aria-label="Data connections" variant="compact" data-testid="connections-table">
        <Thead>
          <Tr>
            <Th sort={getSort(0)}>Name</Th>
            <Th sort={getSort(1)}>Type</Th>
            <Th sort={getSort(2)}>Status</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {filtered.length === 0 ? (
            <Tr>
              <Td colSpan={4}>
                <EmptyState
                  headingLevel="h3"
                  icon={SearchIcon}
                  titleText={hasFilters ? 'No results found' : 'No data connections found'}
                >
                  <EmptyStateBody>
                    {hasFilters
                      ? 'Adjust your filters and try again.'
                      : 'There are no data connections in this project.'}
                  </EmptyStateBody>
                  {hasFilters && (
                    <EmptyStateActions>
                      <Button
                        variant="link"
                        onClick={() => {
                          setNameFilter('');
                          setSelectedTypes(typeIds);
                        }}
                      >
                        Clear all filters
                      </Button>
                    </EmptyStateActions>
                  )}
                </EmptyState>
              </Td>
            </Tr>
          ) : (
            sorted.map((connection) => (
              <Tr key={connection.metadata.id}>
                <Td dataLabel="Name">{connection.resource.name}</Td>
                <Td dataLabel="Type">{getTypeName(connection.resource.data_connection_type_id)}</Td>
                <Td dataLabel="Status">
                  {verifying.has(connection.metadata.id) ? (
                    <Label
                      color="blue"
                      variant="outline"
                      icon={<InProgressIcon color={InfoIconColor.var} className="ai-u-spin" />}
                    >
                      Verifying
                    </Label>
                  ) : isValidTimestamp(connection.status.updated_at) ? (
                    <>
                      <Label variant="outline" status={statusVariant[connection.status.state]}>
                        {connection.status.state === 'ready' ? 'Verified' : 'Verification failed'}
                      </Label>
                      <HelperText>
                        <HelperTextItem>
                          Last tested {new Date(connection.status.updated_at).toLocaleString()}
                        </HelperTextItem>
                      </HelperText>
                    </>
                  ) : (
                    <Label variant="outline" color="grey">
                      Unverified
                    </Label>
                  )}
                  {verificationErrors.has(connection.metadata.id) && (
                    <HelperText>
                      <HelperTextItem variant="error">
                        {verificationErrors.get(connection.metadata.id)?.message}
                      </HelperTextItem>
                    </HelperText>
                  )}
                </Td>
                <Td isActionCell>
                  <Dropdown
                    isOpen={actionsFor === connection.metadata.id}
                    onOpenChange={(open) =>
                      setActionsFor(open ? connection.metadata.id : undefined)
                    }
                    popperProps={{ placement: 'bottom-end' }}
                    toggle={(ref) => (
                      <MenuToggle
                        ref={ref}
                        variant="plain"
                        aria-label={`Actions for ${connection.resource.name}`}
                        onClick={() =>
                          setActionsFor(
                            actionsFor === connection.metadata.id
                              ? undefined
                              : connection.metadata.id,
                          )
                        }
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      <DropdownItem
                        isDisabled={verifying.has(connection.metadata.id)}
                        onClick={() => void handleVerify(connection.metadata.id)}
                      >
                        Verify connection
                      </DropdownItem>
                      <DropdownItem
                        onClick={() => {
                          setActionsFor(undefined);
                          deleteOperationRef.current += 1;
                          setDeleteTarget(connection);
                          setDeleteError(undefined);
                          setDeleting(false);
                        }}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
      {deleteTarget && (
        <DeleteModal
          title={`Permanently delete connection "${deleteTarget.resource.name}"?`}
          deleteName={deleteTarget.resource.name}
          deleting={deleting}
          error={deleteError}
          onClose={() => {
            deleteOperationRef.current += 1;
            setDeleteTarget(undefined);
            setDeleteError(undefined);
            setDeleting(false);
          }}
          onDelete={() => void handleDelete()}
        >
          Deleting this connection will not delete the external data source, but any linked data
          assets will lose access. Additional active workloads or resources using this connection
          may also lose access.
        </DeleteModal>
      )}
    </PageSection>
  );
};

export default ConnectionsTab;
