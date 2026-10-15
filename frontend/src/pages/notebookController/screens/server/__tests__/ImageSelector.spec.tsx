import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { useAppContext } from '#~/app/AppContext';
import { mockNotebookImageInfo } from '#~/__mocks__/mockNotebookImageInfo';
import ImageSelector from '#~/pages/notebookController/screens/server/ImageSelector';

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

const useAppContextMock = jest.mocked(useAppContext);

describe('ImageSelector', () => {
  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({}),
      storageClasses: [],
      isRHOAI: true,
    });
  });

  it('shows deprecated helper text only for a deprecated ImageStream', () => {
    const image = mockNotebookImageInfo()[0];
    const { rerender } = render(
      <ImageSelector image={{ ...image, deprecated: true }} handleSelection={jest.fn()} />,
    );

    expect(screen.getByTestId(`deprecated-image-helper-text-${image.name}`)).toHaveTextContent(
      'This image is deprecated and will not receive new version updates.',
    );

    rerender(<ImageSelector image={image} handleSelection={jest.fn()} />);

    expect(
      screen.queryByTestId(`deprecated-image-helper-text-${image.name}`),
    ).not.toBeInTheDocument();
  });
});
