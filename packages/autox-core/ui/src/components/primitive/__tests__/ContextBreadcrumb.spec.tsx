import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import ContextBreadcrumb from '../ContextBreadcrumb';

describe('ContextBreadcrumb', () => {
  it('should render the home link with page name and project display name', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Widgets"
          projectDisplayName="My Project"
          homePath="/widgets/my-namespace"
          projectHomePath="/projects/my-namespace"
        />
      </MemoryRouter>,
    );

    const homeLink = screen.getByTestId('context-breadcrumb-home');
    expect(homeLink).toHaveTextContent('Widgets in');
    expect(homeLink).toHaveTextContent('My Project');
    expect(homeLink.querySelector('a')).toHaveAttribute('href', '/widgets/my-namespace');
  });

  it('should render the project link', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Widgets"
          projectDisplayName="My Project"
          homePath="/widgets/my-namespace"
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
          pageName="Widgets"
          projectDisplayName="My Project"
          homePath="/widgets/my-namespace"
          projectHomePath="/projects/my-namespace"
          onHomeNavigate={onHomeNavigate}
        />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('context-breadcrumb-home').querySelector('a');
    if (link) {
      await user.click(link);
    }
    expect(onHomeNavigate).toHaveBeenCalledTimes(1);
  });

  it('should use custom test ids when provided', () => {
    render(
      <MemoryRouter>
        <ContextBreadcrumb
          pageName="Widgets"
          projectDisplayName="My Project"
          homePath="/widgets/my-namespace"
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
          pageName="Widgets"
          projectDisplayName="My Project"
          homePath="/widgets/my-namespace"
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
