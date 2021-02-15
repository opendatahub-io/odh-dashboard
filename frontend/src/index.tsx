import '@patternfly/react-core/dist/styles/base.css';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store/store';
import { QuickStarts } from './QuickStarts';
import App from './app/App';

/**
/**
 * Main function
 */
ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <QuickStarts>
          <App />
        </QuickStarts>
      </Router>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root'),
);
