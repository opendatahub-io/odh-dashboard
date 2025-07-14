import { Button, FormGroup, Radio, TextInput } from '@patternfly/react-core';
import React from 'react';
import { FineTuneTaxonomyType } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTuneTaxonomyFormData,
  fineTuneTaxonomySchema,
} from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import PasswordInput from '#~/components/PasswordInput';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { ModelCustomizationDrawerContentArgs } from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '#~/components/MarkdownView';
import FormSection from '#~/components/pf-overrides/FormSection';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  taxonomyMarkdownContent,
  taxonomyMarkdownTitle,
} from '#~/pages/pipelines/global/modelCustomization/const';
import { SshKeyFileUpload } from '#~/pages/pipelines/global/modelCustomization/taxonomySection/SshKeyFileUpload';

type FineTuneTaxonomySectionProps = {
  data: FineTuneTaxonomyFormData;
  setData: (dataTaxonomy: FineTuneTaxonomyFormData) => void;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

export const FineTuneTaxonomySection = ({
  data,
  setData,
  handleOpenDrawer,
}: FineTuneTaxonomySectionProps): React.JSX.Element => {
  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    data,
    fineTuneTaxonomySchema,
  );

  return (
    <FormSection
      id={FineTunePageSections.TAXONOMY_DETAILS}
      data-testid={FineTunePageSections.TAXONOMY_DETAILS}
      title={fineTunePageSectionTitles[FineTunePageSections.TAXONOMY_DETAILS]}
      description={
        <>
          A taxonomy is the structured git repository containing the information used to generate
          synthetic data for the fine-tuning run.{' '}
          <Button
            style={{ padding: 0 }}
            variant="link"
            onClick={() =>
              handleOpenDrawer({
                title: taxonomyMarkdownTitle,
                content: <MarkdownView markdown={taxonomyMarkdownContent} />,
              })
            }
          >
            Learn more about taxonomy
          </Button>
        </>
      }
    >
      <FormGroup label="Taxonomy GIT URL" fieldId="fine-tune-taxonomy-git-url" isRequired>
        <TextInput
          aria-label="taxonomy github url"
          data-testid="taxonomy-github-url"
          value={data.url}
          onChange={(_event, value) => setData({ ...data, url: value })}
          {...getFieldValidationProps(['url'])}
        />
        <ZodErrorHelperText
          data-testid="taxonomy-github-url-error"
          zodIssue={getFieldValidation(['url'])}
        />
      </FormGroup>
      <FormGroup
        label="Authentication method"
        fieldId="authentication-method"
        data-testid="fine-tune-sshupload"
        isRequired
      >
        <Radio
          name="ssh-key-radio"
          data-testid="ssh-key-radio"
          isChecked={data.secret.type === FineTuneTaxonomyType.SSH_KEY}
          id="ssh-key-radio"
          label="SSH key"
          className="pf-v6-u-mb-md"
          onChange={() =>
            setData({
              ...data,
              secret: {
                ...data.secret,
                type: FineTuneTaxonomyType.SSH_KEY,
                sshKey: data.secret.sshKey ?? '',
              },
            })
          }
          body={
            data.secret.type === FineTuneTaxonomyType.SSH_KEY && (
              <FormGroup label="SSH key" isRequired>
                <SshKeyFileUpload
                  data={data.secret.sshKey}
                  onChange={(value) =>
                    setData({
                      ...data,
                      secret: { ...data.secret, sshKey: value },
                    })
                  }
                  {...getFieldValidationProps(['secret', 'sshKey'])}
                />
                <ZodErrorHelperText
                  data-testid="taxonomy-ssh-key-error"
                  zodIssue={getFieldValidation(['secret', 'sshKey'])}
                />
              </FormGroup>
            )
          }
        />
        <Radio
          name="username-and-token-radio"
          data-testid="username-and-token-radio"
          id="username-and-token-radio"
          label="Username and token"
          isChecked={data.secret.type !== FineTuneTaxonomyType.SSH_KEY}
          onChange={() =>
            setData({
              ...data,
              secret: {
                ...data.secret,
                type: FineTuneTaxonomyType.USERNAME_TOKEN,
                username: data.secret.username ?? '',
                token: data.secret.token ?? '',
              },
            })
          }
          body={
            data.secret.type === FineTuneTaxonomyType.USERNAME_TOKEN && (
              <>
                <FormGroup label="Username" fieldId="username" isRequired>
                  <TextInput
                    aria-label="taxonomy username"
                    data-testid="taxonomy-username"
                    value={data.secret.username}
                    onChange={(_e, value) =>
                      setData({
                        ...data,
                        secret: {
                          ...data.secret,
                          username: value,
                        },
                      })
                    }
                    {...getFieldValidationProps(['secret', 'username'])}
                  />
                  <ZodErrorHelperText
                    data-testid="taxonomy-username-error"
                    zodIssue={getFieldValidation(['secret', 'username'])}
                  />
                </FormGroup>
                <FormGroup label="Token" fieldId="token" isRequired>
                  <PasswordInput
                    aria-label="taxonomy token"
                    data-testid="taxonomy-token"
                    value={data.secret.token}
                    onChange={(_e, value) =>
                      setData({
                        ...data,
                        secret: {
                          ...data.secret,
                          token: value,
                        },
                      })
                    }
                    {...getFieldValidationProps(['secret', 'token'])}
                  />
                  <ZodErrorHelperText
                    data-testid="taxonomy-token-error"
                    zodIssue={getFieldValidation(['secret', 'token'])}
                  />
                </FormGroup>
              </>
            )
          }
        />
      </FormGroup>
    </FormSection>
  );
};
