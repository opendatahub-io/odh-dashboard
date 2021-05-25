import React from 'react';
import * as _ from 'lodash';
import { Gallery, PageSection } from '@patternfly/react-core';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { OdhDocument, OdhDocumentType } from '../../types';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import ApplicationsPage from '../ApplicationsPage';
import QuickStarts from '../../App/QuickStarts';
import OdhDocCard from '../../components/OdhDocCard';
import { useQueryParams } from '../../utilities/useQueryParams';
import {
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  DOC_TYPE_FILTER_KEY,
  doesDocAppMatch,
  SEARCH_FILTER_KEY,
  SORT_ASC,
  SORT_DESC,
  SORT_TYPE_NAME,
} from './learningCenterUtils';
import LearningCenterFilters from './LearningCenterFilters';
import { useWatchDocs } from '../../utilities/useWatchDocs';
import { useLocalStorage } from '../../utilities/useLocalStorage';

export const FAVORITE_RESOURCES = 'ods.dashboard.resources.favorites';

const description = `Access all learning resources for Open Data Hub and supported applications.`;

type LearningCenterInnerProps = {
  loaded: boolean;
  loadError?: Error;
  docsLoadError?: Error;
  docsLoaded: boolean;
  filteredDocApps: OdhDocument[];
  docTypeCounts: Record<OdhDocumentType, number>;
  totalCount: number;
  favorites: string[];
  updateFavorite: (isFavorite: boolean, name: string) => void;
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
  }) => {
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
        />
        <PageSection>
          <Gallery className="odh-explore-apps__gallery" hasGutter>
            {filteredDocApps.map((doc) => (
              <OdhDocCard
                key={`${doc.metadata.name}`}
                odhDoc={doc}
                favorite={favorites.includes(doc.metadata.name)}
                updateFavorite={(isFavorite) => updateFavorite(isFavorite, doc.metadata.name)}
              />
            ))}
          </Gallery>
        </PageSection>
      </ApplicationsPage>
    );
  },
);
LearningCenterInner.displayName = 'LearningCenterInner';

const LearningCenter: React.FC = () => {
  const { docs: odhDocs, loaded: docsLoaded, loadError: docsLoadError } = useWatchDocs();
  const { components, loaded, loadError } = useWatchComponents(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [docApps, setDocApps] = React.useState<OdhDocument[]>([]);
  const [docTypesCount, setDocTypesCount] = React.useState<Record<OdhDocumentType, number>>({
    [OdhDocumentType.Documentation]: 0,
    [OdhDocumentType.HowTo]: 0,
    [OdhDocumentType.Tutorial]: 0,
    [OdhDocumentType.QuickStart]: 0,
  });
  const [filteredDocApps, setFilteredDocApps] = React.useState<OdhDocument[]>([]);
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

  React.useEffect(() => {
    if (loaded && !loadError && docsLoaded && !docsLoadError) {
      const updatedDocApps = odhDocs.map((odhDoc) => {
        if (!odhDoc.spec.img || !odhDoc.spec.description) {
          const odhApp = components.find((c) => c.metadata.name === odhDoc.spec.appName);
          if (odhApp) {
            const updatedDoc = _.cloneDeep(odhDoc);
            updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
            updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
            updatedDoc.spec.provider = odhDoc.spec.provider || odhApp.spec.provider;
            return updatedDoc;
          }
        }
        return odhDoc;
      });

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
              img: component.spec.img,
            },
          };
          updatedDocApps.push(odhDoc);
        }
      });

      // Add doc cards for all quick starts
      qsContext.allQuickStarts?.forEach((quickStart) => {
        const odhDoc: OdhDocument = _.merge({}, quickStart, {
          metadata: { type: OdhDocumentType.QuickStart },
        });
        updatedDocApps.push(odhDoc);
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
          let sortVal =
            sortType === SORT_TYPE_NAME
              ? a.spec.displayName.localeCompare(b.spec.displayName)
              : a.metadata.type.localeCompare(b.metadata.type);
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
        [OdhDocumentType.Documentation]: 0,
        [OdhDocumentType.HowTo]: 0,
        [OdhDocumentType.Tutorial]: 0,
        [OdhDocumentType.QuickStart]: 0,
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
    />
  );
};

const LearningCenterWrapper: React.FC = () => (
  <QuickStarts>
    <LearningCenter />
  </QuickStarts>
);

export default LearningCenterWrapper;
