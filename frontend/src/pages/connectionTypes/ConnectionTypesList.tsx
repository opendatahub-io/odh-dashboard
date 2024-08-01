import * as React from 'react';
// import {
//   Bullseye,
//   EmptyState,
//   EmptyStateBody,
//   EmptyStateHeader,
//   EmptyStateIcon,
//   Spinner,
// } from '@patternfly/react-core';
// import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
// import { TABLE_CONTENT_LIMIT } from '~/pages/connectionTypes/const';
import ConnectionTypesTable from '~/pages/connectionTypes/ConnectionTypesTable';
import { ConnectionTypes } from '~/pages/connectionTypes/const';

const useGetConnectionTypesTable = (): ConnectionTypes[] => [
  {
    id: 1,
    name: 'S3 compatible object storage - v1',
    description: 'This is one of the OOTB types provided by Red Hat for you',
    creator: 'Pre-installed',
    created: '2011-10-05T14:48:00.000',
    enable: true,
  },
];

const ConnectionTypesList: React.FC = () => {
  const connectionTypesListResponse = useGetConnectionTypesTable();
  return <ConnectionTypesTable connectionTypes={connectionTypesListResponse} />;
};

export default ConnectionTypesList;
