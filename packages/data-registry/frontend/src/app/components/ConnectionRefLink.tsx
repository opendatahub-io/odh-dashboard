import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectionRef } from '~/app/types';

type ConnectionRefLinkProps = {
  connectionRef?: ConnectionRef | null;
  linkTo?: string;
};

const ConnectionRefLink: React.FC<ConnectionRefLinkProps> = ({ connectionRef, linkTo }) => {
  if (!connectionRef) {
    return <>-</>;
  }

  const label = connectionRef.type === 'rhai' ? connectionRef.secret_name : connectionRef.id;

  const testId = connectionRef.type === 'rhai' ? 'connection-ref-rhai' : 'connection-ref-dch';

  if (linkTo) {
    return (
      <Link to={linkTo} data-testid={testId}>
        {label}
      </Link>
    );
  }

  return <span data-testid={testId}>{label}</span>;
};

export default ConnectionRefLink;
