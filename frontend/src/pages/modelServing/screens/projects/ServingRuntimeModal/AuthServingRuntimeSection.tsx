import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormGroup,
  Popover,
  Stack,
  StackItem,
  getUniqueId,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingModelServingObjectCommon } from '#~/pages/modelServing/screens/types';

import ServingRuntimeTokenSection from './ServingRuntimeTokenSection';

type AuthServingRuntimeSectionProps<D extends CreatingModelServingObjectCommon> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  allowCreate: boolean;
};

const AuthServingRuntimeSection = <D extends CreatingModelServingObjectCommon>({
  data,
  setData,
  allowCreate,
}: AuthServingRuntimeSectionProps<D>): React.ReactNode => {
  const createNewToken = React.useCallback(() => {
    const name = 'default-name';
    const duplicated = data.tokens.filter((token) => token.name === name);
    const duplicatedError = duplicated.length > 0 ? 'Duplicates are invalid' : '';
    setData('tokens', [
      ...data.tokens,
      {
        name,
        uuid: getUniqueId('ml'),
        error: duplicatedError,
      },
    ]);
  }, [data.tokens, setData]);

  return (
    <Stack hasGutter>
      {!allowCreate && (
        <StackItem>
          <Popover
            showClose
            bodyContent="Model route and token authentication can only be changed by administrator users."
          >
            <Button variant="link" icon={<OutlinedQuestionCircleIcon />} isInline>
              Why can't I change the model route and token authentication fields?
            </Button>
          </Popover>
        </StackItem>
      )}
      <StackItem>
        <FormGroup fieldId="alt-form-checkbox-route" label="Model route">
          <Checkbox
            label="Make deployed models available through an external route"
            id="alt-form-checkbox-route"
            data-testid="alt-form-checkbox-route"
            name="alt-form-checkbox-route"
            isChecked={data.externalRoute}
            isDisabled={!allowCreate}
            onChange={(e, check) => {
              setData('externalRoute', check);
              if (check && allowCreate) {
                setData('tokenAuth', check);
                if (data.tokens.length === 0) {
                  createNewToken();
                }
              }
            }}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <ServingRuntimeTokenSection
          data={data}
          setData={setData}
          allowCreate={allowCreate}
          createNewToken={createNewToken}
        />
      </StackItem>
      {data.externalRoute && !data.tokenAuth && (
        <StackItem>
          <Alert
            id="external-route-no-token-alert"
            data-testid="external-route-no-token-alert"
            variant="warning"
            isInline
            title="Making models available by external routes without requiring authorization can lead to security vulnerabilities."
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default AuthServingRuntimeSection;
