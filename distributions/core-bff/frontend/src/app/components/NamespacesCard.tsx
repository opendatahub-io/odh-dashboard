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
import useFetchJson from '~/app/hooks/useFetchJson';

type K8sNamespaceList = {
  items: { metadata?: { name?: string }; status?: { phase?: string } }[];
};

type Namespace = { name: string; status: string };

const NamespaceLabels: React.FC<{ namespaces: Namespace[] }> = ({ namespaces }) => (
  <LabelGroup>
    {namespaces.map((ns) => (
      <Label key={ns.name} color={ns.status === 'Active' ? 'blue' : 'orange'}>
        {ns.name}
      </Label>
    ))}
  </LabelGroup>
);

const NamespacesCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  namespaces: Namespace[];
}> = ({ connected, loaded, error, namespaces }) => {
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
  return <NamespaceLabels namespaces={namespaces} />;
};

const NamespacesCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { data, loaded, error } = useFetchJson<K8sNamespaceList>(
    connected ? '/api/k8s/api/v1/namespaces' : null,
  );

  const namespaces: Namespace[] = (data?.items ?? []).map((item) => ({
    name: item.metadata?.name ?? 'unknown',
    status: item.status?.phase ?? 'unknown',
  }));

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Namespaces ({loaded ? namespaces.length : '...'})</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/k8s
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <NamespacesCardBody
          connected={connected}
          loaded={loaded}
          error={error}
          namespaces={namespaces}
        />
      </CardBody>
    </Card>
  );
};

export default NamespacesCard;
