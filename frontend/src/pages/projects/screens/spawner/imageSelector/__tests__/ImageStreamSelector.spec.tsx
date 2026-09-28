import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { ImageStreamAnnotation } from '#~/types';
import ImageStreamSelector from '#~/pages/projects/screens/spawner/imageSelector/ImageStreamSelector';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const createImages = (namespace = 'dashboard') =>
  [undefined, 'community', 'secure', 'unknown'].map((tier, index) =>
    mockImageStreamK8sResource({
      name: `image-${index}`,
      displayName: `Image ${index}`,
      namespace,
      opts: {
        metadata: {
          annotations: {
            [ImageStreamAnnotation.NOTEBOOK_TIER]: tier,
            [ImageStreamAnnotation.RECOMMENDED_ACCELERATORS]: '["example.com/gpu"]',
          },
        },
      },
    }),
  );

const expectedLabels = ['Image 1community', 'Image 0custom', 'Image 2secure', 'Image 3unknown'];

describe('ImageStreamSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });
  });

  it('should group and label all images, keeping unknown tiers selectable', () => {
    const images = createImages();
    const onSelect = jest.fn();
    render(
      <ImageStreamSelector
        imageStreams={images}
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
        selectedImageStream={images[1]}
      />,
    );
    const toggle = screen.getByTestId('workbench-image-stream-selection');
    expect(toggle).toHaveTextContent('Image 1');
    fireEvent.click(toggle);

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'community',
      'custom',
      'secure',
      'unknown',
    ]);
    screen.getAllByRole('option').forEach((option, index) => {
      expect(option).toHaveTextContent(expectedLabels[index]);
    });
    expect(screen.getAllByRole('option')).toHaveLength(4);
    fireEvent.click(within(screen.getByTestId('image-3')).getByRole('option'));
    expect(onSelect).toHaveBeenCalledWith(images[3]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should retain disabled images and hardware compatibility labels', () => {
    const images = createImages();
    images[2].status = { tags: [] };
    const onSelect = jest.fn();
    render(
      <ImageStreamSelector
        imageStreams={images}
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
        compatibleIdentifiers={['example.com/gpu']}
      />,
    );
    fireEvent.click(screen.getByTestId('workbench-image-stream-selection'));
    const unavailable = within(screen.getByTestId('image-2')).getByRole('option');
    expect(unavailable).toBeDisabled();
    expect(unavailable).toHaveTextContent('secure');
    expect(unavailable).toHaveTextContent('hardware profile');
    fireEvent.click(unavailable);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should handle an empty list and preserve automatic single-image selection', () => {
    const image = createImages()[2];
    const onSelect = jest.fn();
    const { rerender } = render(
      <ImageStreamSelector imageStreams={[]} buildStatuses={[]} onImageStreamSelect={onSelect} />,
    );
    expect(screen.getByTestId('workbench-image-stream-selection')).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
    rerender(
      <ImageStreamSelector
        imageStreams={[image]}
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
      />,
    );
    expect(onSelect).toHaveBeenCalledWith(image);
    expect(screen.getByTestId('workbench-image-stream-selection')).toBeDisabled();
  });

  it('should separate tiers within each scope and preserve search and namespace-aware selection', () => {
    mockUseIsAreaAvailable.mockReturnValue({
      ...mockUseIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED),
      status: true,
    });
    const projectImages = createImages('project');
    const onSelect = jest.fn();
    render(
      <ImageStreamSelector
        imageStreams={createImages()}
        currentProjectStreams={projectImages}
        currentProject="project"
        selectedImageStream={projectImages[1]}
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('image-stream-selector-toggle'));
    ['project-scoped-notebook-images', 'global-scoped-notebook-images'].forEach((testId) => {
      const group = within(screen.getByTestId(testId));
      const items = group.getAllByRole('menuitem');
      expect(items).toHaveLength(4);
      items.forEach((item, index) => expect(item).toHaveTextContent(expectedLabels[index]));
      expect(group.getAllByRole('separator')).toHaveLength(3);
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter content' }), {
      target: { value: 'image-3' },
    });
    const projectGroup = within(screen.getByTestId('project-scoped-notebook-images'));
    expect(projectGroup.getAllByRole('menuitem')).toHaveLength(1);
    expect(projectGroup.queryAllByRole('separator')).toHaveLength(0);
    fireEvent.click(projectGroup.getByRole('menuitem'));
    expect(onSelect).toHaveBeenCalledWith(projectImages[3]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
