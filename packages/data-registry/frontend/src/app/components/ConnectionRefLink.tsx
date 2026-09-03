import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectionRef } from '~/app/types';

type ConnectionRefLinkProps = {
  connectionRef?: ConnectionRef | string | null;
  linkTo?: string;
};

const getLabel = (ref: ConnectionRef | string): string => {
  if (typeof ref === 'string') {
    return ref;
  }
  return ref.type === 'rhai' ? ref.secret_name : ref.id;
};

const ConnectionRefLink: React.FC<ConnectionRefLinkProps> = ({ connectionRef, linkTo }) => {
  if (!connectionRef) {
    return <>-</>;
  }

  const label = getLabel(connectionRef);

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
