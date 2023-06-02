import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormGroup,
  FormSection,
  getUniqueId,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import IndentSection from '~/pages/projects/components/IndentSection';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import ServingRuntimeTokenInput from './ServingRuntimeTokenInput';

type ServingRuntimeTokenSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  allowCreate: boolean;
  rbacLoaded: boolean;
};

const ServingRuntimeTokenSection: React.FC<ServingRuntimeTokenSectionProps> = ({
  data,
  setData,
  allowCreate,
  rbacLoaded,
}) => {
  const createNewToken = () => {
    const name = 'default-name';
    const duplicated = data.tokens.filter((token) => token.name === name);
    const error = duplicated.length > 0 ? 'Duplicates are invalid' : '';
    setData('tokens', [
      ...data.tokens,
      {
        name,
        uuid: getUniqueId('ml'),
        error,
      },
    ]);
  };

  if (!rbacLoaded) {
    return <Skeleton />;
  }

  return (
    <FormSection title="Token authorization">
      <FormGroup>
        <Checkbox
          label="Require token authentication"
          id="alt-form-checkbox-auth"
          name="alt-form-checkbox-auth"
          isDisabled={!allowCreate}
          isChecked={data.tokenAuth}
          onChange={(check) => {
            setData('tokenAuth', check);
            if (data.tokens.length === 0) {
              createNewToken();
            }
          }}
        />
      </FormGroup>

      {!allowCreate && (
        <Alert
          variant="warning"
          isInline
          title="Administrator permissions in this namespace are required to generate tokens."
        />
      )}

      {data.tokenAuth && (
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
      )}
    </FormSection>
  );
};

export default ServingRuntimeTokenSection;
