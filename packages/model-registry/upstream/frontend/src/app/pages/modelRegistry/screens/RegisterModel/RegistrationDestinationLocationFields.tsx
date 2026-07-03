import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue, ThemeAwareFormGroupWrapper } from 'mod-arch-shared';
import PasswordInput from '~/app/shared/components/PasswordInput';
import { RegistrationCommonFormData } from './useRegisterModelData';

type RegistrationDestinationLocationFieldsProps<D extends RegistrationCommonFormData> = {
  formData: D;
  setData: UpdateObjectAtPropAndValue<D>;
};

const RegistrationDestinationLocationFields = <D extends RegistrationCommonFormData>({
  formData,
  setData,
}: RegistrationDestinationLocationFieldsProps<D>): React.ReactNode => {
  const {
    destinationOciRegistry,
    destinationOciUsername,
    destinationOciPassword,
    destinationOciUri,
  } = formData;

  // OCI fields
  const ociRegistryInput = (
    <TextInput
      isRequired
      type="text"
      id="destination-oci-registry"
      name="destination-oci-registry"
      value={destinationOciRegistry}
      onChange={(_e, value) => setData('destinationOciRegistry', value)}
    />
  );

  const ociUsernameInput = (
    <TextInput
      isRequired
      type="text"
      id="destination-oci-username"
      name="destination-oci-username"
      value={destinationOciUsername}
      onChange={(_e, value) => setData('destinationOciUsername', value)}
    />
  );

  const ociPasswordInput = (
    <PasswordInput
      isRequired
      id="destination-oci-password"
      name="destination-oci-password"
      value={destinationOciPassword}
      onChange={(_e, value) => setData('destinationOciPassword', value)}
    />
  );

  const ociUriInput = (
    <TextInput
      isRequired
      type="text"
      id="destination-oci-uri"
      name="destination-oci-uri"
      value={destinationOciUri}
      onChange={(_e, value) => setData('destinationOciUri', value)}
    />
  );

  return (
    <>
      <ThemeAwareFormGroupWrapper label="Registry" fieldId="destination-oci-registry" isRequired>
        {ociRegistryInput}
      </ThemeAwareFormGroupWrapper>
      <ThemeAwareFormGroupWrapper label="URI" fieldId="destination-oci-uri" isRequired>
        {ociUriInput}
      </ThemeAwareFormGroupWrapper>
      <ThemeAwareFormGroupWrapper label="Username" fieldId="destination-oci-username" isRequired>
        {ociUsernameInput}
      </ThemeAwareFormGroupWrapper>
      <ThemeAwareFormGroupWrapper label="Password" fieldId="destination-oci-password" isRequired>
        {ociPasswordInput}
      </ThemeAwareFormGroupWrapper>
    </>
  );
};

export default RegistrationDestinationLocationFields;
