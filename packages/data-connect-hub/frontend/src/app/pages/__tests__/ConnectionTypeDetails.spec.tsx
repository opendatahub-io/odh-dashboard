import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import ConnectionTypeDetails from '~/app/pages/ConnectionTypeDetails';

jest.mock('~/app/hooks/useConnectionType');

const mockUseConnectionType = jest.mocked(useConnectionType);

const renderDetails = (entry = '/connection-types/postgresql?project=test-project&view=details') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/connection-types/:connectionTypeId" element={<ConnectionTypeDetails />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ConnectionTypeDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load the route connection type for the selected project', () => {
    const connectionType = mockConnectionType();
    mockUseConnectionType.mockReturnValue([connectionType, true, undefined]);

    renderDetails();

    expect(mockUseConnectionType).toHaveBeenCalledWith('test-project', 'postgresql');
    expect(screen.getAllByText('PostgreSQL').length).toBeGreaterThan(0);
    expect(screen.getByText('Connect to a PostgreSQL database.')).toBeTruthy();
    expect(screen.getByText('Provider')).toBeTruthy();
    expect(
      screen.getByTestId('connection-type-details').getAttribute('data-connection-type-id'),
    ).toBe('postgresql');
  });

  it('should preserve the query string in the breadcrumb link', () => {
    mockUseConnectionType.mockReturnValue([mockConnectionType(), true, undefined]);

    renderDetails();

    expect(screen.getByRole('link', { name: 'Connection types' }).getAttribute('href')).toBe(
      '/connection-types?project=test-project&view=details',
    );
  });

  it('should render the loading state', () => {
    mockUseConnectionType.mockReturnValue([undefined, false, undefined]);

    renderDetails();

    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.getAllByText('Loading connection type').length).toBeGreaterThan(0);
  });

  it('should render the load error', () => {
    mockUseConnectionType.mockReturnValue([undefined, false, new Error('request failed')]);

    renderDetails();

    expect(screen.getByText('Unable to load connection type')).toBeTruthy();
    expect(screen.getByText('request failed')).toBeTruthy();
  });

  it('should render the not-found state for an empty successful response', () => {
    mockUseConnectionType.mockReturnValue([undefined, true, undefined]);

    renderDetails('/connection-types/missing?project=test-project');

    expect(screen.getByText('Connection type not found')).toBeTruthy();
  });
});
