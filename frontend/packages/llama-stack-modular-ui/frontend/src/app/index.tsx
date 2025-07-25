import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppLayout } from '@app/AppLayout/AppLayout';
import { AppRoutes } from '@app/routes';
import '@app/app.css';
import { AuthProvider } from '@app/contexts/authContext';

const App: React.FunctionComponent = () => (
  <AuthProvider>
    <Router>
      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </Router>
  </AuthProvider>
);

export default App;
