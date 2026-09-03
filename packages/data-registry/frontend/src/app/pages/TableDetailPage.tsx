import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Dropdown,
  DropdownList,
  DropdownItem,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  Tab,
  Tabs,
  TabContent,
  TabTitleText,
  Tooltip,
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useGenericTable } from '~/app/hooks/useGenericTable';
import { deleteGenericTable } from '~/app/api/dataRegistry';
import { browseUrl } from '~/app/utilities/routes';
import DeleteAssetModal from '~/app/components/DeleteAssetModal';
import TableDetailView from './TableDetailView';

const TableDetailPage: React.FC = () => {
  const { project, collection, name } = useParams<{
    project: string;
    collection: string;
    name: string;
  }>();
  const navigate = useNavigate();

  const [asset, loaded, loadError] = useGenericTable(project, collection, name);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    if (!project || !collection || !name) {
      return;
    }
    await deleteGenericTable(project, collection, name);
    navigate(browseUrl(project));
  }, [project, collection, name, navigate]);

  const displayName = name || 'Loading...';

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem
        render={({ className }) => (
          <Link className={className} to={browseUrl(project)}>
            Data
          </Link>
        )}
      />
      {collection ? (
        <BreadcrumbItem
          render={({ className }) => (
            <Link className={className} to={browseUrl(project)}>
              {collection}
            </Link>
          )}
        />
      ) : null}
      <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
    </Breadcrumb>
  );

  const headerAction = (
    <>
      <Dropdown
        isOpen={isActionsOpen}
        onSelect={() => setIsActionsOpen(false)}
        onOpenChange={setIsActionsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={() => setIsActionsOpen((prev) => !prev)}
            isExpanded={isActionsOpen}
            aria-label="Actions"
            data-testid="asset-actions-toggle"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          <Tooltip content="Edit functionality coming soon">
            <DropdownItem key="edit" isDisabled data-testid="asset-action-edit">
              Edit
            </DropdownItem>
          </Tooltip>
          <DropdownItem
            key="delete"
            onClick={() => setIsDeleteModalOpen(true)}
            data-testid="asset-action-delete"
          >
            Delete
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {isDeleteModalOpen && name ? (
        <DeleteAssetModal
          assetName={displayName}
          assetType="table"
          onDelete={handleDelete}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      ) : null}
    </>
  );

  const title = (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{displayName}</FlexItem>
      <FlexItem>
        <Label isCompact data-testid="asset-type-badge">
          Data asset
        </Label>
      </FlexItem>
    </Flex>
  );

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={breadcrumb}
      headerAction={headerAction}
      loaded={loaded}
      loadError={loadError}
      empty={loaded && !asset}
      emptyStatePage={
        <EmptyState
          headingLevel="h2"
          icon={SearchIcon}
          titleText="Table not found"
          variant={EmptyStateVariant.full}
          data-testid="table-not-found-empty-state"
        >
          <EmptyStateBody>
            The table you are looking for does not exist or you do not have permission to view it.
          </EmptyStateBody>
          <EmptyStateFooter>
            <Button
              variant="primary"
              component={(props) => <Link {...props} to={browseUrl(project)} />}
            >
              Return to data browse
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      }
      provideChildrenPadding
    >
      <Tabs defaultActiveKey={0} data-testid="detail-tabs">
        <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
          <TabContent id="overview-tab">
            {asset ? <TableDetailView asset={asset} project={project} /> : null}
          </TabContent>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default TableDetailPage;
