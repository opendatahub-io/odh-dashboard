import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { createConnection } from '~/app/api/dch';
import CreateConnectionWizard from '~/app/components/CreateConnectionWizard';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import ConnectionTypeDetails from '~/app/pages/ConnectionTypeDetails';
import type { CreateConnectionRequest } from '~/app/types';

jest.mock('~/app/hooks/useConnectionType');
jest.mock('~/app/api/dch', () => ({
  createConnection: jest.fn(),
}));
jest.mock('~/app/components/CreateConnectionWizard', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockUseConnectionType = jest.mocked(useConnectionType);
const mockCreateConnection = jest.mocked(createConnection);
const mockCreateConnectionWizard = jest.mocked(CreateConnectionWizard);
const mockCreateRequest = jest.fn();

const createRequest: CreateConnectionRequest = {
  name: 'warehouse',
  data_connection_type_id: 'postgresql',
  format: 'tabular',
  credentials: { secret: 'warehouse', properties: { URI: 'postgres://example' } },
  properties: {},
};

const renderDetails = (entry = '/connection-types/postgresql?project=test-project&view=details') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/connection-types" element={<div data-testid="connection-types-page" />} />
        <Route path="/connection-types/:connectionTypeId" element={<ConnectionTypeDetails />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ConnectionTypeDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateConnection.mockReturnValue(mockCreateRequest);
    mockCreateConnectionWizard.mockImplementation(({ isOpen, onClose, onCreate }) =>
      isOpen ? (
        <div data-testid="mock-create-connection-wizard">
          <button type="button" onClick={onClose}>
            Close mocked wizard
          </button>
          <button type="button" onClick={() => void onCreate?.(createRequest, 'new-project')}>
            Submit mocked connection
          </button>
        </div>
      ) : null,
    );
  });

  it('should load the route connection type for the selected project', () => {
    const connectionType = mockConnectionType();
    mockUseConnectionType.mockReturnValue([connectionType, true, undefined]);

    renderDetails();

    expect(mockUseConnectionType).toHaveBeenCalledWith('test-project', 'postgresql');
    expect(screen.getAllByText('PostgreSQL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connect to a PostgreSQL database.')).toHaveLength(2);
    expect(screen.getByText('Provider')).toBeTruthy();
    expect(
      screen.getByTestId('connection-type-details').getAttribute('data-connection-type-id'),
    ).toBe('postgresql');
    expect(screen.getAllByText('Full integration')).toHaveLength(2);
  });

  it('should open a wizard preselected with the displayed connection type', async () => {
    const user = userEvent.setup();
    mockUseConnectionType.mockReturnValue([mockConnectionType(), true, undefined]);

    renderDetails();
    await user.click(screen.getByTestId('connection-type-details-create-connection'));

    expect(screen.getByTestId('mock-create-connection-wizard')).toBeTruthy();
    const wizardCalls = mockCreateConnectionWizard.mock.calls;
    const wizardProps = wizardCalls[wizardCalls.length - 1]?.[0];
    expect(wizardProps).toEqual(
      expect.objectContaining({
        isOpen: true,
        namespace: 'test-project',
        initialFormData: { data_connection_type_id: 'postgresql' },
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Close mocked wizard' }));
    expect(screen.queryByTestId('mock-create-connection-wizard')).toBeNull();
  });

  it('should create a connection in the namespace selected by the wizard', async () => {
    const user = userEvent.setup();
    mockUseConnectionType.mockReturnValue([mockConnectionType(), true, undefined]);

    renderDetails();
    await user.click(screen.getByTestId('connection-type-details-create-connection'));
    await user.click(screen.getByRole('button', { name: 'Submit mocked connection' }));

    await waitFor(() => {
      expect(mockCreateConnection).toHaveBeenCalledWith('');
      expect(mockCreateRequest).toHaveBeenCalledWith({}, 'new-project', createRequest);
    });
  });

  it('should preserve the query string in the breadcrumb link', () => {
    mockUseConnectionType.mockReturnValue([mockConnectionType(), true, undefined]);

    renderDetails();

    expect(screen.getByRole('link', { name: 'Connection types' }).getAttribute('href')).toBe(
      '/connection-types?project=test-project&view=details',
    );
  });

  it('should redirect to connection types when no project is selected', async () => {
    renderDetails('/connection-types/postgresql?view=details');

    expect(await screen.findByTestId('connection-types-page')).toBeTruthy();
    expect(mockUseConnectionType).not.toHaveBeenCalled();
  });

  it('should render the loading state', () => {
    mockUseConnectionType.mockReturnValue([undefined, false, undefined]);

    renderDetails();

    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.getAllByText('Loading connection type').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('connection-type-details-create-connection')).toBeNull();
    expect(mockCreateConnectionWizard).not.toHaveBeenCalled();
  });

  it('should render the load error', () => {
    mockUseConnectionType.mockReturnValue([undefined, false, new Error('request failed')]);

    renderDetails();

    expect(screen.getByText('Unable to load connection type')).toBeTruthy();
    expect(screen.getByText('request failed')).toBeTruthy();
    expect(screen.queryByTestId('connection-type-details-create-connection')).toBeNull();
    expect(mockCreateConnectionWizard).not.toHaveBeenCalled();
  });

  it('should render the not-found state for an empty successful response', () => {
    mockUseConnectionType.mockReturnValue([undefined, true, undefined]);

    renderDetails('/connection-types/missing?project=test-project');

    expect(screen.getByText('Connection type not found')).toBeTruthy();
    expect(screen.queryByTestId('connection-type-details-create-connection')).toBeNull();
    expect(mockCreateConnectionWizard).not.toHaveBeenCalled();
  });
});
