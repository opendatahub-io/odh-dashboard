import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskGroupCard from '#~/pages/home/taskAssistant/TaskGroupCard';

const MockIcon: React.FC = () => <span data-testid="group-icon">icon</span>;

const mockGroup = {
  id: 'ai-hub',
  title: 'AI hub',
  description: 'Browse, manage, and deploy models.',
  icon: { default: MockIcon as React.ComponentType },
  type: 'serving' as const,
};

const mockTasks = [
  { id: 'task-1', title: 'Find models', href: '/models' },
  { id: 'task-2', title: 'Deploy servers', href: '/servers' },
];

const renderCard = (
  group: React.ComponentProps<typeof TaskGroupCard>['group'] = mockGroup,
  tasks: React.ComponentProps<typeof TaskGroupCard>['tasks'] = mockTasks,
) =>
  render(
    <MemoryRouter>
      <TaskGroupCard group={group} tasks={tasks} />
    </MemoryRouter>,
  );

describe('TaskGroupCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the group title and description', () => {
    renderCard();

    expect(screen.getByText('AI hub')).toBeInTheDocument();
    expect(screen.getByText('Browse, manage, and deploy models.')).toBeInTheDocument();
  });

  it('should render the group icon', () => {
    renderCard();

    expect(screen.getByTestId('group-icon')).toBeInTheDocument();
  });

  it('should render task links', () => {
    renderCard();

    expect(screen.getByTestId('task-link-task-1')).toHaveTextContent('Find models');
    expect(screen.getByTestId('task-link-task-2')).toHaveTextContent('Deploy servers');
    expect(screen.getByTestId('task-link-task-1').closest('a')).toHaveAttribute('href', '/models');
    expect(screen.getByTestId('task-link-task-2').closest('a')).toHaveAttribute('href', '/servers');
  });

  it('should render the card with the correct test id', () => {
    renderCard();

    expect(screen.getByTestId('task-group-card-ai-hub')).toBeInTheDocument();
  });

  it('should render with TypeBorderedCard styling', () => {
    renderCard();

    const card = screen.getByTestId('task-group-card-ai-hub');
    expect(card).toHaveClass('odh-type-bordered-card');
  });

  it('should render an empty task list when no tasks provided', () => {
    renderCard(mockGroup, []);

    expect(screen.getByTestId('task-group-card-ai-hub')).toBeInTheDocument();
    expect(screen.queryByTestId(/^task-link-/)).not.toBeInTheDocument();
  });

  it('should apply the section type as a CSS class', () => {
    renderCard({
      ...mockGroup,
      id: 'general-group',
      type: 'general',
    });

    const card = screen.getByTestId('task-group-card-general-group');
    expect(card).toHaveClass('general');
  });
});
