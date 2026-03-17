import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import classNames from 'classnames';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React, { useState } from 'react';
import { FieldPath, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { usePipelineRunsMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { autoragExperimentsPathname, autoragResultsPathname } from '~/app/utilities/routes';

const configureSchema = createConfigureSchema();
const createFields = [
  'display_name',
  'description',
  'llama_stack_secret_name',
] as const satisfies Array<FieldPath<ConfigureSchema>>;

function AutoragConfigurePage(): React.JSX.Element {
  const navigate = useNavigate();
  const notification = useNotification();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const pipelineRunsMutation = usePipelineRunsMutation(namespace ?? '');

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });

  const [displayName, , llamaStackSecretName] = useWatch({
    control: form.control,
    name: createFields,
  });

  const [step, setStep] = useState<'create' | 'configure'>('create');

  const createActions = (
    <>
      <ActionListItem>
        <Button type="submit" variant="primary" isDisabled={!displayName || !llamaStackSecretName}>
          Next
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          onClick={() => {
            navigate(autoragExperimentsPathname);
          }}
        >
          Cancel
        </Button>
      </ActionListItem>
    </>
  );

  const configureActions = (
    <>
      <ActionListItem>
        <Button
          type="submit"
          variant="primary"
          isDisabled={!form.formState.isValid || form.formState.isSubmitting}
        >
          Run experiment
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          onClick={() => {
            setStep('create');
          }}
        >
          Back
        </Button>
      </ActionListItem>
    </>
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      subtext={
        <h2 className="pf-v6-u-mt-sm">
          {step === 'create' ? 'Create AutoRAG experiment' : `"${displayName}" configurations`}
        </h2>
      }
      description={
        step === 'create' && (
          <Content>
            Automatically configure and optimize your Retrieval-Augmented Generation workflows.
          </Content>
        )
      }
      breadcrumb={
        step === 'configure' && (
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={getRedirectPath(namespace!)}>AutoRAG: {namespace}</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
          </Breadcrumb>
        )
      }
      empty={noNamespaces || invalidNamespace}
      emptyStatePage={<InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />}
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
    >
      <FormProvider {...form}>
        <Stack
          component="form"
          className="pf-v6-u-h-100"
          hasGutter
          noValidate
          onSubmit={(event) => {
            event.preventDefault();

            if (step === 'create') {
              setStep('configure');
              return;
            }

            form.handleSubmit(
              async (data: ConfigureSchema) => {
                try {
                  const pipelineRun = await pipelineRunsMutation.mutateAsync(data);
                  navigate(`${autoragResultsPathname}/${namespace}/${pipelineRun.run_id}`);
                } catch (error) {
                  notification.error(
                    'Failed to create pipeline run',
                    error instanceof Error ? error.message : '',
                  );
                }
              },
              // this `onInvalid` case should be impossible to hit
              // since we disable the button when the form is invalid
              () => notification.error('Form is invalid'),
            )();
          }}
        >
          <StackItem isFilled>
            <PageSection
              className={classNames(
                'pf-v6-c-form',
                'pf-v6-u-py-0',
                step === 'configure' && 'pf-v6-u-h-100',
              )}
              hasBodyWrapper={false}
            >
              {step === 'create' ? <AutoragCreate /> : <AutoragConfigure />}
            </PageSection>
          </StackItem>
          <StackItem>
            <PageSection hasBodyWrapper={false} hasShadowTop>
              <ActionList>
                <ActionListGroup>
                  {step === 'create' ? createActions : configureActions}
                </ActionListGroup>
              </ActionList>
            </PageSection>
          </StackItem>
        </Stack>
      </FormProvider>
    </ApplicationsPage>
  );
}

export default AutoragConfigurePage;
