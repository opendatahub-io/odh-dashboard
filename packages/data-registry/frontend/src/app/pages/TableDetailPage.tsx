import React from 'react';
import { ProjectObjectType, TitleWithIcon } from '@odh-dashboard/ui-core';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  Divider,
  Tab,
  Tabs,
  TabContent,
  TabTitleText,
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useGenericTable } from '~/app/hooks/useGenericTable';
import { useVolume } from '~/app/hooks/useVolume';
import { useConnections } from '~/app/hooks/useConnections';
import { useAssets } from '~/app/hooks/useAssets';
import { useCollections } from '~/app/hooks/useCollections';
import { useLabels } from '~/app/hooks/useLabels';
import { deleteGenericTable, deleteVolume } from '~/app/api/dataRegistry';
import { hasDataRegistryWriteAccess } from '~/app/utilities/access';
import { browseUrl } from '~/app/utilities/routes';
import { getAssetDetailConnectionWarnings } from '~/app/utilities/connectionUtils';
import { useNotification } from '~/app/hooks/useNotification';
import DeleteAssetModal from '~/app/components/DeleteAssetModal';
import EditAssetModal from '~/app/components/EditAssetModal';
import ManageCollectionsModal from '~/app/components/ManageCollectionsModal';
import ManageLabelsModal from '~/app/components/ManageLabelsModal';
import TableDetailView from './TableDetailView';

const TableDetailPage: React.FC = () => {
  const { assetType, project, collection, name } = useParams<{
    assetType: string;
    project: string;
    collection: string;
    name: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const notification = useNotification();

  const isVolume = assetType === 'volume';

  const [genericTable, genericLoaded, genericError, refreshGenericTable] = useGenericTable(
    isVolume ? undefined : project,
    isVolume ? undefined : collection,
    isVolume ? undefined : name,
  );
  const [volume, volumeLoaded, volumeError, refreshVolume] = useVolume(
    isVolume ? project : undefined,
    isVolume ? collection : undefined,
    isVolume ? name : undefined,
  );
  const [assets, assetsLoaded, assetsError, assetsRefresh, collectionNames] = useAssets(
    project || '',
  );
  const hasExistingDchConnectionReferences =
    assetsLoaded && assets.some((assetItem) => assetItem.rawAsset?.connection_ref?.type === 'dch');
  const [, , collectionsError] = useCollections(project || '', assets, collectionNames);
  const [labels, , , labelsRefresh] = useLabels(project || '');
  const hasWriteAccess = hasDataRegistryWriteAccess(assetsError, collectionsError);

  const asset = React.useMemo(
    () => (isVolume ? volume : genericTable),
    [isVolume, volume, genericTable],
  );

  const [
    connections,
    connectionsLoaded,
    connectionsError,
    ,
    connectionWarnings,
    fetchedConnectionDisplayData,
  ] = useConnections(project ?? '', !!asset?.connection_ref);
  const connectionDisplayData = fetchedConnectionDisplayData ?? connections;
  const visibleConnectionWarnings = getAssetDetailConnectionWarnings(
    connectionWarnings,
    asset?.connection_ref,
  );

  const loaded = isVolume ? volumeLoaded : genericLoaded;
  const loadError = isVolume ? volumeError : genericError;

  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(searchParams.get('edit') === 'true');
  const [returnToEditModal, setReturnToEditModal] = React.useState(false);
  const [isManageCollectionsOpen, setIsManageCollectionsOpen] = React.useState(false);
  const [isManageLabelsOpen, setIsManageLabelsOpen] = React.useState(false);

  const closeEditModal = React.useCallback(() => {
    setIsEditModalOpen(false);
    setReturnToEditModal(false);
    if (searchParams.has('edit')) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('edit');
        return next;
      });
    }
  }, [searchParams, setSearchParams]);

  const openCollectionsFromEdit = React.useCallback(() => {
    setIsEditModalOpen(false);
    setReturnToEditModal(true);
    setIsManageCollectionsOpen(true);
  }, []);

  const openLabelsFromEdit = React.useCallback(() => {
    setIsEditModalOpen(false);
    setReturnToEditModal(true);
    setIsManageLabelsOpen(true);
  }, []);

  const handleCollectionsModalClose = React.useCallback(() => {
    setIsManageCollectionsOpen(false);
    if (returnToEditModal) {
      setReturnToEditModal(false);
      setIsEditModalOpen(true);
    }
  }, [returnToEditModal]);

  const handleLabelsModalClose = React.useCallback(() => {
    setIsManageLabelsOpen(false);
    if (returnToEditModal) {
      setReturnToEditModal(false);
      setIsEditModalOpen(true);
    }
  }, [returnToEditModal]);

  const refresh = React.useCallback(() => {
    if (isVolume) {
      refreshVolume();
    } else {
      refreshGenericTable();
    }
    assetsRefresh();
    labelsRefresh();
  }, [assetsRefresh, isVolume, labelsRefresh, refreshGenericTable, refreshVolume]);

  const handleSaved = React.useCallback(() => {
    closeEditModal();
    refresh();
  }, [closeEditModal, refresh]);

  const handleDelete = React.useCallback(async () => {
    if (!project || !collection || !name) {
      return;
    }
    if (isVolume) {
      await deleteVolume(project, collection, name);
      notification.success('Volume deleted', `${name} was deleted successfully.`);
    } else {
      await deleteGenericTable(project, collection, name);
      notification.success('Table deleted', `${name} was deleted successfully.`);
    }
    navigate(browseUrl(project));
  }, [project, collection, name, navigate, isVolume, notification]);

  const displayName = name || 'Loading...';

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem
        render={({ className }) => (
          <Link className={className} to={browseUrl(project)}>
            Data Registry – {project || ''}
          </Link>
        )}
      />
      <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
    </Breadcrumb>
  );

  let editAssetModal: React.ReactNode = null;
  if ((isEditModalOpen || returnToEditModal) && hasWriteAccess && project && collection && name) {
    if (isVolume && volume) {
      editAssetModal = (
        <EditAssetModal
          isOpen={isEditModalOpen}
          asset={volume}
          assetKind="volume"
          project={project}
          collection={collection}
          name={name}
          hasExistingDchConnectionReferences={hasExistingDchConnectionReferences}
          onClose={closeEditModal}
          onSaved={handleSaved}
          onManageCollections={openCollectionsFromEdit}
          onManageLabels={openLabelsFromEdit}
        />
      );
    } else if (!isVolume && genericTable) {
      editAssetModal = (
        <EditAssetModal
          isOpen={isEditModalOpen}
          asset={genericTable}
          assetKind="table"
          project={project}
          collection={collection}
          name={name}
          hasExistingDchConnectionReferences={hasExistingDchConnectionReferences}
          onClose={closeEditModal}
          onSaved={handleSaved}
          onManageCollections={openCollectionsFromEdit}
          onManageLabels={openLabelsFromEdit}
        />
      );
    }
  }

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
            isDisabled={!loaded}
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
          <DropdownItem
            key="edit"
            onClick={() => setIsEditModalOpen(true)}
            isDisabled={!hasWriteAccess}
            data-testid="asset-action-edit"
          >
            Edit
          </DropdownItem>
          <Divider component="li" />
          <DropdownItem
            key="delete"
            onClick={() => setIsDeleteModalOpen(true)}
            isDisabled={!hasWriteAccess}
            isDanger
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
      {editAssetModal}
      {project ? (
        <ManageCollectionsModal
          isOpen={isManageCollectionsOpen}
          project={project}
          onRefresh={refresh}
          onClose={handleCollectionsModalClose}
        />
      ) : null}
      {project ? (
        <ManageLabelsModal
          isOpen={isManageLabelsOpen}
          project={project}
          labels={labels}
          assets={assets}
          onRefresh={refresh}
          onClose={handleLabelsModalClose}
        />
      ) : null}
    </>
  );

  const title = (
    <TitleWithIcon
      objectType={ProjectObjectType.dataRegistry}
      iconSize={32}
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>{displayName}</FlexItem>
          <FlexItem>
            <Label isCompact variant="outline" data-testid="asset-type-badge">
              Data asset
            </Label>
          </FlexItem>
        </Flex>
      }
    />
  );

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={breadcrumb}
      headerAction={headerAction}
      loaded={loaded}
      loadError={loadError}
      onRetry={refresh}
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
      removeChildrenTopPadding
    >
      <Tabs defaultActiveKey={0} data-testid="detail-tabs">
        <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
          <TabContent id="overview-tab">
            {asset ? (
              <TableDetailView
                asset={asset}
                project={project}
                connections={connectionDisplayData}
                connectionsLoaded={connectionsLoaded}
                connectionsError={connectionsError}
                connectionWarnings={visibleConnectionWarnings}
              />
            ) : null}
          </TabContent>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default TableDetailPage;
