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
  Truncate,
} from '@patternfly/react-core';
import classNames from 'classnames';
import { ApplicationsPage } from 'mod-arch-shared';
import React, { useCallback, useState } from 'react';
import { FieldPath, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useCreatePipelineRunMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import type { SecretSelection } from '~/app/components/common/SecretSelector';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { autoragExperimentsPathname, autoragResultsPathname } from '~/app/utilities/routes';

const configureSchema = createConfigureSchema();
const createFields = [
  'display_name',
  'description',
  'llama_stack_secret_name',
] as const satisfies Array<FieldPath<ConfigureSchema>>;

type AutoragConfigurePageProps = {
  initialValues?: Partial<ConfigureSchema>;
  /** Pre-resolved S3 connection secret for reconfigure flows. */
  initialInputDataSecret?: SecretSelection;
  /** Pre-resolved Llama Stack connection secret for reconfigure flows. */
  initialLlamaStackSecret?: SecretSelection;
  /** When reconfiguring, the run ID of the source run (used for cancel navigation). */
  sourceRunId?: string;
  /** When reconfiguring, the display name of the source run (used in the page title). */
  sourceRunName?: string;
};

function AutoragConfigurePage({
  initialValues,
  initialInputDataSecret,
  initialLlamaStackSecret,
  sourceRunId,
  sourceRunName,
}: AutoragConfigurePageProps): React.JSX.Element {
  const navigate = useNavigate();
  const notification = useNotification();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const pipelineRunsMutation = useCreatePipelineRunMutation(namespace ?? '');

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...initialValues },
  });

  const [displayName, , llamaStackSecretName] = useWatch({
    control: form.control,
    name: createFields,
  });

  const [step, setStep] = useState<'create' | 'configure'>('create');

  const onCancel = useCallback(() => navigate(-1), [navigate]);

  const createActions = (
    <>
      <ActionListItem>
        <Button
          type="submit"
          variant="primary"
          isDisabled={
            !configureSchema.base.shape.display_name.safeParse(displayName).success ||
            !configureSchema.base.shape.llama_stack_secret_name.safeParse(llamaStackSecretName)
              .success
          }
        >
          Next
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button variant="link" onClick={onCancel}>
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
          isLoading={form.formState.isSubmitting}
          spinnerAriaValueText="Submitting"
        >
          {sourceRunId ? 'Create new run' : 'Create run'}
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          isDisabled={form.formState.isSubmitting}
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
      title={<AutoragHeader />}
      subtext={
        <h2 className="pf-v6-u-mt-sm">
          {step === 'create' ? (
            sourceRunId && sourceRunName ? (
              <>
                Reconfigure &quot;
                <Truncate content={sourceRunName} />
                &quot;
              </>
            ) : (
              'Create AutoRAG optimization run'
            )
          ) : (
            <span data-testid="configure-step-subtitle">
              &quot;
              <Truncate content={displayName || ''} />
              &quot; configurations
            </span>
          )}
        </h2>
      }
      description={
        step === 'create' && (
          <Content>
            Automatically test and tune retrieval, indexing, and model settings to improve
            Retrieval-Augmented Generation (RAG) response quality.
            {sourceRunId && (
              <>
                <br />
                Settings from the previous run have been automatically populated. You can modify any
                configurations as needed.
              </>
            )}
          </Content>
        )
      }
      breadcrumb={
        (step === 'configure' || sourceRunId) && (
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={getRedirectPath(namespace!)}>AutoRAG: {namespace}</Link>
            </BreadcrumbItem>
            {sourceRunId && sourceRunName && (
              <BreadcrumbItem data-testid="configure-breadcrumb-source-run">
                <Link to={`${autoragResultsPathname}/${namespace}/${sourceRunId}`}>
                  <Truncate content={sourceRunName} />
                </Link>
              </BreadcrumbItem>
            )}
            <BreadcrumbItem isActive data-testid="configure-breadcrumb-name">
              {sourceRunId ? 'Reconfigure' : <Truncate content={displayName || ''} />}
            </BreadcrumbItem>
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
          className={classNames('pf-v6-u-h-0', 'pf-v6-u-flex-fill')}
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
          <StackItem className="pf-v6-u-h-0" isFilled>
            <PageSection
              className={classNames(
                'pf-v6-c-form',
                'pf-v6-u-py-0',
                step === 'configure' && 'pf-v6-u-h-100',
              )}
              hasBodyWrapper={false}
            >
              {step === 'create' ? (
                <AutoragCreate initialLlamaStackSecret={initialLlamaStackSecret} />
              ) : (
                <AutoragConfigure
                  initialValues={initialValues}
                  initialInputDataSecret={initialInputDataSecret}
                />
              )}
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
