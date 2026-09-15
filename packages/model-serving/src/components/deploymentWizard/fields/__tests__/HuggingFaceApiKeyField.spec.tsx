import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  HuggingFaceApiKeyField,
  isHuggingFaceApiKeyConfigured,
  isValidHuggingFaceApiKey,
} from '../HuggingFaceApiKeyField';

describe('HuggingFaceApiKeyField validation helpers', () => {
  it('should require a token when required and not configured', () => {
    expect(isValidHuggingFaceApiKey({ token: '' }, true)).toBe(false);
    expect(isValidHuggingFaceApiKey({ token: 'hf_123' }, true)).toBe(true);
  });

  it('should accept configured deployments without a new token', () => {
    expect(isValidHuggingFaceApiKey({ token: '', configuredSecretName: 'hf-secret' }, true)).toBe(
      true,
    );
    expect(isHuggingFaceApiKeyConfigured({ token: '', configuredSecretName: 'hf-secret' })).toBe(
      true,
    );
  });
});

describe('HuggingFaceApiKeyField', () => {
  it('should render gated helper text when requested', () => {
    render(<HuggingFaceApiKeyField data={{ token: '' }} onChange={jest.fn()} isGated />);

    expect(screen.getByTestId('hf-gated-access-alert')).toBeInTheDocument();
    expect(screen.getByText(/gated access on Hugging Face/i)).toBeInTheDocument();
  });

  it('should show configured helper text without exposing the token', () => {
    render(
      <HuggingFaceApiKeyField
        data={{ token: '', configuredSecretName: 'hf-secret' }}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hf-api-key-configured-helper')).toBeInTheDocument();
    expect(screen.getByTestId('hf-api-key-input')).toHaveValue('');
  });

  it('should update token value on input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<HuggingFaceApiKeyField data={{ token: '' }} onChange={onChange} />);

    await user.type(screen.getByTestId('hf-api-key-input'), 'hf_token');

    expect(onChange.mock.calls.map(([value]) => value.token).join('')).toBe('hf_token');
  });
});
