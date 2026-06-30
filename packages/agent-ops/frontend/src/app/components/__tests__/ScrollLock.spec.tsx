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
    document.body.appendChild(scrollContainer);
    mockGetDashboardMainContainer.mockReturnValue(scrollContainer);
  });

  afterEach(() => {
    scrollContainer.remove();
    jest.clearAllMocks();
  });

  it('should add and remove the scroll lock class around child mount lifecycle', () => {
    const { unmount } = render(
      <ScrollLock>
        <span>Wizard content</span>
      </ScrollLock>,
    );

    expect(screen.getByText('Wizard content')).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('agent-ops-scroll-lock');

    unmount();

    expect(scrollContainer).not.toHaveClass('agent-ops-scroll-lock');
  });
});
