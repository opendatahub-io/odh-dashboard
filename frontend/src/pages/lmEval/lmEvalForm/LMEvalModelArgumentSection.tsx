import React from 'react';
import {
  Button,
  Content,
  FormGroup,
  FormSection,
  Icon,
  Popover,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { LmModelArgument } from '#~/pages/lmEval/types';

type LmEvalModelArgumentSectionProps = {
  modelArgument: LmModelArgument;
  setModelArgument: (modelArgument: LmModelArgument) => void;
};

const LmEvalModelArgumentSection: React.FC<LmEvalModelArgumentSectionProps> = ({
  modelArgument,
  setModelArgument,
}) => (
  <FormSection
    title={
      <>
        <Content className="pf-v6-c-form__section-title">Model parameters</Content>
        <Content component="p" className="odh-form-section__desc">
          Details about the model you are evaluating.
        </Content>
      </>
    }
  >
    <FormGroup label="Model name" data-testid="model-argument-name">
      {modelArgument.name || '-'}
    </FormGroup>
    <FormGroup label="Model URL" data-testid="model-argument-url">
      {modelArgument.url || '-'}
    </FormGroup>
    <FormGroup
      label="Tokenized requests"
      labelHelp={
        <Popover bodyContent={<></>}>
          <Button
            icon={
              <Icon isInline>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
            variant="plain"
            isInline
          />
        </Popover>
      }
    >
      <Radio
        name="model-tokenized-request-true-radio"
        id="model-tokenized-request-true-radio"
        label="True"
        isChecked={modelArgument.tokenizedRequest === 'True'}
        onChange={() => setModelArgument({ ...modelArgument, tokenizedRequest: 'True' })}
      />
      <Radio
        name="model-tokenized-request-false-radio"
        id="model-tokenized-request-false-radio"
        label="False"
        isChecked={modelArgument.tokenizedRequest === 'False'}
        onChange={() => setModelArgument({ ...modelArgument, tokenizedRequest: 'False' })}
      />
    </FormGroup>
    <FormGroup
      label="Tokenizer"
      isRequired
      labelHelp={
        <Popover bodyContent={<></>}>
          <Button
            icon={
              <Icon isInline>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
            variant="plain"
            isInline
          />
        </Popover>
      }
    >
      <TextInput
        aria-label="Tokenizer text input"
        value={modelArgument.tokenizer}
        onChange={(_event, v) => setModelArgument({ ...modelArgument, tokenizer: v })}
      />
    </FormGroup>
  </FormSection>
);

export default LmEvalModelArgumentSection;
