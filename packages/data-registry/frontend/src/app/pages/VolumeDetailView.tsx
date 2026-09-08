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
import { VolumeInfo } from '~/app/types';

type VolumeDetailViewProps = {
  volume: VolumeInfo;
};

const VolumeDetailView: React.FC<VolumeDetailViewProps> = ({ volume }) => (
  <Grid hasGutter>
    <GridItem md={7}>
      <Card data-testid="data-details-card">
        <CardTitle>Data details</CardTitle>
        <CardBody>
          <DescriptionList
            data-testid="volume-detail-description-list"
            columnModifier={{ default: '2Col' }}
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-comment">
                {volume.comment || '-'}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Volume type</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-type">
                {volume['volume-type'] ? (
                  <Label isCompact variant="outline" color="orange">
                    {volume['volume-type']}
                  </Label>
                ) : (
                  '-'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Project</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-project">
                {volume['catalog-name']}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Storage location</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-storage-location">
                {volume['storage-location']}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Owner</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-owner">
                {volume.owner || '-'}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-created-at">
                {volume['created-at'] ? (
                  <Timestamp
                    date={new Date(volume['created-at'])}
                    dateFormat={TimestampFormat.long}
                  />
                ) : (
                  '-'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Last modified</DescriptionListTerm>
              <DescriptionListDescription data-testid="volume-updated-at">
                {volume['updated-at'] ? (
                  <Timestamp
                    date={new Date(volume['updated-at'])}
                    dateFormat={TimestampFormat.long}
                  />
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
              {volume.labels && volume.labels.length > 0 ? (
                <LabelGroup data-testid="volume-labels" numLabels={5}>
                  {volume.labels.map((label) => (
                    <Label key={label} isCompact>
                      {label}
                    </Label>
                  ))}
                </LabelGroup>
              ) : (
                <span data-testid="volume-labels">No labels</span>
              )}
            </CardBody>
          </Card>
        </StackItem>

        {volume.properties && Object.keys(volume.properties).length > 0 ? (
          <StackItem>
            <Card data-testid="properties-card">
              <CardTitle>Properties</CardTitle>
              <CardBody>
                <LabelGroup data-testid="volume-properties" numLabels={5}>
                  {Object.entries(volume.properties).map(([key, value]) => (
                    <Label key={key} isCompact>
                      {key}: {value}
                    </Label>
                  ))}
                </LabelGroup>
              </CardBody>
            </Card>
          </StackItem>
        ) : null}
      </Stack>
    </GridItem>
  </Grid>
);

export default VolumeDetailView;
