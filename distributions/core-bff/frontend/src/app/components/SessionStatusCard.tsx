import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';
import { useBffStatus } from '~/app/context/BffStatusContext';
import useFetchJson from '~/app/hooks/useFetchJson';
import type { KubeStatus, StatusResponse } from '~/app/types';

const StatusDetails: React.FC<{ kube: KubeStatus }> = ({ kube }) => (
  <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '15ch' }}>
    <DescriptionListGroup>
      <DescriptionListTerm>User</DescriptionListTerm>
      <DescriptionListDescription>
        {kube.userName || 'Unknown'}
        {kube.isAdmin ? (
          <>
            {' '}
            <Label color="green" isCompact>
              admin
            </Label>
          </>
        ) : null}
        {kube.isAllowed ? null : (
          <>
            {' '}
            <Label color="red" isCompact>
              not allowed
            </Label>
          </>
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Cluster</DescriptionListTerm>
      <DescriptionListDescription>
        {kube.clusterBranding}{' '}
        <Label color="blue" isCompact>
          {kube.clusterID ? `${kube.clusterID.slice(0, 8)}...` : 'no ID'}
        </Label>
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Context</DescriptionListTerm>
      <DescriptionListDescription>{kube.currentContext}</DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Server</DescriptionListTerm>
      <DescriptionListDescription>{kube.serverURL}</DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

const SessionStatusCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  kube: KubeStatus | undefined;
}> = ({ connected, loaded, error, kube }) => {
  if (!connected || error) {
    return (
      <Label color="grey" isCompact>
        {error ?? 'Unavailable'}
      </Label>
    );
  }
  if (!loaded) {
    return <Spinner size="md" />;
  }
  if (kube) {
    return <StatusDetails kube={kube} />;
  }
  return null;
};

const SessionStatusCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { data, loaded, error } = useFetchJson<StatusResponse>(connected ? '/api/status' : null);

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Session & Status</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/status
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <SessionStatusCardBody
          connected={connected}
          loaded={loaded}
          error={error}
          kube={data?.kube}
        />
      </CardBody>
    </Card>
  );
};

export default SessionStatusCard;
