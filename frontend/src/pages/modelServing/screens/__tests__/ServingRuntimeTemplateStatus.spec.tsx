import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServingRuntimeTemplateStatus from '#~/pages/modelServing/screens/ServingRuntimeTemplateStatus';

describe('ServingRuntimeTemplateStatus', () => {
  it('should render "Template removed" label', () => {
    render(<ServingRuntimeTemplateStatus />);
    expect(screen.getByTestId('serving-runtime-template-status-label')).toBeVisible();
    expect(screen.getByText('Template removed')).toBeVisible();
  });

  it('should render with warning status styling', () => {
    render(<ServingRuntimeTemplateStatus />);
    const label = screen.getByTestId('serving-runtime-template-status-label');
    expect(label).toHaveClass('pf-m-warning');
  });
});
