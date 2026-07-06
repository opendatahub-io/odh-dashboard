import React from 'react';
import { Alert, PageSection, Spinner, Content, ContentVariants } from '@patternfly/react-core';
import { URL_PREFIX } from '~/app/utilities/const';

const MainPage: React.FC = () => {
  const [bffStatus, setBffStatus] = React.useState<{
    connected: boolean;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    fetch(`${URL_PREFIX}/healthcheck`)
      .then((res) => res.json())
      .then((data: { status: string }) => {
        setBffStatus({
          connected: data.status === 'available',
          message: 'Hello from Agent Ops BFF!',
        });
      })
      .catch(() => {
        setBffStatus({
          connected: false,
          message: 'Could not connect to BFF',
        });
      });
  }, []);

  return (
    <PageSection>
      <Content component={ContentVariants.h1}>Main Page</Content>
      <Content component={ContentVariants.p}>Hello world</Content>
      {bffStatus === null ? (
        <Spinner size="md" />
      ) : (
        <Alert
          variant={bffStatus.connected ? 'success' : 'danger'}
          title={bffStatus.connected ? 'BFF Connection OK' : 'BFF Connection Failed'}
          isInline
        >
          {bffStatus.message}
        </Alert>
      )}
    </PageSection>
  );
};

export default MainPage;
