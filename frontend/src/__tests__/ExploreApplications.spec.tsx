import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { store } from '../redux/store/store';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { mount } from 'enzyme';
import ExploreApplications from '../pages/exploreApplication/ExploreApplications';
import { mockExploreApplications } from '../../__mocks__/mockExploreApplications';
import { mockGettingStartedDoc } from '../../__mocks__/mockGettingStartedDoc';

const dashboardConfig = {
  disableInfo: false,
  enablement: true,
};

jest.mock('react-router-dom', () => {
  const reactRouterDom = jest.requireActual('react-router-dom');
  return {
    ...reactRouterDom,
    useLocation: () => '/',
  };
});
jest.mock('react', () => {
  const React = jest.requireActual('react');
  return {
    ...React,
    Suspense: ({ children }) => children,
    lazy: (factory) => factory(),
  };
});
jest.mock('../utilities/useWatchComponents', () => ({
  useWatchComponents: () => ({
    loaded: true,
    loadError: null,
    components: mockExploreApplications,
  }),
}));
jest.mock('../utilities/useGettingStarted', () => ({
  useGettingStarted: () => ({
    odhGettingStarted: mockGettingStartedDoc,
    loaded: true,
    loadError: null,
  }),
}));
jest.mock('../utilities/router', () => ({
  setQueryArgument: () => {
    return;
  },
  removeQueryArgument: () => {
    return;
  },
}));
jest.mock('../utilities/useWatchDashboardConfig', () => ({
  useWatchDashboardConfig: () => ({
    dashboardConfig,
    loaded: true,
    loadError: null,
  }),
}));

describe('ExploreApplications', () => {
  beforeEach(() => {
    dashboardConfig.disableInfo = false;
    dashboardConfig.enablement = true;
  });

  it('should display available applications', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );
    expect(wrapper.find('.odh-explore-apps__body').exists()).toBe(true);
    const cards = wrapper.find('.pf-m-selectable.odh-card');
    expect(cards.length).toBe(2);

    expect(wrapper.html()).toMatchSnapshot();
    wrapper.unmount();
  });

  it('should show the getting started panel on card click', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );
    expect(wrapper.find('.m-side-panel-open').exists()).toBe(false);

    act(() => {
      const card = wrapper.find('.pf-m-selectable.odh-card').at(0);
      card.simulate('click');
    });
    wrapper.update();

    expect(wrapper.find('.m-side-panel-open').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();

    act(() => {
      const close = wrapper.find('.pf-c-drawer__close .pf-c-button');
      close.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.m-side-panel-open').exists()).toBe(false);
    wrapper.unmount();
  });

  it('should show the enable modal when clicked', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );

    // First app is enabled, there should be no enable button
    act(() => {
      const card = wrapper.find('.pf-m-selectable.odh-card').at(0);
      card.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.m-side-panel-open').exists()).toBe(true);
    expect(
      wrapper.find('.odh-get-started__button-panel .pf-c-button.pf-m-secondary').exists(),
    ).toBe(false);

    // Second app is enable-able, there should be an enable button
    act(() => {
      const card = wrapper.find('.pf-m-selectable.odh-card').at(1);
      card.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.m-side-panel-open').exists()).toBe(true);
    expect(
      wrapper.find('.odh-get-started__button-panel .pf-c-button.pf-m-secondary').exists(),
    ).toBe(true);

    expect(wrapper.find('.odh-enable-modal').exists()).toBe(false);
    act(() => {
      const close = wrapper.find('.odh-get-started__button-panel .pf-c-button.pf-m-secondary');
      close.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.odh-enable-modal').exists()).toBe(true);

    expect(wrapper.find('.pf-c-modal-box.odh-enable-modal').html()).toMatchSnapshot();

    act(() => {
      const close = wrapper.find(
        '.odh-enable-modal .pf-c-modal-box__footer .pf-c-button.pf-m-link',
      );
      close.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.odh-enable-modal').exists()).toBe(false);

    wrapper.unmount();
  });

  it('should disable the cards when disableInfo is set', () => {
    dashboardConfig.disableInfo = true;
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );

    // Cards should be disabled
    expect(wrapper.find('.odh-card').first().hasClass('m-disabled')).toBe(true);

    // First app is enabled, but clicking should have no effect
    act(() => {
      const card = wrapper.find('.odh-card').at(0);
      card.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.m-side-panel-open').exists()).toBe(false);

    expect(wrapper.html()).toMatchSnapshot();

    wrapper.unmount();
  });

  it('should hide the enable button when dashboard config enablement is false', () => {
    dashboardConfig.enablement = false;
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );

    // Second app is enable-able, there would be an enable button if enablement is allowed
    act(() => {
      const card = wrapper.find('.pf-m-selectable.odh-card').at(1);
      card.simulate('click');
    });
    wrapper.update();
    expect(wrapper.find('.m-side-panel-open').exists()).toBe(true);
    expect(
      wrapper
        .find('.odh-get-started__button-panel .pf-c-button.pf-m-secondary')
        .first()
        .hasClass('pf-m-disabled'),
    ).toBe(true);
  });
});
