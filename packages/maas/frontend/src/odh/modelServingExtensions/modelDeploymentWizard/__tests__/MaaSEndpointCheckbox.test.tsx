import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  MaaSEndpointFieldWizardField,
  maasFieldSchema,
  type MaaSFieldValue,
} from '~/odh/modelServingExtensions/modelDeploymentWizard/MaaSEndpointCheckbox';

describe('MaaSEndpointCheckbox', () => {
  describe('maasFieldSchema validation', () => {
    it('should validate when checkbox is unchecked', () => {
      const value: MaaSFieldValue = { isChecked: false };
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checkbox is checked', () => {
      const value: MaaSFieldValue = { isChecked: true };
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean isChecked values', () => {
      const value = { isChecked: 'true' };
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should reject missing isChecked', () => {
      const value = {};
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });
  });

  it('renders in the Users section', () => {
    expect(MaaSEndpointFieldWizardField.parentId).toBe('model-users');
  });

  it('maps the user audience radios to the MaaS field value', () => {
    const onChange = jest.fn();
    const MaaSField = MaaSEndpointFieldWizardField.component;

    render(
      <MaaSField
        id="maas/save-as-maas-checkbox"
        value={{ isChecked: false }}
        onChange={onChange}
      />,
    );

    expect((screen.getByTestId('project-members-radio') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByTestId('maas/save-as-maas-checkbox'));
    expect(onChange).toHaveBeenCalledWith({ isChecked: true });
  });

  it('locks the MaaS gateway and provides its routing guidance for subscribed users', () => {
    const overrides = MaaSEndpointFieldWizardField.reducerFunctions.getFieldOverrides?.({
      isChecked: true,
    });
    const gateway = overrides?.['llmd-serving/gateway'];

    expect(gateway).toMatchObject({
      isDisabled: true,
      selection: { name: 'maas-default-gateway', namespace: 'openshift-ingress' },
    });
    expect(gateway?.labelHelpPopover?.title).toBeUndefined();

    render(<>{gateway?.labelHelpPopover?.content}</>);
    expect(
      screen.getByText('Select the gateway through which users can access model deployments.'),
    ).toBeTruthy();
    expect(screen.getByText('maas-default-gateway | openshift-ingress')).toBeTruthy();
  });
});
