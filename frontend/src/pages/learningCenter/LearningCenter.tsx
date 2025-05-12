import React from 'react';
import useDimensions from 'react-cool-dimensions';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhDocument } from '~/types';
import { useBrowserStorage } from '~/components/browserStorage/BrowserStorageContext';
import { useQueryParams } from '~/utilities/useQueryParams';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { DOC_LINK, ODH_PRODUCT_NAME } from '~/utilities/const';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { useDocResources } from '~/concepts/docResources/useDocResources';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
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
import LearningCenterDataView from './LearningCenterDataView';

import './LearningCenter.scss';

const description = `Access all learning resources for ${ODH_PRODUCT_NAME} and supported applications.`;
const docText = ` To learn more about ${ODH_PRODUCT_NAME}, `;

const LearningCenter: React.FC = () => {
  const [filteredDocApps, setFilteredDocApps] = React.useState<OdhDocument[]>([]);
  const queryParams = useQueryParams();
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;
  const [favorites, setFavorites] = useBrowserStorage<string[]>(FAVORITE_RESOURCES, []);
  const favoriteResources = useDeepCompareMemoize(favorites);
  const docFilterer = useDocFilterer(favoriteResources);
  const [viewType, setViewType] = useBrowserStorage<string>(VIEW_TYPE, '', false);
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(false);
  const [filtersCollapsible, setFiltersCollapsible] = React.useState(false);
  const { docs, loaded, loadError } = useDocResources();

  const { observe } = useDimensions({
    breakpoints: { sm: 0, md: 600 },
    onResize: ({ currentBreakpoint }) => {
      setFiltersCollapsed(currentBreakpoint === 'sm');
      setFiltersCollapsible(currentBreakpoint === 'sm');
    },
  });

  React.useEffect(() => {
    const filtered = docFilterer(docs);
    setFilteredDocApps(
      filtered.toSorted((a, b) => {
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
            sortVal = a.spec.type.localeCompare(b.spec.type);
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
  }, [docs, docFilterer, sortOrder, sortType]);

  const updateFavorite = React.useCallback(
    (isFavorite: boolean, name: string): void => {
      const updatedFavorites = [...favoriteResources];
      const index = updatedFavorites.indexOf(name);
      if (isFavorite && index === -1) {
        updatedFavorites.push(name);
      } else if (!isFavorite && index !== -1) {
        updatedFavorites.splice(index, 1);
      }
      setFavorites(updatedFavorites);
    },
    [favoriteResources, setFavorites],
  );

  const docLink = DOC_LINK ? (
    <>
      {docText}
      <a href={DOC_LINK} target="_blank" rel="noopener noreferrer">
        view the documentation. <ExternalLinkAltIcon />
      </a>
    </>
  ) : null;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="Resources" objectType={ProjectObjectType.resources} />}
      description={
        <>
          {description}
          {docLink}
        </>
      }
      loaded={loaded}
      loadError={loadError}
      empty={false}
    >
      <div
        style={{ height: '100%' }}
        className="odh-dashboard__page-content"
        data-id="page-content"
        ref={observe}
      >
        <LearningCenterFilters
          docApps={docs}
          collapsible={filtersCollapsible}
          collapsed={filtersCollapsed}
          onCollapse={() => setFiltersCollapsed(true)}
          favorites={favoriteResources}
        />
        <div className="odh-learning-paths__view-panel">
          <LearningCenterToolbar
            count={filteredDocApps.length}
            totalCount={docs.length}
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

export default LearningCenter;
