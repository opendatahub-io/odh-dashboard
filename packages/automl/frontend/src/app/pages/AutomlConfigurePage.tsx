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
import React, { useState } from 'react';
import { FieldPath, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import AutomlCreate from '~/app/components/create/AutomlCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useCreatePipelineRunMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { automlExperimentsPathname, automlResultsPathname } from '~/app/utilities/routes';

const configureSchema = createConfigureSchema();
const createFields = ['display_name', 'description'] as const satisfies Array<
  FieldPath<ConfigureSchema>
>;

function AutomlConfigurePage(): React.JSX.Element {
  const navigate = useNavigate();
  const notification = useNotification();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const pipelineRunsMutation = useCreatePipelineRunMutation(namespace ?? '');

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });

  const [displayName] = useWatch({
    control: form.control,
    name: createFields,
  });

  const [step, setStep] = useState<'create' | 'configure'>('create');

  const createActions = (
    <>
      <ActionListItem>
        <Button
          type="submit"
          variant="primary"
          isDisabled={!configureSchema.base.shape.display_name.safeParse(displayName).success}
        >
          Next
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          component={(props) => (
            <Link {...props} to={`${automlExperimentsPathname}/${namespace}`} />
          )}
          variant="link"
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
          Create run
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
      title={<AutomlHeader />}
      subtext={
        <h2 className="pf-v6-u-mt-sm">
          {step === 'create' ? (
            'Create AutoML optimization run'
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
          <Content>Automatically configure and optimize your machine learning workflows.</Content>
        )
      }
      breadcrumb={
        step === 'configure' && (
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={getRedirectPath(namespace!)}>AutoML: {namespace}</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive data-testid="configure-breadcrumb-name">
              <Truncate content={displayName || ''} />
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
                  navigate(`${automlResultsPathname}/${namespace}/${pipelineRun.run_id}`);
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
              {step === 'create' ? <AutomlCreate /> : <AutomlConfigure />}
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

export default AutomlConfigurePage;
