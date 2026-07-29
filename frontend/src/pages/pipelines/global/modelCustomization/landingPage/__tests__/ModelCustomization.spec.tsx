import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelCustomization from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomization';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({
    title,
    children,
  }: {
    title: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="app-page-title">{title}</div>
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
  it('should show the page with correct title when rendered', () => {
    render(<ModelCustomization />);
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Model customization');
  });

  it('should render the drawer container', () => {
    render(<ModelCustomization />);
    expect(screen.getByTestId('drawer-model-customization')).toBeInTheDocument();
  });
});
