import React from 'react';
import {
  trackGuidedTourCompleted,
  trackGuidedTourDismissed,
  trackGuidedTourLearnMoreClicked,
  trackGuidedTourPathSelected,
  trackGuidedTourStarted,
  trackGuidedTourSummaryDocsClicked,
  type GuidedTourDismissMethod,
  type GuidedTourEntryPoint,
  type GuidedTourPath,
  type GuidedTourPresentationType,
} from './guidedTourTracking';

type TourStepLike = {
  id: string;
  sectionAvailable: boolean;
  newFeatures: { available: boolean }[];
};

type DismissArgs = {
  dismissMethod: GuidedTourDismissMethod;
  dismissStepId: string;
  dismissStepIndex: number;
  pathStepCount: number;
};

/**
 * Holds tour-session state and fires Segment events via guidedTourTracking helpers.
 * WhatsNewModal should not import Segment utilities directly.
 */
export const useGuidedTourTracking = (
  isAdmin: boolean,
): {
  beginSession: (entryPoint: GuidedTourEntryPoint, isReturningUser: boolean) => void;
  selectPath: (tourPath: GuidedTourPath) => void;
  trackStepView: (step: TourStepLike) => void;
  trackLearnMore: (
    stepId: string,
    destinationUrl: string,
    presentationType: GuidedTourPresentationType,
  ) => void;
  trackSummaryDocs: (destinationUrl: string) => void;
  dismiss: (args: DismissArgs) => void;
  complete: (pathStepCount: number) => void;
  resetSession: () => void;
  tourPath: GuidedTourPath | undefined;
} => {
  const [tourPath, setTourPath] = React.useState<GuidedTourPath | undefined>();
  const entryPointRef = React.useRef<GuidedTourEntryPoint>('auto-launch');
  const viewedStepIdsRef = React.useRef<Set<string>>(new Set());
  const hadUnavailableFeaturesRef = React.useRef(false);

  const resetSession = React.useCallback(() => {
    setTourPath(undefined);
    viewedStepIdsRef.current = new Set();
    hadUnavailableFeaturesRef.current = false;
  }, []);

  const beginSession = React.useCallback(
    (entryPoint: GuidedTourEntryPoint, isReturningUser: boolean) => {
      entryPointRef.current = entryPoint;
      resetSession();
      trackGuidedTourStarted(entryPoint, isAdmin, isReturningUser);
    },
    [isAdmin, resetSession],
  );

  const selectPath = React.useCallback(
    (path: GuidedTourPath) => {
      setTourPath(path);
      trackGuidedTourPathSelected(path, entryPointRef.current, isAdmin);
    },
    [isAdmin],
  );

  const trackStepView = React.useCallback((step: TourStepLike) => {
    viewedStepIdsRef.current.add(step.id);
    if (!step.sectionAvailable || step.newFeatures.some((feature) => !feature.available)) {
      hadUnavailableFeaturesRef.current = true;
    }
  }, []);

  const trackLearnMore = React.useCallback(
    (stepId: string, destinationUrl: string, presentationType: GuidedTourPresentationType) => {
      if (!tourPath) {
        return;
      }
      trackGuidedTourLearnMoreClicked({
        stepId,
        destinationUrl,
        tourPath,
        presentationType,
      });
    },
    [tourPath],
  );

  const trackSummaryDocs = React.useCallback(
    (destinationUrl: string) => {
      if (!tourPath) {
        return;
      }
      trackGuidedTourSummaryDocsClicked({ destinationUrl, tourPath });
    },
    [tourPath],
  );

  const dismiss = React.useCallback(
    ({ dismissMethod, dismissStepId, dismissStepIndex, pathStepCount }: DismissArgs) => {
      trackGuidedTourDismissed({
        entryPoint: entryPointRef.current,
        isAdmin,
        tourPath,
        dismissStepId,
        dismissStepIndex,
        dismissMethod,
        stepsViewed: viewedStepIdsRef.current.size,
        totalSteps: pathStepCount,
      });
    },
    [isAdmin, tourPath],
  );

  const complete = React.useCallback(
    (pathStepCount: number) => {
      if (!tourPath) {
        return;
      }
      trackGuidedTourCompleted({
        tourPath,
        entryPoint: entryPointRef.current,
        isAdmin,
        stepsViewed: viewedStepIdsRef.current.size,
        totalSteps: pathStepCount,
        hadUnavailableFeatures: hadUnavailableFeaturesRef.current,
      });
    },
    [isAdmin, tourPath],
  );

  return {
    beginSession,
    selectPath,
    trackStepView,
    trackLearnMore,
    trackSummaryDocs,
    dismiss,
    complete,
    resetSession,
    tourPath,
  };
};
