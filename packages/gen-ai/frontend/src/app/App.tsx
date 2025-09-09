import * as React from 'react';
import { AppLayout } from '~/app/standalone/AppLayout';
import { AppRoutes } from '~/app/AppRoutes';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import './app.css';

const App: React.FunctionComponent = () => (
  <AppLayout>
    <AppRoutes />
  </AppLayout>
);

export default App;
