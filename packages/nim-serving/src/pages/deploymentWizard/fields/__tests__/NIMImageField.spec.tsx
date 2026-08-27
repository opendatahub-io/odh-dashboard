import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { NIMAccountStatus } from '../../../../api/accounts/hooks';
import type { NIMImageFieldExternalData } from '../NIMImageField';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useAccessReview: jest.fn(),
}));

const mockUseAccessReview = jest.mocked(useAccessReview);

describe('NIMImageFieldComponent', () => {
  const mockOnChange = jest.fn();

  const renderComponent = (props?: {
    value?: { repository: string; tag: string };
    isEditing?: boolean;
    externalData?: {
      data: NIMImageFieldExternalData;
      loaded: boolean;
      loadError?: Error;
    };
  }) => {
    // Dynamic import to pick up mocks
    const NIMImageFieldModule = require('../NIMImageField');
    const NIMImageFieldComponent = NIMImageFieldModule.NIMImageFieldWizardField
      .component as React.FC<{
      value?: { repository: string; tag: string };
      onChange: (value: { repository: string; tag: string }) => void;
      externalData?: { data: NIMImageFieldExternalData; loaded: boolean; loadError?: Error };
      isEditing?: boolean;
    }>;

    return render(
      <MemoryRouter>
        <NIMImageFieldComponent
          value={props?.value ?? { repository: '', tag: '' }}
          onChange={mockOnChange}
          externalData={props?.externalData}
          isEditing={props?.isEditing}
        />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessReview.mockReturnValue([true, true]);
  });

  it('should show info alert when no project is selected', () => {
    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [] },
          accountStatus: NIMAccountStatus.NOT_FOUND,
        },
        loaded: true,
      },
    });

    expect(screen.getByText('Select a project to load available NIM images.')).toBeInTheDocument();
    expect(screen.getByText('No project selected')).toBeInTheDocument();
  });

  it('should show "no key configured" error with settings link for admin users', () => {
    mockUseAccessReview.mockReturnValue([true, true]);

    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.NOT_FOUND,
        },
        loaded: true,
      },
    });

    expect(
      screen.getByText('No NVIDIA NIM key has been configured for this project.', { exact: false }),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Configure in project settings' });
    expect(link).toHaveAttribute('href', expect.stringContaining('/projects/test-project'));
  });

  it('should show "no key configured" error with ask-admin text for non-admin users', () => {
    mockUseAccessReview.mockReturnValue([false, true]);

    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.NOT_FOUND,
        },
        loaded: true,
      },
    });

    expect(
      screen.getByText('No NVIDIA NIM key has been configured for this project.', { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ask your project administrator to configure NVIDIA NIM.', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Configure in project settings' }),
    ).not.toBeInTheDocument();
  });

  it('should show "invalid key" error with settings link for admin users', () => {
    mockUseAccessReview.mockReturnValue([true, true]);

    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.ERROR,
        },
        loaded: true,
      },
    });

    expect(
      screen.getByText('The NVIDIA NIM key for this project is invalid and needs to be replaced.', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configure in project settings' })).toBeInTheDocument();
  });

  it('should show "invalid key" error with ask-admin text for non-admin users', () => {
    mockUseAccessReview.mockReturnValue([false, true]);

    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.ERROR,
        },
        loaded: true,
      },
    });

    expect(
      screen.getByText('The NVIDIA NIM key for this project is invalid and needs to be replaced.', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ask your project administrator to configure NVIDIA NIM.', {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('should show spinner while RBAC check is loading', () => {
    mockUseAccessReview.mockReturnValue([false, false]);

    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.NOT_FOUND,
        },
        loaded: true,
      },
    });

    expect(
      screen.getByText('No NVIDIA NIM key has been configured for this project.', { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show skeleton while account status and images are loading', () => {
    renderComponent({
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.LOADING,
        },
        loaded: false,
      },
    });

    expect(screen.getByText('NIM image')).toBeInTheDocument();
    expect(
      screen.queryByText('No NVIDIA NIM key has been configured', { exact: false }),
    ).not.toBeInTheDocument();
  });

  const configuredExternalData = {
    data: {
      nimImages: {
        images: [
          {
            name: 'test-model',
            displayName: 'Test Model',
            namespace: 'nim/test',
            tags: ['1.0.0'],
          },
        ],
        projectName: 'test-project',
      },
      accountStatus: NIMAccountStatus.READY,
    },
    loaded: true,
  };

  it('should show typeahead selector when NIM is configured with models', () => {
    renderComponent({
      externalData: {
        data: {
          nimImages: {
            images: [
              {
                name: 'test-model',
                displayName: 'Test Model',
                namespace: 'nim/test',
                tags: ['1.0.0', '2.0.0'],
              },
            ],
            projectName: 'test-project',
          },
          accountStatus: NIMAccountStatus.READY,
        },
        loaded: true,
      },
    });

    expect(
      screen.queryByText('No NVIDIA NIM key has been configured', { exact: false }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('The NVIDIA NIM key for this project is invalid', { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('NIM image')).toBeInTheDocument();
  });

  it('should not unlock image selection while the catalog is still empty on load', () => {
    renderComponent({
      isEditing: true,
      value: { repository: 'nvcr.io/nim/test/test-model', tag: '1.0.0' },
      externalData: {
        data: {
          nimImages: { images: [], projectName: 'test-project' },
          accountStatus: NIMAccountStatus.READY,
        },
        loaded: true,
      },
    });

    expect(screen.queryByRole('button', { name: 'Clear input value' })).not.toBeInTheDocument();
  });

  it('should disable image selection when editing with a valid image', () => {
    renderComponent({
      isEditing: true,
      value: { repository: 'nvcr.io/nim/test/test-model', tag: '1.0.0' },
      externalData: configuredExternalData,
    });

    expect(screen.queryByTestId('nim-image-not-found-warning')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear input value' })).not.toBeInTheDocument();
  });

  it('should allow image selection when editing with a missing image', () => {
    renderComponent({
      isEditing: true,
      value: { repository: '', tag: '' },
      externalData: configuredExternalData,
    });

    expect(screen.getByPlaceholderText('Select NVIDIA NIM image')).toBeInTheDocument();
  });

  it('should allow image selection when editing with an image not found in the catalog', () => {
    renderComponent({
      isEditing: true,
      value: { repository: 'nvcr.io/nim/test/legacy-model', tag: '9.9.9' },
      externalData: configuredExternalData,
    });

    expect(screen.getByPlaceholderText('Select NVIDIA NIM image')).toBeInTheDocument();
    expect(screen.getByTestId('nim-image-not-found-warning')).toBeInTheDocument();
  });

  it('should reset reselection unlock when the edit project context changes', () => {
    const NIMImageFieldModule = require('../NIMImageField');
    const NIMImageFieldComponent = NIMImageFieldModule.NIMImageFieldWizardField
      .component as React.FC<{
      value?: { repository: string; tag: string };
      onChange: (value: { repository: string; tag: string }) => void;
      externalData?: { data: NIMImageFieldExternalData; loaded: boolean; loadError?: Error };
      isEditing?: boolean;
    }>;

    const { rerender } = render(
      <MemoryRouter>
        <NIMImageFieldComponent
          value={{ repository: 'nvcr.io/nim/test/legacy-model', tag: '9.9.9' }}
          onChange={mockOnChange}
          externalData={configuredExternalData}
          isEditing
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Clear input value' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <NIMImageFieldComponent
          value={{ repository: 'nvcr.io/nim/test/test-model', tag: '1.0.0' }}
          onChange={mockOnChange}
          externalData={{
            ...configuredExternalData,
            data: {
              ...configuredExternalData.data,
              nimImages: {
                ...configuredExternalData.data.nimImages,
                projectName: 'another-project',
              },
            },
          }}
          isEditing
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Clear input value' })).not.toBeInTheDocument();
  });
});
