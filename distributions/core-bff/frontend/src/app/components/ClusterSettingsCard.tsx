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
import type { ClusterSettings } from '~/app/types';

const DEFAULT_CULLER_TIMEOUT = 31536000;

const formatTimeout = (seconds: number): string => {
  if (seconds >= DEFAULT_CULLER_TIMEOUT) {
    return 'disabled';
  }
  if (seconds >= 86400) {
    return `${Math.floor(seconds / 86400)}d`;
  }
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  return `${Math.floor(seconds / 60)}m`;
};

const SettingsDetails: React.FC<{ settings: ClusterSettings }> = ({ settings }) => (
  <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '15ch' }}>
    <DescriptionListGroup>
      <DescriptionListTerm>PVC Size</DescriptionListTerm>
      <DescriptionListDescription>{settings.pvcSize} Gi</DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>Culler Timeout</DescriptionListTerm>
      <DescriptionListDescription>
        {settings.cullerTimeout >= DEFAULT_CULLER_TIMEOUT ? (
          <Label color="grey" isCompact>
            disabled
          </Label>
        ) : (
          formatTimeout(settings.cullerTimeout)
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>KServe</DescriptionListTerm>
      <DescriptionListDescription>
        <Label color={settings.modelServingPlatformEnabled.kServe ? 'green' : 'grey'} isCompact>
          {settings.modelServingPlatformEnabled.kServe ? 'enabled' : 'disabled'}
        </Label>
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm>llm-d</DescriptionListTerm>
      <DescriptionListDescription>
        <Label color={settings.modelServingPlatformEnabled.LLMd ? 'green' : 'grey'} isCompact>
          {settings.modelServingPlatformEnabled.LLMd ? 'enabled' : 'disabled'}
        </Label>
      </DescriptionListDescription>
    </DescriptionListGroup>
    {settings.defaultDeploymentStrategy ? (
      <DescriptionListGroup>
        <DescriptionListTerm>Strategy</DescriptionListTerm>
        <DescriptionListDescription>
          {settings.defaultDeploymentStrategy}
        </DescriptionListDescription>
      </DescriptionListGroup>
    ) : null}
  </DescriptionList>
);

const ClusterSettingsCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  settings: ClusterSettings | null;
}> = ({ connected, loaded, error, settings }) => {
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
  if (settings) {
    return <SettingsDetails settings={settings} />;
  }
  return null;
};

const ClusterSettingsCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { data, loaded, error } = useFetchJson<ClusterSettings>(
    connected ? '/api/cluster-settings' : null,
  );

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Cluster Settings</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/cluster-settings
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <ClusterSettingsCardBody
          connected={connected}
          loaded={loaded}
          error={error}
          settings={data}
        />
      </CardBody>
    </Card>
  );
};

export default ClusterSettingsCard;
