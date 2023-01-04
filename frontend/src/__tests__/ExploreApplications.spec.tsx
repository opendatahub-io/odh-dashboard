import * as React from 'react';
import { store } from '../redux/store/store';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import ExploreApplications from '../pages/exploreApplication/ExploreApplications';
import { mockExploreApplications } from '../../__mocks__/mockExploreApplications';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const dashboardConfig = {
  spec: {
    dashboardConfig: {
      enablement: true,
      disableInfo: true,
    },
  },
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
jest.mock('../app/AppContext.ts', () => ({
  useAppContext: () => ({ dashboardConfig }),
}));
jest.mock('../utilities/useWatchComponents', () => ({
  useWatchComponents: () => ({
    loaded: true,
    loadError: null,
    components: mockExploreApplications,
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

// scrollIntoView is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('ExploreApplications', () => {
  beforeEach(() => {
    dashboardConfig.spec.dashboardConfig.disableInfo = false;
    dashboardConfig.spec.dashboardConfig.enablement = true;
  });

  it('should display available applications', () => {
    render(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBe(3);
    expect(cards.filter((card) => card.classList.contains('pf-m-selectable')).length).toBe(2);
  });

  it('should show the getting started panel on card click', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );
    expect(screen.queryByTestId('explore-drawer-panel')).toBeNull();

    // Click on the selectable card, check whether it opens the drawer panel
    const cards = screen.getAllByRole('article');
    const selectableCards = cards.filter((card) => card.classList.contains('pf-m-selectable'));
    await user.click(selectableCards[0]);
    expect(screen.queryByTestId('explore-drawer-panel')).toBeInTheDocument();

    // Click on the close button on the drawer panel
    const closeButton = container.querySelector('.pf-c-drawer__close .pf-c-button');
    await user.click(closeButton as Element);
    expect(screen.queryByTestId('explore-drawer-panel')).toBeNull();
  });

  it('should show the enable modal when clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );

    // First app is enabled, there should be no enable button
    const cards = screen.getAllByRole('article');
    const selectableCards = cards.filter((card) => card.classList.contains('pf-m-selectable'));
    await user.click(selectableCards[0]);
    expect(container.querySelector('.pf-c-action-list .pf-c-button.pf-m-secondary')).toBeNull();

    // Second app is enable-able, there should be an enable button
    await user.click(selectableCards[1]);
    expect(
      container.querySelector('.pf-c-action-list .pf-c-button.pf-m-secondary'),
    ).toBeInTheDocument();

    // Click the enable button
    expect(screen.queryByTestId('enable-modal')).toBeNull();
    await user.click(
      container.querySelector('.pf-c-action-list .pf-c-button.pf-m-secondary') as Element,
    );
    expect(screen.queryByTestId('enable-modal')).toBeInTheDocument();

    // Close the enable modal
    await user.click(
      screen
        .getByTestId('enable-modal')
        .parentElement?.querySelector(
          '.odh-enable-modal .pf-c-modal-box__footer .pf-c-button.pf-m-link',
        ) as Element,
    );
    expect(screen.queryByTestId('enable-modal')).toBeNull();
  });

  it('should disable the cards when disableInfo is set', async () => {
    dashboardConfig.spec.dashboardConfig.disableInfo = true;
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );

    // Cards should be disabled
    const cards = screen.getAllByRole('article');
    expect(cards.filter((card) => card.classList.contains('pf-m-selectable')).length).toBe(0);

    // First app is enabled, but clicking should have no effect
    await user.click(cards[0]);
    expect(screen.queryByTestId('explore-drawer-panel')).toBeNull();
  });

  it('should hide the enable button when dashboard config enablement is false', async () => {
    dashboardConfig.spec.dashboardConfig.enablement = false;
    const user = userEvent.setup();
    const { container } = render(
      <Provider store={store}>
        <Router>
          <ExploreApplications />
        </Router>
      </Provider>,
    );

    // Second app is enable-able, there would be an enable button if enablement is allowed
    const cards = screen.getAllByRole('article');
    const selectableCards = cards.filter((card) => card.classList.contains('pf-m-selectable'));
    await user.click(selectableCards[1]);
    expect(container.querySelector('.pf-c-action-list .pf-c-button.pf-m-secondary')).toHaveClass(
      'pf-m-disabled',
    );
  });
});
