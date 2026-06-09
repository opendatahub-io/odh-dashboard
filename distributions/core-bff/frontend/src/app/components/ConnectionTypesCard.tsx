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
import type { K8sConfigMap } from '~/app/types';

const ConnectionTypeLabels: React.FC<{ items: K8sConfigMap[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <Label color="grey" isCompact>
        0 connection types
      </Label>
    );
  }
  return (
    <LabelGroup>
      {items.map((ct) => (
        <Label key={ct.metadata.name} color="blue" isCompact>
          {ct.metadata.name}
        </Label>
      ))}
    </LabelGroup>
  );
};

const ConnectionTypesCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  items: K8sConfigMap[];
}> = ({ connected, loaded, error, items }) => {
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
  return <ConnectionTypeLabels items={items} />;
};

const ConnectionTypesCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { data, loaded, error } = useFetchJson<K8sConfigMap[]>(
    connected ? '/api/connection-types' : null,
  );
  const items = data ?? [];

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Connection Types ({loaded ? items.length : '...'})</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/connection-types
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <ConnectionTypesCardBody
          connected={connected}
          loaded={loaded}
          error={error}
          items={items}
        />
      </CardBody>
    </Card>
  );
};

export default ConnectionTypesCard;
