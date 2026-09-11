import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useThemeContext } from 'mod-arch-kubeflow';
import { mockCatalogModel } from '~/__mocks__';
import ModelGatedAccessRequiredView from '~/app/pages/modelCatalog/screens/ModelGatedAccessRequiredView';
import { AdminStatusProvider } from '~/odh/context/AdminStatusContext';

jest.mock('mod-arch-kubeflow', () => ({
  useThemeContext: jest.fn(),
}));

jest.mock('mod-arch-shared', () => ({
  KubeflowDocs: () => <div data-testid="kubeflow-docs" />,
  WhosMyAdministrator: ({ linkTestId }: { linkTestId?: string }) => (
    <button type="button" data-testid={linkTestId}>
      Who&apos;s my administrator?
    </button>
  ),
}));

jest.mock('~/app/pages/modelCatalog/utils/modelCatalogUtils', () => ({
  getHuggingFaceModelUrl: () => 'https://huggingface.co/meta-llama/test-model',
}));

const mockModel = mockCatalogModel({ name: 'meta-llama/test-model' });

const renderView = ({
  isAdmin,
  loaded = true,
  hfUsername,
}: {
  isAdmin: boolean;
  loaded?: boolean;
  hfUsername?: string;
}) =>
  render(
    <AdminStatusProvider
      isAdmin={isAdmin}
      loaded={loaded}
      settingsUrl="/settings"
      settingsTitle="Settings"
    >
      <ModelGatedAccessRequiredView model={mockModel} hfUsername={hfUsername} />
    </AdminStatusProvider>,
  );

describe('ModelGatedAccessRequiredView', () => {
  beforeEach(() => {
    (useThemeContext as jest.Mock).mockReturnValue({ isMUITheme: false });
  });

  it('shows non-admin guidance with Who is my administrator link', () => {
    renderView({ isAdmin: false });

    expect(
      screen.getByText(
        'You do not have access to this model, so it cannot be deployed or registered. To request access, contact your administrator.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('whos-my-admin-link')).toBeInTheDocument();
    expect(screen.queryByTestId('model-gated-access-request-link')).not.toBeInTheDocument();
  });

  it('shows admin guidance with Hugging Face username and request link', () => {
    renderView({ isAdmin: true, hfUsername: 'johndoe' });

    expect(screen.getByText(/Log in to the Hugging Face account/)).toBeInTheDocument();
    expect(screen.getByText('johndoe')).toBeInTheDocument();
    expect(screen.getByTestId('model-gated-access-request-link')).toBeInTheDocument();
    expect(screen.queryByTestId('whos-my-admin-link')).not.toBeInTheDocument();
  });

  it('shows Kubeflow docs for non-admin users in MUI theme', () => {
    (useThemeContext as jest.Mock).mockReturnValue({ isMUITheme: true });
    renderView({ isAdmin: false });

    expect(screen.getByTestId('kubeflow-docs')).toBeInTheDocument();
    expect(screen.queryByTestId('whos-my-admin-link')).not.toBeInTheDocument();
  });
});
