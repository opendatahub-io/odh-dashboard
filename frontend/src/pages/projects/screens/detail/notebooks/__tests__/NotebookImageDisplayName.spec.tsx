import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockNotebookState } from '#~/__mocks__/mockNotebookState';
import { ImageStreamAnnotation } from '#~/types';
import { NotebookImageDisplayName } from '#~/pages/projects/screens/detail/notebooks/NotebookImageDisplayName';
import {
  NotebookImageAvailability,
  NotebookImageStatus,
} from '#~/pages/projects/screens/detail/notebooks/const';
import { NotebookImage } from '#~/pages/projects/screens/detail/notebooks/types';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(() => ({ status: false })),
}));

const renderNotebookImageDisplayName = (
  imageStatus: NotebookImageStatus,
  isImageStreamDeprecated: boolean,
) => {
  const notebook = mockNotebookK8sResource({});
  const imageStream = mockImageStreamK8sResource({
    opts: {
      metadata: {
        annotations: {
          [ImageStreamAnnotation.DEPRECATED]: isImageStreamDeprecated ? 'true' : 'false',
        },
      },
    },
  });
  const imageVersion = imageStream.spec.tags?.[0];
  if (!imageVersion) {
    throw new Error('Expected the mock ImageStream to include an image version');
  }
  const notebookImage: NotebookImage = {
    imageAvailability: NotebookImageAvailability.ENABLED,
    imageDisplayName: 'Test Image',
    tagSoftware: 'Python v3.12',
    dependencies: [],
    imageStream,
    imageVersion,
    latestImageVersion: imageVersion,
    imageStatus,
  };

  render(
    <MemoryRouter>
      <NotebookImageDisplayName
        notebook={notebook}
        notebookImage={notebookImage}
        notebookState={mockNotebookState(notebook)}
        loaded
        updateImageHref="/edit"
        onUpdateImageClick={jest.fn()}
        isUpdating={false}
        setIsUpdating={jest.fn()}
      />
    </MemoryRouter>,
  );
};

describe('NotebookImageDisplayName', () => {
  it('should describe ImageStream deprecation without offering a same-version update', async () => {
    const user = userEvent.setup();
    renderNotebookImageDisplayName(NotebookImageStatus.LATEST, true);

    const statusLabel = screen.getByTestId('notebook-image-availability');
    expect(statusLabel).toHaveTextContent('Deprecated');
    await user.click(statusLabel);

    expect(
      await screen.findByText(
        'This image is deprecated. Select a different workbench image to keep receiving updates.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('update-latest-version-button')).not.toBeInTheDocument();
  });

  it('should retain the update action for a deprecated image version', async () => {
    const user = userEvent.setup();
    renderNotebookImageDisplayName(NotebookImageStatus.DEPRECATED, false);

    await user.click(screen.getByTestId('notebook-image-availability'));

    expect(
      await screen.findByText(
        'This image version is deprecated. This workbench can continue using this version, but the workbench will not receive new version updates.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('update-latest-version-button')).toBeInTheDocument();
  });
});
