import * as React from 'react';
import { Button, Checkbox, FormGroup, FormSection, getUniqueId } from '@patternfly/react-core';
import IndentSection from 'pages/projects/components/IndentSection';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject } from '../../types';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ServingRuntimeTokenInput from './ServingRuntimeTokenInput';

type ServingRuntimeTokenSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
};

const ServingRuntimeTokenSection: React.FC<ServingRuntimeTokenSectionProps> = ({
  data,
  setData,
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

  return (
    <FormSection title="Token authorization">
      <FormGroup>
        <Checkbox
          label="Require token authentication"
          id="alt-form-checkbox-auth"
          name="alt-form-checkbox-auth"
          isChecked={data.tokenAuth}
          onChange={(check) => {
            setData('tokenAuth', check);
            if (data.tokens.length === 0) {
              createNewToken();
            }
          }}
        />
      </FormGroup>

      {data.tokenAuth && (
        <IndentSection>
          {data.tokens.map((token) => (
            <ServingRuntimeTokenInput
              key={token.uuid}
              token={token}
              data={data}
              setData={setData}
            />
          ))}
          <Button
            onClick={() => {
              createNewToken();
            }}
            isInline
            iconPosition="left"
            variant="link"
            icon={<PlusCircleIcon />}
          >
            Add a service account
          </Button>
        </IndentSection>
      )}
    </FormSection>
  );
};

export default ServingRuntimeTokenSection;
