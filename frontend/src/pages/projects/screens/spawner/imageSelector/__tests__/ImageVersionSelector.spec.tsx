import * as React from 'react';
import { render, screen } from '@testing-library/react';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { ImageStreamAnnotation, ImageStreamSpecTagAnnotation } from '#~/types';
import ImageVersionSelector from '#~/pages/projects/screens/spawner/imageSelector/ImageVersionSelector';

jest.mock('@odh-dashboard/ui-core/components/SimpleSelect', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../ImageVersionTooltip', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => children,
}));

const simpleSelectMock = jest.mocked(SimpleSelect);

const renderImageVersionSelector = (isDeprecated: boolean) => {
  const imageStream = mockImageStreamK8sResource({
    opts: {
      metadata: {
        annotations: isDeprecated ? { [ImageStreamAnnotation.DEPRECATED]: 'true' } : undefined,
      },
      spec: {
        tags: [
          {
            name: '3.6',
            annotations: {
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'true',
            },
          },
          {
            name: '3.5',
            annotations: {
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'false',
            },
          },
        ],
      },
      status: {
        tags: [
          { tag: '3.6', items: [] },
          { tag: '3.5', items: [] },
        ],
      },
    },
  });
  const imageVersions = imageStream.spec.tags ?? [];

  render(
    <ImageVersionSelector
      data={{ imageStream, imageVersions, buildStatuses: [] }}
      selectedImageVersion={imageVersions[0]}
      setSelectedImageVersion={jest.fn()}
    />,
  );
};

describe('ImageVersionSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    simpleSelectMock.mockImplementation(({ options }) => (
      <div>
        {(options ?? []).map(({ key, dropdownLabel }) => (
          <div key={key}>{dropdownLabel}</div>
        ))}
      </div>
    ));
  });

  it('should display Deprecated for every version when the ImageStream is deprecated', () => {
    renderImageVersionSelector(true);

    expect(screen.getAllByTestId('notebook-image-availability')).toHaveLength(2);
    expect(screen.getAllByText('Deprecated')).toHaveLength(2);
    expect(screen.queryByText('Latest')).not.toBeInTheDocument();
  });

  it('should retain the Latest label when the ImageStream deprecation annotation is absent', () => {
    renderImageVersionSelector(false);

    expect(screen.getByTestId('notebook-image-availability')).toHaveTextContent('Latest');
    expect(screen.queryByText('Deprecated')).not.toBeInTheDocument();
  });
});
