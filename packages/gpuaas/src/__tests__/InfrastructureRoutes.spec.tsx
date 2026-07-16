import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import InfrastructureRoutes, { INFRASTRUCTURE_PATH } from '../InfrastructureRoutes';

jest.mock('../pages/InfrastructurePage', () => ({
  __esModule: true,
  default: () => <div data-testid="infrastructure-page">Infrastructure</div>,
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
};

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={`${INFRASTRUCTURE_PATH}/*`}
          element={
            <>
              <LocationDisplay />
              <InfrastructureRoutes />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('InfrastructureRoutes', () => {
  it('should render the Infrastructure page on the index route', async () => {
    renderAt(INFRASTRUCTURE_PATH);

    expect(await screen.findByTestId('infrastructure-page')).toBeInTheDocument();
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(INFRASTRUCTURE_PATH);
  });

  it('should redirect unknown sub-routes to the Infrastructure page', async () => {
    renderAt(`${INFRASTRUCTURE_PATH}/invalid`);

    expect(await screen.findByTestId('infrastructure-page')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('location-pathname')).toHaveTextContent(INFRASTRUCTURE_PATH);
    });
  });
});
