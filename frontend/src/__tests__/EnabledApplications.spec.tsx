import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from '../redux/store/store';
import { EnabledApplicationsInner } from '../pages/enabledApplications/EnabledApplications';
import { mockEnabledApplications } from '../../__mocks__/mockEnabledApplications';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const dashboardConfig = {
  spec: {
    dashboardConfig: {
      disableISVBadges: false,
    },
  },
};

jest.mock('../app/AppContext.ts', () => ({
  useAppContext: () => ({ dashboardConfig }),
}));

describe('EnabledApplications', () => {
  it('should display a message when there are no enabled applications', () => {
    render(
      <Provider store={store}>
        <Router>
          <EnabledApplicationsInner loaded={true} components={[]} />
        </Router>
      </Provider>,
    );
    expect(screen.getByTestId('empty-empty-state')).toBeInTheDocument();
  });

  it('should display a message when loading applications fails', () => {
    render(
      <Provider store={store}>
        <Router>
          <EnabledApplicationsInner
            loaded={true}
            loadError={new Error('faux error')}
            components={[]}
          />
        </Router>
      </Provider>,
    );
    expect(screen.getByTestId('error-empty-state')).toBeInTheDocument();
  });

  it('should display enabled applications', () => {
    render(
      <Provider store={store}>
        <Router>
          <EnabledApplicationsInner loaded={true} components={mockEnabledApplications} />
        </Router>
      </Provider>,
    );
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
