import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store/store';
import App from './app/App';
import SDKInitialize from './SDKInitialize';

/**
/**
 * Main function
 */
ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <SDKInitialize>
          <App />
        </SDKInitialize>
      </Router>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root'),
);
