import * as React from 'react';
import { Alert, Bullseye } from '@patternfly/react-core';
import {
  ApplicationsPage,
  KubeflowDocs,
  ProjectObjectType,
  TitleWithIcon,
  typedEmptyImage,
  WhosMyAdministrator,
} from 'mod-arch-shared';
import { useThemeContext } from 'mod-arch-kubeflow';
import { Outlet } from 'react-router-dom';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { EmptyCatalogState, hasSourcesWithModels } from '~/app/shared/components/catalog';
import { AGENTS_CATALOG_TITLE, AGENTS_CATALOG_DESCRIPTION } from '~/app/pages/agentsCatalog/const';

const AgentsCatalogCoreLoader: React.FC = () => {
  const { catalogSources, catalogSourcesLoaded, catalogSourcesLoadError } =
    React.useContext(AgentsCatalogContext);
  const { isMUITheme } = useThemeContext();

  if (catalogSourcesLoadError) {
    return (
      <ApplicationsPage
        noTitle
        title={
          <TitleWithIcon
            title={AGENTS_CATALOG_TITLE}
            objectType={ProjectObjectType.agentsCatalog}
          />
        }
        description={AGENTS_CATALOG_DESCRIPTION}
        headerContent={null}
        empty
        emptyStatePage={
          <Bullseye>
            <Alert title="Agents catalog source load error" variant="danger" isInline>
              {catalogSourcesLoadError.message}
            </Alert>
          </Bullseye>
        }
        loaded
      />
    );
  }

  if (!catalogSourcesLoaded) {
    return (
      <ApplicationsPage
        noTitle
        title={
          <TitleWithIcon
            title={AGENTS_CATALOG_TITLE}
            objectType={ProjectObjectType.agentsCatalog}
          />
        }
        description={AGENTS_CATALOG_DESCRIPTION}
        headerContent={null}
        empty
        emptyStatePage={<Bullseye>Loading catalog sources...</Bullseye>}
        loaded={false}
      />
    );
  }

  if (catalogSources?.items?.length === 0 || !hasSourcesWithModels(catalogSources)) {
    return (
      <ApplicationsPage
        noTitle
        title={
          <TitleWithIcon
            title={AGENTS_CATALOG_TITLE}
            objectType={ProjectObjectType.agentsCatalog}
          />
        }
        description={AGENTS_CATALOG_DESCRIPTION}
        empty
        emptyStatePage={
          <EmptyCatalogState
            testid="empty-agents-catalog-state"
            title="Agents catalog configuration required"
            description={
              isMUITheme
                ? 'To discover agents, follow the instructions in the docs below.'
                : 'There are no agent sources to display. Request that your administrator configure agent sources for the catalog.'
            }
            headerIcon={() => (
              <img src={typedEmptyImage(ProjectObjectType.modelRegistrySettings)} alt="" />
            )}
            primaryAction={isMUITheme ? <KubeflowDocs /> : <WhosMyAdministrator />}
          />
        }
        headerContent={null}
        loaded
        provideChildrenPadding
      />
    );
  }

  return <Outlet />;
};

export default AgentsCatalogCoreLoader;
