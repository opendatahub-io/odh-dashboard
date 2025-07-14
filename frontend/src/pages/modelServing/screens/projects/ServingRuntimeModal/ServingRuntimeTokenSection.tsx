import * as React from 'react';
import { Alert, Button, Checkbox, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import IndentSection from '#~/pages/projects/components/IndentSection';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingModelServingObjectCommon } from '#~/pages/modelServing/screens/types';
import ServingRuntimeTokenInput from './ServingRuntimeTokenInput';

type ServingRuntimeTokenSectionProps<D extends CreatingModelServingObjectCommon> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  allowCreate: boolean;
  createNewToken: () => void;
};

const ServingRuntimeTokenSection = <D extends CreatingModelServingObjectCommon>({
  data,
  setData,
  allowCreate,
  createNewToken,
}: ServingRuntimeTokenSectionProps<D>): React.ReactNode => (
  <FormGroup
    label="Token authentication"
    data-testid="auth-section"
    fieldId="alt-form-checkbox-auth"
  >
    <Stack hasGutter id="auth-section">
      <StackItem>
        <Checkbox
          label="Require token authentication"
          id="alt-form-checkbox-auth"
          data-testid="alt-form-checkbox-auth"
          name="alt-form-checkbox-auth"
          isDisabled={!allowCreate}
          isChecked={data.tokenAuth}
          onChange={(e, check) => {
            setData('tokenAuth', check);
            if (data.tokens.length === 0) {
              createNewToken();
            }
          }}
        />
      </StackItem>
      {data.tokenAuth && (
        <StackItem>
          <IndentSection>
            <Stack hasGutter>
              {allowCreate && (
                <StackItem>
                  <Alert
                    variant="info"
                    isInline
                    title="The actual tokens will be created and displayed when the model server is configured."
                  />
                </StackItem>
              )}
              {data.tokens.map((token) => (
                <StackItem key={token.uuid}>
                  <ServingRuntimeTokenInput
                    token={token}
                    data={data}
                    setData={setData}
                    disabled={!allowCreate}
                  />
                </StackItem>
              ))}
              <StackItem>
                <Button
                  onClick={() => {
                    createNewToken();
                  }}
                  isInline
                  iconPosition="left"
                  variant="link"
                  icon={<PlusCircleIcon />}
                  isDisabled={!allowCreate}
                >
                  Add a service account
                </Button>
              </StackItem>
            </Stack>
          </IndentSection>
        </StackItem>
      )}
    </Stack>
  </FormGroup>
);

export default ServingRuntimeTokenSection;
