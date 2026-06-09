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
import type { DashboardConfigResponse } from '~/app/types';

type FlagDef = { key: string; label: string; inverted?: boolean };

const FLAGS: FlagDef[] = [
  { key: 'enablement', label: 'Enablement' },
  { key: 'disableProjects', label: 'Projects', inverted: true },
  { key: 'disableKServe', label: 'KServe', inverted: true },
  { key: 'disableModelServing', label: 'Model Serving', inverted: true },
  { key: 'disableTracking', label: 'Tracking', inverted: true },
  { key: 'disablePipelines', label: 'Pipelines', inverted: true },
  { key: 'modelAsService', label: 'Model as Service' },
  { key: 'disableConnectionTypes', label: 'Connection Types', inverted: true },
  { key: 'disableFineTuning', label: 'Fine Tuning', inverted: true },
  { key: 'mlflow', label: 'MLflow' },
];

const FlagLabels: React.FC<{ flags: Record<string, boolean> }> = ({ flags }) => (
  <LabelGroup>
    {FLAGS.map(({ key, label, inverted }) => {
      const enabled = inverted ? !flags[key] : flags[key];
      return (
        <Label key={key} color={enabled ? 'green' : 'grey'} isCompact>
          {label}: {enabled ? 'enabled' : 'disabled'}
        </Label>
      );
    })}
  </LabelGroup>
);

const DashboardConfigCardBody: React.FC<{
  connected: boolean;
  loaded: boolean;
  error?: string;
  flags: Record<string, boolean> | undefined;
}> = ({ connected, loaded, error, flags }) => {
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
  if (flags) {
    return <FlagLabels flags={flags} />;
  }
  return (
    <Label color="orange" isCompact>
      No config loaded
    </Label>
  );
};

const DashboardConfigCard: React.FC = () => {
  const { connected } = useBffStatus();
  const { data, loaded, error } = useFetchJson<DashboardConfigResponse>(
    connected ? '/api/config' : null,
  );

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Dashboard Config ({FLAGS.length})</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /api/config
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <DashboardConfigCardBody
          connected={connected}
          loaded={loaded}
          error={error}
          flags={data?.spec.dashboardConfig}
        />
      </CardBody>
    </Card>
  );
};

export default DashboardConfigCard;
