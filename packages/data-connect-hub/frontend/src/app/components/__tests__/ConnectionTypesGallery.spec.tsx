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
});
