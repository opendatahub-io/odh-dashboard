import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PvcConfigSection from '../PvcConfigSection';

jest.mock('@odh-dashboard/internal/components/pf-overrides/FormSection', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PvcConfigSection', () => {
  let onChange: jest.Mock;

  beforeEach(() => {
    onChange = jest.fn();
  });

  it('renders three radio options', () => {
    render(
      <PvcConfigSection
        pvcConfig={undefined}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    expect(screen.getByLabelText('Ephemeral storage')).toBeChecked();
    expect(screen.getByLabelText('Use existing PVC')).not.toBeChecked();
    expect(screen.getByLabelText('Create new PVC')).not.toBeChecked();
  });

  it('calls onChange with undefined when selecting None', () => {
    render(
      <PvcConfigSection
        pvcConfig={{ ref: { name: 'test-pvc' }, mountPath: '/data' }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.click(screen.getByLabelText('Ephemeral storage'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('shows PVC name and mount path fields when Use existing PVC is selected', () => {
    render(
      <PvcConfigSection
        pvcConfig={undefined}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.click(screen.getByLabelText('Use existing PVC'));
    expect(onChange).toHaveBeenCalledWith({ ref: { name: '' }, mountPath: '/data' });
  });

  it('renders PVC name field for ref mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{ ref: { name: 'my-pvc' }, mountPath: '/data' }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    expect(screen.getByPlaceholderText('my-existing-pvc')).toHaveValue('my-pvc');
  });

  it('calls onChange when PVC name changes in ref mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{ ref: { name: '' }, mountPath: '/data' }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('my-existing-pvc'), {
      target: { value: 'new-pvc' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ref: { name: 'new-pvc' } }));
  });

  it('shows storage size, class, access mode, and mount path for Create new PVC', () => {
    render(
      <PvcConfigSection
        pvcConfig={{
          create: { resources: { requests: { storage: '10Gi' } } },
          mountPath: '/data',
        }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    expect(screen.getByDisplayValue('10Gi')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cluster default if empty')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ReadWriteOnce')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/data')).toBeInTheDocument();
  });

  it('calls onChange with create config when selecting Create new PVC', () => {
    render(
      <PvcConfigSection
        pvcConfig={undefined}
        onChange={onChange}
        defaultMountPath="/data/test"
        defaultStorageSize="10Gi"
        idPrefix="test"
      />,
    );
    fireEvent.click(screen.getByLabelText('Create new PVC'));
    expect(onChange).toHaveBeenCalledWith({
      create: { resources: { requests: { storage: '10Gi' } } },
      mountPath: '/data/test',
    });
  });

  it('updates storage size in create mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{
          create: { resources: { requests: { storage: '5Gi' } } },
          mountPath: '/data',
        }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    const sizeInput = screen.getByDisplayValue('5Gi');
    fireEvent.change(sizeInput, { target: { value: '20Gi' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resources: { requests: { storage: '20Gi' } },
        }),
      }),
    );
  });

  it('does not emit an empty storage request', () => {
    render(
      <PvcConfigSection
        pvcConfig={{ create: { resources: { requests: { storage: '5Gi' } } }, mountPath: '/data' }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.change(screen.getByDisplayValue('5Gi'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ resources: { requests: { storage: '5Gi' } } }),
      }),
    );
  });

  it('uses default mount path when none provided', () => {
    render(
      <PvcConfigSection
        pvcConfig={undefined}
        onChange={onChange}
        defaultMountPath="/default/mount"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.click(screen.getByLabelText('Use existing PVC'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mountPath: '/default/mount' }));
  });

  it('updates mount path in ref mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{ ref: { name: 'my-pvc' }, mountPath: '/data' }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.change(screen.getByDisplayValue('/data'), {
      target: { value: '/new/path' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ref: { name: 'my-pvc' }, mountPath: '/new/path' }),
    );
  });

  it('updates storage class in create mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{
          create: { resources: { requests: { storage: '5Gi' } } },
          mountPath: '/data',
        }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Cluster default if empty'), {
      target: { value: 'gp3' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ storageClassName: 'gp3' }),
      }),
    );
  });

  it('updates access mode in create mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{
          create: { resources: { requests: { storage: '5Gi' } } },
          mountPath: '/data',
        }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('ReadWriteOnce'), {
      target: { value: 'ReadWriteMany' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ accessModes: ['ReadWriteMany'] }),
      }),
    );
  });

  it('updates mount path in create mode', () => {
    render(
      <PvcConfigSection
        pvcConfig={{
          create: { resources: { requests: { storage: '5Gi' } } },
          mountPath: '/data',
        }}
        onChange={onChange}
        defaultMountPath="/data"
        defaultStorageSize="5Gi"
        idPrefix="test"
      />,
    );
    const mountPaths = screen.getAllByDisplayValue('/data');
    fireEvent.change(mountPaths[mountPaths.length - 1], {
      target: { value: '/new/mount' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mountPath: '/new/mount' }));
  });
});
