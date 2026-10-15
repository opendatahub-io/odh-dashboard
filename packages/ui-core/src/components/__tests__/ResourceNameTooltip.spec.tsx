import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const mockDescriptionLines = (lines: number) => {
  jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(lines * 20);
  const { getComputedStyle } = window;
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) =>
      Object.assign(getComputedStyle(element), { lineHeight: '20px' }),
    );
};

describe('ResourceNameTooltip', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should show the resource name and type without a description row by default', async () => {
    render(<ResourceNameTooltip resource={resource}>single-gpu</ResourceNameTooltip>);

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));

    expect(await screen.findByTestId('resource-name-text')).toHaveTextContent('single-gpu');
    expect(screen.getByTestId('resource-kind-text')).toHaveTextContent(
      ResourceClaimTemplateModel.kind,
    );
    expect(screen.getByRole('dialog', { name: 'Resource name and type' })).toBeInTheDocument();
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

  it('should not show a toggle for a description within the line limit', async () => {
    mockDescriptionLines(3);
    render(
      <ResourceNameTooltip resource={resource} description="Requests one GPU for the workload.">
        single-gpu
      </ResourceNameTooltip>,
    );

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));

    expect(await screen.findByTestId('resource-description-text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('should expand a description that is longer than the line limit', async () => {
    mockDescriptionLines(4);
    render(
      <ResourceNameTooltip resource={resource} description="Requests one GPU for the workload.">
        single-gpu
      </ResourceNameTooltip>,
    );

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));
    const description = await screen.findByTestId('resource-description-text');
    await userEvent.click(within(description).getByRole('button', { name: 'Show more' }));

    expect(within(description).getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('should use descriptionMaxLines as the line limit', async () => {
    mockDescriptionLines(2);
    render(
      <ResourceNameTooltip
        resource={resource}
        description="Requests one GPU for the workload."
        descriptionMaxLines={1}
      >
        single-gpu
      </ResourceNameTooltip>,
    );

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));

    expect(await screen.findByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('should move focus into the popover by default', async () => {
    render(<ResourceNameTooltip resource={resource}>single-gpu</ResourceNameTooltip>);

    await userEvent.click(screen.getByTestId('resource-name-icon-button'));

    const popover = await screen.findByRole('dialog');
    await waitFor(() => expect(popover).toContainElement(document.activeElement as HTMLElement));
  });

  it('should keep focus on the trigger when withFocusTrap is false', async () => {
    render(
      <ResourceNameTooltip resource={resource} withFocusTrap={false}>
        single-gpu
      </ResourceNameTooltip>,
    );

    const trigger = screen.getByTestId('resource-name-icon-button');
    await userEvent.click(trigger);

    expect(await screen.findByRole('dialog')).not.toContainElement(
      document.activeElement as HTMLElement,
    );
    expect(trigger).toHaveFocus();
  });
});
