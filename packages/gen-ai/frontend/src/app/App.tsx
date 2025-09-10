import * as React from 'react';
import ProjectsContextProvider from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { AppLayout } from '~/app/standalone/AppLayout';
import { AppRoutes } from '~/app/AppRoutes';
import '@patternfly/react-core/dist/styles/base.css';
import './app.css';

const App: React.FunctionComponent = () => (
  <AppLayout>
    <ProjectsContextProvider>
      <AppRoutes />
    </ProjectsContextProvider>
  </AppLayout>
);

export default App;
