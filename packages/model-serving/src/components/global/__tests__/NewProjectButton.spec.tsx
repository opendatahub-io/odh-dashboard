import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockCreateProject = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useHostApi: jest.fn(() => ({
    createProject: mockCreateProject,
  })),
  useTrackEvent: jest.fn(() => mockTrackEvent),
}));

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
}));

import NewProjectButton from '../NewProjectButton';

describe('NewProjectButton', () => {
  let resolveCreate: (value: string) => void = () => undefined;
  let rejectCreate: (reason: Error) => void = () => undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProject.mockImplementation(
      () =>
        new Promise<string>((resolve, reject) => {
          resolveCreate = resolve;
          rejectCreate = reject;
        }),
    );
  });

  it('should render the Create project button', () => {
    render(<NewProjectButton />);
    expect(screen.getByTestId('create-project')).toBeInTheDocument();
  });

  it('should open the modal when clicking Create project', () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));
    expect(screen.getByTestId('generic-modal-header')).toHaveTextContent('Create project');
    expect(screen.getByTestId('create-project-name')).toBeInTheDocument();
  });

  it('should close the modal when clicking Cancel', () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('create-project-name')).not.toBeInTheDocument();
  });

  it('should submit the form with trimmed name', async () => {
    mockCreateProject.mockResolvedValue('test-project');
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: '  My Project  ' },
    });
    fireEvent.change(screen.getByTestId('create-project-description'), {
      target: { value: 'A description' },
    });
    fireEvent.click(screen.getByTestId('create-project-submit'));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith('My Project', 'A description');
    });
  });

  it('should call onProjectCreated on success', async () => {
    const onProjectCreated = jest.fn();
    render(<NewProjectButton onProjectCreated={onProjectCreated} />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: 'My Project' },
    });
    fireEvent.click(screen.getByTestId('create-project-submit'));

    await waitFor(() => {
      resolveCreate('my-project');
    });

    await waitFor(() => {
      expect(onProjectCreated).toHaveBeenCalledWith('my-project');
    });
  });

  it('should display error on failure', async () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: 'My Project' },
    });
    fireEvent.click(screen.getByTestId('create-project-submit'));

    await waitFor(() => {
      rejectCreate(new Error('Namespace already exists'));
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to create project')).toBeInTheDocument();
    });
  });

  it('should reset form on cancel', () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: 'My Project' },
    });
    fireEvent.click(screen.getByText('Cancel'));

    fireEvent.click(screen.getByTestId('create-project'));
    expect(screen.getByTestId('create-project-name')).toHaveValue('');
  });

  it('should disable submit when name is empty or whitespace', () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));
    expect(screen.getByTestId('create-project-submit')).toBeDisabled();

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: '   ' },
    });
    expect(screen.getByTestId('create-project-submit')).toBeDisabled();
  });

  it('should not submit when Enter is pressed with whitespace-only name', () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: '   ' },
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test: form always exists inside modal
    const form = screen.getByTestId('create-project-name').closest('form')!;
    fireEvent.submit(form);

    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('should block cancel while submitting', async () => {
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: 'My Project' },
    });
    fireEvent.click(screen.getByTestId('create-project-submit'));

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByTestId('create-project-name')).toBeInTheDocument();

    resolveCreate('my-project');
    await waitFor(() => {
      expect(screen.queryByTestId('create-project-name')).not.toBeInTheDocument();
    });
  });

  it('should track events on cancel and submit', async () => {
    mockCreateProject.mockResolvedValue('test-project');
    render(<NewProjectButton />);
    fireEvent.click(screen.getByTestId('create-project'));

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockTrackEvent).toHaveBeenCalledWith('create_project_canceled', {});

    fireEvent.click(screen.getByTestId('create-project'));
    fireEvent.change(screen.getByTestId('create-project-name'), {
      target: { value: 'My Project' },
    });
    fireEvent.click(screen.getByTestId('create-project-submit'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('create_project_submitted', {
        outcome: 'success',
      });
    });
  });
});
