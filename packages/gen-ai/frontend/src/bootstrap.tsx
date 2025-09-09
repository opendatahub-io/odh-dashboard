import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModularArchConfig, ModularArchContextProvider } from 'mod-arch-core';
import { BrowserRouter as Router } from 'react-router-dom';
import axe from 'react-axe';
import { DEPLOYMENT_MODE, URL_PREFIX } from '~/app/utilities/const';
import App from '~/app/App';
import { ProjectContextProvider } from '~/app/context/ProjectContext';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DEPLOYMENT_MODE,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

if (process.env.NODE_ENV !== 'production') {
  const config = {
    rules: [
      {
        id: 'color-contrast',
        enabled: false,
      },
    ],
  };
  axe(React, ReactDOM, 1000, config);
}

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <React.StrictMode>
    <Router>
      <ModularArchContextProvider config={modularArchConfig}>
        <ProjectContextProvider>
          <App />
        </ProjectContextProvider>
      </ModularArchContextProvider>
    </Router>
  </React.StrictMode>,
);
