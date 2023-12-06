import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { Route, Routes } from 'react-router-dom';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

type ProjectsRoutesProps = {
  children: React.ReactNode;
  disableMountRefresh?: boolean;
};

/** For replacing the react-router <Routes> object in a safe "always render with projects". */
const ProjectsRoutes: React.FC<ProjectsRoutesProps> = ({ children, disableMountRefresh }) => {
  const { loaded, loadError, refresh } = React.useContext(ProjectsContext);
  const [enabledRefresh, setEnabledRefresh] = React.useState(true);

  React.useEffect(() => {
    if (!disableMountRefresh) {
      setEnabledRefresh(false);
      refresh().then(() => setEnabledRefresh(true));
    }
  }, [disableMountRefresh, refresh]);

  let render: React.ReactNode;

  if (loadError) {
    // This is unlikely to happen -- likely a development setup error and mounted outside of the provider
    render = (
      <EmptyState>
        <EmptyStateHeader titleText="There was an issue fetching projects." headingLevel="h2" />
        <EmptyStateBody>{loadError.message}</EmptyStateBody>
        <EmptyStateFooter>
          <Button
            variant="primary"
            isDisabled={!enabledRefresh}
            onClick={() => {
              setEnabledRefresh(false);
              refresh().then(() => setEnabledRefresh(true));
            }}
          >
            Attempt to refresh
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  } else if (!loaded) {
    render = (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  } else {
    return <Routes>{children}</Routes>;
  }

  return (
    <Routes>
      <Route path="*" element={render} />
    </Routes>
  );
};

export default ProjectsRoutes;
