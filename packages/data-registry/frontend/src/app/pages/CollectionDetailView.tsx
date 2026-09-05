import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  MenuToggle,
  Timestamp,
  TimestampFormat,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import type { CollectionDetail, CollectionAsset } from '~/app/hooks/useCollectionDetail';
import { tableDetailUrl, volumeDetailUrl } from '~/app/utilities/routes';

type CollectionDetailViewProps = {
  collection: CollectionDetail;
  project?: string;
};

type AssetRowProps = {
  asset: CollectionAsset;
  assetType: string;
  collectionName: string;
  project?: string;
};

const AssetRow: React.FC<AssetRowProps> = ({ asset, assetType, collectionName, project }) => {
  const navigate = useNavigate();
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);

  const detailUrl = project
    ? asset.assetType === 'volume'
      ? volumeDetailUrl(project, collectionName, asset.name)
      : tableDetailUrl(project, collectionName, asset.name)
    : undefined;

  return (
    <Tr>
      <Td dataLabel="Name">{detailUrl ? <Link to={detailUrl}>{asset.name}</Link> : asset.name}</Td>
      <Td dataLabel="Type">{assetType}</Td>
      <Td dataLabel="Format">
        {asset.format === 'Structured' || asset.format === 'Unstructured' ? (
          <Label isCompact color="grey">
            {assetType}
          </Label>
        ) : (
          <Label isCompact color={asset.assetType === 'table' ? 'orange' : 'grey'}>
            {asset.format}
          </Label>
        )}
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

const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({ collection, project }) => (
  <Grid hasGutter>
    <GridItem md={7}>
      <Card data-testid="data-assets-card">
        <CardTitle>Data assets ({collection.assets.length})</CardTitle>
        <CardBody>
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
              {collection.assets.length === 0 ? (
                <Tr>
                  <Td colSpan={4}>
                    <Content component="p">No data assets in this collection.</Content>
                  </Td>
                </Tr>
              ) : (
                collection.assets.map((asset) => {
                  const assetType = asset.assetType === 'table' ? 'Structured' : 'Unstructured';
                  return (
                    <AssetRow
                      key={asset.name}
                      asset={asset}
                      assetType={assetType}
                      collectionName={collection.name}
                      project={project}
                    />
                  );
                })
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </GridItem>

    <GridItem md={5}>
      <Card data-testid="collection-details-card">
        <CardTitle>Collection details</CardTitle>
        <CardBody>
          <DescriptionList data-testid="collection-detail-description-list">
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
                {collection.createdAt ? (
                  <Flex
                    direction={{ default: 'column' }}
                    spaceItems={{ default: 'spaceItemsNone' }}
                  >
                    <FlexItem>
                      <Timestamp
                        date={new Date(collection.createdAt)}
                        dateFormat={TimestampFormat.long}
                      />
                    </FlexItem>
                    {collection.createdBy ? (
                      <FlexItem>
                        <Content component="small">by {collection.createdBy}</Content>
                      </FlexItem>
                    ) : null}
                  </Flex>
                ) : (
                  '-'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
    </GridItem>
  </Grid>
);

export default CollectionDetailView;
