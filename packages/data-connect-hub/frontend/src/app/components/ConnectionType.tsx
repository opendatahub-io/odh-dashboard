// Modules -------------------------------------------------------------------->

import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Icon,
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

type ValueRenderer = (c: ConnectionType) => React.ReactNode;

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
  tags: {
    id: 'tags',
    label: 'Tags',
    value: () => null,
    shouldRender: false,
  },
  provider: {
    id: 'provider',
    label: 'Provider',
    value: (connectionType) => connectionType.resource.provider,
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

// Private -------------------------------------------------------------------->

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

const ConnectionTypeCardIdentifier = (id: string) => `${id}--ConnectionTypeCard`;
type ConnectionTypeCardProps = {
  connectionType: ConnectionType;
  onClick: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
};
const ConnectionTypeCard: React.FC<ConnectionTypeCardProps> = ({
  connectionType,
  onClick,
  isSelectable = false,
  isSelected = false,
}) => {
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
const ConnectionTypeValues: React.FC<ConnectionTypeValuesProps> = ({ connectionType }) => (
  <DescriptionList>
    {Object.values(renderedConnectionTypeValues)
      .filter((v) => v.shouldRender !== false)
      .map((renderedValue) => (
        <DescriptionListGroup key={renderedValue.id}>
          <DescriptionListTerm>{renderedValue.label}</DescriptionListTerm>
          <DescriptionListDescription>
            {renderedValue.value(connectionType)}
          </DescriptionListDescription>
        </DescriptionListGroup>
      ))}
  </DescriptionList>
);

// Public --------------------------------------------------------------------->

export {
  KnownConnectionTypes,
  ConnectionTypeIcon,
  ConnectionTypeCardIdentifier,
  ConnectionTypeCard,
  ConnectionTypeValues,
};
