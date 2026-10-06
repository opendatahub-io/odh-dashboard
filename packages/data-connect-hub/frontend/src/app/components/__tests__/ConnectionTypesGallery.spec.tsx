import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import ConnectionTypesGallery from '~/app/components/ConnectionTypesGallery';

jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

describe('ConnectionTypesGallery', () => {
  it('should call the custom action with the selected connection type', async () => {
    const user = userEvent.setup();
    const onConnectionTypeClick = jest.fn();
    const connectionType = mockConnectionType({
      resource: { name: 'PostgreSQL connection' },
    });

    render(
      <ConnectionTypesGallery
        connectionTypes={[connectionType]}
        onConnectionTypeClick={onConnectionTypeClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'PostgreSQL connection' }));

    expect(onConnectionTypeClick).toHaveBeenCalledWith(connectionType);
  });

  it('should support selecting and clearing multiple label filters', async () => {
    const user = userEvent.setup();

    render(<ConnectionTypesGallery connectionTypes={[]} onConnectionTypeClick={jest.fn()} />);

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    const labelsFilterOption = screen.getByTestId('connection-types-gallery-dropdown-labels');
    await user.click(labelsFilterOption.querySelector('button') ?? labelsFilterOption);
    await user.click(screen.getByTestId('connection-types-gallery-labels-dropdown'));
    const firstLabelOption = screen.getByTestId('connection-types-gallery-labels-label-01');
    const secondLabelOption = screen.getByTestId('connection-types-gallery-labels-label-02');
    await user.click(firstLabelOption.querySelector('label') ?? firstLabelOption);
    await user.click(secondLabelOption.querySelector('label') ?? secondLabelOption);

    const labelsToggle = screen.getByTestId('connection-types-gallery-labels-dropdown');
    expect(labelsToggle.textContent).toContain('2');

    await user.click(labelsToggle);

    const toolbar = screen.getByTestId('connection-types-gallery-toolbar');
    expect(toolbar.querySelectorAll('.pf-v6-c-label')).toHaveLength(2);
    expect(toolbar.textContent).toContain('Label 01');
    expect(toolbar.textContent).toContain('Label 02');

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(labelsToggle.textContent).not.toContain('2');
    expect(toolbar.querySelectorAll('.pf-v6-c-label')).toHaveLength(0);
  });
});
