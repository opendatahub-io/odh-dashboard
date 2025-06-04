import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { Deployment, type DeploymentStatus } from '../../../../extension-points';
import { DeploymentRow } from '../DeploymentsTableRow';

const mockDeployment = ({ status }: { status?: DeploymentStatus }): Deployment => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
    },
  },
  status,
});

describe('DeploymentsTableRow', () => {
  let onDelete: jest.Mock;

  beforeEach(() => {
    onDelete = jest.fn();
  });

  it('should render the basic row', async () => {
    render(
      <table>
        <tbody>
          <DeploymentRow deployment={mockDeployment({})} platformColumns={[]} onDelete={onDelete} />
        </tbody>
      </table>,
    );

    expect(screen.getByRole('cell', { name: 'test-deployment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More info' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'warning status' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kebab toggle' }));
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('should render the row with a status', () => {
    render(
      <table>
        <tbody>
          <DeploymentRow
            deployment={mockDeployment({
              status: { state: InferenceServiceModelState.LOADED },
            })}
            platformColumns={[]}
            onDelete={onDelete}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByRole('button', { name: 'success status' })).toBeInTheDocument();
  });
});
