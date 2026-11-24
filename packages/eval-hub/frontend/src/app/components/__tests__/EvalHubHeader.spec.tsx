import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import EvalHubHeader from '~/app/components/EvalHubHeader';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

describe('EvalHubHeader', () => {
  beforeEach(() =>
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>),
  );
  it('should render the provided title', () => {
    render(<EvalHubHeader title="Evaluations" />);
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
  });

  it('should render the icon container', () => {
    const { container } = render(<EvalHubHeader title="Test Title" />);
    const iconContainer = container.querySelector('svg');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render with a different title', () => {
    render(<EvalHubHeader title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render project content alongside the title', () => {
    render(<EvalHubHeader title="Evaluations" projectContent={<span>Project selector</span>} />);
    expect(screen.getByText('Project selector')).toBeInTheDocument();
  });

  it('should hide the entire project control group when UPS is enabled', () => {
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: true } as ReturnType<typeof useIsAreaAvailable>);
    render(<EvalHubHeader title="Evaluations" projectContent={<span>Project selector</span>} />);
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.queryByText('Project selector')).not.toBeInTheDocument();
  });
});
