import { zodResolver } from '@hookform/resolvers/zod';
import { ActionGroup, Breadcrumb, BreadcrumbItem, Button, Form } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React, { useState } from 'react';
import { FormProvider, useForm, Watch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { autoragConfigurePathname, autoragExperimentsPathname } from '~/app/utilities/routes';
import AutoragConfigure from '../components/configure/AutoragConfigure';
import { createExperimentSchema } from '../schemas/experiment.schema';

const experimentSchema = createExperimentSchema();
const createFields = ['name', 'description'] as const;

function AutoragConfigurePage(): React.JSX.Element {
  const navigate = useNavigate();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(experimentSchema.complete),
    defaultValues: experimentSchema.defaults,
  });

  const [step, setStep] = useState<'create' | 'configure'>('create');

  const createActions = (
    <ActionGroup>
      <Watch
        control={form.control}
        name={createFields}
        render={() => (
          <Button
            variant="primary"
            isDisabled={
              !form.formState.isDirty ||
              createFields.some((field) => form.getFieldState(field).invalid)
            }
            onClick={() => {
              setStep('configure');
            }}
          >
            Next
          </Button>
        )}
      />
      <Button
        variant="link"
        onClick={() => {
          navigate(autoragExperimentsPathname);
        }}
      >
        Cancel
      </Button>
    </ActionGroup>
  );

  const configureActions = (
    <ActionGroup>
      <Button
        variant="primary"
        isDisabled={!form.formState.isValid}
        onClick={() => {
          form.handleSubmit(() => {
            navigate(`${autoragConfigurePathname}/FAKE_EXPERIMENT_ID`);
          })();
        }}
      >
        Create
      </Button>
      <Button
        variant="link"
        onClick={() => {
          setStep('create');
        }}
      >
        Back
      </Button>
    </ActionGroup>
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      description={
        step === 'create' && (
          <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
        )
      }
      breadcrumb={
        step === 'configure' && (
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={getRedirectPath(namespace!)}>AutoRAG: {namespace}</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>
              <Watch control={form.control} name="name" render={(name) => name} />
            </BreadcrumbItem>
          </Breadcrumb>
        )
      }
      empty={noNamespaces || invalidNamespace}
      emptyStatePage={<InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />}
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
      provideChildrenPadding
    >
      <FormProvider {...form}>
        <Form>
          {step === 'create' ? <AutoragCreate /> : <AutoragConfigure />}
          {step === 'create' ? createActions : configureActions}
        </Form>
      </FormProvider>
    </ApplicationsPage>
  );
}

export default AutoragConfigurePage;
