import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const expectedLabels = ['Image 1Community', 'Image 0Custom', 'Image 2Secure', 'Image 3Unknown'];

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
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Image 1');
    fireEvent.click(input);

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Community',
      'Custom',
      'Secure',
      'Unknown',
    ]);
    screen.getAllByRole('option').forEach((option, index) => {
      expect(option).toHaveTextContent(expectedLabels[index]);
    });
    expect(screen.getAllByRole('option')).toHaveLength(4);
    fireEvent.click(within(screen.getByTestId('image-3')).getByRole('option'));
    expect(onSelect).toHaveBeenCalledWith(images[3]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'should filter by display name, resource name, and tier with project-scoped mode %s',
    async (projectScoped) => {
      const user = userEvent.setup();
      mockUseIsAreaAvailable.mockReturnValue({
        ...mockUseIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED),
        status: projectScoped,
      });
      const images = createImages();
      const onSelect = jest.fn();
      render(
        <ImageStreamSelector
          imageStreams={images}
          currentProjectStreams={createImages('project')}
          currentProject="project"
          selectedImageStream={images[1]}
          buildStatuses={[]}
          onImageStreamSelect={onSelect}
        />,
      );
      await user.click(
        projectScoped
          ? screen.getByTestId('image-stream-selector-toggle')
          : screen.getByRole('combobox'),
      );
      const input = screen.getByRole(projectScoped ? 'textbox' : 'combobox');
      expect(input).toHaveFocus();
      const role = projectScoped ? 'menuitem' : 'option';
      [' IMAGE 2 ', 'SECURE', 'image-2'].forEach((search) => {
        fireEvent.change(input, { target: { value: search } });
        const matches = screen.getAllByRole(role);
        expect(matches).toHaveLength(projectScoped ? 2 : 1);
        matches.forEach((item) => expect(item).toHaveTextContent('Image 2Secure'));
      });
      fireEvent.change(input, { target: { value: 'no matches' } });
      const noResults = screen.getByRole(role, { name: /No results found/ });
      if (projectScoped) {
        expect(noResults).toBeDisabled();
      } else {
        expect(noResults).toHaveAttribute('aria-disabled', 'true');
      }
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getAllByRole(role)).toHaveLength(projectScoped ? 8 : 4);
      expect(onSelect).not.toHaveBeenCalled();
    },
  );

  it('should filter and select with the typeahead keyboard controls', async () => {
    const user = userEvent.setup();
    const images = createImages();
    const onSelect = jest.fn();
    render(
      <ImageStreamSelector
        imageStreams={images}
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('secure');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(images[2]);
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
    fireEvent.click(screen.getByRole('combobox'));
    const unavailable = within(screen.getByTestId('image-2')).getByRole('option');
    expect(unavailable).toBeDisabled();
    expect(unavailable).toHaveTextContent('Secure');
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
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
    rerender(
      <ImageStreamSelector
        imageStreams={[image]}
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
      />,
    );
    expect(onSelect).toHaveBeenCalledWith(image);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('should support typing immediately and keyboard selection in the project-scoped dropdown', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      ...mockUseIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED),
      status: true,
    });
    const user = userEvent.setup();
    const projectImages = createImages('project');
    const onSelect = jest.fn();
    render(
      <ImageStreamSelector
        imageStreams={createImages()}
        currentProjectStreams={projectImages}
        currentProject="project"
        buildStatuses={[]}
        onImageStreamSelect={onSelect}
      />,
    );
    await user.click(screen.getByTestId('image-stream-selector-toggle'));
    await user.keyboard('secure{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(projectImages[2]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId('image-stream-selector-toggle'));
    expect(screen.getByRole('textbox', { name: 'Filter content' })).toHaveFocus();
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
