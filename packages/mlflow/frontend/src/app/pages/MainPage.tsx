import React, { useEffect, useState } from 'react';
import { Alert } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';

const MainPage: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [loadError, setLoadError] = useState<Error | undefined>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${URL_PREFIX}/api/${BFF_API_VERSION}/hello`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`BFF responded with ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setMessage(json.data);
        setLoaded(true);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err : new Error(String(err)));
        setLoaded(true);
      });
  }, []);

  return (
    <ApplicationsPage
      title="Main Page"
      description={<p>Hello world</p>}
      empty={false}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      {message && (
        <Alert variant="success" isInline title="BFF Connection OK">
          {message}
        </Alert>
      )}
    </ApplicationsPage>
  );
};

export default MainPage;
