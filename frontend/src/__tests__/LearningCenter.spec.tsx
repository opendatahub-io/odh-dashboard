import * as React from 'react';
import { store } from '../redux/store/store';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { LearningCenter } from '../pages/learningCenter/LearningCenter';
import { mockExploreApplications } from '../../__mocks__/mockExploreApplications';
import { mockDocs } from '../../__mocks__/mockDocs';
import { Options } from 'react-cool-dimensions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

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
    const { container } = render(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    expect(container.querySelector('.odh-learning-paths__view-panel')).toBeInTheDocument();

    const cards = screen.getAllByRole('article');
    expect(cards.length).toBe(7);
  });

  it('should display available filters', () => {
    const { container } = render(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    expect(container.querySelector('.odh-learning-paths__filter-panel')).toBeInTheDocument();

    const categories = container.querySelectorAll('.vertical-tabs-pf-tab');
    expect(categories.length).toBe(5);
    const activeCategories = container.querySelectorAll('.vertical-tabs-pf-tab.active');
    expect(activeCategories.length).toBe(1);
    expect(activeCategories[0].textContent).toBe('All Items');
  });

  it('should not collapse the filter panel at higher resolutions', () => {
    const { container } = render(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );

    expect(container.querySelector('.odh-learning-paths__filter-panel')).not.toHaveClass(
      'm-is-collapsible',
    );
    expect(
      container.querySelector('.odh-learning-paths__filter-panel__collapse-button'),
    ).toBeNull();
  });

  it('should collapse the filter panel at low resolutions', async () => {
    count = 0;
    currSize = 'sm';
    const user = userEvent.setup();
    const { container } = render(
      <Provider store={store}>
        <Router>
          <LearningCenter />
        </Router>
      </Provider>,
    );
    let filterPanel = container.querySelector('.odh-learning-paths__filter-panel');
    expect(filterPanel).toHaveClass('m-is-collapsible');
    expect(filterPanel).toHaveClass('m-is-collapsed');
    expect(
      container.querySelector('.odh-learning-paths__filter-panel__collapse-button'),
    ).toBeInTheDocument();

    const clickFilterToggle = async () => {
      const viewFilter = container.querySelector('.odh-learning-paths__toolbar__view-filter');
      const filterButton = viewFilter?.querySelector('.pf-c-button.pf-m-link');
      await user.click(filterButton as Element);
      filterPanel = container.querySelector('.odh-learning-paths__filter-panel');
    };

    await clickFilterToggle();
    expect(filterPanel).not.toHaveClass('m-is-collapsed');

    await clickFilterToggle();
    expect(filterPanel).toHaveClass('m-is-collapsed');

    await clickFilterToggle();

    // Click close button
    await user.click(
      container.querySelector(
        '.pf-c-button.odh-learning-paths__filter-panel__collapse-button',
      ) as Element,
    );
    filterPanel = container.querySelector('.odh-learning-paths__filter-panel');
    expect(filterPanel).toHaveClass('m-is-collapsed');
  });
});
