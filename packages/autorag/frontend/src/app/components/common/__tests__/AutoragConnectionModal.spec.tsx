import { mockConnectionTypeConfigMapObj } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import * as secretsApi from '@odh-dashboard/internal/api/k8s/secrets';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import AutoragConnectionModal from '~/app/components/common/AutoragConnectionModal';
import * as tracking from '~/app/utilities/tracking';

const TEST_PROJECT = 'my-project';

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({
  createSecret: jest.fn(),
}));

jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual('~/app/utilities/tracking'),
  fireAutoragS3ConnectionCreated: jest.fn(),
}));

const createSecretMock = jest.mocked(secretsApi.createSecret);
const fireAutoragS3ConnectionCreatedMock = jest.mocked(tracking.fireAutoragS3ConnectionCreated);

describe('AutoragConnectionModal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should preselect connection type if only one', () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'Short text',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('combobox')).toHaveValue('the only type');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Add a connection' })).toBeInTheDocument();
  });

  it('should list connection types and select one', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'type one',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 1',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type two',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 2',
                envVar: 'env2',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type three disabled',
            enabled: false,
            fields: [
              {
                type: 'short-text',
                name: 'Short text 2',
                envVar: 'env2',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    expect(screen.getByRole('option', { name: /type one/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /type two/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /type three disabled/ })).toBeFalsy();

    await act(async () => {
      screen.getByRole('option', { name: /type one/ }).click();
    });
    expect(screen.getByRole('combobox')).toHaveValue('type one');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toBeVisible();
  });

  it('should enable Add connection button when required fields filled and all valid', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                required: true,
                properties: {},
              },
              {
                type: 'text',
                name: 'text 2',
                envVar: 'env2',
                required: true,
                properties: {},
              },
              {
                type: 'boolean',
                name: 'boolean 3',
                envVar: 'env3',
                required: true,
                properties: {},
              },
              {
                type: 'dropdown',
                name: 'dropdown 4',
                envVar: 'env4',
                required: true,
                properties: {
                  items: [{ label: 'a', value: 'a' }],
                },
              },
            ],
          }),
        ]}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'a' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'short text 1' }), {
        target: { value: 'b' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'text 2' }), {
        target: { value: 'c' },
      });
      screen.getByRole('button', { name: 'dropdown 4' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /Value: a/ }).click();
    });

    expect(addButton).toBeEnabled();
    await act(async () => {
      addButton.click();
    });
    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should enable Add connection once field validations are valid', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
              {
                type: 'uri',
                name: 'uri 2',
                envVar: 'env2',
                properties: {},
              },
              {
                type: 'numeric',
                name: 'numeric 3',
                envVar: 'env3',
                properties: { min: 0 },
              },
            ],
          }),
        ]}
      />,
    );

    const connectionName = screen.getByRole('textbox', { name: 'Connection name' });
    const uri = screen.getByRole('textbox', { name: 'uri 2' });
    const addButton = screen.getByRole('button', { name: 'Add connection' });

    await act(async () => {
      fireEvent.change(connectionName, {
        target: { value: 'name entry' },
      });
    });
    expect(addButton).toBeEnabled();

    await act(async () => {
      fireEvent.change(uri, {
        target: { value: 'invalid uri' },
      });
      fireEvent.blur(uri);
    });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(uri, {
        target: { value: 'http://localhost' },
      });
      fireEvent.blur(uri);
    });
    expect(addButton).toBeEnabled();

    await act(async () => {
      addButton.click();
    });
    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should clear type-specific values and preserve name/description when switching types', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'type one',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 1',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type two',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 2',
                envVar: 'env2',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /type one/ }).click();
    });
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'connection one name' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection description' }), {
        target: { value: 'connection one desc' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Short text 1' }), {
        target: { value: 'one field' },
      });
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toHaveValue('one field');

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      const optionTwo = await screen.findByRole('option', { name: /type two/ });
      optionTwo.click();
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 2' })).toHaveValue('');
  });

  it('should call onClose when cancel is clicked', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [],
          }),
        ]}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await act(async () => {
      fireEvent.click(cancelButton);
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should not call onClose with true when createSecret rejects', async () => {
    createSecretMock.mockRejectedValueOnce(
      new Error('AWS_SECRET_ACCESS_KEY=super-secret-value; endpoint=internal-proxy.svc:8443'),
    );

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    await act(async () => {
      addButton.click();
    });

    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
    // Analytics must only ever see the fixed, allowlisted failure category — never the raw
    // Error.message, which may contain credentials, tenant identifiers, or internal endpoints.
    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledTimes(1);
    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: tracking.AUTORAG_FAILURE_CATEGORY }),
    );
    const allCallArgs = JSON.stringify(fireAutoragS3ConnectionCreatedMock.mock.calls);
    expect(allCallArgs).not.toContain('super-secret-value');
    expect(allCallArgs).not.toContain('internal-proxy.svc');

    // The raw backend error must never be rendered to the user either — only the fixed,
    // user-facing message.
    expect(screen.queryByText(/super-secret-value/)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal-proxy\.svc/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Failed to create the S3 connection. Please check your connection details and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('should not re-create the Secret when retrying submit after onSubmit rejects', async () => {
    onSubmitMock.mockRejectedValueOnce(new Error('onSubmit error'));

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    await act(async () => {
      addButton.click();
    });

    expect(
      await screen.findByText(
        'The connection was created, but AutoRAG could not select it. Retry saving it.',
      ),
    ).toBeInTheDocument();
    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(onSubmitMock).toHaveBeenCalledTimes(1);

    // Retry: the Secret already exists from the first attempt, so createSecret must not be
    // called again — only onSubmit is retried.
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => expect(onCloseMock).toHaveBeenCalledWith(true));

    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(onSubmitMock).toHaveBeenCalledTimes(2);
    // Only the original creation success should have ever been reported — the retry must not
    // emit a second, duplicate submit-success event.
    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledTimes(1);
    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: tracking.TrackingOutcome.submit, success: true }),
    );
  });

  it('should lock all fields once the Secret has been created, so a retry cannot submit edited values', async () => {
    onSubmitMock.mockRejectedValueOnce(new Error('onSubmit error'));

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    await act(async () => {
      addButton.click();
    });

    expect(
      await screen.findByText(
        'The connection was created, but AutoRAG could not select it. Retry saving it.',
      ),
    ).toBeInTheDocument();
    expect(createSecretMock).toHaveBeenCalledTimes(1);

    // The Secret already exists — every field must now be locked so a user can't change the
    // connection type, name/description, or values before retrying, which would otherwise
    // silently be discarded (the retry always resubmits the already-created connection).
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'short text 1' })).toBeDisabled();
    expect(screen.getByTestId('connection-locked-for-retry-alert')).toBeInTheDocument();

    // The retry itself must still be possible.
    const addButtonAfterFailure = screen.getByRole('button', { name: 'Add connection' });
    expect(addButtonAfterFailure).toBeEnabled();
    await act(async () => {
      addButtonAfterFailure.click();
    });

    await waitFor(() => expect(onCloseMock).toHaveBeenCalledWith(true));
    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(onSubmitMock).toHaveBeenCalledTimes(2);
    // The connection resubmitted on retry must be the one whose Secret actually exists — the
    // (blocked) name field is still 'my-conn', matching what was actually created.
    expect(onSubmitMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          annotations: expect.objectContaining({
            'openshift.io/display-name': 'my-conn',
          }),
        }),
      }),
    );
  });

  it('should not emit a conflicting cancel event when Cancel is clicked after createSecret rejects', async () => {
    createSecretMock.mockRejectedValueOnce(new Error('boom'));

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalled();
    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledTimes(1);

    // The failure outcome was already reported above. Cancelling now must not emit a second,
    // conflicting cancel event for the same (failed) creation attempt.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).toHaveBeenCalledWith();
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
  });

  it('should fire outcome: submit, success: true when createSecret resolves', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledWith({
      outcome: tracking.TrackingOutcome.submit,
      success: true,
    });
  });

  it('should report success once createSecret resolves, even if onSubmit later rejects', async () => {
    onSubmitMock.mockRejectedValueOnce(new Error('onSubmit error'));

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(
      await screen.findByText(
        'The connection was created, but AutoRAG could not select it. Retry saving it.',
      ),
    ).toBeInTheDocument();

    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    // The Secret was created successfully, so the creation event must report success even
    // though the later onSubmit call failed. It must not be called with success: false.
    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(fireAutoragS3ConnectionCreatedMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
  });

  it('should fire outcome: cancel when Cancel is clicked before creation', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    expect(fireAutoragS3ConnectionCreatedMock).toHaveBeenCalledWith({
      outcome: tracking.TrackingOutcome.cancel,
    });
  });

  it('should not emit a conflicting cancel event when Cancel is clicked after onSubmit rejects', async () => {
    onSubmitMock.mockRejectedValueOnce(new Error('onSubmit error'));

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(
      await screen.findByText(
        'The connection was created, but AutoRAG could not select it. Retry saving it.',
      ),
    ).toBeInTheDocument();
    fireAutoragS3ConnectionCreatedMock.mockClear();

    // The Secret was already reported as created (success: true) above. Cancelling now, after
    // the async onSubmit failed, must not emit a second, conflicting cancel event for the same
    // creation attempt.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    expect(fireAutoragS3ConnectionCreatedMock).not.toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith();
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
  });

  it('should block close attempts (Cancel and Escape) while createSecret is still pending', async () => {
    let resolveCreateSecret: (() => void) | undefined;
    createSecretMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreateSecret = () => resolve({} as Awaited<ReturnType<typeof createSecretMock>>);
      }),
    );

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).not.toHaveBeenCalled();

    // Creation is still pending — a Cancel click must not close the modal or fire a cancel
    // event, since the Secret may still be created out from under a closed modal.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(onCloseMock).not.toHaveBeenCalled();
    expect(fireAutoragS3ConnectionCreatedMock).not.toHaveBeenCalled();

    // Escape must be blocked the same way, since it reaches the same close handler.
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    });
    expect(onCloseMock).not.toHaveBeenCalled();
    expect(fireAutoragS3ConnectionCreatedMock).not.toHaveBeenCalled();

    // Once creation resolves, the normal flow proceeds and the modal is allowed to close.
    await act(async () => {
      resolveCreateSecret?.();
    });
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledWith(true));
  });
});
