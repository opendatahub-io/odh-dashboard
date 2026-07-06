import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskAssistantSearchDropdown from '#~/pages/home/taskAssistant/TaskAssistantSearchDropdown';

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
});
