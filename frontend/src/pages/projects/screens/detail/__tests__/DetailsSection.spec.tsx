import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import DetailsSection from '#~/pages/projects/screens/detail/DetailsSection';
import { K8sStatusError } from '#~/api/errorUtils';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { ProjectObjectType } from '#~/concepts/design/utils';

describe('DetailsSection', () => {
  const defaultEmptyState = <div data-testid="empty-state">Empty</div>;

  it('should render UnauthorizedError when loadError is a 403 error', () => {
    const forbiddenError = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'Forbidden',
      reason: 'Forbidden',
      code: 403,
    });

    render(
      <MemoryRouter>
        <DetailsSection
          id={ProjectSectionID.WORKBENCHES}
          objectType={ProjectObjectType.notebook}
          title="Workbenches"
          loadError={forbiddenError}
          isLoading={false}
          isEmpty={false}
          emptyState={defaultEmptyState}
        >
          <div>Section content</div>
        </DetailsSection>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
    expect(screen.queryByText('Section content')).not.toBeInTheDocument();
  });

  it('should render error alert when loadError is a non-403 error', () => {
    const genericError = new Error('Something went wrong');

    render(
      <MemoryRouter>
        <DetailsSection
          id={ProjectSectionID.WORKBENCHES}
          objectType={ProjectObjectType.notebook}
          title="Workbenches"
          loadError={genericError}
          isLoading={false}
          isEmpty={false}
          emptyState={defaultEmptyState}
        >
          <div>Section content</div>
        </DetailsSection>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Section content')).not.toBeInTheDocument();
  });

  it('should render children when there is no error', () => {
    render(
      <MemoryRouter>
        <DetailsSection
          id={ProjectSectionID.WORKBENCHES}
          objectType={ProjectObjectType.notebook}
          title="Workbenches"
          loadError={undefined}
          isLoading={false}
          isEmpty={false}
          emptyState={defaultEmptyState}
        >
          <div>Section content</div>
        </DetailsSection>
      </MemoryRouter>,
    );

    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('should render loading spinner when isLoading is true', () => {
    render(
      <MemoryRouter>
        <DetailsSection
          id={ProjectSectionID.WORKBENCHES}
          objectType={ProjectObjectType.notebook}
          title="Workbenches"
          loadError={undefined}
          isLoading
          isEmpty={false}
          emptyState={defaultEmptyState}
        >
          <div>Section content</div>
        </DetailsSection>
      </MemoryRouter>,
    );

    // When loading, children should not be visible
    expect(screen.queryByText('Section content')).not.toBeInTheDocument();
  });
});
