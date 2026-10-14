import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectionModel, ConnectionRef } from '~/app/types';
import { getConnectionDisplayName } from '~/app/utilities/connectionUtils';

type ConnectionRefLinkProps = {
  connectionRef?: ConnectionRef | string | null;
  connections?: ConnectionModel[];
  linkTo?: string;
};

const ConnectionRefLink: React.FC<ConnectionRefLinkProps> = ({
  connectionRef,
  connections = [],
  linkTo,
}) => {
  if (!connectionRef) {
    return <>-</>;
  }

  const label = getConnectionDisplayName(connectionRef, connections);

  if (linkTo && typeof connectionRef !== 'string') {
    return (
      <Link to={linkTo} data-testid="connection-ref-link">
        {label}
      </Link>
    );
  }

  return <span data-testid="connection-ref-label">{label}</span>;
};

export default ConnectionRefLink;
