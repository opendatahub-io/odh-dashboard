import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import RuntimeImageInstallAction from '../RuntimeImageInstallAction';
import { mockRuntimeImageActionData } from '../mockRuntimeImageActionData';
import { PLACEHOLDER_INSTALL_PATH } from '../const';

const StateView: React.FC = () => {
  const { state } = useLocation();
  return <span data-testid="route-data">{JSON.stringify(state)}</span>;
};

describe('RuntimeImageInstallAction', () => {
  it('should navigate with typed action data in router state', () => {
    render(
      <MemoryRouter initialEntries={['/dummy-origin-route']}>
        <Routes>
          <Route
            path="/dummy-origin-route"
            element={<RuntimeImageInstallAction actionData={mockRuntimeImageActionData()} />}
          />
          <Route path={PLACEHOLDER_INSTALL_PATH} element={<StateView />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', {
        name: 'Install',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('runtime-image-install'));
    expect(screen.getByTestId('route-data')).toHaveTextContent(
      JSON.stringify({ actionData: mockRuntimeImageActionData() }),
    );
  });
});
