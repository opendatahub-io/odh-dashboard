import * as React from 'react';
import { store } from '../redux/store/store';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { mount } from 'enzyme';
import { LearningCenter } from '../pages/learningCenter/LearningCenter';
import { mockExploreApplications } from '../../__mocks__/mockExploreApplications';
import { mockDocs } from '../../__mocks__/mockDocs';
import { act } from 'react-dom/test-utils';
import { Options } from 'react-cool-dimensions';

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

let count = 0;
let currSize = 'lg';
jest.mock('react-cool-dimensions', () => (options: Options) => {
  if (count == 0 && options.onResize) {
    count++;
    options.onResize({ currentBreakpoint: currSize } as never);
  }
  return {
    observe: undefined,
  };
});

jest.mock('../utilities/useWatchComponents', () => ({
  useWatchComponents: () => ({
    loaded: true,
    loadError: null,
    components: mockExploreApplications,
  }),
}));
jest.mock('../utilities/useWatchDocs', () => ({
  useWatchDocs: () => ({
    docs: mockDocs,
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

describe('Resources page', () => {
  it('should display available resources', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    const viewPanel = wrapper.find('.odh-learning-paths__view-panel');
    expect(viewPanel.exists()).toBe(true);
    expect(viewPanel.html()).toMatchSnapshot();

    const cards = viewPanel.find('.pf-c-card__header');
    expect(cards.length).toBe(6);

    wrapper.unmount();
  });
  it('should display available filters', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    const filterPanel = wrapper.find('.odh-learning-paths__filter-panel');
    expect(filterPanel.exists()).toBe(true);
    expect(filterPanel.html()).toMatchSnapshot();

    const categories = filterPanel.find('.vertical-tabs-pf-tab');
    expect(categories.length).toBe(5);
    const activeCategories = filterPanel.find('.vertical-tabs-pf-tab.active');
    expect(activeCategories.length).toBe(1);
    expect(activeCategories.text()).toBe('All Items');

    wrapper.unmount();
  });
  it('should show the list view when selected', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    let viewPanel = wrapper.find('.odh-learning-paths__view-panel');
    expect(viewPanel.length).toBe(1);
    let listView = viewPanel.find('section.odh-learning-paths__view-panel__list-view');
    let cardView = viewPanel.find('section.odh-learning-paths__view-panel__card-view');
    expect(listView.length).toBe(0);
    expect(cardView.length).toBe(1);

    const viewFilter = wrapper.find('.odh-learning-paths__toolbar__view-filter');
    expect(viewFilter.exists()).toBe(true);

    const viewButtons = viewFilter.find('.pf-c-toggle-group__button');
    expect(viewButtons.length).toBe(2);

    act(() => {
      viewButtons.at(1).simulate('click');
    });
    wrapper.update();

    viewPanel = wrapper.find('.odh-learning-paths__view-panel');
    expect(viewPanel.html()).toMatchSnapshot();

    listView = viewPanel.find('section.odh-learning-paths__view-panel__list-view');
    cardView = viewPanel.find('section.odh-learning-paths__view-panel__card-view');
    expect(listView.length).toBe(1);
    expect(cardView.length).toBe(0);

    wrapper.unmount();
  });
  it('should not collapse the filter panel at higher resolutions', () => {
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    const filterPanel = wrapper.find('.odh-learning-paths__filter-panel');
    expect(filterPanel.hasClass('m-is-collapsible')).toBe(false);
    expect(filterPanel.find('.odh-learning-paths__filter-panel__collapse-button').exists()).toBe(
      false,
    );

    wrapper.unmount();
  });

  it('should collapse the filter panel at low resolutions', () => {
    count = 0;
    currSize = 'sm';
    const wrapper = mount(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );
    let filterPanel = wrapper.find('.odh-learning-paths__filter-panel');
    expect(filterPanel.hasClass('m-is-collapsible')).toBe(true);
    expect(filterPanel.hasClass('m-is-collapsed')).toBe(true);
    expect(filterPanel.find('.odh-learning-paths__filter-panel__collapse-button').exists()).toBe(
      true,
    );

    const clickFilterToggle = () => {
      act(() => {
        const viewFilter = wrapper.find('.odh-learning-paths__toolbar__view-filter');
        const filterButton = viewFilter.find('.pf-c-button.pf-m-link').at(0);
        filterButton.simulate('click');
      });
      wrapper.update();
      filterPanel = wrapper.find('.odh-learning-paths__filter-panel');
    };

    clickFilterToggle();
    expect(filterPanel.hasClass('m-is-collapsed')).toBe(false);

    clickFilterToggle();
    expect(filterPanel.hasClass('m-is-collapsed')).toBe(true);

    clickFilterToggle();
    act(() => {
      const closeButton = wrapper.find(
        '.pf-c-button.odh-learning-paths__filter-panel__collapse-button',
      );
      closeButton.simulate('click');
    });
    wrapper.update();
    filterPanel = wrapper.find('.odh-learning-paths__filter-panel');
    expect(filterPanel.hasClass('m-is-collapsed')).toBe(true);

    wrapper.unmount();
  });
});
