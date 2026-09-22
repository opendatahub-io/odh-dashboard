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
import { useLinkClickHandler, useLocation } from 'react-router-dom';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import type {
  Identified,
  Iconed,
  ConnectionType,
  ConnectionTypeGroup,
  Labelled,
  Valued,
} from '~/app/types';

import DataSourceIcon from '@patternfly/react-icons/dist/esm/icons/data-source-icon';
import LinkIcon from '@patternfly/react-icons/dist/esm/icons/link-icon';
import RhUiAiExperienceIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-ai-experience-icon';
import RhUiContainerIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-container-icon';
import RhUiSearchIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-search-icon';
import RhUiStorageIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-storage-icon';

// Types ---------------------------------------------------------------------->

type KnownConnectionType = Identified<string> &
  Iconed<React.ReactNode> & {
    group: ConnectionTypeGroup;
  };

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
    group: 'other',
  },
  huggingface: {
    id: 'elasticsearch',
    icon: <RhUiAiExperienceIcon />,
    group: 'other',
  },
  milvus: {
    id: 'milvus',
    icon: <RhUiStorageIcon />,
    group: 'other',
  },
  neo4j: {
    id: 'neo4j',
    icon: <RhUiStorageIcon />,
    group: 'other',
  },
  'oci-v1': {
    id: 'oci-v1',
    icon: <RhUiContainerIcon />,
    group: 'other',
  },
  postgres: {
    id: 'postgres',
    icon: <RhUiStorageIcon />,
    group: 'other',
  },
  s3: {
    id: 's3',
    icon: <RhUiStorageIcon />,
    group: 'red_hat',
  },
  sqlite: {
    id: 'sqlite',
    icon: <RhUiStorageIcon />,
    group: 'other',
  },
  'uri-v1': {
    id: 'uri-v1',
    icon: <LinkIcon />,
    group: 'red_hat',
  },
  uri: {
    id: 'uri',
    icon: <LinkIcon />,
    group: 'red_hat',
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
    value: (connectionType) => {
      const createdAt = new Date(connectionType?.metadata.created_at ?? '');
      return (
        <Timestamp date={createdAt} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {relativeTime(Date.now(), createdAt.getTime())}
        </Timestamp>
      );
    },
  },
  last_modified: {
    id: 'last_modified',
    label: 'Last modified',
    value: (connectionType) => {
      const updatedAt = new Date(connectionType?.metadata.updated_at ?? '');
      return (
        <Timestamp date={updatedAt} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {relativeTime(Date.now(), updatedAt.getTime())}
        </Timestamp>
      );
    },
  },
};

// Private -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

type ConnectionTypeIconProps = {
  connectionType: ConnectionType;
  iconProps?: IconComponentProps;
};
const ConnectionTypeIcon: React.FC<ConnectionTypeIconProps> = ({ connectionType, iconProps }) => {
  const provider = connectionType.resource.provider;
  const mappedIcon = KnownConnectionTypes[provider]?.icon ?? <DataSourceIcon />;

  return (
    <Icon size="sm" {...iconProps}>
      {mappedIcon}
    </Icon>
  );
};

const ConnectionTypeCardIdentifier = (id: string) => `${id}--ConnectionTypeCard`;
type ConnectionTypeCardProps = { connectionType: ConnectionType };
const ConnectionTypeCard: React.FC<ConnectionTypeCardProps> = ({ connectionType }) => {
  const { pathname, search } = useLocation();
  const rootId = ConnectionTypeCardIdentifier(connectionType.metadata.id);
  const detailsPath = `${pathname.replace(/\/$/, '')}/${encodeURIComponent(
    connectionType.metadata.id,
  )}${search}`;
  const handleClick = useLinkClickHandler(detailsPath);
  return (
    <Card id={rootId} isClickable style={{ aspectRatio: '4 / 3' }}>
      <CardHeader
        selectableActions={{
          to: detailsPath,
          selectableActionProps: { onClick: handleClick },
          selectableActionAriaLabelledby: `${rootId}-card-title`,
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
