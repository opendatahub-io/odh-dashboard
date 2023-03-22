import React from "react"
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from '../src/redux/store/store';
import SDKInitialize from '../src/SDKInitialize';
import { BrowserStorageContextProvider } from '../src/components/browserStorage/BrowserStorageContext';
import { initialize, mswDecorator } from 'msw-storybook-addon';

import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import { AppContext } from "../src/app/AppContext";
import {mockDashboardConfig} from "../src/__mocks__/mockDashboardConfig"

export const parameters = {
  a11y: {
    config: {
      rules: [
        // disable so kebabs on table headers don't need a visible label
        {
          id: 'empty-table-header',
          enabled: false,
        }
      ],
    }
  },
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

// Initialize MSW
initialize();

export const decorators = [
  (Story) => (
    <AppContext.Provider
      value={{
        dashboardConfig: mockDashboardConfig,
      }}
    >
      <Provider store={store}>
        <Router>
          <SDKInitialize>
            <BrowserStorageContextProvider>
              <Story />
            </BrowserStorageContextProvider>
          </SDKInitialize>
        </Router>
      </Provider>
    </AppContext.Provider>
  ),
  mswDecorator
];
