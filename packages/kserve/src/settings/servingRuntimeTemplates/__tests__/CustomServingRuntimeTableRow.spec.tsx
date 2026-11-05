import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import CustomServingRuntimeTableRow from '../CustomServingRuntimeTableRow';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(() => jest.fn()),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../CustomServingRuntimeEnabledToggle', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../CustomServingRuntimeAPIProtocolLabel', () => ({
  __esModule: true,
  default: () => null,
}));

describe('CustomServingRuntimeTableRow', () => {
  const renderRow = (obj = mockServingRuntimeTemplateK8sResource({})) =>
    render(
      <table>
        <tbody>
          <CustomServingRuntimeTableRow obj={obj} rowIndex={0} onDeleteTemplate={jest.fn()} />
        </tbody>
      </table>,
    );

  it('should show the purple From library label for a catalog-installed runtime', () => {
    const template = mockServingRuntimeTemplateK8sResource({
      annotations: { [MetadataAnnotation.InstalledFromCatalog]: 'true' },
    });

    renderRow(template);

    expect(screen.getByTestId('from-library-label')).toHaveTextContent('From library');
    expect(screen.getByTestId('from-library-label')).toHaveClass('pf-v6-c-label');
  });

  it('should not show From library without the catalog-origin annotation', () => {
    renderRow();

    expect(screen.queryByTestId('from-library-label')).not.toBeInTheDocument();
  });
});
