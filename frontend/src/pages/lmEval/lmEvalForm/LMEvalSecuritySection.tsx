import React from 'react';
import {
  Button,
  Content,
  FormFieldGroupExpandable,
  FormFieldGroupHeader,
  FormGroup,
  Icon,
  Popover,
  Radio,
  Skeleton,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import useTrustyAIConfigMap from './useTrustyAIConfigMap';

type LMEvalSecuritySectionProps = {
  allowRemoteCode: boolean;
  allowOnline: boolean;
  setAllowRemoteCode: (allowRemoteCode: boolean) => void;
  setAllowOnline: (allowOnline: boolean) => void;
};

const LMEvalSecuritySection: React.FC<LMEvalSecuritySectionProps> = ({
  allowRemoteCode,
  allowOnline,
  setAllowRemoteCode,
  setAllowOnline,
}) => {
  const { data: trustyAIConfigMap, loaded: trustyAIConfigMapLoaded } = useTrustyAIConfigMap();
  const isOnlineDisabled = !trustyAIConfigMap?.data?.['lmes-allow-online'];
  const isRemoteCodeDisabled = !trustyAIConfigMap?.data?.['lmes-allow-code-execution'];

  return (
    <FormFieldGroupExpandable
      data-testid="lm-eval-security-section"
      style={{ border: 0 }}
      isExpanded
      toggleAriaLabel="Details"
      header={
        <FormFieldGroupHeader
          titleText={{
            text: <div className="pf-v6-c-form__section-title">Security settings</div>,
            id: 'field-security-settings',
          }}
          titleDescription={
            <Content component="p" className="odh-form-section__desc">
              These settings can only be changed if they are active globally
            </Content>
          }
        />
      }
    >
      <>
        <FormGroup
          label="Available online"
          isRequired
          fieldId="1-expanded-group1-label1"
          labelHelp={
            <Popover
              bodyContent={
                <>
                  If <strong>true</strong>, the evaluation run downloads artifacts such as models,
                  datasets, or tokenizers, as needed.
                  <br />
                  <br />
                  If <strong>false</strong>, artifacts are not downloaded and are instead pulled
                  from local storage.
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
                aria-label="Available online help"
              />
            </Popover>
          }
        >
          {trustyAIConfigMapLoaded ? (
            <>
              <Radio
                name="allow-online-true-radio"
                id="allow-online-true-radio"
                label="True"
                isChecked={allowOnline}
                onChange={() => setAllowOnline(true)}
                isDisabled={!!isOnlineDisabled}
              />
              <Radio
                name="allow-online-false-radio"
                id="allow-online-false-radio"
                label="False"
                isChecked={!allowOnline}
                onChange={() => setAllowOnline(false)}
                isDisabled={isOnlineDisabled}
              />
            </>
          ) : (
            <Skeleton />
          )}
        </FormGroup>
        <FormGroup
          label="Trust remote code"
          isRequired
          fieldId="trust-remote-code"
          labelHelp={
            <Popover
              bodyContent={
                <>
                  If <strong>true</strong>, the evaluation run will use downloaded code for
                  preparing models or datasets.
                  <br />
                  <br />
                  If <strong>false</strong>, downloaded code will not be used.
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
                aria-label="Trust remote code help"
              />
            </Popover>
          }
        >
          {trustyAIConfigMapLoaded ? (
            <>
              <Radio
                name="trust-remote-code-true-radio"
                id="trust-remote-code-true-radio"
                label="True"
                isChecked={allowRemoteCode}
                onChange={() => setAllowRemoteCode(true)}
                isDisabled={isRemoteCodeDisabled}
              />
              <Radio
                name="trust-remote-code-false-radio"
                id="trust-remote-code-false-radio"
                label="False"
                isChecked={!allowRemoteCode}
                onChange={() => setAllowRemoteCode(false)}
                isDisabled={isRemoteCodeDisabled}
              />
            </>
          ) : (
            <Skeleton />
          )}
        </FormGroup>
      </>
    </FormFieldGroupExpandable>
  );
};

export default LMEvalSecuritySection;
