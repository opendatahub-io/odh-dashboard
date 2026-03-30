import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Timestamp,
  Label,
  Popover,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, CubesIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { FeatureStoreKind } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import DeleteFeatureStoreModal from './DeleteFeatureStoreModal';
import useExistingFeatureStores from '../../hooks/useExistingFeatureStores';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../../const';

const columns: SortableData<FeatureStoreKind>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a, b) => a.metadata.name.localeCompare(b.metadata.name),
  },
  {
    field: 'namespace',
    label: 'Namespace',
    width: 20,
    sortable: (a, b) => a.metadata.namespace.localeCompare(b.metadata.namespace),
  },
  {
    field: 'phase',
    label: 'Status',
    width: 15,
    sortable: (a, b) => (a.status?.phase ?? '').localeCompare(b.status?.phase ?? ''),
  },
  {
    field: 'feastVersion',
    label: 'Version',
    width: 10,
    sortable: false,
  },
  {
    field: 'created',
    label: 'Created',
    width: 15,
    sortable: (a, b) =>
      new Date(a.metadata.creationTimestamp ?? '').getTime() -
      new Date(b.metadata.creationTimestamp ?? '').getTime(),
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

const phaseLabel = (phase?: string): React.ReactNode => {
  switch (phase) {
    case 'Ready':
      return <Label color="green">Ready</Label>;
    case 'Failed':
      return <Label color="red">Failed</Label>;
    case 'Installing':
      return <Label color="blue">Installing</Label>;
    default:
      return <Label color="grey">{phase ?? 'Pending'}</Label>;
  }
};

const FeatureStoreListPage: React.FC = () => {
  const { featureStores, loaded, error, refresh } = useExistingFeatureStores();
  const [canCreate] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const [canDelete] = useAccessAllowed(verbModelAccess('delete', FeatureStoreModel));
  const [deleteTarget, setDeleteTarget] = React.useState<FeatureStoreKind | undefined>();

  const onDeleteClose = (deleted: boolean) => {
    setDeleteTarget(undefined);
    if (deleted) {
      refresh();
    }
  };

  const emptyStatePage = (
    <EmptyState
      headingLevel="h2"
      titleText="No feature stores"
      icon={CubesIcon}
      data-testid="empty-feature-stores"
    >
      <EmptyStateBody>
        No feature stores have been created yet.
        {canCreate ? ' Get started by creating your first feature store.' : ''}
      </EmptyStateBody>
      {canCreate && (
        <EmptyStateFooter>
          <Button
            variant="primary"
            component={(props: React.ComponentProps<'a'>) => (
              <Link {...props} to="/develop-train/feature-store/create" />
            )}
            icon={<PlusCircleIcon />}
            data-testid="create-feature-store-empty-btn"
          >
            Create feature store
          </Button>
        </EmptyStateFooter>
      )}
    </EmptyState>
  );

  const toolbarContent = (
    <ToolbarGroup>
      {canCreate && (
        <ToolbarItem>
          <Button
            variant="primary"
            component={(props: React.ComponentProps<'a'>) => (
              <Link {...props} to="/develop-train/feature-store/create" />
            )}
            icon={<PlusCircleIcon />}
            data-testid="create-feature-store-toolbar-btn"
          >
            Create feature store
          </Button>
        </ToolbarItem>
      )}
    </ToolbarGroup>
  );

  return (
    <>
      <ApplicationsPage
        title="Feature stores"
        description="View and manage your feature store instances."
        loaded={loaded}
        loadError={error}
        empty={featureStores.length === 0}
        emptyStatePage={emptyStatePage}
        provideChildrenPadding
      >
        <Table
          data-testid="feature-store-list-table"
          id="feature-store-list-table"
          enablePagination
          data={featureStores}
          columns={columns}
          defaultSortColumn={0}
          toolbarContent={toolbarContent}
          emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
          rowRenderer={(fs) => {
            const isUILabeled =
              fs.metadata.labels?.[FEATURE_STORE_UI_LABEL_KEY] === FEATURE_STORE_UI_LABEL_VALUE;
            return (
              <Tr key={fs.metadata.uid}>
                <Td dataLabel="Name">
                  {fs.status?.phase === 'Ready' ? (
                    <Link to={`/develop-train/feature-store/overview/${fs.spec.feastProject}`}>
                      {fs.metadata.name}
                    </Link>
                  ) : (
                    fs.metadata.name
                  )}
                  {isUILabeled && (
                    <>
                      {' '}
                      <Popover bodyContent="This is the primary feature store whose registry is shared with other feature stores. Additional feature stores should use a remote registry pointing to this store.">
                        <Label
                          color="blue"
                          isCompact
                          icon={<OutlinedQuestionCircleIcon />}
                          style={{ cursor: 'pointer' }}
                        >
                          Primary
                        </Label>
                      </Popover>
                    </>
                  )}
                </Td>
                <Td dataLabel="Namespace">{fs.metadata.namespace}</Td>
                <Td dataLabel="Status">{phaseLabel(fs.status?.phase)}</Td>
                <Td dataLabel="Version">{fs.status?.feastVersion ?? '-'}</Td>
                <Td dataLabel="Created">
                  {fs.metadata.creationTimestamp ? (
                    <Timestamp date={new Date(fs.metadata.creationTimestamp)} />
                  ) : (
                    '-'
                  )}
                </Td>
                <Td isActionCell>
                  <ActionsColumn
                    items={[
                      {
                        title: 'Delete',
                        isDisabled: !canDelete,
                        onClick: () => setDeleteTarget(fs),
                      },
                    ]}
                  />
                </Td>
              </Tr>
            );
          }}
        />
      </ApplicationsPage>

      {deleteTarget && (
        <DeleteFeatureStoreModal featureStore={deleteTarget} onClose={onDeleteClose} />
      )}
    </>
  );
};

export default FeatureStoreListPage;
