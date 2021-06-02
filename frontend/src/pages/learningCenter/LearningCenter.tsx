import React from 'react';
import * as classNames from 'classnames';
import * as _ from 'lodash';
import useDimensions from 'react-cool-dimensions';
import { Gallery, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHDoc, ODHDocType } from '../../types';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import { useWatchDocs } from '../../utilities/useWatchDocs';
import { useLocalStorage } from '../../utilities/useLocalStorage';
import { useQueryParams } from '../../utilities/useQueryParams';
import ApplicationsPage from '../ApplicationsPage';
import QuickStarts from '../../app/QuickStarts';
import OdhDocCard from '../../components/OdhDocCard';
import OdhDocListItem from '../../components/OdhDocListItem';
import {
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  DOC_TYPE_FILTER_KEY,
  doesDocAppMatch,
  SEARCH_FILTER_KEY,
  SORT_ASC,
  SORT_DESC,
  SORT_TYPE_APPLICATION,
  SORT_TYPE_DURATION,
  SORT_TYPE_NAME,
  SORT_TYPE_TYPE,
} from './learningCenterUtils';
import LearningCenterListHeader from './LearningCenterListHeader';
import LearningCenterFilters from './LearningCenterFilters';
import { CARD_VIEW, LIST_VIEW, VIEW_TYPE } from './const';

import './LearningCenter.scss';

export const FAVORITE_RESOURCES = 'rhods.dashboard.resources.favorites';
const description = `Access all learning resources for Red Hat OpenShift Data Science and supported applications.`;

type LearningCenterInnerProps = {
  loaded: boolean;
  loadError?: Error;
  docsLoadError?: Error;
  docsLoaded: boolean;
  filteredDocApps: ODHDoc[];
  docTypeCounts: Record<ODHDocType, number>;
  totalCount: number;
  favorites: string[];
  updateFavorite: (isFavorite: boolean, name: string) => void;
  viewType: string;
  updateViewType: (updatedType: string) => void;
};

const LearningCenterInner: React.FC<LearningCenterInnerProps> = React.memo(
  ({
    loaded,
    loadError,
    docsLoaded,
    docsLoadError,
    filteredDocApps,
    docTypeCounts,
    totalCount,
    favorites,
    updateFavorite,
    viewType,
    updateViewType,
  }) => {
    const [sizeClass, setSizeClass] = React.useState<string>('m-ods-size-lg');
    const { observe } = useDimensions({
      breakpoints: { sm: 0, md: 600, lg: 750 },
      onResize: ({ currentBreakpoint }) => {
        setSizeClass(`m-odh-size-${currentBreakpoint}`);
      },
    });

    const listViewClasses = classNames('odh-learning-paths__list-view', sizeClass);
    return (
      <ApplicationsPage
        title="Resources"
        description={description}
        loaded={loaded && docsLoaded}
        loadError={loadError || docsLoadError}
        empty={false}
      >
        <LearningCenterFilters
          count={filteredDocApps.length}
          totalCount={totalCount}
          docTypeStatusCount={docTypeCounts}
          viewType={viewType}
          updateViewType={updateViewType}
        />
        <PageSection
          variant={viewType === LIST_VIEW ? PageSectionVariants.light : PageSectionVariants.default}
          hasShadowTop={viewType === LIST_VIEW}
        >
          {viewType !== LIST_VIEW ? (
            <Gallery className="odh-learning-paths__gallery" hasGutter>
              {filteredDocApps.map((doc) => (
                <OdhDocCard
                  key={`${doc.metadata.name}`}
                  odhDoc={doc}
                  favorite={favorites.includes(doc.metadata.name)}
                  updateFavorite={(isFavorite) => updateFavorite(isFavorite, doc.metadata.name)}
                />
              ))}
            </Gallery>
          ) : (
            <div className={listViewClasses} aria-label="Simple data list example">
              <LearningCenterListHeader />
              {filteredDocApps.map((doc) => (
                <OdhDocListItem
                  key={`${doc.metadata.name}`}
                  odhDoc={doc}
                  favorite={favorites.includes(doc.metadata.name)}
                  updateFavorite={(isFavorite) => updateFavorite(isFavorite, doc.metadata.name)}
                />
              ))}
            </div>
          )}
        </PageSection>
        <div ref={observe} />
      </ApplicationsPage>
    );
  },
);
LearningCenterInner.displayName = 'LearningCenterInner';

const LearningCenter: React.FC = () => {
  const { docs: odhDocs, loaded: docsLoaded, loadError: docsLoadError } = useWatchDocs();
  const { components, loaded, loadError } = useWatchComponents(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [docApps, setDocApps] = React.useState<ODHDoc[]>([]);
  const [docTypesCount, setDocTypesCount] = React.useState<Record<ODHDocType, number>>({
    [ODHDocType.Documentation]: 0,
    [ODHDocType.HowTo]: 0,
    [ODHDocType.Tutorial]: 0,
    [ODHDocType.QuickStart]: 0,
  });
  const [filteredDocApps, setFilteredDocApps] = React.useState<ODHDoc[]>([]);
  const queryParams = useQueryParams();
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';
  const filters = queryParams.get(DOC_TYPE_FILTER_KEY);
  const typeFilters = React.useMemo(() => {
    return filters?.split(',') || [];
  }, [filters]);
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;
  const [favorites, setFavorites] = useLocalStorage(FAVORITE_RESOURCES);
  const favoriteResources = React.useMemo(() => JSON.parse(favorites || '[]'), [favorites]);
  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);

  React.useEffect(() => {
    if (loaded && !loadError && docsLoaded && !docsLoadError) {
      const docs = [...odhDocs];

      // Add doc cards for all components' documentation
      components.forEach((component) => {
        if (component.spec.docsLink) {
          const odhDoc: ODHDoc = {
            metadata: {
              name: `${component.metadata.name}-doc`,
              type: ODHDocType.Documentation,
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
        const odhDoc: ODHDoc = _.merge({}, quickStart, {
          metadata: { type: ODHDocType.QuickStart },
        });
        docs.push(odhDoc);
      });

      const updatedDocApps = docs.map((odhDoc) => {
        const odhApp = components.find((c) => c.metadata.name === odhDoc.spec.appName);
        if (odhApp) {
          const updatedDoc = _.cloneDeep(odhDoc);
          updatedDoc.spec.appDisplayName = odhDoc.spec.appDisplayName || odhApp.spec.displayName;
          updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
          updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
          updatedDoc.spec.provider = odhDoc.spec.provider || odhApp.spec.provider;
          return updatedDoc;
        }
        return odhDoc;
      });

      setDocApps(updatedDocApps);
    }
  }, [components, loaded, loadError, odhDocs, docsLoaded, docsLoadError, qsContext.allQuickStarts]);

  React.useEffect(() => {
    setFilteredDocApps(
      docApps
        .filter((doc) => doc.metadata.type !== 'getting-started')
        .filter((doc) => doesDocAppMatch(doc, searchQuery, typeFilters))
        .sort((a, b) => {
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
    const docCounts = docApps.reduce(
      (acc, docApp) => {
        if (acc[docApp.metadata.type] !== undefined) {
          acc[docApp.metadata.type]++;
        }
        return acc;
      },
      {
        [ODHDocType.Documentation]: 0,
        [ODHDocType.HowTo]: 0,
        [ODHDocType.Tutorial]: 0,
        [ODHDocType.QuickStart]: 0,
      },
    );
    setDocTypesCount(docCounts);
    // Do not include favoriteResources change to prevent re-sorting when favoriting/unfavoriting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docApps, searchQuery, typeFilters, sortOrder, sortType]);

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

  return (
    <LearningCenterInner
      loaded={loaded}
      loadError={loadError}
      docsLoaded={docsLoaded}
      docsLoadError={docsLoadError}
      filteredDocApps={filteredDocApps}
      docTypeCounts={docTypesCount}
      totalCount={docApps.length}
      favorites={favoriteResources}
      updateFavorite={updateFavorite}
      viewType={viewType || CARD_VIEW}
      updateViewType={setViewType}
    />
  );
};

const LearningCenterWrapper: React.FC = () => (
  <QuickStarts>
    <LearningCenter />
  </QuickStarts>
);

export default LearningCenterWrapper;
