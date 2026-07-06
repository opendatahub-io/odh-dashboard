import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorOverviewCard from '#~/pages/projects/screens/detail/overview/components/ErrorOverviewCard';
import { K8sStatusError } from '#~/api/errorUtils';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';

describe('ErrorOverviewCard', () => {
  it('should render permission error message for 403 errors', () => {
    const error = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'Forbidden',
      reason: 'Forbidden',
      code: 403,
    });

    render(
      <ErrorOverviewCard
        error={error}
        objectType={ProjectObjectType.notebook}
        sectionType={SectionType.training}
        title="Workbenches"
      />,
    );

    expect(
      screen.getByText('To access notebook, ask your administrator to adjust your permissions.'),
    ).toBeInTheDocument();
  });

  it('should render generic error message for non-403 errors', () => {
    const error = new Error('Something went wrong');

    render(
      <ErrorOverviewCard
        error={error}
        objectType={ProjectObjectType.notebook}
        sectionType={SectionType.training}
        title="Workbenches"
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render server error message for 500 errors', () => {
    const error = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'Internal Server Error',
      reason: 'InternalError',
      code: 500,
    });

    render(
      <ErrorOverviewCard
        error={error}
        objectType={ProjectObjectType.notebook}
        sectionType={SectionType.training}
        title="Workbenches"
      />,
    );

    expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
  });

  it('should display the correct object type in permission error message', () => {
    const error = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'Forbidden',
      reason: 'Forbidden',
      code: 403,
    });

    render(
      <ErrorOverviewCard
        error={error}
        objectType={ProjectObjectType.pipeline}
        sectionType={SectionType.training}
        title="Pipelines"
      />,
    );

    expect(
      screen.getByText('To access pipeline, ask your administrator to adjust your permissions.'),
    ).toBeInTheDocument();
  });
});
