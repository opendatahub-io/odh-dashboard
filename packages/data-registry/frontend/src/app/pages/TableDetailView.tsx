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
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { AssetResponse } from '~/app/types';
import SchemaColumnsTable from '~/app/components/SchemaColumnsTable';
import ConnectionRefLink from '~/app/components/ConnectionRefLink';
import { browseUrl } from '~/app/utilities/routes';
import { getFormatBadge, isStructured } from '~/app/utilities/formatUtils';

type TableDetailViewProps = {
  asset: AssetResponse;
  project?: string;
};

const TableDetailView: React.FC<TableDetailViewProps> = ({ asset, project }) => {
  const formatBadge = asset.format ? getFormatBadge(asset.format) : undefined;
  const isUnstructured = asset.format && !isStructured(asset.format);

  const formatTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) {
      return '-';
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
  };

  return (
    <Grid hasGutter>
      <GridItem md={7}>
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
                    {formatBadge ? formatBadge.text : asset.asset_type || '-'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Format - only for structured (right column after Description) */}
              {asset.format && isStructured(asset.format) ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Format</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-format">
                    <Label isCompact variant="outline" color={formatBadge?.color}>
                      {asset.format}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Collection - third for unstructured (left column), third for structured */}
              <DescriptionListGroup>
                <DescriptionListTerm>Collection</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-collection">
                  {asset.collection ? (
                    project ? (
                      <Link to={browseUrl(project)}>{asset.collection}</Link>
                    ) : (
                      asset.collection
                    )
                  ) : (
                    '-'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>

              {/* Owner - fourth for unstructured (right column) */}
              {isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Owner</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-owner">
                    {asset.owner || '-'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Asset type - for structured only (right column after Collection) */}
              {!isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Asset type</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-type">
                    {formatBadge ? formatBadge.text : asset.asset_type || '-'}
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

              {/* Created - sixth for unstructured (right column) */}
              {isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-created-at">
                    {formatTimestamp(asset.created_at)}
                    {asset.created_at && asset.registered_by ? ` by ${asset.registered_by}` : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Owner - for structured only (right column after Connection) */}
              {!isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Owner</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-owner">
                    {asset.owner || '-'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Path - seventh for unstructured (left column), seventh for structured */}
              <DescriptionListGroup>
                <DescriptionListTerm>Path</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-location">
                  {asset.location || '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>

              {/* Created - eighth for both (right column) */}
              <DescriptionListGroup>
                <DescriptionListTerm>Created</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-created-at">
                  {formatTimestamp(asset.created_at)}
                  {asset.created_at && asset.registered_by ? ` by ${asset.registered_by}` : null}
                </DescriptionListDescription>
              </DescriptionListGroup>

              {/* Last modified - ninth for unstructured (left column) */}
              {isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Last modified</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-updated-at">
                    {formatTimestamp(asset.updated_at)}
                    {asset.updated_at && asset.updated_by ? ` by ${asset.updated_by}` : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Empty placeholder - for structured only (ninth position) - pushes Last modified to right column */}
              {!isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>&nbsp;</DescriptionListTerm>
                  <DescriptionListDescription>&nbsp;</DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

              {/* Last modified - for structured only (tenth position, right column) */}
              {!isUnstructured ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Last modified</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-updated-at">
                    {formatTimestamp(asset.updated_at)}
                    {asset.updated_at && asset.updated_by ? ` by ${asset.updated_by}` : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
            </DescriptionList>
          </CardBody>
        </Card>
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
                      <Label key={label} isCompact>
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

          {asset.properties && Object.keys(asset.properties).length > 0 ? (
            <StackItem>
              <Card data-testid="properties-card">
                <CardTitle>Properties</CardTitle>
                <CardBody>
                  <LabelGroup data-testid="asset-properties" numLabels={5}>
                    {Object.entries(asset.properties).map(([key, value]) => (
                      <Label key={key} isCompact>
                        {key}: {value}
                      </Label>
                    ))}
                  </LabelGroup>
                </CardBody>
              </Card>
            </StackItem>
          ) : null}

          {(asset.columns?.length ?? 0) > 0 ? (
            <StackItem>
              <Card data-testid="schema-card">
                <CardTitle>Schema</CardTitle>
                <CardBody>
                  <span data-testid="schema-column-count">{asset.columns?.length} columns</span>
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
