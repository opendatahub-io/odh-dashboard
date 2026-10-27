import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AlertVariant } from '@patternfly/react-core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, jest } from '@jest/globals';
import ToastNotification from '~/app/components/ToastNotification';
import { useNotification } from '~/app/hooks/useNotification';

jest.mock('~/app/hooks/useNotification');

const mockUseNotification = jest.mocked(useNotification);

describe('ToastNotification', () => {
  it('should navigate when a notification link is clicked', async () => {
    const user = userEvent.setup();
    mockUseNotification.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      remove: jest.fn(),
    });
    const Location = () => (
      <div data-testid="toast-test-location">{`${useLocation().pathname}${useLocation().search}`}</div>
    );

    render(
      <MemoryRouter>
        <Routes>
          <Route
            path="/*"
            element={
              <>
                <Location />
                <ToastNotification
                  notification={{
                    id: 1,
                    status: AlertVariant.success,
                    title: 'Connection created',
                    message: 'warehouse was created in Test Project',
                    timestamp: new Date(),
                    linkUrl: '/ai-hub/connections/connections/connection-id?project=test-project',
                    linkLabel: 'View connection details',
                  }}
                />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('toast-notification-alert').textContent).toContain(
      'Connection created',
    );
    await user.click(screen.getByRole('button', { name: 'View connection details' }));
    expect(screen.getByTestId('toast-test-location').textContent).toBe(
      '/ai-hub/connections/connections/connection-id?project=test-project',
    );
  });
});
