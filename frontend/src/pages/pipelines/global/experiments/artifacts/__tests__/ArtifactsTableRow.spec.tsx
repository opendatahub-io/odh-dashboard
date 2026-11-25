/* eslint-disable camelcase */
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import ArtifactsTableRow from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsTableRow';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(() => ({ status: true })),
}));
jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({ namespace: 'test-ns' })),
}));

describe('ArtifactsTableRow', () => {
  it('should link using a string artifact ID and display URI and registered metadata', () => {
    render(
      <BrowserRouter>
        <table>
          <tbody>
            <ArtifactsTableRow
              artifact={{
                artifact_id: 'uuid-1',
                name: 'trained model',
                type: PipelineArtifactTypeKF.MODEL,
                uri: 's3://test-uri',
                metadata: {
                  registeredModelName: 'model',
                  registeredModelId: 'model-1',
                  modelVersionId: 'version-1',
                  modelRegistryName: 'registry-a',
                },
              }}
            />
          </tbody>
        </table>
      </BrowserRouter>,
    );
    expect(screen.getByRole('link', { name: 'trained model' })).toHaveAttribute(
      'href',
      '/develop-train/pipelines/artifacts/test-ns/uuid-1',
    );
    expect(screen.getByTestId('model-registered-label')).toHaveTextContent('Registered');
    expect(screen.getByText('s3://test-uri')).toBeInTheDocument();
  });

  it('should omit the registered label when the metadata cannot form a model link', () => {
    render(
      <BrowserRouter>
        <table>
          <tbody>
            <ArtifactsTableRow
              artifact={{
                artifact_id: 'uuid-2',
                name: 'model output',
                type: PipelineArtifactTypeKF.MODEL,
                metadata: { registeredModelName: 'model' },
              }}
            />
          </tbody>
        </table>
      </BrowserRouter>,
    );
    expect(screen.queryByTestId('model-registered-label')).not.toBeInTheDocument();
  });
});
