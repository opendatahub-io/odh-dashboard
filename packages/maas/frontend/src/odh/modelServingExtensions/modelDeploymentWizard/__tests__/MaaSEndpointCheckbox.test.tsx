import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
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

  it('maps the audience cards to the MaaS field value', () => {
    const onChange = jest.fn();
    const MaaSField = MaaSEndpointFieldWizardField.component;
    const fieldId = 'maas/save-as-maas-checkbox';

    const { rerender } = render(
      <MaaSField id={fieldId} value={{ isChecked: false }} onChange={onChange} />,
    );

    const projectMembers = screen.getByTestId('project-members-radio');
    const subscribedUsers = screen.getByTestId(fieldId);

    expect(projectMembers).toBeChecked();
    expect(projectMembers).toHaveAccessibleName('Project members');
    expect(subscribedUsers).not.toBeChecked();
    expect(subscribedUsers).toHaveAccessibleName('Subscribed users');
    expect(subscribedUsers).toHaveAccessibleDescription(
      'Available as a service (MaaS) to users with an admin-assigned subscription and authorization policy.',
    );

    fireEvent.click(subscribedUsers);
    expect(onChange).toHaveBeenLastCalledWith({ isChecked: true });

    rerender(<MaaSField id={fieldId} value={{ isChecked: true }} onChange={onChange} />);
    expect(subscribedUsers).toBeChecked();
    expect(projectMembers).not.toBeChecked();

    fireEvent.click(projectMembers);
    expect(onChange).toHaveBeenLastCalledWith({ isChecked: false });
  });

  it('locks the MaaS gateway and provides its routing guidance for subscribed users', () => {
    const overrides = MaaSEndpointFieldWizardField.reducerFunctions.getFieldOverrides?.(
      {
        isChecked: true,
      },
      {},
    );
    const gateway = overrides?.['llmd-serving/gateway'];

    expect(gateway).toMatchObject({
      isDisabled: true,
      selections: [{ name: 'maas-default-gateway', namespace: 'openshift-ingress' }],
      hiddenOptions: undefined,
    });
    expect(gateway?.labelHelpPopover?.title).toBeUndefined();

    render(<>{gateway?.labelHelpPopover?.content}</>);
    expect(
      screen.getByText('Select the gateway through which users can access model deployments.'),
    ).toBeTruthy();
    expect(screen.getByText('maas-default-gateway | openshift-ingress')).toBeTruthy();
  });
});
