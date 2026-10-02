/* eslint-disable camelcase */
import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import { AssetResponse } from '~/app/types';
import SchemaColumnsTable from '~/app/components/SchemaColumnsTable';
import ConnectionRefLink from '~/app/components/ConnectionRefLink';
import { collectionDetailUrl } from '~/app/utilities/routes';
import {
  getFormatBadge,
  getUnstructuredFormatLabel,
  FORMAT_OPTIONS,
} from '~/app/utilities/formatUtils';

type TableDetailViewProps = {
  asset: AssetResponse;
  project?: string;
};

const WELL_KNOWN_PROPERTY_LABELS: Record<string, string> = {
  pii: 'Pii',
  purpose: 'Purpose',
  maturity: 'Maturity',
  license: 'License',
  domain: 'Domain',
};

const getOrderedProperties = (properties: Record<string, string>) => {
  const entries = Object.entries(properties);
  const wellKnownProperties = Object.keys(WELL_KNOWN_PROPERTY_LABELS).flatMap((key) => {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      return [];
    }
    const value = properties[key];
    return [[key, value] as const];
  });
  const customProperties = entries.filter(([key]) => !WELL_KNOWN_PROPERTY_LABELS[key]);

  return [...wellKnownProperties, ...customProperties];
};

const TableDetailView: React.FC<TableDetailViewProps> = ({ asset, project }) => {
  const isUnstructured = asset.asset_type === 'volume';
  const formatBadge = getFormatBadge(asset.format, asset.asset_type);
  const assetTypeLabel = isUnstructured ? 'Unstructured' : 'Structured';
  const formatLabel = isUnstructured
    ? getUnstructuredFormatLabel(asset.format)
    : FORMAT_OPTIONS.find(
        (option) => option.value === asset.format && option.assetType === asset.asset_type,
      )?.label || asset.format;
  const orderedProperties = asset.properties ? getOrderedProperties(asset.properties) : [];

  const renderTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return <span>-</span>;
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return <span>-</span>;
    }

    return (
      <Timestamp
        date={date}
        tooltip={{
          variant: TimestampTooltipVariant.default,
        }}
      >
        {relativeTime(Date.now(), date.getTime())}
      </Timestamp>
    );
  };

  return (
    <Grid hasGutter>
      <GridItem md={7}>
        <Stack hasGutter>
          <StackItem>
            <Card data-testid="data-details-card">
              <CardTitle>Data details</CardTitle>
              <CardBody>
                <DescriptionList
                  data-testid="table-detail-description-list"
                  columnModifier={{ default: '2Col' }}
                >
                  {/* Description - always first (left column) */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-description">
                      {asset.description || '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Asset type - second for unstructured (right column), fourth for structured */}
                  {isUnstructured ? (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Asset type</DescriptionListTerm>
                      <DescriptionListDescription data-testid="asset-type">
                        {assetTypeLabel}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ) : (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Format</DescriptionListTerm>
                      <DescriptionListDescription data-testid="asset-format">
                        <Label isCompact variant="outline" color={formatBadge.color}>
                          {formatLabel}
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}

                  {/* Collection - third for unstructured (left column), third for structured */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Collection</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-collection">
                      {asset.collection ? (
                        project ? (
                          <Link to={collectionDetailUrl(project, asset.collection)}>
                            {asset.collection}
                          </Link>
                        ) : (
                          asset.collection
                        )
                      ) : (
                        '-'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Format - fourth for unstructured (right column) */}
                  {isUnstructured ? (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Format</DescriptionListTerm>
                      <DescriptionListDescription data-testid="asset-format">
                        <Label isCompact variant="outline" color={formatBadge.color}>
                          {formatLabel}
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ) : null}

                  {/* Asset type - for structured only (right column after Collection) */}
                  {!isUnstructured ? (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Asset type</DescriptionListTerm>
                      <DescriptionListDescription data-testid="asset-type">
                        {assetTypeLabel}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ) : null}

                  {/* Connection - fifth for unstructured (left column), fifth for structured */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Connection</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-connection">
                      <ConnectionRefLink connectionRef={asset.connection_ref} />
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Owner - sixth for both asset types (right column) */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Owner</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-owner">
                      {asset.owner || '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Path - seventh for unstructured (left column), seventh for structured */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Path</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-location">
                      {asset.storage_location || '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Created - eighth for both (right column) */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Created</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-created-at">
                      {renderTimestamp(asset.created_at)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Empty placeholder - pushes Last modified below Created in the right column */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>&nbsp;</DescriptionListTerm>
                    <DescriptionListDescription>&nbsp;</DescriptionListDescription>
                  </DescriptionListGroup>

                  {/* Last modified - tenth for both asset types (right column) */}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Last modified</DescriptionListTerm>
                    <DescriptionListDescription data-testid="asset-updated-at">
                      {renderTimestamp(asset.updated_at)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>

          {orderedProperties.length > 0 ? (
            <StackItem>
              <Card data-testid="properties-card">
                <CardTitle>Properties</CardTitle>
                <CardBody>
                  <DescriptionList
                    data-testid="asset-properties"
                    columnModifier={{ default: '2Col' }}
                  >
                    {orderedProperties.map(([key, value]) => (
                      <DescriptionListGroup key={key} data-testid={`asset-property-${key}`}>
                        <DescriptionListTerm>
                          {WELL_KNOWN_PROPERTY_LABELS[key] || key}
                        </DescriptionListTerm>
                        <DescriptionListDescription>{value || '-'}</DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </CardBody>
              </Card>
            </StackItem>
          ) : null}
        </Stack>
      </GridItem>

      <GridItem md={5}>
        <Stack hasGutter>
          <StackItem>
            <Card data-testid="labels-card">
              <CardTitle>Labels</CardTitle>
              <CardBody>
                {asset.labels && asset.labels.length > 0 ? (
                  <LabelGroup data-testid="asset-labels" numLabels={5}>
                    {asset.labels.map((label) => (
                      <Label key={label} isCompact variant="outline">
                        {label}
                      </Label>
                    ))}
                  </LabelGroup>
                ) : (
                  <span data-testid="asset-labels">No labels</span>
                )}
              </CardBody>
            </Card>
          </StackItem>

          {(asset.columns?.length ?? 0) > 0 ? (
            <StackItem>
              <Card data-testid="schema-card">
                <CardTitle>Schema</CardTitle>
                <CardBody>
                  <SchemaColumnsTable columns={asset.columns ?? []} />
                </CardBody>
              </Card>
            </StackItem>
          ) : null}
        </Stack>
      </GridItem>
    </Grid>
  );
};

export default TableDetailView;
