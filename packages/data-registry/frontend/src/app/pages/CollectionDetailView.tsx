import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Grid,
  GridItem,
  Label,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import type { CollectionDetail, CollectionAsset } from '~/app/hooks/useCollectionDetail';
import { useDataRegistryTrackEvent } from '~/app/hooks/useDataRegistryTrackEvent';
import { assetDetailUrl } from '~/app/utilities/routes';
import { FORMAT_OPTIONS, getUnstructuredFormatLabel } from '~/app/utilities/formatUtils';
import { DATA_REGISTRY_EVENT_NAMES } from '~/app/utilities/tracking';

type CollectionDetailViewProps = {
  collection: CollectionDetail;
  project?: string;
  onRegisterData?: () => void;
  isRegisterDataDisabled?: boolean;
};

type AssetRowProps = {
  asset: CollectionAsset;
  assetType: string;
  collectionName: string;
  project?: string;
};

const AssetRow: React.FC<AssetRowProps> = ({ asset, assetType, collectionName, project }) => {
  const navigate = useNavigate();
  const trackEvent = useDataRegistryTrackEvent();
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const formatLabel =
    asset.assetType === 'volume'
      ? getUnstructuredFormatLabel(asset.format)
      : FORMAT_OPTIONS.find(
          (option) => option.value === asset.format && option.assetType === asset.assetType,
        )?.label || asset.format;

  const detailUrl = project
    ? assetDetailUrl(
        project,
        collectionName,
        asset.name,
        asset.assetType === 'volume' ? 'volume' : 'table',
      )
    : undefined;

  return (
    <Tr>
      <Td dataLabel="Name">
        {detailUrl ? (
          <Link
            to={detailUrl}
            onClick={() => {
              trackEvent({
                eventName: DATA_REGISTRY_EVENT_NAMES.assetOpened,
                properties: { project: project || '' },
              });
            }}
          >
            {asset.name}
          </Link>
        ) : (
          asset.name
        )}
      </Td>
      <Td dataLabel="Type">{assetType}</Td>
      <Td dataLabel="Format">
        <Label isCompact variant="outline">
          {formatLabel}
        </Label>
      </Td>
      <Td isActionCell>
        <Dropdown
          isOpen={isKebabOpen}
          onSelect={() => setIsKebabOpen(false)}
          onOpenChange={setIsKebabOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              variant="plain"
              onClick={() => setIsKebabOpen((prev) => !prev)}
              isExpanded={isKebabOpen}
              aria-label={`Actions for ${asset.name}`}
              data-testid={`asset-kebab-${asset.name}`}
            >
              <EllipsisVIcon />
            </MenuToggle>
          )}
          popperProps={{ position: 'right' }}
        >
          <DropdownList>
            <DropdownItem
              key="view"
              onClick={() => {
                if (detailUrl) {
                  trackEvent({
                    eventName: DATA_REGISTRY_EVENT_NAMES.assetOpened,
                    properties: { project: project || '' },
                  });
                  navigate(detailUrl);
                }
              }}
              isDisabled={!detailUrl}
            >
              View details
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </Td>
    </Tr>
  );
};

const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({
  collection,
  project,
  onRegisterData,
  isRegisterDataDisabled = false,
}) => (
  <Grid hasGutter>
    <GridItem md={7}>
      <Card data-testid="data-assets-card">
        <CardTitle>Data assets ({collection.assets.length})</CardTitle>
        <CardBody>
          {collection.assets.length === 0 ? (
            <EmptyState
              headingLevel="h3"
              titleText="No data assets"
              icon={PlusCircleIcon}
              variant={EmptyStateVariant.xs}
              data-testid="collection-assets-empty-state"
            >
              <EmptyStateBody>
                To help users in your organization discover and understand external data, create a
                data asset. Data assets are metadata records that store information like location,
                format, and schema, but not the data itself.
              </EmptyStateBody>
              {onRegisterData ? (
                <EmptyStateFooter>
                  <Button
                    variant="primary"
                    onClick={onRegisterData}
                    isDisabled={isRegisterDataDisabled}
                    data-testid="collection-empty-register-data-button"
                  >
                    Register data
                  </Button>
                </EmptyStateFooter>
              ) : null}
            </EmptyState>
          ) : (
            <Table aria-label="Collection assets" data-testid="collection-assets-table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Format</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {collection.assets.map((asset) => {
                  const assetType = asset.assetType === 'table' ? 'Structured' : 'Unstructured';
                  return (
                    <AssetRow
                      key={`${asset.assetType}-${asset.name}`}
                      asset={asset}
                      assetType={assetType}
                      collectionName={collection.name}
                      project={project}
                    />
                  );
                })}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </GridItem>

    <GridItem md={5}>
      <Card data-testid="collection-details-card">
        <CardTitle>Collection details</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal data-testid="collection-detail-description-list">
            <DescriptionListGroup>
              <DescriptionListTerm>Structured</DescriptionListTerm>
              <DescriptionListDescription data-testid="collection-structured-count">
                {collection.structuredCount}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Unstructured</DescriptionListTerm>
              <DescriptionListDescription data-testid="collection-unstructured-count">
                {collection.unstructuredCount}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Owner</DescriptionListTerm>
              <DescriptionListDescription data-testid="collection-owner">
                {collection.owner}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription data-testid="collection-created-at">
                {collection.createdAt
                  ? `${new Date(collection.createdAt).toLocaleString()}${collection.createdBy ? ` by ${collection.createdBy}` : ''}`
                  : '-'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
    </GridItem>
  </Grid>
);

export default CollectionDetailView;
