import React, { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import useUser from '~/app/hooks/useUser';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

type BffStatus = { loaded: boolean; error?: string; version?: string };

const BffConnectionAlert: React.FC<{ status: BffStatus }> = ({ status }) => {
  if (!status.loaded) {
    return <Alert variant="info" isInline title="Checking BFF connectivity..." />;
  }
  if (status.error) {
    return (
      <Alert variant="danger" isInline title="Could not connect to BFF">
        {status.error}
      </Alert>
    );
  }
  return (
    <Alert
      variant="success"
      isInline
      title={status.version ? `BFF connected (${status.version})` : 'BFF connected'}
    />
  );
};

const MainPage: React.FC = () => {
  const [bffStatus, setBffStatus] = useState<BffStatus>({ loaded: false });
  const user = useUser();
  const { namespaces, namespacesLoaded } = useNamespaceSelector();

  useEffect(() => {
    fetch(`${URL_PREFIX}/api/${BFF_API_VERSION}/healthcheck`)
      .then((resp) => {
        if (!resp.ok) {
          setBffStatus({ loaded: true, error: `HTTP ${resp.status}` });
          return;
        }
        resp
          .json()
          .then((data) => setBffStatus({ loaded: true, version: data?.systemInfo?.version }))
          .catch(() => setBffStatus({ loaded: true }));
      })
      .catch((err) => setBffStatus({ loaded: true, error: String(err) }));
  }, []);

  return (
    <ApplicationsPage
      title="Core BFF"
      description="Development dashboard for BFF connectivity verification"
      empty={false}
      loaded
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <Stack hasGutter>
        <StackItem>
          <BffConnectionAlert status={bffStatus} />
        </StackItem>
        <StackItem>
          <Card isCompact>
            <CardTitle>Session Info</CardTitle>
            <CardBody>
              <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '15ch' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm icon={<UserIcon />}>User</DescriptionListTerm>
                  <DescriptionListDescription>
                    {user.userId || 'Unknown'}
                    {user.clusterAdmin ? (
                      <>
                        {' '}
                        <Label color="green" isCompact>
                          admin
                        </Label>
                      </>
                    ) : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </StackItem>
        <StackItem>
          <Card isCompact>
            <CardTitle>Namespaces ({namespacesLoaded ? namespaces.length : '...'})</CardTitle>
            <CardBody>
              {namespacesLoaded ? (
                <LabelGroup>
                  {namespaces.map((ns) => (
                    <Label key={ns.name} color="blue">
                      {ns.displayName || ns.name}
                    </Label>
                  ))}
                </LabelGroup>
              ) : (
                <Spinner size="md" />
              )}
            </CardBody>
          </Card>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default MainPage;
