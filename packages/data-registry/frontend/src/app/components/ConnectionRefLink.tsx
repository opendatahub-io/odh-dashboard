import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectionRef } from '~/app/types';
import { getConnectionIdentifier, getConnectionKey } from '~/app/utilities/connectionUtils';

type ConnectionRefLinkProps = {
  connectionRef?: ConnectionRef | string | null;
  linkTo?: string;
  connections?: ConnectionRef[];
};

const ConnectionRefLink: React.FC<ConnectionRefLinkProps> = ({
  connectionRef,
  linkTo,
  connections = [],
}) => {
  if (!connectionRef) {
    return <>-</>;
  }

  const resolved =
    typeof connectionRef === 'string'
      ? undefined
      : connections.find(
          (connection) => getConnectionKey(connection) === getConnectionKey(connectionRef),
        );
  const label =
    resolved?.name ||
    (typeof connectionRef === 'string' ? connectionRef : getConnectionIdentifier(connectionRef));

  if (linkTo) {
    return (
      <Link to={linkTo} data-testid="connection-ref-link">
        {label}
      </Link>
    );
  }

  return <span data-testid="connection-ref-label">{label}</span>;
};

export default ConnectionRefLink;
