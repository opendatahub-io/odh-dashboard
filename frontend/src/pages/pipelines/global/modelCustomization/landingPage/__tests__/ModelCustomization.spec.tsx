import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ModelCustomization from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomization';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({
    title,
    description,
    children,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="app-page-title">{title}</div>
      <div data-testid="app-page-description">{description}</div>
      <div>{children}</div>
    </div>
  ),
}));

jest.mock('@odh-dashboard/ui-core/design/TitleWithIcon', () => {
  const MockTitleWithIcon = ({ title }: { title: React.ReactNode }) => <span>{title}</span>;
  MockTitleWithIcon.displayName = 'MockTitleWithIcon';
  return { __esModule: true, default: MockTitleWithIcon };
});

jest.mock(
  '#~/pages/pipelines/global/modelCustomization/landingPage/LabMethodDescriptionSection',
  () => ({
    LabMethodDescriptionSection: () => <div data-testid="mock-lab-method" />,
  }),
);

jest.mock('#~/pages/pipelines/global/modelCustomization/landingPage/PrerequisitesSection', () => ({
  PrerequisitesSection: () => <div data-testid="mock-prerequisites" />,
}));

jest.mock('#~/pages/pipelines/global/modelCustomization/landingPage/ProjectSetupSection', () => ({
  ProjectSetupSection: () => <div data-testid="mock-project-setup" />,
}));

jest.mock('#~/pages/pipelines/global/modelCustomization/landingPage/NextStepsSection', () => ({
  NextStepsSection: () => <div data-testid="mock-next-steps" />,
}));

jest.mock(
  '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent',
  () => {
    const { forwardRef } = jest.requireActual('react');
    const Component = forwardRef(() => null);
    Component.displayName = 'MockDrawerContent';
    return { __esModule: true, default: Component };
  },
);

describe('ModelCustomization', () => {
  it('should render the page title and description', () => {
    render(<ModelCustomization />);
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Model customization');
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Optionally customize foundation models',
    );
  });

  it('should render the LAB-tuning card with descriptive content', () => {
    render(<ModelCustomization />);
    expect(screen.getByRole('heading', { name: 'LAB-tuning', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/LAB-tuning significantly reduces limitations/)).toBeInTheDocument();
  });

  it('should render the drawer container in collapsed state', () => {
    render(<ModelCustomization />);
    const drawer = screen.getByTestId('drawer-model-customization');
    expect(drawer).toBeInTheDocument();
    expect(drawer).not.toHaveClass('pf-m-expanded');
  });

  it('should render all content sections', () => {
    render(<ModelCustomization />);
    expect(screen.getByTestId('mock-lab-method')).toBeInTheDocument();
    expect(screen.getByTestId('mock-prerequisites')).toBeInTheDocument();
    expect(screen.getByTestId('mock-project-setup')).toBeInTheDocument();
    expect(screen.getByTestId('mock-next-steps')).toBeInTheDocument();
  });
});
