import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Title,
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
        <Title headingLevel="h2" size="lg">
          There was an issue fetching projects.
        </Title>
        <EmptyStateBody>{loadError.message}</EmptyStateBody>
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
