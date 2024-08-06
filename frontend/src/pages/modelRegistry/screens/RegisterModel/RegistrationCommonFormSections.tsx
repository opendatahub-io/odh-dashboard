import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  TextArea,
  Radio,
  Split,
  SplitItem,
  InputGroupText,
  InputGroupItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import FormSection from '~/components/pf-overrides/FormSection';
import { ModelLocationType, RegistrationCommonFormData } from './useRegisterModelData';

type RegistrationCommonFormSectionsProps = {
  formData: RegistrationCommonFormData;
  setData: UpdateObjectAtPropAndValue<RegistrationCommonFormData>;
  isFirstVersion: boolean;
};

const RegistrationCommonFormSections: React.FC<RegistrationCommonFormSectionsProps> = ({
  formData,
  setData,
  isFirstVersion,
}) => {
  const {
    versionName,
    versionDescription,
    sourceModelFormat,
    sourceModelFormatVersion,
    modelLocationType,
    modelLocationEndpoint,
    modelLocationBucket,
    modelLocationRegion,
    modelLocationPath,
    modelLocationURI,
  } = formData;
  return (
    <>
      <FormSection
        title="Version details"
        description={
          isFirstVersion
            ? 'Configure details for the first version of this model.'
            : 'Configure details for the version of this model.'
        }
      >
        <FormGroup label="Version name" isRequired fieldId="version-name">
          <TextInput
            isRequired
            type="text"
            id="version-name"
            name="version-name"
            value={versionName}
            onChange={(_e, value) => setData('versionName', value)}
          />
        </FormGroup>
        <FormGroup label="Version description" fieldId="version-description">
          <TextArea
            type="text"
            id="version-description"
            name="version-description"
            value={versionDescription}
            onChange={(_e, value) => setData('versionDescription', value)}
          />
        </FormGroup>
        <FormGroup label="Source model format" fieldId="source-model-format">
          <TextInput
            type="text"
            placeholder="Example, tensorflow"
            id="source-model-format"
            name="source-model-format"
            value={sourceModelFormat}
            onChange={(_e, value) => setData('sourceModelFormat', value)}
          />
        </FormGroup>
        <FormGroup label="Source model format version" fieldId="source-model-format-version">
          <TextInput
            type="text"
            placeholder="Example, 1"
            id="source-model-format-version"
            name="source-model-format-version"
            value={sourceModelFormatVersion}
            onChange={(_e, value) => setData('sourceModelFormatVersion', value)}
          />
        </FormGroup>
      </FormSection>
      <FormSection
        title="Model location"
        description="Specify the model location by providing either the object storage details or the URI."
      >
        <Radio
          isChecked={modelLocationType === ModelLocationType.ObjectStorage}
          name="location-type-object-storage"
          onChange={() => {
            setData('modelLocationType', ModelLocationType.ObjectStorage);
          }}
          label="Object storage"
          id="location-type-object-storage"
          body={
            modelLocationType === ModelLocationType.ObjectStorage && (
              <Form>
                <FormGroup label="Endpoint" isRequired fieldId="location-endpoint">
                  <TextInput
                    isRequired
                    type="text"
                    id="location-endpoint"
                    name="location-endpoint"
                    value={modelLocationEndpoint}
                    onChange={(_e, value) => setData('modelLocationEndpoint', value)}
                  />
                </FormGroup>
                <FormGroup label="Bucket" isRequired fieldId="location-bucket">
                  <TextInput
                    isRequired
                    type="text"
                    id="location-bucket"
                    name="location-bucket"
                    value={modelLocationBucket}
                    onChange={(_e, value) => setData('modelLocationBucket', value)}
                  />
                </FormGroup>
                <FormGroup label="Region" fieldId="location-region">
                  <TextInput
                    type="text"
                    id="location-region"
                    name="location-region"
                    value={modelLocationRegion}
                    onChange={(_e, value) => setData('modelLocationRegion', value)}
                  />
                </FormGroup>
                <FormGroup label="Path" isRequired fieldId="location-path">
                  <Split hasGutter>
                    <SplitItem>
                      <InputGroupText isPlain>/</InputGroupText>
                    </SplitItem>
                    <SplitItem isFilled>
                      <InputGroupItem>
                        <TextInput
                          isRequired
                          type="text"
                          id="location-path"
                          name="location-path"
                          value={modelLocationPath}
                          onChange={(_e, value) => setData('modelLocationPath', value)}
                        />
                      </InputGroupItem>
                    </SplitItem>
                  </Split>
                  <HelperText>
                    <HelperTextItem>
                      Enter a path to a model or folder. This path cannot point to a root folder.
                    </HelperTextItem>
                  </HelperText>
                </FormGroup>
              </Form>
            )
          }
        />
        <Radio
          isChecked={modelLocationType === ModelLocationType.URI}
          name="location-type-uri"
          onChange={() => {
            setData('modelLocationType', ModelLocationType.URI);
          }}
          label="URI"
          id="location-type-uri"
          body={
            modelLocationType === ModelLocationType.URI && (
              <Form>
                <FormGroup label="URI" isRequired fieldId="location-uri">
                  <TextInput
                    isRequired
                    type="text"
                    id="location-uri"
                    name="location-uri"
                    value={modelLocationURI}
                    onChange={(_e, value) => setData('modelLocationURI', value)}
                  />
                </FormGroup>
              </Form>
            )
          }
        />
      </FormSection>
    </>
  );
};

export default RegistrationCommonFormSections;
