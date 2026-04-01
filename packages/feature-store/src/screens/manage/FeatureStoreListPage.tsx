import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, CubesIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import DeleteFeatureStoreModal from './DeleteFeatureStoreModal';
import FeatureStoreTableRow from './FeatureStoreTableRow';
import useExistingFeatureStores from '../../hooks/useExistingFeatureStores';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../../const';
import { FeatureStoreKind } from '../../k8sTypes';

const columns: SortableData<FeatureStoreKind>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
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

const FeatureStoreListPage: React.FC = () => {
  const { featureStores, loaded, error, refresh } = useExistingFeatureStores();
  const [canCreate] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const [canDelete] = useAccessAllowed(verbModelAccess('delete', FeatureStoreModel));
  const [deleteTarget, setDeleteTarget] = React.useState<FeatureStoreKind | undefined>();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRowExpansion = React.useCallback((name: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

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
          defaultSortColumn={1}
          toolbarContent={toolbarContent}
          emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
          rowRenderer={(fs, rowIndex) => (
            <FeatureStoreTableRow
              key={fs.metadata.uid}
              featureStore={fs}
              rowIndex={rowIndex}
              isExpanded={expandedRows.has(`${fs.metadata.namespace}/${fs.metadata.name}`)}
              onToggleExpansion={() =>
                toggleRowExpansion(`${fs.metadata.namespace}/${fs.metadata.name}`)
              }
              isUILabeled={
                fs.metadata.labels?.[FEATURE_STORE_UI_LABEL_KEY] === FEATURE_STORE_UI_LABEL_VALUE
              }
              canDelete={canDelete}
              onDelete={setDeleteTarget}
            />
          )}
        />
      </ApplicationsPage>

      {deleteTarget && (
        <DeleteFeatureStoreModal featureStore={deleteTarget} onClose={onDeleteClose} />
      )}
    </>
  );
};

export default FeatureStoreListPage;
