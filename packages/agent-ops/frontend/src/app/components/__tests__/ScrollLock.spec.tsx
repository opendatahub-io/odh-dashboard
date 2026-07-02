import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ScrollLock from '~/app/components/ScrollLock';

jest.mock('@odh-dashboard/internal/utilities/utils', () => ({
  getDashboardMainContainer: jest.fn(),
}));

const mockGetDashboardMainContainer = jest.requireMock<{
  getDashboardMainContainer: jest.Mock<HTMLElement, []>;
}>('@odh-dashboard/internal/utilities/utils').getDashboardMainContainer;

describe('ScrollLock', () => {
  let scrollContainer: HTMLDivElement;

  beforeEach(() => {
    scrollContainer = document.createElement('div');
    scrollContainer.id = 'dashboard-page-main';
    scrollContainer.style.overflow = 'auto';
    document.body.appendChild(scrollContainer);
    mockGetDashboardMainContainer.mockReturnValue(scrollContainer);
  });

  afterEach(() => {
    scrollContainer.remove();
    jest.clearAllMocks();
  });

  it('should set overflow hidden while mounted and restore on unmount', () => {
    const { unmount } = render(
      <ScrollLock>
        <span>Wizard content</span>
      </ScrollLock>,
    );

    expect(screen.getByText('Wizard content')).toBeInTheDocument();
    expect(scrollContainer.style.overflow).toBe('hidden');

    unmount();

    expect(scrollContainer.style.overflow).toBe('auto');
  });

  it('should keep overflow hidden until all nested locks unmount', () => {
    const { unmount: unmountOuter } = render(
      <ScrollLock>
        <ScrollLock>
          <span>Nested wizard</span>
        </ScrollLock>
      </ScrollLock>,
    );

    expect(scrollContainer.style.overflow).toBe('hidden');

    unmountOuter();

    expect(scrollContainer.style.overflow).toBe('auto');
  });
});
