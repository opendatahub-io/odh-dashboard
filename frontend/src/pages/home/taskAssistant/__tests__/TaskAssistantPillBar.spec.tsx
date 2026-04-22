import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TaskAssistantPillBar from '#~/pages/home/taskAssistant/TaskAssistantPillBar';

const MockIcon: React.FC = () => <span data-testid="mock-icon">icon</span>;

const mockIcon = { default: MockIcon as React.ComponentType };

const mockGroups = [
  { id: 'group-1', label: 'Manage models', icon: mockIcon, type: 'serving' as const },
  { id: 'group-2', label: 'Train models', icon: mockIcon, type: 'training' as const },
];

describe('TaskAssistantPillBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a pill for each group', () => {
    const onPillClick = jest.fn();
    render(<TaskAssistantPillBar groups={mockGroups} onPillClick={onPillClick} />);

    expect(screen.getByTestId('task-pill-group-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-pill-group-2')).toBeInTheDocument();
  });

  it('should display label text in each pill', () => {
    const onPillClick = jest.fn();
    render(<TaskAssistantPillBar groups={mockGroups} onPillClick={onPillClick} />);

    expect(screen.getByTestId('task-pill-group-1')).toHaveTextContent('Manage models');
    expect(screen.getByTestId('task-pill-group-2')).toHaveTextContent('Train models');
  });

  it('should call onPillClick with the group id when a pill is clicked', () => {
    const onPillClick = jest.fn();
    render(<TaskAssistantPillBar groups={mockGroups} onPillClick={onPillClick} />);

    const pill1 = screen.getByTestId('task-pill-group-1');
    fireEvent.click(within(pill1).getByRole('button'));
    expect(onPillClick).toHaveBeenCalledWith('group-1');

    const pill2 = screen.getByTestId('task-pill-group-2');
    fireEvent.click(within(pill2).getByRole('button'));
    expect(onPillClick).toHaveBeenCalledWith('group-2');
  });

  it('should render nothing when groups is empty', () => {
    const onPillClick = jest.fn();
    const { container } = render(<TaskAssistantPillBar groups={[]} onPillClick={onPillClick} />);

    expect(container.querySelectorAll('[data-testid^="task-pill-"]')).toHaveLength(0);
  });

  it('should render the icon for each pill', () => {
    const onPillClick = jest.fn();
    render(<TaskAssistantPillBar groups={mockGroups} onPillClick={onPillClick} />);

    expect(screen.getAllByTestId('mock-icon')).toHaveLength(2);
  });
});
