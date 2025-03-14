import {
  Button,
  Content,
  ContentVariants,
  FormGroup,
  FormSection,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import React from 'react';
import { FineTuneTaxonomyType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { FineTuneTaxonomyFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import PasswordInput from '~/components/PasswordInput';
import { ValidationContext } from '~/utilities/useValidation';
import { ZodErrorHelperText } from '~/components/ZodErrorFormHelperText';
import { ModelCustomizationDrawerContentArgs } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '~/components/MarkdownView';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  taxonomyMarkdownContent,
  taxonomyMarkdownTitle,
} from './const';

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
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const urlValidationIssues = data.url ? getAllValidationIssues(['taxonomy', 'url']) : [];
  const sshKeyValidationIssues = data.secret.sshKey
    ? getAllValidationIssues(['taxonomy', 'secret', 'sshKey'])
    : [];
  const usernameValidationIssues = data.secret.username
    ? getAllValidationIssues(['taxonomy', 'secret', 'username'])
    : [];
  const tokenValidationIssues = data.secret.token
    ? getAllValidationIssues(['taxonomy', 'secret', 'token'])
    : [];

  return (
    <FormSection
      id={FineTunePageSections.TAXONOMY_DETAILS}
      data-testid={FineTunePageSections.TAXONOMY_DETAILS}
      title={fineTunePageSectionTitles[FineTunePageSections.TAXONOMY_DETAILS]}
    >
      <Content component={ContentVariants.small}>
        A taxonomy is the structured git repository containing the information used to generate
        synthetic data for the fine-tuning run.{' '}
        <Button
          isInline
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
      </Content>
      <FormGroup label="Taxonomy GIT URL" fieldId="fine-tune-taxonomy-git-url" isRequired>
        <TextInput
          aria-label="taxonomy github url"
          data-testid="taxonomy-github-url"
          validated={urlValidationIssues.length > 0 ? 'error' : 'default'}
          value={data.url}
          onChange={(_event, value) => setData({ ...data, url: value })}
        />
        <ZodErrorHelperText zodIssue={urlValidationIssues} />
      </FormGroup>
      <FormGroup label="Authentication method" fieldId="authentication-method" isRequired>
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
                <TextInput
                  aria-label="taxonomy ssh key"
                  data-testid="taxonomy-ssh-key"
                  validated={sshKeyValidationIssues.length > 0 ? 'error' : 'default'}
                  value={data.secret.sshKey}
                  onChange={(_e, value) =>
                    setData({
                      ...data,
                      secret: { ...data.secret, sshKey: value },
                    })
                  }
                />
                <ZodErrorHelperText zodIssue={sshKeyValidationIssues} />
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
                    validated={usernameValidationIssues.length > 0 ? 'error' : 'default'}
                    onChange={(_e, value) =>
                      setData({
                        ...data,
                        secret: {
                          ...data.secret,
                          username: value,
                        },
                      })
                    }
                  />
                  <ZodErrorHelperText zodIssue={usernameValidationIssues} />
                </FormGroup>
                <FormGroup label="Token" fieldId="token" isRequired>
                  <PasswordInput
                    data-testid="taxonomy-token"
                    value={data.secret.token}
                    validated={tokenValidationIssues.length > 0 ? 'error' : 'default'}
                    onChange={(_e, value) =>
                      setData({
                        ...data,
                        secret: {
                          ...data.secret,
                          token: value,
                        },
                      })
                    }
                  />
                  <ZodErrorHelperText zodIssue={tokenValidationIssues} />
                </FormGroup>
              </>
            )
          }
        />
      </FormGroup>
    </FormSection>
  );
};
