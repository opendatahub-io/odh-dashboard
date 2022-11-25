import React from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
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
import { OdhDocument } from '../../types';
import { removeQueryArgument } from '../../utilities/router';
import OdhDocCard from '../../components/OdhDocCard';
import OdhDocListItem from '../../components/OdhDocListItem';
import {
  LIST_VIEW,
  ENABLED_FILTER_KEY,
  SEARCH_FILTER_KEY,
  DOC_TYPE_FILTER_KEY,
  PROVIDER_FILTER_KEY,
  CATEGORY_FILTER_KEY,
} from './const';
import LearningCenterListHeader from './LearningCenterListHeader';

type LearningCenterDataViewProps = {
  filteredDocApps: OdhDocument[];
  favorites: string[];
  updateFavorite: (isFavorite: boolean, name: string) => void;
  viewType: string;
};

const LearningCenterDataView: React.FC<LearningCenterDataViewProps> = React.memo(
  ({ filteredDocApps, favorites, updateFavorite, viewType }) => {
    const navigate = useNavigate();
    const [sizeClass, setSizeClass] = React.useState('m-ods-size-lg');
    const { observe } = useDimensions({
      breakpoints: { sm: 0, md: 600, lg: 750 },
      onResize: ({ currentBreakpoint }) => {
        setSizeClass(`m-odh-size-${currentBreakpoint}`);
      },
    });

    const onClearFilters = () => {
      removeQueryArgument(navigate, SEARCH_FILTER_KEY);
      removeQueryArgument(navigate, CATEGORY_FILTER_KEY);
      removeQueryArgument(navigate, ENABLED_FILTER_KEY);
      removeQueryArgument(navigate, DOC_TYPE_FILTER_KEY);
      removeQueryArgument(navigate, PROVIDER_FILTER_KEY);
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
          <Gallery role="list" className="odh-learning-paths__gallery" hasGutter>
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

export default LearningCenterDataView;
