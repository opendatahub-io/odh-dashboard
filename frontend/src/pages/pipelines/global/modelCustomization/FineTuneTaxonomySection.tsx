import { Button, FormGroup, FormSection, Popover, Radio, TextInput } from '@patternfly/react-core';
import React from 'react';
import { HelpIcon } from '@patternfly/react-icons';
import { FineTuneTaxonomyType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { FineTuneTaxonomyFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import PasswordInput from '~/components/PasswordInput';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';

type FineTuneTaxonomySectionProps = {
  data: FineTuneTaxonomyFormData;
  setData: (dataTaxonomy: FineTuneTaxonomyFormData) => void;
};

export const FineTuneTaxonomySection = ({
  data,
  setData,
}: FineTuneTaxonomySectionProps): React.JSX.Element => {
  const taxonomyDetailsDescription = (
    <p>
      Select or create a connection to specify the taxonomy to use for this run. A taxonomy is the
      structured git repository containing the information used to generate synthetic data for
      fine-tuning run.{' '}
      <Button isInline variant="link">
        Learn more about taxonomy
      </Button>
    </p>
  );
  return (
    <FormSection
      id={FineTunePageSections.TAXONOMY_DETAILS}
      data-testid={FineTunePageSections.TAXONOMY_DETAILS}
      title={fineTunePageSectionTitles[FineTunePageSections.TAXONOMY_DETAILS]}
    >
      {/* TODO: add link to taxonomy https://issues.redhat.com/browse/RHOAIENG-19187 */}
      {taxonomyDetailsDescription}
      {/* TODO: popover title and body content*/}
      <FormGroup
        label="Taxonomy GIT URL"
        fieldId="fine-tune-taxonomy-git-url"
        isRequired
        labelHelp={
          <Popover
            aria-label="Taxonomy git url help popover"
            headerContent="Taxonomy GIT URL"
            hasAutoWidth
            bodyContent={<></>}
          >
            <HelpIcon />
          </Popover>
        }
      >
        <TextInput
          aria-label="taxonomy github url"
          data-testid="taxonomy-github-url"
          value={data.url}
          onChange={(_event, value) => setData({ ...data, url: value })}
        />
      </FormGroup>
      {/* TODO: popover title and body content */}
      <FormGroup
        label="Authentication methods"
        fieldId="authentication-methods"
        isRequired
        labelHelp={
          <Popover
            aria-label="Authentication methods help popover"
            headerContent="Authentication methods"
            hasAutoWidth
            bodyContent={<></>}
          >
            <HelpIcon />
          </Popover>
        }
      >
        <Radio
          name="ssh-key-radio"
          data-testid="ssh-key-radio"
          isChecked={data.secret.type === FineTuneTaxonomyType.SSH_KEY}
          id="ssh-key-radio"
          label="SSH key"
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
                  value={data.secret.sshKey}
                  onChange={(_e, value) =>
                    setData({
                      ...data,
                      secret: { ...data.secret, sshKey: value },
                    })
                  }
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
                  />
                </FormGroup>
                <FormGroup label="Token" fieldId="token" isRequired>
                  <PasswordInput
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
