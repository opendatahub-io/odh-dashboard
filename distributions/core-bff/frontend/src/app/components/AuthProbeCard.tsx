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
import useHttpProbe from '~/app/hooks/useHttpProbe';

type ProbeRowProps = {
  label: string;
  endpoint: string;
  status: number | null;
  loaded: boolean;
  connected: boolean;
};

const statusColor = (status: number | null): 'green' | 'red' | 'orange' | 'grey' => {
  if (status === null) {
    return 'grey';
  }
  if (status >= 200 && status < 300) {
    return 'green';
  }
  if (status === 401 || status === 403) {
    return 'orange';
  }
  return 'red';
};

const ProbeRow: React.FC<ProbeRowProps> = ({ label, endpoint, status, loaded, connected }) => (
  <DescriptionListGroup>
    <DescriptionListTerm>
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>{label}</FlexItem>
        <FlexItem>
          <Label color="purple" isCompact>
            {endpoint}
          </Label>
        </FlexItem>
      </Flex>
    </DescriptionListTerm>
    <DescriptionListDescription>
      {(() => {
        if (!connected) {
          return (
            <Label color="grey" isCompact>
              Unavailable
            </Label>
          );
        }
        if (!loaded) {
          return <Spinner size="md" />;
        }
        return (
          <Label color={statusColor(status)} isCompact>
            {status === null ? 'Network error' : `HTTP ${status}`}
          </Label>
        );
      })()}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

const AuthProbeCard: React.FC = () => {
  const { connected } = useBffStatus();

  const secureProbe = useHttpProbe(connected ? '/api/status' : null);
  const adminProbe = useHttpProbe(connected ? '/api/cluster-settings' : null);

  return (
    <Card isCompact>
      <CardTitle>Auth Middleware Probe</CardTitle>
      <CardBody>
        <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '35ch' }}>
          <ProbeRow
            label="secureRoute"
            endpoint="/api/status"
            status={secureProbe.status}
            loaded={secureProbe.loaded}
            connected={connected}
          />
          <ProbeRow
            label="secureAdminRoute"
            endpoint="/api/cluster-settings"
            status={adminProbe.status}
            loaded={adminProbe.loaded}
            connected={connected}
          />
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default AuthProbeCard;
