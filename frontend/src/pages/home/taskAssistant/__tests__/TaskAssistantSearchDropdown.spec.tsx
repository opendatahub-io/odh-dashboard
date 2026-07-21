import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  fireShortcutClicked,
  fireSearchAborted,
} from '#~/pages/home/taskAssistant/taskAssistantTracking';
import TaskAssistantSearchDropdown from '#~/pages/home/taskAssistant/TaskAssistantSearchDropdown';

jest.mock('#~/pages/home/taskAssistant/taskAssistantTracking', () => ({
  fireShortcutClicked: jest.fn(),
  fireSearchAborted: jest.fn(),
}));

const mockFireShortcutClicked = jest.mocked(fireShortcutClicked);
const mockFireSearchAborted = jest.mocked(fireSearchAborted);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockGroups = [
  { id: 'ai-hub', title: 'AI hub' },
  { id: 'develop', title: 'Develop and train' },
];

const mockTasks = [
  { id: 'task-1', group: 'ai-hub', title: 'Find models', href: '/models' },
  { id: 'task-2', group: 'ai-hub', title: 'Deploy MCP servers', href: '/mcp' },
  { id: 'task-3', group: 'develop', title: 'Create workbench', href: '/workbenches' },
  { id: 'task-4', group: 'develop', title: 'Build pipelines', href: '/pipelines' },
];

const renderDropdown = (groups = mockGroups, tasks = mockTasks) =>
  render(
    <MemoryRouter>
      <TaskAssistantSearchDropdown groups={groups} tasks={tasks} />
    </MemoryRouter>,
  );

describe('TaskAssistantSearchDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the typeahead toggle', () => {
    renderDropdown();

    expect(screen.getByTestId('task-assistant-search')).toBeInTheDocument();
  });

  it('should show placeholder text', () => {
    renderDropdown();

    expect(screen.getByPlaceholderText('Looking for another task?')).toBeInTheDocument();
  });

  it('should show all tasks when opened', () => {
    renderDropdown();

    const input = screen.getByPlaceholderText('Looking for another task?');
    fireEvent.click(input);
    expect(screen.getByText('Find models')).toBeInTheDocument();
    expect(screen.getByText('Deploy MCP servers')).toBeInTheDocument();
    expect(screen.getByText('Create workbench')).toBeInTheDocument();
    expect(screen.getByText('Build pipelines')).toBeInTheDocument();
  });

  it('should filter tasks when typing', () => {
    renderDropdown();

    const input = screen.getByPlaceholderText('Looking for another task?');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'model' } });

    expect(screen.getByText('Find models')).toBeInTheDocument();
    expect(screen.queryByText('Deploy MCP servers')).not.toBeInTheDocument();
    expect(screen.queryByText('Create workbench')).not.toBeInTheDocument();
    expect(screen.queryByText('Build pipelines')).not.toBeInTheDocument();
  });

  it('should be case-insensitive when filtering', () => {
    renderDropdown();

    const input = screen.getByPlaceholderText('Looking for another task?');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'MCP' } });

    expect(screen.getByText('Deploy MCP servers')).toBeInTheDocument();
  });

  it('should navigate when a task is selected', () => {
    renderDropdown();

    const input = screen.getByPlaceholderText('Looking for another task?');
    fireEvent.click(input);
    fireEvent.click(screen.getByText('Find models'));

    expect(mockNavigate).toHaveBeenCalledWith('/models');
  });

  it('should show no results message when nothing matches', () => {
    renderDropdown();

    const input = screen.getByPlaceholderText('Looking for another task?');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'zzz-no-match' } });

    expect(screen.getByText(/No results found/)).toBeInTheDocument();
  });

  describe('tracking', () => {
    it('should fire Shortcut Clicked with viewContext search when selecting without filtering', () => {
      renderDropdown();

      const input = screen.getByPlaceholderText('Looking for another task?');
      fireEvent.click(input);
      fireEvent.click(screen.getByText('Find models'));

      expect(mockFireShortcutClicked).toHaveBeenCalledWith({
        taskName: 'Find models',
        category: 'ai-hub',
        destination: '/models',
        viewContext: 'search',
      });
    });

    it('should fire Shortcut Clicked with viewContext search-filtered when filter text was entered', () => {
      renderDropdown();

      const input = screen.getByPlaceholderText('Looking for another task?');
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'model' } });
      fireEvent.click(screen.getByText('Find models'));

      expect(mockFireShortcutClicked).toHaveBeenCalledWith({
        taskName: 'Find models',
        category: 'ai-hub',
        destination: '/models',
        viewContext: 'search-filtered',
      });
    });

    it('should fire Search Aborted with filtered false when closing without selecting or typing', () => {
      renderDropdown();

      const toggle = screen.getByRole('button', { name: 'Typeahead menu toggle' });
      fireEvent.click(toggle);
      fireEvent.click(toggle);

      expect(mockFireSearchAborted).toHaveBeenCalledWith({ filtered: false });
      expect(mockFireShortcutClicked).not.toHaveBeenCalled();
    });

    it('should fire Search Aborted with filtered true when closing after typing without selecting', () => {
      renderDropdown();

      const input = screen.getByPlaceholderText('Looking for another task?');
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'model' } });

      const toggle = screen.getByRole('button', { name: 'Typeahead menu toggle' });
      fireEvent.click(toggle);

      expect(mockFireSearchAborted).toHaveBeenCalledWith({ filtered: true });
      expect(mockFireShortcutClicked).not.toHaveBeenCalled();
    });

    it('should fire Search Aborted with filtered true when user typed then cleared text before closing', () => {
      renderDropdown();

      const input = screen.getByPlaceholderText('Looking for another task?');
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'workbench' } });
      fireEvent.change(input, { target: { value: '' } });

      const toggle = screen.getByRole('button', { name: 'Typeahead menu toggle' });
      fireEvent.click(toggle);

      expect(mockFireSearchAborted).toHaveBeenCalledWith({ filtered: true });
    });

    it('should not fire Search Aborted when a task is selected', () => {
      renderDropdown();

      const input = screen.getByPlaceholderText('Looking for another task?');
      fireEvent.click(input);
      fireEvent.click(screen.getByText('Find models'));

      expect(mockFireSearchAborted).not.toHaveBeenCalled();
    });
  });
});
