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
import { useVolume } from '~/app/hooks/useVolume';
import { deleteGenericTable, deleteVolume } from '~/app/api/dataRegistry';
import { browseUrl } from '~/app/utilities/routes';
import { volumeToAsset } from '~/app/utilities/assetUtils';
import DeleteAssetModal from '~/app/components/DeleteAssetModal';
import TableDetailView from './TableDetailView';

const TableDetailPage: React.FC = () => {
  const { assetType, project, collection, name } = useParams<{
    assetType: string;
    project: string;
    collection: string;
    name: string;
  }>();
  const navigate = useNavigate();

  const isVolume = assetType === 'volume';

  const [genericTable, genericLoaded, genericError] = useGenericTable(
    isVolume ? undefined : project,
    isVolume ? undefined : collection,
    isVolume ? undefined : name,
  );
  const [volume, volumeLoaded, volumeError] = useVolume(
    isVolume ? project : undefined,
    isVolume ? collection : undefined,
    isVolume ? name : undefined,
  );

  const asset = React.useMemo(() => {
    if (isVolume && volume && collection) {
      return volumeToAsset(volume, collection);
    }
    return genericTable;
  }, [isVolume, volume, genericTable, collection]);

  const loaded = isVolume ? volumeLoaded : genericLoaded;
  const loadError = isVolume ? volumeError : genericError;

  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    if (!project || !collection || !name) {
      return;
    }
    if (isVolume) {
      await deleteVolume(project, collection, name);
    } else {
      await deleteGenericTable(project, collection, name);
    }
    navigate(browseUrl(project));
  }, [project, collection, name, navigate, isVolume]);

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
          assetType={isVolume ? 'volume' : 'table'}
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
          titleText="Asset not found"
          variant={EmptyStateVariant.full}
          data-testid="asset-not-found-empty-state"
        >
          <EmptyStateBody>
            The asset you are looking for does not exist or you do not have permission to view it.
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
