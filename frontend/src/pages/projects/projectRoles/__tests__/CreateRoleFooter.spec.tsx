import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateRoleFooter from '#~/pages/projects/projectRoles/CreateRoleFooter';

const renderFooter = (props: Partial<React.ComponentProps<typeof CreateRoleFooter>> = {}) =>
  render(
    <MemoryRouter>
      <CreateRoleFooter
        namespace="test-ns"
        isSubmitDisabled={false}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        {...props}
      />
    </MemoryRouter>,
  );

describe('CreateRoleFooter', () => {
  it('should render Create role button', () => {
    renderFooter();

    expect(screen.getByTestId('create-role-submit')).toHaveTextContent('Create role');
  });

  it('should render Save changes button in edit mode', () => {
    renderFooter({ isEdit: true });

    expect(screen.getByTestId('create-role-submit')).toHaveTextContent('Save changes');
  });

  it('should disable submit button when isSubmitDisabled is true', () => {
    renderFooter({ isSubmitDisabled: true });

    expect(screen.getByTestId('create-role-submit')).toBeDisabled();
  });

  it('should call onSubmit when submit button is clicked', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderFooter({ onSubmit });

    fireEvent.click(screen.getByTestId('create-role-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error alert when submitError is set', () => {
    renderFooter({ submitError: new Error('Something went wrong') });

    expect(screen.getByTestId('create-role-error-alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should not show error alert when submitError is undefined', () => {
    renderFooter();

    expect(screen.queryByTestId('create-role-error-alert')).not.toBeInTheDocument();
  });

  it('should show creating error title for create mode', () => {
    renderFooter({ submitError: new Error('fail') });

    expect(screen.getByText('Error creating role')).toBeInTheDocument();
  });

  it('should show updating error title for edit mode', () => {
    renderFooter({ isEdit: true, submitError: new Error('fail') });

    expect(screen.getByText('Error updating role')).toBeInTheDocument();
  });

  it('should disable buttons while submitting', async () => {
    let resolvePromise: () => void = () => undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
    );
    renderFooter({ onSubmit });

    fireEvent.click(screen.getByTestId('create-role-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('create-role-submit')).toBeDisabled();
      expect(screen.getByTestId('create-role-cancel')).toBeDisabled();
    });

    resolvePromise();

    await waitFor(() => {
      expect(screen.getByTestId('create-role-submit')).not.toBeDisabled();
    });
  });

  it('should re-enable submit button after onSubmit rejects', async () => {
    let rejectPromise: (reason?: unknown) => void = () => undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectPromise = reject;
        }),
    );
    renderFooter({ onSubmit });

    fireEvent.click(screen.getByTestId('create-role-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('create-role-submit')).toBeDisabled();
    });

    rejectPromise(new Error('API error'));

    await waitFor(() => {
      expect(screen.getByTestId('create-role-submit')).not.toBeDisabled();
    });
  });
});
