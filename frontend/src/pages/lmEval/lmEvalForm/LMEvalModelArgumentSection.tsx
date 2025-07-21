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
      <span data-testid="model-argument-name-value">{modelArgument.name || '-'}</span>
    </FormGroup>
    <FormGroup label="Model URL" data-testid="model-argument-url">
      <span data-testid="model-argument-url-value">{modelArgument.url || '-'}</span>
    </FormGroup>
    <FormGroup
      label="Tokenized requests"
      labelHelp={
        <Popover
          bodyContent={
            <>
              Set to <strong>true</strong> if the evaluation dataset is pre-tokenized.
              <br />
              <br />
              Set to <strong>false</strong> if the evaluation dataset consists of raw text.
            </>
          }
        >
          <Button
            icon={
              <Icon isInline>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
            variant="plain"
            isInline
            aria-label="Tokenized requests help"
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
      label="Tokenizer URL"
      isRequired
      labelHelp={
        <Popover bodyContent="Enter the tokenizer URL for the selected model. This should be included in the model’s documentation.">
          <Button
            icon={
              <Icon isInline>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
            variant="plain"
            isInline
            aria-label="Tokenizer URL help"
          />
        </Popover>
      }
    >
      <TextInput
        aria-label="Tokenizer text input"
        data-testid="tokenizer-url-input"
        value={modelArgument.tokenizer}
        onChange={(_event, v) => setModelArgument({ ...modelArgument, tokenizer: v })}
      />
    </FormGroup>
  </FormSection>
);

export default LmEvalModelArgumentSection;
