/* eslint-disable camelcase */
import React, { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PipelineVersionToUse } from '#~/concepts/pipelines/content/createRun/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineVersionRadioGroup from '#~/concepts/pipelines/content/createRun/contentSections/PipelineVersionRadioGroup';
import { buildMockPipeline, buildMockPipelineVersion } from '#~/__mocks__';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockPipeline = buildMockPipeline();
const mockLatestVersion = buildMockPipelineVersion({
  pipeline_id: mockPipeline.pipeline_id,
  display_name: 'latest-version',
});
const mockSelectedVersion = buildMockPipelineVersion({
  pipeline_id: mockPipeline.pipeline_id,
  display_name: 'selected-version',
});
const mockOnVersionChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (usePipelinesAPI as jest.Mock).mockReturnValue({
    apiAvailable: true,
    refreshAllAPI: jest.fn(),
  });
});

describe('PipelineVersionRadioGroup', () => {
  it('should render info alert if pipeline is null', () => {
    render(
      <PipelineVersionRadioGroup
        pipeline={null}
        selectedVersion={null}
        latestVersion={null}
        latestVersionLoaded
        versionToUse={PipelineVersionToUse.LATEST}
        onVersionChange={mockOnVersionChange}
      />,
    );
    expect(screen.getByTestId('pipeline-not-selected-alert')).toBeInTheDocument();
  });

  it('should render skeleton while latest version is not loaded', () => {
    render(
      <PipelineVersionRadioGroup
        pipeline={mockPipeline}
        selectedVersion={null}
        latestVersion={null}
        latestVersionLoaded={false}
        versionToUse={PipelineVersionToUse.LATEST}
        onVersionChange={mockOnVersionChange}
      />,
    );
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('should show alert when no versions exist', () => {
    render(
      <PipelineVersionRadioGroup
        pipeline={mockPipeline}
        selectedVersion={null}
        latestVersion={null}
        latestVersionLoaded
        versionToUse={PipelineVersionToUse.LATEST}
        onVersionChange={mockOnVersionChange}
      />,
    );
    expect(screen.getByTestId('no-pipeline-versions-available-alert')).toBeInTheDocument();
    expect(screen.getByTestId('import-pipeline-version-button')).toBeInTheDocument();
  });

  it('should select latest version radio', async () => {
    render(
      <PipelineVersionRadioGroup
        pipeline={mockPipeline}
        selectedVersion={mockSelectedVersion}
        latestVersion={mockLatestVersion}
        latestVersionLoaded
        versionToUse={PipelineVersionToUse.PROVIDED}
        onVersionChange={mockOnVersionChange}
      />,
    );

    act(() => fireEvent.click(screen.getByTestId('use-latest-version-radio')));

    await waitFor(() => {
      expect(mockOnVersionChange).toHaveBeenCalledWith({
        value: mockLatestVersion,
        versionToUse: PipelineVersionToUse.LATEST,
      });
    });
  });

  it('should select fixed version radio', async () => {
    render(
      <PipelineVersionRadioGroup
        pipeline={mockPipeline}
        selectedVersion={mockSelectedVersion}
        latestVersion={mockLatestVersion}
        latestVersionLoaded
        versionToUse={PipelineVersionToUse.LATEST}
        onVersionChange={mockOnVersionChange}
      />,
    );

    act(() => fireEvent.click(screen.getByTestId('use-fixed-version-radio')));

    await waitFor(() => {
      expect(mockOnVersionChange).toHaveBeenCalledWith({
        value: mockSelectedVersion,
        versionToUse: PipelineVersionToUse.PROVIDED,
      });
    });
  });

  it('should show the latest version in the popover when using LATEST', async () => {
    render(
      <PipelineVersionRadioGroup
        pipeline={mockPipeline}
        selectedVersion={mockSelectedVersion}
        latestVersion={mockLatestVersion}
        latestVersionLoaded
        versionToUse={PipelineVersionToUse.LATEST}
        onVersionChange={mockOnVersionChange}
      />,
    );

    act(() => fireEvent.click(screen.getByTestId('view-latest-version-button')));

    await waitFor(() => {
      expect(screen.getByText(mockLatestVersion.display_name)).toBeInTheDocument();
    });
  });
});
