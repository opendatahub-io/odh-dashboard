import React from "react"
import { Provider } from 'react-redux';
import { withRouter } from 'storybook-addon-react-router-v6';
import { store } from '../src/redux/store/store';
import SDKInitialize from '../src/SDKInitialize';
import { BrowserStorageContextProvider } from '../src/components/browserStorage/BrowserStorageContext';
import { initialize, mswDecorator } from 'msw-storybook-addon';
import { AppContext } from "../src/app/AppContext";
import { mockDashboardConfig } from "../src/__mocks__/mockDashboardConfig"

import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';

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
        <SDKInitialize>
          <BrowserStorageContextProvider>
            <Story />
          </BrowserStorageContextProvider>
        </SDKInitialize>
      </Provider>
    </AppContext.Provider>
  ),
  mswDecorator,
  withRouter
];
