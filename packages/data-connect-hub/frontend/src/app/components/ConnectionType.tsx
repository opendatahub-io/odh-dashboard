// Modules -------------------------------------------------------------------->

import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Icon } from '@patternfly/react-core';
import type { IconComponentProps } from '@patternfly/react-core';
import { useLinkClickHandler, useLocation } from 'react-router-dom';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import type { Identified, Iconed, ConnectionType, ConnectionTypeGroup } from '~/app/types';

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

// Public --------------------------------------------------------------------->

export {
  KnownConnectionTypes,
  ConnectionTypeCardIdentifier,
  ConnectionTypeCard,
  ConnectionTypeIcon,
};
