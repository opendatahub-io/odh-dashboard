import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  HuggingFaceApiKeyField,
  isHuggingFaceApiKeyConfigured,
  requiredHuggingFaceApiKeySchema,
} from '../HuggingFaceApiKeyField';

describe('HuggingFaceApiKeyField validation helpers', () => {
  it('should require a token when required and not configured', () => {
    expect(requiredHuggingFaceApiKeySchema.safeParse({ token: '' }).success).toBe(false);
    expect(requiredHuggingFaceApiKeySchema.safeParse({ token: 'hf_123' }).success).toBe(true);
  });

  it('should accept configured deployments without a new token', () => {
    expect(
      requiredHuggingFaceApiKeySchema.safeParse({
        token: '',
        configuredSecretName: 'hf-secret',
      }).success,
    ).toBe(true);
    expect(isHuggingFaceApiKeyConfigured({ token: '', configuredSecretName: 'hf-secret' })).toBe(
      true,
    );
  });
});

describe('HuggingFaceApiKeyField', () => {
  it('should render alert text when provided', () => {
    render(
      <HuggingFaceApiKeyField
        data={{ token: '' }}
        onChange={jest.fn()}
        alertText="This model requires gated access on Hugging Face."
      />,
    );

    expect(screen.getByTestId('hf-gated-access-alert')).toBeInTheDocument();
    expect(screen.getByText(/gated access on Hugging Face/i)).toBeInTheDocument();
  });

  it('should show configured placeholder without exposing the token', () => {
    render(
      <HuggingFaceApiKeyField
        data={{ token: '', configuredSecretName: 'hf-secret' }}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hf-api-key-configured-helper')).toBeInTheDocument();
    expect(screen.getByTestId('hf-api-key-input')).toHaveValue('*******');
  });

  it('should update token value on input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<HuggingFaceApiKeyField data={{ token: '' }} onChange={onChange} />);

    await user.type(screen.getByTestId('hf-api-key-input'), 'hf_token');

    expect(onChange.mock.calls.map(([value]) => value.token).join('')).toBe('hf_token');
  });
});
