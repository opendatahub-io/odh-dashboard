// This page is a temporary placeholder used only to verify BFF connectivity during development.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, List, ListItem, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { URL_PREFIX, BFF_API_VERSION, WORKSPACE_PARAM } from '~/app/utilities/const';

const DEFAULT_WORKSPACE = 'default';

interface Experiment {
  name: string;
}

const MainPage: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadError, setLoadError] = useState<Error | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const workspace = searchParams.get(WORKSPACE_PARAM) || DEFAULT_WORKSPACE;

  useEffect(() => {
    if (searchParams.has(WORKSPACE_PARAM)) {
      return;
    }
    setSearchParams({ [WORKSPACE_PARAM]: DEFAULT_WORKSPACE }, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetch(
      `${URL_PREFIX}/api/${BFF_API_VERSION}/experiments?${WORKSPACE_PARAM}=${encodeURIComponent(workspace)}`,
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`BFF responded with ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setExperiments(json?.data?.experiments ?? []);
        setLoaded(true);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err : new Error(String(err)));
        setLoaded(true);
      });
  }, [workspace]);

  return (
    <ApplicationsPage
      title="MLflow"
      description="MLflow Experiment Tracking"
      empty={false}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      {loaded && !loadError && (
        <Stack hasGutter>
          <StackItem>
            <Alert
              variant="success"
              isInline
              isPlain
              title={
                <>
                  BFF connected — {experiments.length} experiment
                  {experiments.length !== 1 ? 's' : ''} found in workspace <em>{workspace}</em>
                </>
              }
            />
          </StackItem>
          {experiments.length > 0 && (
            <StackItem>
              <List>
                {experiments.map((exp) => (
                  <ListItem key={exp.name}>{exp.name}</ListItem>
                ))}
              </List>
            </StackItem>
          )}
        </Stack>
      )}
    </ApplicationsPage>
  );
};

export default MainPage;
