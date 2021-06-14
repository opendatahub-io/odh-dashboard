import React from 'react';
import { useHistory } from 'react-router';
import classNames from 'classnames';
import * as _ from 'lodash';
import useDimensions from 'react-cool-dimensions';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  EmptyStateVariant,
  Gallery,
  PageSection,
  PageSectionVariants,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { OdhDocument, OdhDocumentType } from '../../types';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import { useWatchDocs } from '../../utilities/useWatchDocs';
import { useLocalStorage } from '../../utilities/useLocalStorage';
import { useQueryParams } from '../../utilities/useQueryParams';
import { removeQueryArgument } from '../../utilities/router';
import ApplicationsPage from '../ApplicationsPage';
import QuickStarts from '../../app/QuickStarts';
import OdhDocCard from '../../components/OdhDocCard';
import OdhDocListItem from '../../components/OdhDocListItem';
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
  LIST_VIEW,
  VIEW_TYPE,
  ENABLED_FILTER_KEY,
  SEARCH_FILTER_KEY,
  DOC_TYPE_FILTER_KEY,
  PROVIDER_FILTER_KEY,
  CATEGORY_FILTER_KEY,
} from './const';
import LearningCenterListHeader from './LearningCenterListHeader';
import LearningCenterToolbar from './LearningCenterToolbar';
import LearningCenterFilters from './LearningCenterFilters';
import { useDocFilterer } from './useDocFilterer';

import './LearningCenter.scss';
import { combineCategoryAnnotations } from '../../utilities/utils';

export const FAVORITE_RESOURCES = 'ods.dashboard.resources.favorites';

const description = `Access all learning resources for Open Data Hub and supported applications.`;

type LearningCenterDataViewProps = {
  filteredDocApps: OdhDocument[];
  favorites: string[];
  updateFavorite: (isFavorite: boolean, name: string) => void;
  viewType: string;
};

const LearningCenterDataView: React.FC<LearningCenterDataViewProps> = React.memo(
  ({ filteredDocApps, favorites, updateFavorite, viewType }) => {
    const history = useHistory();
    const [sizeClass, setSizeClass] = React.useState<string>('m-ods-size-lg');
    const { observe } = useDimensions({
      breakpoints: { sm: 0, md: 600, lg: 750 },
      onResize: ({ currentBreakpoint }) => {
        setSizeClass(`m-odh-size-${currentBreakpoint}`);
      },
    });

    const onClearFilters = () => {
      removeQueryArgument(history, SEARCH_FILTER_KEY);
      removeQueryArgument(history, CATEGORY_FILTER_KEY);
      removeQueryArgument(history, ENABLED_FILTER_KEY);
      removeQueryArgument(history, DOC_TYPE_FILTER_KEY);
      removeQueryArgument(history, PROVIDER_FILTER_KEY);
    };

    const renderContent = () => {
      if (filteredDocApps.length === 0) {
        return (
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon icon={SearchIcon} />
            <Title headingLevel="h2" size="lg">
              No results match the filter criteria
            </Title>
            <EmptyStateBody>
              No resources are being shown due to the filters being applied.
            </EmptyStateBody>
            <EmptyStateSecondaryActions>
              <Button variant="link" onClick={onClearFilters}>
                Clear all filters
              </Button>
            </EmptyStateSecondaryActions>
          </EmptyState>
        );
      }

      if (viewType !== LIST_VIEW) {
        return (
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
        );
      }

      const listViewClasses = classNames('odh-learning-paths__list-view', sizeClass);
      return (
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
      );
    };

    return (
      <>
        <PageSection
          isFilled={true}
          variant={viewType === LIST_VIEW ? PageSectionVariants.light : PageSectionVariants.default}
          className={
            viewType === LIST_VIEW
              ? 'odh-learning-paths__view-panel__list-view'
              : 'odh-learning-paths__view-panel__card-view'
          }
        >
          {renderContent()}
        </PageSection>
        <div ref={observe} />
      </>
    );
  },
);
LearningCenterDataView.displayName = 'LearningCenterInner';

const LearningCenter: React.FC = () => {
  const { docs: odhDocs, loaded: docsLoaded, loadError: docsLoadError } = useWatchDocs();
  const { components, loaded, loadError } = useWatchComponents(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [docApps, setDocApps] = React.useState<OdhDocument[]>([]);
  const [filteredDocApps, setFilteredDocApps] = React.useState<OdhDocument[]>([]);
  const queryParams = useQueryParams();
  const docFilterer = useDocFilterer();
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
          console.log(`===== ${updatedDoc.metadata.name}: =>  ${updatedDoc.metadata.annotations}`);
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

  return (
    <ApplicationsPage
      title="Resources"
      description={description}
      loaded={loaded && docsLoaded}
      loadError={loadError || docsLoadError}
      empty={false}
    >
      <div className="odh-learning-paths__content">
        <LearningCenterFilters docApps={docApps} />
        <div className="odh-learning-paths__view-panel">
          <LearningCenterToolbar
            count={filteredDocApps.length}
            totalCount={docApps.length}
            viewType={viewType || CARD_VIEW}
            updateViewType={setViewType}
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
