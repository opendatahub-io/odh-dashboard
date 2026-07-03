import React from 'react';
import {
  TextInput,
  Radio,
  TextInputGroupMain,
  TextInputGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useExtensions, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { UpdateObjectAtPropAndValue, ThemeAwareFormGroupWrapper } from 'mod-arch-shared';
import { isAutofillConnectionButtonExtension } from '~/odh/extension-points';
import PasswordInput from '~/app/shared/components/PasswordInput';
import { ModelLocationType, RegistrationCommonFormData } from './useRegisterModelData';

type RegistrationModelLocationFieldsProps<D extends RegistrationCommonFormData> = {
  formData: D;
  setData: UpdateObjectAtPropAndValue<D>;
  isCatalogModel?: boolean;
  includeCredentialFields?: boolean;
};

const RegistrationModelLocationFields = <D extends RegistrationCommonFormData>({
  formData,
  setData,
  isCatalogModel,
  includeCredentialFields = false,
}: RegistrationModelLocationFieldsProps<D>): React.ReactNode => {
  const {
    modelLocationType,
    modelLocationEndpoint,
    modelLocationBucket,
    modelLocationRegion,
    modelLocationPath,
    modelLocationURI,
    modelLocationS3AccessKeyId,
    modelLocationS3SecretAccessKey,
  } = formData;

  const endpointInput = (
    <TextInput
      isRequired
      type="text"
      id="location-endpoint"
      name="location-endpoint"
      value={modelLocationEndpoint}
      onChange={(_e, value) => setData('modelLocationEndpoint', value)}
    />
  );

  const bucketInput = (
    <TextInput
      isRequired
      type="text"
      id="location-bucket"
      name="location-bucket"
      value={modelLocationBucket}
      onChange={(_e, value) => setData('modelLocationBucket', value)}
    />
  );

  const regionInput = (
    <TextInput
      type="text"
      id="location-region"
      name="location-region"
      value={modelLocationRegion}
      onChange={(_e, value) => setData('modelLocationRegion', value)}
    />
  );

  const pathInput = (
    <TextInputGroup>
      <TextInputGroupMain
        icon="/"
        type="text"
        id="location-path"
        name="location-path"
        value={modelLocationPath}
        onChange={(_e, value) => setData('modelLocationPath', value)}
      />
    </TextInputGroup>
  );

  const uriInput = (
    <TextInput
      isRequired
      type="text"
      id="location-uri"
      name="location-uri"
      value={modelLocationURI}
      onChange={(_e, value) => setData('modelLocationURI', value)}
      isDisabled={isCatalogModel}
    />
  );

  const s3AccessKeyIdInput = (
    <TextInput
      isRequired
      type="text"
      id="location-s3-access-key-id"
      name="location-s3-access-key-id"
      value={modelLocationS3AccessKeyId}
      onChange={(_e, value) => setData('modelLocationS3AccessKeyId', value)}
    />
  );

  const s3SecretAccessKeyInput = (
    <PasswordInput
      isRequired
      id="location-s3-secret-access-key"
      name="location-s3-secret-access-key"
      value={modelLocationS3SecretAccessKey}
      onChange={(_e, value) => setData('modelLocationS3SecretAccessKey', value)}
    />
  );

  const autofillConnectionButtonExtensions = useExtensions(isAutofillConnectionButtonExtension);
  const autofillConnectionButtons = autofillConnectionButtonExtensions.map((extension) => (
    <SplitItem key={extension.uid}>
      <LazyCodeRefComponent
        component={extension.properties.component}
        props={{
          modelLocationType,
          setData,
        }}
      />
    </SplitItem>
  ));

  const pathHelperTextNode = (
    <FormHelperText>
      <HelperText>
        <HelperTextItem>
          Enter a path to a model or folder. This path cannot point to a root folder.
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  );

  return (
    <>
      <Split>
        <SplitItem isFilled>
          <Radio
            isChecked={modelLocationType === ModelLocationType.ObjectStorage}
            name="location-type-object-storage"
            isDisabled={isCatalogModel}
            onChange={() => {
              setData('modelLocationType', ModelLocationType.ObjectStorage);
            }}
            label="Object storage"
            id="location-type-object-storage"
          />
        </SplitItem>
        {modelLocationType === ModelLocationType.ObjectStorage && <>{autofillConnectionButtons}</>}
      </Split>
      {modelLocationType === ModelLocationType.ObjectStorage && (
        <>
          <ThemeAwareFormGroupWrapper
            className={spacing.mlLg}
            label="Endpoint"
            fieldId="location-endpoint"
            isRequired
          >
            {endpointInput}
          </ThemeAwareFormGroupWrapper>
          <ThemeAwareFormGroupWrapper
            className={spacing.mlLg}
            label="Bucket"
            fieldId="location-bucket"
            isRequired
          >
            {bucketInput}
          </ThemeAwareFormGroupWrapper>
          <ThemeAwareFormGroupWrapper
            className={spacing.mlLg}
            label="Region"
            fieldId="location-region"
          >
            {regionInput}
          </ThemeAwareFormGroupWrapper>
          <ThemeAwareFormGroupWrapper
            className={`location-path ${spacing.mlLg}`}
            label="Path"
            fieldId="location-path"
            isRequired
            helperTextNode={pathHelperTextNode}
          >
            {pathInput}
          </ThemeAwareFormGroupWrapper>
          {includeCredentialFields && (
            <>
              <ThemeAwareFormGroupWrapper
                className={spacing.mlLg}
                label="Access Key ID"
                fieldId="location-s3-access-key-id"
                isRequired
              >
                {s3AccessKeyIdInput}
              </ThemeAwareFormGroupWrapper>
              <ThemeAwareFormGroupWrapper
                className={spacing.mlLg}
                label="Secret Access Key"
                fieldId="location-s3-secret-access-key"
                isRequired
              >
                {s3SecretAccessKeyInput}
              </ThemeAwareFormGroupWrapper>
            </>
          )}
        </>
      )}
      <Split>
        <SplitItem isFilled>
          <Radio
            isChecked={modelLocationType === ModelLocationType.URI}
            name="location-type-uri"
            onChange={() => {
              setData('modelLocationType', ModelLocationType.URI);
            }}
            label="URI"
            id="location-type-uri"
          />
        </SplitItem>
        {modelLocationType === ModelLocationType.URI && !isCatalogModel && (
          <>{autofillConnectionButtons}</>
        )}
      </Split>
      {modelLocationType === ModelLocationType.URI &&
        (!isCatalogModel ? (
          <ThemeAwareFormGroupWrapper
            className={spacing.mlLg}
            label="URI"
            fieldId="location-uri"
            isRequired
          >
            {uriInput}
          </ThemeAwareFormGroupWrapper>
        ) : (
          formData.modelLocationURI
        ))}
    </>
  );
};

export default RegistrationModelLocationFields;
