import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StorageClassEditModal } from '#~/pages/storageClasses/StorageClassEditModal';
import { StorageClassKind } from '#~/k8sTypes';
import { AccessMode, provisionerAccessModes } from '#~/pages/storageClasses/storageEnums';

const mockStorageClass = (provisioner: string): StorageClassKind => ({
  apiVersion: 'storage.k8s.io/v1',
  kind: 'StorageClass',
  allowVolumeExpansion: true,
  metadata: {
    name: `test-sc-${provisioner}`,
    uid: '123',
    resourceVersion: '1',
    creationTimestamp: '2022-01-01T00:00:00Z',
    labels: {},
    annotations: {},
  },
  provisioner,
  reclaimPolicy: 'Delete',
  volumeBindingMode: 'Immediate',
});

describe('StorageClassEditModal', () => {
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  const allAccessModes = Object.values(AccessMode);
  const testCases: [string, AccessMode[], AccessMode[]][] = Object.entries(
    provisionerAccessModes,
  ).map(([provisioner, supportedModes]) => {
    const unsupportedModes = allAccessModes.filter((mode) => !supportedModes.includes(mode));
    return [provisioner, supportedModes, unsupportedModes];
  });

  // Add the unknown provisioner case, which should default to only supporting RWO
  testCases.push([
    'unknown-provisioner',
    [AccessMode.RWO],
    [AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP],
  ]);

  testCases.forEach(([provisioner, supportedModes, unsupportedModes]) => {
    it(`should display correct access modes for ${provisioner}`, () => {
      const storageClass = mockStorageClass(provisioner);
      // StorageClassEditModal can be rendered standalone - no context needed
      render(
        <StorageClassEditModal
          storageClass={storageClass}
          onSuccess={onSuccess}
          onClose={onClose}
        />,
      );

      // RWO is always checked and disabled
      const rwoCheckbox = screen.getByTestId('edit-sc-access-mode-checkbox-readwriteonce');
      expect(rwoCheckbox).toBeChecked();
      expect(rwoCheckbox).toBeDisabled();

      supportedModes.forEach((mode) => {
        if (mode === AccessMode.RWO) {
          return; // already tested
        }
        const checkbox = screen.getByTestId(`edit-sc-access-mode-checkbox-${mode.toLowerCase()}`);
        // Supported modes should be unchecked by default but enabled
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toBeEnabled();
      });

      unsupportedModes.forEach((mode) => {
        const checkbox = screen.getByTestId(`edit-sc-access-mode-checkbox-${mode.toLowerCase()}`);
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toBeEnabled();
      });
    });
  });
});
