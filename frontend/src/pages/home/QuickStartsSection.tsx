import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Gallery, PageSection, PageSectionProps, Stack } from '@patternfly/react-core';
import { QuickStartContext, QuickStartContextValues } from '@patternfly/quickstarts';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import { SectionType } from '~/concepts/design/utils';
import { OdhDocument } from '~/types';
import OdhDocCard from '~/components/OdhDocCard';
import { useWatchComponents } from '~/utilities/useWatchComponents';
import { getQuickStartDocs } from '~/pages/learningCenter/utils';

const QuickStartsSection: React.FC<PageSectionProps> = ({ ...rest }) => {
  const navigate = useNavigate();
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const { components, loaded, loadError } = useWatchComponents(false);
  const [shownQuickStarts, setShownQuickStarts] = React.useState<OdhDocument[]>([]);

  React.useEffect(() => {
    if (loaded && !loadError) {
      const quickStartDocs = getQuickStartDocs(qsContext.allQuickStarts || [], components);
      setShownQuickStarts(quickStartDocs.slice(0, 4));
    }
  }, [loaded, loadError, qsContext.allQuickStarts, components]);

  if (shownQuickStarts.length === 0) {
    return null;
  }

  return (
    <PageSection data-testid="landing-page-quick-starts" {...rest}>
      <CollapsibleSection
        sectionType={SectionType.setup}
        title="Get oriented with quick starts"
        titleComponent="h1"
      >
        <Stack hasGutter>
          <Gallery
            hasGutter
            minWidths={{ default: '225px', md: '225px' }}
            maxWidths={{ default: '100%', md: 'calc(25% - 3rem / 4)' }}
          >
            {shownQuickStarts.map((doc) => (
              <OdhDocCard
                key={`${doc.metadata.name}`}
                odhDoc={doc as unknown as OdhDocument}
                showFavorite={false}
              />
            ))}
          </Gallery>
          <Button variant="link" isInline onClick={() => navigate('/resources')}>
            View all resources
          </Button>
        </Stack>
      </CollapsibleSection>
    </PageSection>
  );
};

export default QuickStartsSection;
