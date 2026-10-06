// Modules -------------------------------------------------------------------->

import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
  Icon,
  Label,
  LabelColor,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import type { IconComponentProps } from '@patternfly/react-core';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import type { Identified, Iconed, ConnectionType, Labelled, Valued } from '~/app/types';

import DataSourceIcon from '@patternfly/react-icons/dist/esm/icons/data-source-icon';
import LinkIcon from '@patternfly/react-icons/dist/esm/icons/link-icon';
import RhUiAiExperienceIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-ai-experience-icon';
import RhUiContainerIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-container-icon';
import RhUiSearchIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-search-icon';
import RhUiStorageIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-storage-icon';

// Types ---------------------------------------------------------------------->

type KnownConnectionType = Identified<string> & Iconed<React.ReactNode>;

type ValueRenderer = (c: ConnectionTypeInstance) => React.ReactNode;

type RenderedConnectionTypeValue = Identified<string> &
  Labelled<string> &
  Valued<ValueRenderer> & {
    shouldRender?: boolean;
  };

// Globals -------------------------------------------------------------------->

const KnownConnectionTypes: Record<string, KnownConnectionType> = {
  elasticsearch: {
    id: 'elasticsearch',
    icon: <RhUiSearchIcon />,
  },
  huggingface: {
    id: 'huggingface',
    icon: <RhUiAiExperienceIcon />,
  },
  milvus: {
    id: 'milvus',
    icon: <RhUiStorageIcon />,
  },
  neo4j: {
    id: 'neo4j',
    icon: <RhUiStorageIcon />,
  },
  'oci-v1': {
    id: 'oci-v1',
    icon: <RhUiContainerIcon />,
  },
  postgres: {
    id: 'postgres',
    icon: <RhUiStorageIcon />,
  },
  s3: {
    id: 's3',
    icon: <RhUiStorageIcon />,
  },
  sqlite: {
    id: 'sqlite',
    icon: <RhUiStorageIcon />,
  },
  'uri-v1': {
    id: 'uri-v1',
    icon: <LinkIcon />,
  },
  uri: {
    id: 'uri',
    icon: <LinkIcon />,
  },
};

const renderedConnectionTypeValues: Record<string, RenderedConnectionTypeValue> = {
  description: {
    id: 'description',
    label: 'Description',
    value: (connectionType) => connectionType.resource.description,
  },
  category: {
    id: 'category',
    label: 'Category',
    value: () => null,
    shouldRender: false,
  },
  license: {
    id: 'license',
    label: 'License',
    value: () => null,
    shouldRender: false,
  },
  source: {
    id: 'source',
    label: 'Source',
    value: () => null,
    shouldRender: false,
  },
  provider: {
    id: 'provider',
    label: 'Provider',
    value: (connectionType) => connectionType.resource.provider,
  },
  capability: {
    id: 'capability',
    label: 'Capability',
    value: (connectionType) =>
      connectionType.isCredentialsOnly() ? 'Credentials only' : 'Full integration',
  },
  created: {
    id: 'created',
    label: 'Created',
    value: (connectionType) => <RelativeTimestamp datetime={connectionType.metadata.created_at} />,
  },
  last_modified: {
    id: 'last_modified',
    label: 'Last modified',
    value: (connectionType) => <RelativeTimestamp datetime={connectionType.metadata.updated_at} />,
  },
};

const localFeatureFlags = {
  tags: true,
};

// Private -------------------------------------------------------------------->

// Classes -------------------------------------------------------------------->

class ConnectionTypeInstance implements ConnectionType {
  metadata: ConnectionType['metadata'];
  resource: ConnectionType['resource'];
  status: ConnectionType['status'];

  readonly id: string;
  readonly original: ConnectionType;

  constructor(connectionType: ConnectionType) {
    this.metadata = connectionType.metadata;
    this.resource = connectionType.resource;
    this.status = connectionType.status;

    this.id = connectionType.metadata.id;
    this.original = connectionType;
  }

  isFullIntegration() {
    // TODO [ Gustavo ] Subject to change to flight_ready: Other PR will be updating the schema to be used here
    return Boolean(this.status?.capabilities.flight);
  }

  isCredentialsOnly() {
    return !this.isFullIntegration();
  }

  matchesSearch(searchTerm: string) {
    const name = this.resource.name;
    const description = this.resource.description;
    const searchableText = `${name} ${description}`.trim().toLowerCase();
    return searchableText.includes(searchTerm.trim().toLowerCase());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Depends on labels being added by API: Return true for now
  matchesLabels(labels: string | string[]) {
    return true;
  }

  toJSON() {
    return this.original;
  }
}

// Components ----------------------------------------------------------------->

type RelativeTimestampProps = {
  datetime: string;
};
const RelativeTimestamp: React.FC<RelativeTimestampProps> = ({ datetime }) => {
  const datetimeObject = new Date(datetime);

  if (Number.isNaN(datetimeObject.getTime())) {
    return <>-</>;
  }

  return (
    <Timestamp date={datetimeObject} tooltip={{ variant: TimestampTooltipVariant.default }}>
      {relativeTime(Date.now(), datetimeObject.getTime())}
    </Timestamp>
  );
};

type ConnectionTypeIconProps = {
  connectionType: ConnectionType;
  iconProps?: IconComponentProps;
};
const ConnectionTypeIcon: React.FC<ConnectionTypeIconProps> = ({ connectionType, iconProps }) => {
  const provider = connectionType.resource.provider;
  const knownConnectionType = KnownConnectionTypes[provider];
  const mappedIcon = knownConnectionType?.icon ?? <DataSourceIcon />;

  return (
    <Icon
      size="sm"
      data-testid={knownConnectionType ? 'connection-type-icon' : 'connection-type-icon-fallback'}
      {...iconProps}
    >
      {mappedIcon}
    </Icon>
  );
};

type ConnectionTypeLabelProps = {
  connectionType: ConnectionType;
};
const ConnectionTypeLabel: React.FC<ConnectionTypeLabelProps> = ({
  connectionType: _connectionType,
}) => {
  const connectionType = new ConnectionTypeInstance(_connectionType);
  let label = <Label color={LabelColor.teal}>Full integration</Label>;
  if (connectionType.isCredentialsOnly()) {
    label = <Label color={LabelColor.yellow}>Credentials only</Label>;
  }
  return label;
};

const ConnectionTypeCardIdentifier = (id: string) => `${id}--ConnectionTypeCard`;
type ConnectionTypeCardProps = {
  connectionType: ConnectionType;
  onClick: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
};
const ConnectionTypeCard: React.FC<ConnectionTypeCardProps> = ({
  connectionType: _connectionType,
  onClick,
  isSelectable = false,
  isSelected = false,
}) => {
  const connectionType = new ConnectionTypeInstance(_connectionType);
  const rootId = ConnectionTypeCardIdentifier(connectionType.metadata.id);
  return (
    <Card
      id={rootId}
      data-testid={rootId}
      isClickable={!isSelectable}
      isSelectable={isSelectable}
      isSelected={isSelectable ? isSelected : undefined}
      style={{ aspectRatio: '4 / 3' }}
    >
      <CardHeader
        actions={{
          hasNoOffset: true,
          actions: [
            <ConnectionTypeLabel key="ConnectionTypeLabel" connectionType={_connectionType} />,
          ],
        }}
        selectableActions={{
          onClickAction: onClick,
          onChange: onClick,
          selectableActionAriaLabel: connectionType.resource.name,
          name: 'connection-type',
          variant: 'single',
          isHidden: isSelectable,
        }}
      >
        <ConnectionTypeIcon connectionType={connectionType} iconProps={{ size: 'xl' }} />
      </CardHeader>
      <CardTitle id={`${rootId}-card-title`}>{connectionType.resource.name}</CardTitle>
      <CardBody>
        <TruncatedText maxLines={6} content={connectionType.resource.description} />
      </CardBody>
    </Card>
  );
};

type ConnectionTypeValuesProps = { connectionType: ConnectionType };
const ConnectionTypeValues: React.FC<ConnectionTypeValuesProps> = ({
  connectionType: _connectionType,
}) => {
  const connectionType = new ConnectionTypeInstance(_connectionType);
  const valuesToRender = Object.values(renderedConnectionTypeValues).filter(
    (v) => v.shouldRender !== false,
  );
  return (
    <Grid className="pf-v6-u-h-100" hasGutter>
      <GridItem span={8}>
        <Card className="pf-v6-u-p-xs" isFullHeight>
          <div style={{ overflow: 'auto' }}>
            <CardHeader>
              <Content component="h3">Details</Content>
            </CardHeader>
            <CardBody>
              <Grid hasGutter>
                <GridItem span={6}>
                  <DescriptionList>
                    {valuesToRender.slice(0, 2).map((renderedValue) => (
                      <DescriptionListGroup key={renderedValue.id}>
                        <DescriptionListTerm>{renderedValue.label}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {renderedValue.value(connectionType)}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </GridItem>
                <GridItem span={6}>
                  <DescriptionList>
                    {valuesToRender.slice(2).map((renderedValue) => (
                      <DescriptionListGroup key={renderedValue.id}>
                        <DescriptionListTerm>{renderedValue.label}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {renderedValue.value(connectionType)}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </GridItem>
              </Grid>
            </CardBody>
          </div>
        </Card>
      </GridItem>
      {localFeatureFlags.tags && (
        <GridItem span={4}>
          <Card className="pf-v6-u-p-xs" isFullHeight>
            <div style={{ overflow: 'auto' }}>
              <CardHeader>
                <Content component="h3">Labels</Content>
              </CardHeader>
              <CardBody>
                <Label>Example</Label>
              </CardBody>
            </div>
          </Card>
        </GridItem>
      )}
    </Grid>
  );
};

// Public --------------------------------------------------------------------->

export {
  KnownConnectionTypes,
  ConnectionTypeInstance,
  ConnectionTypeIcon,
  ConnectionTypeLabel,
  ConnectionTypeCardIdentifier,
  ConnectionTypeCard,
  ConnectionTypeValues,
};
