import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Gallery, PageSection, PageSectionProps, Stack } from '@patternfly/react-core';
import { QuickStartContext, QuickStartContextValues } from '@patternfly/quickstarts';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import { SectionType } from '~/concepts/design/utils';
import { OdhDocument, OdhDocumentType } from '~/types';
import OdhDocCard from '~/components/OdhDocCard';
import { useWatchComponents } from '~/utilities/useWatchComponents';

const QuickStartsSection: React.FC<PageSectionProps> = ({ ...rest }) => {
  const navigate = useNavigate();
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const { components, loaded, loadError } = useWatchComponents(false);
  const [shownQuickStarts, setShownQuickStarts] = React.useState<OdhDocument[]>([]);

  React.useEffect(() => {
    if (loaded && !loadError) {
      const quickStarts =
        qsContext.allQuickStarts?.slice(0, 4).map((quickStart) => {
          const odhDoc = quickStart as unknown as OdhDocument;
          const odhApp = components.find((c) => c.metadata.name === odhDoc.spec.appName);
          const updatedDoc = {
            ...odhDoc,
            spec: { ...odhDoc.spec, type: OdhDocumentType.QuickStart },
          };
          if (odhApp) {
            updatedDoc.spec.appDisplayName = odhApp.spec.displayName;
            updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
            updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
          }
          return updatedDoc;
        }) ?? [];
      setShownQuickStarts(quickStarts);
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
