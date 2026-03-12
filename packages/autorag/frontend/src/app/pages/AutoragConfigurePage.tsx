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
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { autoragConfigurePathname, autoragExperimentsPathname } from '~/app/utilities/routes';
import AutoragConfigure from '../components/configure/AutoragConfigure';
import { createConfigureSchema } from '../schemas/configure.schema';

const configureSchema = createConfigureSchema();
const createFields = ['display_name', 'description'] as const;

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
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });

  const [displayName] = useWatch({ control: form.control, name: createFields });

  const [step, setStep] = useState<'create' | 'configure'>('create');

  const createActions = (
    <>
      <ActionListItem>
        <Button
          variant="primary"
          isDisabled={!displayName}
          onClick={() => {
            setStep('configure');
          }}
        >
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
          variant="primary"
          isDisabled={!form.formState.isValid}
          onClick={() => {
            form.handleSubmit(() => {
              navigate(`${autoragConfigurePathname}/FAKE_EXPERIMENT_ID`);
            })();
          }}
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
          className="pf-v6-u-h-100"
          hasGutter
          component="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
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
