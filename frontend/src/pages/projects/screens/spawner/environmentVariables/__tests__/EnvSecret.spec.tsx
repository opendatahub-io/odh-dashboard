import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { UseExistingSecretsResult } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';
import EnvSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvSecret';
import { SecretCategory } from '#~/pages/projects/types';

const mockExistingSecretsData = (
  overrides: Partial<UseExistingSecretsResult> = {},
): UseExistingSecretsResult => ({
  secrets: [],
  loaded: true,
  canList: true,
  ...overrides,
});

describe('EnvSecret', () => {
  describe('loading state', () => {
    it('should disable the radio while loading', () => {
      render(
        <EnvSecret
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ loaded: false })}
        />,
      );

      expect(screen.getByTestId('env-data-type-radio-existing secret')).toBeDisabled();
    });

    it('should show a tooltip icon while loading', () => {
      render(
        <EnvSecret
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ loaded: false })}
        />,
      );

      expect(screen.getByLabelText('More info')).toBeInTheDocument();
    });
  });

  describe('no permission state', () => {
    it('should disable the radio when user lacks permission', () => {
      render(
        <EnvSecret
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ canList: false })}
        />,
      );

      expect(screen.getByTestId('env-data-type-radio-existing secret')).toBeDisabled();
    });

    it('should show inline message when pre-selected and no permission', () => {
      render(
        <EnvSecret
          env={{ category: SecretCategory.EXISTING, data: [] }}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ canList: false })}
        />,
      );

      expect(screen.getByText("You don't have permission to view secrets.")).toBeInTheDocument();
    });
  });

  describe('fetch error state', () => {
    it('should disable the radio when fetch fails', () => {
      render(
        <EnvSecret
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ error: new Error('Network error') })}
        />,
      );

      expect(screen.getByTestId('env-data-type-radio-existing secret')).toBeDisabled();
    });

    it('should show inline error message when pre-selected and fetch failed', () => {
      render(
        <EnvSecret
          env={{ category: SecretCategory.EXISTING, data: [] }}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ error: new Error('fail') })}
        />,
      );

      expect(
        screen.getByText('Unable to load secrets. Retry or contact your administrator.'),
      ).toBeInTheDocument();
    });
  });

  describe('no secrets state', () => {
    it('should disable the radio when no secrets exist', () => {
      render(
        <EnvSecret
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ secrets: [] })}
        />,
      );

      expect(screen.getByTestId('env-data-type-radio-existing secret')).toBeDisabled();
    });

    it('should show inline message when pre-selected and no secrets', () => {
      render(
        <EnvSecret
          env={{ category: SecretCategory.EXISTING, data: [] }}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ secrets: [] })}
        />,
      );

      expect(screen.getByText('No secrets available to attach.')).toBeInTheDocument();
    });
  });

  describe('secrets available', () => {
    it('should enable the radio when secrets are available', () => {
      render(
        <EnvSecret
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({
            secrets: [{ name: 'my-secret', keys: ['key1'] }],
          })}
        />,
      );

      expect(screen.getByTestId('env-data-type-radio-existing secret')).toBeEnabled();
      expect(screen.queryByLabelText('More info')).not.toBeInTheDocument();
    });
  });
});
