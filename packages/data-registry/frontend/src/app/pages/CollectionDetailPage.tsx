import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
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
import { useCollectionDetail } from '~/app/hooks/useCollectionDetail';
import { useAssets } from '~/app/hooks/useAssets';
import { useCollections } from '~/app/hooks/useCollections';
import { browseUrl } from '~/app/utilities/routes';
import DeleteCollectionModal from '~/app/components/DeleteCollectionModal';
import ManageCollectionsModal from '~/app/components/ManageCollectionsModal';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import type { CollectionInfo } from '~/app/hooks/useCollections';
import CollectionDetailView from './CollectionDetailView';

const CollectionDetailPage: React.FC = () => {
  const { project, collection } = useParams<{
    project: string;
    collection: string;
  }>();
  const navigate = useNavigate();

  const [collectionDetail, loaded, loadError, refresh] = useCollectionDetail(project, collection);
  const [assets, , , assetsRefresh, collectionNames] = useAssets(project || '');
  const [collections, , , collectionsRefresh] = useCollections(
    project || '',
    assets,
    collectionNames,
  );

  const handleRefresh = React.useCallback(() => {
    refresh();
    assetsRefresh();
    collectionsRefresh();
  }, [refresh, assetsRefresh, collectionsRefresh]);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isManageCollectionsOpen, setIsManageCollectionsOpen] = React.useState(false);
  const [isRegisterDataOpen, setIsRegisterDataOpen] = React.useState(false);

  const handleDeleted = React.useCallback(() => {
    navigate(browseUrl(project));
  }, [project, navigate]);

  const displayName = collection || 'Loading...';
  const hasAssets = (collectionDetail?.assets.length ?? 0) > 0;

  // Convert CollectionDetail to CollectionInfo for the DeleteCollectionModal
  const collectionInfo: CollectionInfo | null = collectionDetail
    ? {
        name: collectionDetail.name,
        description: collectionDetail.description,
        assetNames: collectionDetail.assets.map((a) => a.name),
        tableCount: collectionDetail.structuredCount,
        volumeCount: collectionDetail.unstructuredCount,
      }
    : null;

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
            data-testid="collection-actions-toggle"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          <DropdownItem
            key="register-data"
            onClick={() => setIsRegisterDataOpen(true)}
            data-testid="collection-action-register-data"
          >
            Register data
          </DropdownItem>
          <Tooltip
            content={
              hasAssets
                ? 'Cannot delete a collection that contains data assets'
                : 'Delete this collection'
            }
          >
            <DropdownItem
              key="delete"
              onClick={() => setIsDeleteModalOpen(true)}
              isDisabled={hasAssets}
              data-testid="collection-action-delete"
            >
              Delete collection
            </DropdownItem>
          </Tooltip>
          <DropdownItem
            key="manage-collections"
            onClick={() => setIsManageCollectionsOpen(true)}
            data-testid="collection-action-manage-collections"
          >
            Manage collections
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {isDeleteModalOpen && project && collectionInfo ? (
        <DeleteCollectionModal
          isOpen={isDeleteModalOpen}
          project={project}
          collection={collectionInfo}
          onDeleted={handleDeleted}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      ) : null}
      {isManageCollectionsOpen && project ? (
        <ManageCollectionsModal
          isOpen={isManageCollectionsOpen}
          project={project}
          collections={collections}
          onRefresh={handleRefresh}
          onClose={() => {
            setIsManageCollectionsOpen(false);
          }}
        />
      ) : null}
      {isRegisterDataOpen && project && collection ? (
        <RegisterDataModal
          isOpen={isRegisterDataOpen}
          project={project}
          collections={[collection]}
          onCreated={handleRefresh}
          onManageCollections={() => {
            setIsRegisterDataOpen(false);
            setIsManageCollectionsOpen(true);
          }}
          onClose={() => {
            setIsRegisterDataOpen(false);
          }}
        />
      ) : null}
    </>
  );

  const title = (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{displayName}</FlexItem>
      <FlexItem>
        <Label isCompact data-testid="collection-type-badge">
          Collection
        </Label>
      </FlexItem>
    </Flex>
  );

  const description = collectionDetail?.description ? (
    <Content component="p" data-testid="collection-description">
      {collectionDetail.description}
    </Content>
  ) : null;

  return (
    <ApplicationsPage
      title={title}
      description={description}
      breadcrumb={breadcrumb}
      headerAction={headerAction}
      loaded={loaded}
      loadError={loadError}
      empty={loaded && !collectionDetail}
      emptyStatePage={
        <EmptyState
          headingLevel="h2"
          icon={SearchIcon}
          titleText="Collection not found"
          variant={EmptyStateVariant.full}
          data-testid="collection-not-found-empty-state"
        >
          <EmptyStateBody>
            The collection you are looking for does not exist or you do not have permission to view
            it.
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
            {collectionDetail ? (
              <CollectionDetailView collection={collectionDetail} project={project} />
            ) : null}
          </TabContent>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default CollectionDetailPage;
