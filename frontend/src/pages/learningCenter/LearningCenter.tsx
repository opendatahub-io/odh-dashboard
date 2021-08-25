import React from 'react';
import * as _ from 'lodash';
import useDimensions from 'react-cool-dimensions';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhDocument, OdhDocumentType } from '../../types';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import { useWatchDocs } from '../../utilities/useWatchDocs';
import { useLocalStorage } from '../../utilities/useLocalStorage';
import { useQueryParams } from '../../utilities/useQueryParams';
import ApplicationsPage from '../ApplicationsPage';
import QuickStarts from '../../app/QuickStarts';
import {
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  SORT_ASC,
  SORT_DESC,
  SORT_TYPE_APPLICATION,
  SORT_TYPE_DURATION,
  SORT_TYPE_NAME,
  SORT_TYPE_TYPE,
  CARD_VIEW,
  VIEW_TYPE,
  FAVORITE_RESOURCES,
} from './const';
import LearningCenterToolbar from './LearningCenterToolbar';
import LearningCenterFilters from './LearningCenterFilters';
import { useDocFilterer } from './useDocFilterer';
import { DOC_LINK } from '../../utilities/const';
import { combineCategoryAnnotations } from '../../utilities/utils';
import LearningCenterDataView from './LearningCenterDataView';

import './LearningCenter.scss';

const description = `Access all learning resources for Open Data Hub and supported applications.`;
const docText = ` To learn more about Open Data Hub, `;

export const LearningCenter: React.FC = () => {
  const { docs: odhDocs, loaded: docsLoaded, loadError: docsLoadError } = useWatchDocs();
  const { components, loaded, loadError } = useWatchComponents(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [docApps, setDocApps] = React.useState<OdhDocument[]>([]);
  const [filteredDocApps, setFilteredDocApps] = React.useState<OdhDocument[]>([]);
  const queryParams = useQueryParams();
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;
  const [favorites, setFavorites] = useLocalStorage(FAVORITE_RESOURCES);
  const favoriteResources = React.useMemo(() => JSON.parse(favorites || '[]'), [favorites]);
  const docFilterer = useDocFilterer(favoriteResources);
  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);
  const [filtersCollapsed, setFiltersCollapsed] = React.useState<boolean>(false);
  const [filtersCollapsible, setFiltersCollapsible] = React.useState<boolean>(false);
  const { observe } = useDimensions({
    breakpoints: { sm: 0, md: 600 },
    onResize: ({ currentBreakpoint }) => {
      setFiltersCollapsed(currentBreakpoint === 'sm');
      setFiltersCollapsible(currentBreakpoint === 'sm');
    },
  });

  React.useEffect(() => {
    if (loaded && !loadError && docsLoaded && !docsLoadError) {
      const docs = [...odhDocs];

      // Add doc cards for all components' documentation
      components.forEach((component) => {
        if (component.spec.docsLink) {
          const odhDoc: OdhDocument = {
            metadata: {
              name: `${component.metadata.name}-doc`,
              type: OdhDocumentType.Documentation,
            },
            spec: {
              appName: component.metadata.name,
              provider: component.spec.provider,
              url: component.spec.docsLink,
              displayName: component.spec.displayName,
              description: component.spec.description,
            },
          };
          docs.push(odhDoc);
        }
      });

      // Add doc cards for all quick starts
      qsContext.allQuickStarts?.forEach((quickStart) => {
        const odhDoc: OdhDocument = _.merge({}, quickStart, {
          metadata: { type: OdhDocumentType.QuickStart },
        });
        docs.push(odhDoc);
      });

      const updatedDocApps = docs
        .filter((doc) => doc.metadata.type !== 'getting-started')
        .map((odhDoc) => {
          const odhApp = components.find((c) => c.metadata.name === odhDoc.spec.appName);
          const updatedDoc = _.cloneDeep(odhDoc);
          if (odhApp) {
            combineCategoryAnnotations(odhDoc, odhApp);
            updatedDoc.spec.appDisplayName = odhApp.spec.displayName;
            updatedDoc.spec.appEnabled = odhApp.spec.isEnabled ?? false;
            updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
            updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
            updatedDoc.spec.provider = odhDoc.spec.provider || odhApp.spec.provider;
          } else {
            updatedDoc.spec.appEnabled = false;
          }
          return updatedDoc;
        });
      setDocApps(updatedDocApps);
    }
  }, [components, loaded, loadError, odhDocs, docsLoaded, docsLoadError, qsContext.allQuickStarts]);

  React.useEffect(() => {
    const filtered = docFilterer(docApps);
    setFilteredDocApps(
      filtered.sort((a, b) => {
        const aFav = favoriteResources.includes(a.metadata.name);
        const bFav = favoriteResources.includes(b.metadata.name);
        if (aFav && !bFav) {
          return -1;
        }
        if (!aFav && bFav) {
          return 1;
        }
        let sortVal;
        switch (sortType) {
          case SORT_TYPE_NAME:
            sortVal = a.spec.displayName.localeCompare(b.spec.displayName);
            break;
          case SORT_TYPE_TYPE:
            sortVal = a.metadata.type.localeCompare(b.metadata.type);
            break;
          case SORT_TYPE_APPLICATION:
            if (!a.spec.appDisplayName) {
              sortVal = -1;
            } else if (!b.spec.appDisplayName) {
              sortVal = 1;
            } else {
              sortVal = a.spec.appDisplayName.localeCompare(b.spec.appDisplayName);
            }
            break;
          case SORT_TYPE_DURATION:
            sortVal = (a.spec.durationMinutes || 0) - (b.spec.durationMinutes || 0);
            break;
          default:
            sortVal = a.spec.displayName.localeCompare(b.spec.displayName);
        }
        if (sortVal === 0) {
          sortVal = a.spec.displayName.localeCompare(b.spec.displayName);
        }
        if (sortOrder === SORT_DESC) {
          sortVal *= -1;
        }
        return sortVal;
      }),
    );
    // Do not include favoriteResources change to prevent re-sorting when favoriting/unfavoriting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docApps, docFilterer, sortOrder, sortType]);

  const updateFavorite = React.useCallback(
    (isFavorite: boolean, name: string): void => {
      const updatedFavorites = [...favoriteResources];
      const index = updatedFavorites.indexOf(name);
      if (isFavorite) {
        if (index === -1) {
          updatedFavorites.push(name);
        }
      } else {
        if (index !== -1) {
          updatedFavorites.splice(index, 1);
        }
      }
      setFavorites(JSON.stringify(updatedFavorites));
    },
    [favoriteResources, setFavorites],
  );

  const docLink = DOC_LINK ? (
    <>
      {docText}
      <a
        className="odh-dashboard__external-link"
        href={DOC_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        view the documentation.
        <ExternalLinkAltIcon />
      </a>
    </>
  ) : null;

  return (
    <ApplicationsPage
      title="Resources"
      description={
        <>
          {description}
          {docLink}
        </>
      }
      loaded={loaded && docsLoaded}
      loadError={loadError || docsLoadError}
      empty={false}
    >
      <div className="odh-dashboard__page-content" ref={observe}>
        <LearningCenterFilters
          docApps={docApps}
          collapsible={filtersCollapsible}
          collapsed={filtersCollapsed}
          onCollapse={() => setFiltersCollapsed(true)}
          favorites={favoriteResources}
        />
        <div className="odh-learning-paths__view-panel">
          <LearningCenterToolbar
            count={filteredDocApps.length}
            totalCount={docApps.length}
            viewType={viewType || CARD_VIEW}
            updateViewType={setViewType}
            filtersCollapsible={filtersCollapsible}
            onToggleFiltersCollapsed={() => setFiltersCollapsed(!filtersCollapsed)}
          />
          <LearningCenterDataView
            filteredDocApps={filteredDocApps}
            favorites={favoriteResources}
            updateFavorite={updateFavorite}
            viewType={viewType || CARD_VIEW}
          />
        </div>
      </div>
    </ApplicationsPage>
  );
};

const LearningCenterWrapper: React.FC = () => (
  <QuickStarts>
    <LearningCenter />
  </QuickStarts>
);

export default LearningCenterWrapper;
