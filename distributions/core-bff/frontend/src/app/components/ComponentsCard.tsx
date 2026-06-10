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

type OdhApplication = {
  metadata?: { name?: string };
};

const ApplicationLabels: React.FC<{ apps: OdhApplication[] }> = ({ apps }) => {
  if (apps.length === 0) {
    return (
      <Label color="grey" isCompact>
        0 applications
      </Label>
    );
  }
  return (
    <LabelGroup>
      {apps.map((app) => (
        <Label key={app.metadata?.name} color="blue" isCompact>
          {app.metadata?.name ?? 'unknown'}
        </Label>
      ))}
    </LabelGroup>
  );
};

const ComponentsCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  apps: OdhApplication[];
}> = ({ connected, loaded, error, apps }) => {
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
  return <ApplicationLabels apps={apps} />;
};

const ComponentsCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { data, loaded, error } = useFetchJson<OdhApplication[]>(
    connected ? '/api/components' : null,
  );
  const apps = data ?? [];

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Components ({loaded ? apps.length : '...'})</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/components
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <ComponentsCardBody connected={connected} loaded={loaded} error={error} apps={apps} />
      </CardBody>
    </Card>
  );
};

export default ComponentsCard;
