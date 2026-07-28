import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScopedLabel from '@odh-dashboard/ui-core/components/ScopedLabel';

describe('ScopedLabel', () => {
  it('should render project-scoped label with project icon', () => {
    render(
      <ScopedLabel isProject color="blue">
        Project
      </ScopedLabel>,
    );

    const label = screen.getByTestId('project-scoped-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Project');
    expect(label).toHaveClass('pf-m-blue');
  });

  it('should render global-scoped label with global icon', () => {
    render(
      <ScopedLabel isProject={false} color="blue">
        Global
      </ScopedLabel>,
    );

    const label = screen.getByTestId('global-scoped-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Global');
  });

  it('should use custom data-testid when provided', () => {
    render(
      <ScopedLabel isProject dataTestId="custom-label">
        Custom
      </ScopedLabel>,
    );

    expect(screen.getByTestId('custom-label')).toBeInTheDocument();
  });

  it('should render with custom color', () => {
    render(
      <ScopedLabel isProject color="green">
        Green Label
      </ScopedLabel>,
    );

    const label = screen.getByTestId('project-scoped-label');
    expect(label).toHaveClass('pf-m-green');
  });

  it('should render with filled variant when specified', () => {
    render(
      <ScopedLabel isProject variant="filled">
        Filled
      </ScopedLabel>,
    );

    const label = screen.getByTestId('project-scoped-label');
    expect(label).toHaveClass('pf-m-filled');
    expect(label).not.toHaveClass('pf-m-outline');
  });

  it('should render with outline variant by default', () => {
    render(<ScopedLabel isProject>Outline</ScopedLabel>);

    const label = screen.getByTestId('project-scoped-label');
    expect(label).toHaveClass('pf-m-outline');
  });

  it('should be compact by default', () => {
    render(<ScopedLabel isProject>Compact</ScopedLabel>);

    const label = screen.getByTestId('project-scoped-label');
    expect(label).toHaveClass('pf-m-compact');
  });

  it('should not be compact when isCompact is false', () => {
    render(
      <ScopedLabel isProject isCompact={false}>
        Not Compact
      </ScopedLabel>,
    );

    const label = screen.getByTestId('project-scoped-label');
    expect(label).not.toHaveClass('pf-m-compact');
  });
});
