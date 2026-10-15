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
    jest.clearAllMocks();
    useAppContextMock.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({}),
      storageClasses: [],
      isRHOAI: true,
    });
  });

  it('should show helper text for a deprecated ImageStream', () => {
    const image = mockNotebookImageInfo()[0];
    render(<ImageSelector image={{ ...image, deprecated: true }} handleSelection={jest.fn()} />);

    expect(
      screen.getByText('This image is deprecated and will not receive new version updates.'),
    ).toBeInTheDocument();
  });

  it('should not show helper text for an active ImageStream', () => {
    const image = mockNotebookImageInfo()[0];
    render(<ImageSelector image={image} handleSelection={jest.fn()} />);

    expect(
      screen.queryByText('This image is deprecated and will not receive new version updates.'),
    ).not.toBeInTheDocument();
  });
});
