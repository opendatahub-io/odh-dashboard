import * as React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import { store } from '../redux/store/store';
import { BrowserRouter as Router } from 'react-router-dom';
import App from '../app/App';

jest.mock('react-router-dom', () => {
  const reactRouterDom = jest.requireActual('react-router-dom');
  return {
    ...reactRouterDom,
    useLocation: () => '/',
  };
});
jest.mock('react', () => {
  const React = jest.requireActual('react');
  jest.mock('react', () => {
    const React = jest.requireActual('react');
    return {
      ...React,
      Suspense: ({ children }) => children,
      lazy: (factory) => factory(),
    };
  });

  return React;
});

describe('Index test', () => {
  it('should render a basic component', () => {
    const component = mount(
      <Provider store={store}>
        <Router>
          <App />
        </Router>
      </Provider>,
    );
    expect(component.html()).toMatchSnapshot('basic');
  });
});
