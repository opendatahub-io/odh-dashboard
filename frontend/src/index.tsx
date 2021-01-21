import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import '@patternfly/patternfly/utilities/Spacing/spacing.css';
import '@patternfly/react-core/dist/styles/base.css';
import App from './app/App';
import { store } from './redux/store/store';

import './index.scss';

/**
/**
 * Main function
 */
ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root'),
);
