import * as React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
import {
  isConnectionTypeDataField,
  type ConnectionTypeConfigMapObj,
} from '@odh-dashboard/k8s-core';
import type { HostApiServices } from '@odh-dashboard/plugin-core/host-api';
import { trimInputOnBlur, trimInputOnPaste } from '@odh-dashboard/ui-core/utilities';

export const createTiltUriConnectionType = (namespace: string): ConnectionTypeConfigMapObj => ({
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: 'uri-v1',
    namespace,
    labels: {
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/connection-type': 'true',
    },
    annotations: {
      'openshift.io/display-name': 'URI',
      'openshift.io/description': 'Direct model URI for the RHAII Tilt environment.',
      'opendatahub.io/disabled': 'false',
    },
  },
  data: {
    fields: [
      {
        envVar: 'URI',
        name: 'URI',
        description: 'URI of the model to deploy.',
        required: true,
        type: 'uri',
        properties: {},
      },
    ],
  },
});

const UriConnectionFormFields: HostApiServices['ConnectionTypeFormFields'] = ({
  fields,
  isDisabled,
  onChange,
  connectionValues,
}) => {
  const uriField = fields?.find(
    (field) => isConnectionTypeDataField(field) && field.envVar === 'URI',
  );

  if (!uriField || !isConnectionTypeDataField(uriField)) {
    return null;
  }

  const currentValue = connectionValues?.[uriField.envVar];
  const stringValue = typeof currentValue === 'string' ? currentValue : '';
  const handleChange = (value: string) => onChange?.(uriField, value);

  return (
    <FormGroup label={uriField.name} fieldId="rhaii-tilt-model-uri" isRequired={uriField.required}>
      <TextInput
        autoComplete="off"
        id="rhaii-tilt-model-uri"
        data-testid="rhaii-tilt-model-uri"
        value={stringValue}
        isDisabled={isDisabled}
        isRequired={uriField.required}
        onChange={(_event, value) => handleChange(value)}
        onBlur={trimInputOnBlur(stringValue, handleChange)}
        onPaste={trimInputOnPaste(handleChange)}
      />
    </FormGroup>
  );
};

export default UriConnectionFormFields;
