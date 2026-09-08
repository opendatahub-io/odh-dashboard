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
  TimestampFormat,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { AssetResponse } from '~/app/types';
import SchemaColumnsTable from '~/app/components/SchemaColumnsTable';
import ConnectionRefLink from '~/app/components/ConnectionRefLink';
import { browseUrl } from '~/app/utilities/routes';
import { getFormatBadge } from '~/app/utilities/formatUtils';

type TableDetailViewProps = {
  asset: AssetResponse;
  project?: string;
};

const TableDetailView: React.FC<TableDetailViewProps> = ({ asset, project }) => {
  const formatBadge = asset.format ? getFormatBadge(asset.format) : undefined;

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
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-description">
                  {asset.description || '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>

              {asset.format ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Format</DescriptionListTerm>
                  <DescriptionListDescription data-testid="asset-format">
                    <Label isCompact variant="outline" color={formatBadge?.color}>
                      {asset.format}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}

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

              <DescriptionListGroup>
                <DescriptionListTerm>Asset type</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-type">
                  {formatBadge ? formatBadge.text : asset.asset_type || '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Connection</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-connection">
                  <ConnectionRefLink connectionRef={asset.connection_ref} />
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Owner</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-owner">
                  {asset.owner || '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Path</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-location">
                  {asset.location || '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Created</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-created-at">
                  {asset.created_at ? (
                    <>
                      <Timestamp
                        date={new Date(asset.created_at)}
                        dateFormat={TimestampFormat.long}
                      />
                      {asset.registered_by ? ` by ${asset.registered_by}` : null}
                    </>
                  ) : (
                    '-'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Last modified</DescriptionListTerm>
                <DescriptionListDescription data-testid="asset-updated-at">
                  {asset.updated_at ? (
                    <>
                      <Timestamp
                        date={new Date(asset.updated_at)}
                        dateFormat={TimestampFormat.long}
                      />
                      {asset.updated_by ? ` by ${asset.updated_by}` : null}
                    </>
                  ) : (
                    '-'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
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

          <StackItem>
            <Card data-testid="schema-card">
              <CardTitle>Schema</CardTitle>
              <CardBody>
                {(asset.columns?.length ?? 0) > 0 ? (
                  <span data-testid="schema-column-count">{asset.columns?.length} columns</span>
                ) : null}
                <SchemaColumnsTable columns={asset.columns ?? []} />
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </GridItem>
    </Grid>
  );
};

export default TableDetailView;
