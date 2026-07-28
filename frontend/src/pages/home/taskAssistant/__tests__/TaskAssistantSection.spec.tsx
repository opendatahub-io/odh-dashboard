import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { fireSectionToggled } from '#~/pages/home/taskAssistant/taskAssistantTracking';
import TaskAssistantSection from '#~/pages/home/taskAssistant/TaskAssistantSection';
import { makeGroupExtension, makeItemExtension } from './taskAssistantTestUtils';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
  useExtensions: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/utilities', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core/utilities'),
  useBrowserStorage: jest.fn(),
}));

jest.mock('#~/pages/home/taskAssistant/taskAssistantTracking', () => ({
  fireSectionToggled: jest.fn(),
}));

const mockFireSectionToggled = jest.mocked(fireSectionToggled);

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);
const mockUseExtensions = jest.mocked(useExtensions);
const mockUseBrowserStorage = jest.mocked(useBrowserStorage);

const mockSetIsOpen = jest.fn();

const renderSection = () =>
  render(
    <MemoryRouter>
      <TaskAssistantSection />
    </MemoryRouter>,
  );

describe('TaskAssistantSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExtensions.mockReturnValue([]);
    mockUseBrowserStorage.mockReturnValue([true, mockSetIsOpen]);
  });

  it('should render nothing when extensions are not resolved', () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    const { container } = renderSection();

    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when there are no groups with tasks', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
      .mockReturnValueOnce([[], true, []]);

    const { container } = renderSection();
    expect(container.innerHTML).toBe('');
  });

  it('should render the section when groups have tasks', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
      .mockReturnValueOnce([[makeItemExtension('t1', 'g1', '1')], true, []]);

    renderSection();
    expect(screen.getByTestId('task-assistant-section')).toBeInTheDocument();
  });

  it('should show the title "Task shortcuts"', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
      .mockReturnValueOnce([[makeItemExtension('t1', 'g1', '1')], true, []]);

    renderSection();
    expect(screen.getByText('Task shortcuts')).toBeInTheDocument();
  });

  describe('expanded state', () => {
    beforeEach(() => {
      mockUseBrowserStorage.mockReturnValue([true, mockSetIsOpen]);
      mockUseResolvedExtensions
        .mockReturnValueOnce([
          [makeGroupExtension('g1', '2'), makeGroupExtension('g2', '1')],
          true,
          [],
        ])
        .mockReturnValueOnce([
          [makeItemExtension('t1', 'g1', '1'), makeItemExtension('t2', 'g2', '1')],
          true,
          [],
        ]);
    });

    it('should render group cards sorted by order', () => {
      renderSection();

      const cards = screen.getAllByTestId(/^task-group-card-/);
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute('data-testid', 'task-group-card-g2');
      expect(cards[1]).toHaveAttribute('data-testid', 'task-group-card-g1');
    });

    it('should not show pills when expanded', () => {
      renderSection();

      expect(screen.queryByTestId(/^task-pill-/)).not.toBeInTheDocument();
    });

    it('should toggle to collapsed when the toggle button is clicked', () => {
      renderSection();

      fireEvent.click(screen.getByRole('button', { expanded: true }));
      expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });

    it('should fire Section Toggled with isExpanded false when collapsing', () => {
      renderSection();

      fireEvent.click(screen.getByRole('button', { expanded: true }));
      expect(mockFireSectionToggled).toHaveBeenCalledWith({ isExpanded: false });
    });
  });

  describe('collapsed state', () => {
    beforeEach(() => {
      mockUseBrowserStorage.mockReturnValue([false, mockSetIsOpen]);
      mockUseResolvedExtensions
        .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
        .mockReturnValueOnce([[makeItemExtension('t1', 'g1', '1')], true, []]);
    });

    it('should not show group cards when collapsed', () => {
      renderSection();

      expect(screen.queryByTestId(/^task-group-card-/)).not.toBeInTheDocument();
    });

    it('should show pills when collapsed', () => {
      renderSection();

      expect(screen.getByTestId('task-pill-g1')).toBeInTheDocument();
    });

    it('should expand when a pill is clicked', () => {
      renderSection();

      const pill = screen.getByTestId('task-pill-g1');
      const clickTarget = pill.querySelector('.pf-v6-c-label__content') ?? pill;
      fireEvent.click(clickTarget);
      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });

    it('should fire Section Toggled with category when expanding via pill click', () => {
      renderSection();

      const pill = screen.getByTestId('task-pill-g1');
      const clickTarget = pill.querySelector('.pf-v6-c-label__content') ?? pill;
      fireEvent.click(clickTarget);
      expect(mockFireSectionToggled).toHaveBeenCalledWith({ isExpanded: true, category: 'g1' });
    });

    it('should fire Section Toggled without category when expanding via toggle button', () => {
      renderSection();

      fireEvent.click(screen.getByRole('button', { name: 'Task shortcuts', expanded: false }));
      expect(mockFireSectionToggled).toHaveBeenCalledWith({ isExpanded: true });
    });
  });
});
