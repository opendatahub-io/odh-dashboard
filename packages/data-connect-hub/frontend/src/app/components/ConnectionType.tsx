// Modules -------------------------------------------------------------------->

import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Icon } from '@patternfly/react-core';
import type { IconComponentProps } from '@patternfly/react-core';
import { useLinkClickHandler, useLocation } from 'react-router-dom';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import type { Identified, ConnectionType } from '~/app/types';

import DataSourceIcon from '@patternfly/react-icons/dist/esm/icons/data-source-icon';
import LinkIcon from '@patternfly/react-icons/dist/esm/icons/link-icon';
import RhUiAiExperienceFillIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-ai-experience-fill-icon';
import RhUiContainerIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-container-icon';
import RhUiSearchIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-search-icon';
import RhUiStorageIcon from '@patternfly/react-icons/dist/esm/icons/rh-ui-storage-icon';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

const knownConnectionTypes: Record<string, Identified<string> & { icon: React.ReactNode }> = {
  elasticsearch: { id: 'elasticsearch', icon: <RhUiSearchIcon /> },
  huggingface: { id: 'elasticsearch', icon: <RhUiAiExperienceFillIcon /> },
  milvus: { id: 'milvus', icon: <RhUiStorageIcon /> },
  neo4j: { id: 'neo4j', icon: <RhUiStorageIcon /> },
  'oci-v1': { id: 'oci-v1', icon: <RhUiContainerIcon /> },
  postgres: { id: 'postgres', icon: <RhUiStorageIcon /> },
  s3: { id: 's3', icon: <RhUiStorageIcon /> },
  sqlite: { id: 'sqlite', icon: <RhUiStorageIcon /> },
  'uri-v1': { id: 'uri-v1', icon: <LinkIcon /> },
  uri: { id: 'uri', icon: <LinkIcon /> },
};

// Private -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

type ConnectionTypeIconProps = {
  connectionType: ConnectionType;
  iconProps?: IconComponentProps;
};
const ConnectionTypeIcon: React.FC<ConnectionTypeIconProps> = ({ connectionType, iconProps }) => {
  const provider = connectionType.resource.provider;
  const mappedIcon = knownConnectionTypes[provider]?.icon ?? <DataSourceIcon />;

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

export { ConnectionTypeCardIdentifier, ConnectionTypeCard, ConnectionTypeIcon };
