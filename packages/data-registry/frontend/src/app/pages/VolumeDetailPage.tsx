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
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useVolume } from '~/app/hooks/useVolume';
import { deleteVolume } from '~/app/api/dataRegistry';
import { browseUrl } from '~/app/utilities/routes';
import DeleteAssetModal from '~/app/components/DeleteAssetModal';
import EditAssetModal from '~/app/components/EditAssetModal';
import VolumeDetailView from './VolumeDetailView';

const VolumeDetailPage: React.FC = () => {
  const { project, collection, name } = useParams<{
    project: string;
    collection: string;
    name: string;
  }>();
  const navigate = useNavigate();

  const [volume, loaded, loadError, refresh] = useVolume(project, collection, name);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    if (!project || !collection || !name) {
      return;
    }
    await deleteVolume(project, collection, name);
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
            data-testid="asset-action-edit"
          >
            Edit
          </DropdownItem>
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
          assetType="volume"
          onDelete={handleDelete}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      ) : null}
      {isEditModalOpen && volume && project && collection && name ? (
        <EditAssetModal
          asset={volume}
          assetKind="volume"
          project={project}
          collection={collection}
          name={name}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={() => {
            setIsEditModalOpen(false);
            refresh();
          }}
        />
      ) : null}
    </>
  );

  const title = (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{displayName}</FlexItem>
      <FlexItem>
        <Label isCompact data-testid="asset-type-badge">
          Volume
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
      empty={loaded && !volume}
      emptyStatePage={
        <EmptyState
          headingLevel="h2"
          icon={SearchIcon}
          titleText="Volume not found"
          variant={EmptyStateVariant.full}
          data-testid="volume-not-found-empty-state"
        >
          <EmptyStateBody>
            The volume you are looking for does not exist or you do not have permission to view it.
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
            {volume ? <VolumeDetailView volume={volume} /> : null}
          </TabContent>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default VolumeDetailPage;
