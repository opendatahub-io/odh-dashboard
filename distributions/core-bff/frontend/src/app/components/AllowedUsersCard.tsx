import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Spinner,
} from '@patternfly/react-core';
import { useBffStatus } from '~/app/context/BffStatusContext';
import { useNamespaceSelector } from '~/app/context/NamespaceContext';
import useFetchJson from '~/app/hooks/useFetchJson';
import NamespaceSelect from '~/app/components/NamespaceSelect';
import type { AllowedUser } from '~/app/types';

const UserLabels: React.FC<{ users: AllowedUser[] }> = ({ users }) => (
  <LabelGroup>
    {users.map((user) => (
      <Label key={user.username} color={user.privilege === 'Admin' ? 'green' : 'blue'} isCompact>
        {user.username} ({user.privilege})
      </Label>
    ))}
  </LabelGroup>
);

const getErrorMessage = (error: string): string => {
  if (error.includes('403')) {
    return 'Namespace not allowed';
  }
  if (error.includes('401')) {
    return 'Admin only';
  }
  return error;
};

const AllowedUsersCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  users: AllowedUser[];
}> = ({ connected, loaded, error, users }) => {
  if (!connected) {
    return (
      <Label color="grey" isCompact>
        Unavailable
      </Label>
    );
  }
  if (error) {
    return (
      <Label color="orange" isCompact>
        {getErrorMessage(error)}
      </Label>
    );
  }
  if (!loaded) {
    return <Spinner size="md" />;
  }
  if (users.length > 0) {
    return <UserLabels users={users} />;
  }
  return (
    <Label color="grey" isCompact>
      0 users
    </Label>
  );
};

const AllowedUsersCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { selectedNamespace } = useNamespaceSelector();
  const { data, loaded, error } = useFetchJson<AllowedUser[]>(
    connected && selectedNamespace ? `/api/status/${selectedNamespace}/allowedUsers` : null,
  );

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Allowed Users ({loaded && !error ? (data ?? []).length : '...'})</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/status/:ns/allowedUsers
            </Label>
          </FlexItem>
          <FlexItem>
            <NamespaceSelect />
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <AllowedUsersCardBody
          connected={connected}
          loaded={loaded}
          error={error}
          users={data ?? []}
        />
      </CardBody>
    </Card>
  );
};

export default AllowedUsersCard;
