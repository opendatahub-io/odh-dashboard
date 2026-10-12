import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { kindApiVersion } from '@odh-dashboard/k8s-core';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import ResourceNameTooltip from '../ResourceNameTooltip';

const resource = {
  apiVersion: kindApiVersion(ResourceClaimTemplateModel),
  kind: ResourceClaimTemplateModel.kind,
  metadata: { name: 'single-gpu' },
};

describe('ResourceNameTooltip', () => {
  it('should show the resource name and type without a description row by default', async () => {
    render(<ResourceNameTooltip resource={resource}>single-gpu</ResourceNameTooltip>);

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));

    expect(await screen.findByTestId('resource-name-text')).toHaveTextContent('single-gpu');
    expect(screen.getByTestId('resource-kind-text')).toHaveTextContent(
      ResourceClaimTemplateModel.kind,
    );
    expect(screen.queryByText('Resource description')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resource-description-text')).not.toBeInTheDocument();
  });

  it('should show the resource description when provided', async () => {
    render(
      <ResourceNameTooltip resource={resource} description="Requests one GPU for the workload.">
        single-gpu
      </ResourceNameTooltip>,
    );

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));

    expect(await screen.findByText('Resource description')).toBeInTheDocument();
    expect(screen.getByTestId('resource-description-text')).toHaveTextContent(
      'Requests one GPU for the workload.',
    );
  });

  it('should show a truncated description in full in a tooltip', async () => {
    const longDescription = 'Requests one partitioned GPU device for the workload. '
      .repeat(10)
      .trim();
    const offsetHeight = jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function getOffsetHeight(this: HTMLElement) {
        return this.childElementCount === 0 ? 100 : 50;
      });
    render(
      <ResourceNameTooltip resource={resource} description={longDescription}>
        single-gpu
      </ResourceNameTooltip>,
    );

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));
    const description = await screen.findByTestId('resource-description-text');
    await userEvent.hover(within(description).getByText(longDescription));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(longDescription);
    offsetHeight.mockRestore();
  });
});
