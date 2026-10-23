import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';

describe('ContextBreadcrumb', () => {
  it('should render the home link with page name and project display name', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName="My Project"
          homePath="/evaluation/my-namespace"
          projectHomePath="/projects/my-namespace"
        />
      </MemoryRouter>,
    );

    const homeLink = screen.getByTestId('context-breadcrumb-home');
    expect(homeLink).toHaveTextContent('Evaluations in');
    expect(homeLink).toHaveTextContent('My Project');
    expect(homeLink).toHaveAttribute('href', '/evaluation/my-namespace');
  });

  it('should render the project link', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName="My Project"
          homePath="/evaluation/my-namespace"
          projectHomePath="/projects/my-namespace"
        />
      </MemoryRouter>,
    );

    const projectLink = screen.getByTestId('context-breadcrumb-project-link');
    expect(projectLink).toHaveTextContent('Go to');
    expect(projectLink).toHaveTextContent('My Project');
    expect(projectLink.querySelector('a')).toHaveAttribute('href', '/projects/my-namespace');
  });

  it('should call onHomeNavigate when the home link is clicked', async () => {
    const user = userEvent.setup();
    const onHomeNavigate = jest.fn();
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName="My Project"
          homePath="/evaluation/my-namespace"
          projectHomePath="/projects/my-namespace"
          onHomeNavigate={onHomeNavigate}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('context-breadcrumb-home'));
    expect(onHomeNavigate).toHaveBeenCalledTimes(1);
  });

  it('should render a disabled home crumb when isHomeDisabled is true', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName="My Project"
          homePath="/evaluation/my-namespace"
          projectHomePath="/projects/my-namespace"
          isHomeDisabled
          homeTestId="custom-home"
        />
      </MemoryRouter>,
    );

    const homeCrumb = screen.getByTestId('custom-home');
    expect(homeCrumb).toHaveTextContent('Evaluations in');
    expect(homeCrumb.tagName).toBe('SPAN');
    expect(homeCrumb).toHaveAttribute('aria-disabled', 'true');
    expect(homeCrumb.querySelector('a')).not.toBeInTheDocument();
  });

  it('should use custom test ids when provided', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName="My Project"
          homePath="/evaluation/my-namespace"
          projectHomePath="/projects/my-namespace"
          homeTestId="custom-home"
          projectLinkTestId="custom-project-link"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('custom-home')).toBeInTheDocument();
    expect(screen.getByTestId('custom-project-link')).toBeInTheDocument();
  });

  it('should render additional breadcrumb items passed as children', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName="My Project"
          homePath="/evaluation/my-namespace"
          projectHomePath="/projects/my-namespace"
        >
          <BreadcrumbItem isActive data-testid="extra-crumb">
            Extra step
          </BreadcrumbItem>
        </ContextBreadcrumb>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('extra-crumb')).toHaveTextContent('Extra step');
  });
});
