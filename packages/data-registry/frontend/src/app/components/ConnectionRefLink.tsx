import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectionModel, ConnectionRef } from '~/app/types';
import {
  CONNECTION_UNAVAILABLE_LABEL,
  getConnectionDisplayName,
} from '~/app/utilities/connectionUtils';

type ConnectionRefLinkProps = {
  connectionRef?: ConnectionRef | string | null;
  connections?: ConnectionModel[];
  connectionsLoaded?: boolean;
  connectionsError?: Error;
  linkTo?: string | ((connectionRef: ConnectionRef) => string);
};

const ConnectionRefLink: React.FC<ConnectionRefLinkProps> = ({
  connectionRef,
  connections = [],
  connectionsLoaded = false,
  connectionsError,
  linkTo,
}) => {
  if (!connectionRef) {
    return <>-</>;
  }

  const label = getConnectionDisplayName(
    connectionRef,
    connections,
    connectionsLoaded,
    connectionsError,
  );

  if (linkTo && typeof connectionRef !== 'string' && label !== CONNECTION_UNAVAILABLE_LABEL) {
    const destination = typeof linkTo === 'string' ? linkTo : linkTo(connectionRef);
    return (
      <Link to={destination} data-testid="connection-ref-link">
        {label}
      </Link>
    );
  }

  return <span data-testid="connection-ref-label">{label}</span>;
};

export default ConnectionRefLink;
