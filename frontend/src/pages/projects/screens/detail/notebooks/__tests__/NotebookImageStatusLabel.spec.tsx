import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  NotebookImageAvailability,
  NotebookImageStatus,
} from '#~/pages/projects/screens/detail/notebooks/const';
import NotebookImageStatusLabel from '#~/pages/projects/screens/detail/notebooks/NotebookImageStatusLabel';

describe('NotebookImageStatusLabel', () => {
  it('should render Latest label with green color and check icon', () => {
    render(
      <NotebookImageStatusLabel
        imageStatus={NotebookImageStatus.LATEST}
        imageAvailability={NotebookImageAvailability.ENABLED}
      />,
    );

    const label = screen.getByTestId('notebook-image-status-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(NotebookImageStatus.LATEST);
    expect(label).toHaveClass('pf-m-green');
  });

  it('should render Deprecated label with yellow color and warning icon', () => {
    render(
      <NotebookImageStatusLabel
        imageStatus={NotebookImageStatus.DEPRECATED}
        imageAvailability={NotebookImageAvailability.ENABLED}
      />,
    );

    const label = screen.getByTestId('notebook-image-status-label');
    expect(label).toHaveTextContent(NotebookImageStatus.DEPRECATED);
    expect(label).toHaveClass('pf-m-yellow');
  });

  it('should render Deleted label with red color and error icon', () => {
    render(
      <NotebookImageStatusLabel
        imageStatus={NotebookImageStatus.DELETED}
        imageAvailability={NotebookImageAvailability.ENABLED}
      />,
    );

    const label = screen.getByTestId('notebook-image-status-label');
    expect(label).toHaveTextContent(NotebookImageStatus.DELETED);
    expect(label).toHaveClass('pf-m-red');
  });

  it('should render Disabled availability with yellow color and warning icon', () => {
    render(
      <NotebookImageStatusLabel
        imageStatus={NotebookImageStatus.LATEST}
        imageAvailability={NotebookImageAvailability.DISABLED}
      />,
    );

    const label = screen.getByTestId('notebook-image-status-label');
    // When disabled, should show availability (DISABLED), not status (LATEST)
    expect(label).toHaveTextContent(NotebookImageAvailability.DISABLED);
    expect(label).toHaveClass('pf-m-yellow');
  });

  it('should be compact by default', () => {
    render(
      <NotebookImageStatusLabel
        imageStatus={NotebookImageStatus.LATEST}
        imageAvailability={NotebookImageAvailability.ENABLED}
      />,
    );

    const label = screen.getByTestId('notebook-image-status-label');
    expect(label).toHaveClass('pf-m-compact');
  });
});
