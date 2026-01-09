import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { Deployment } from '../../../extension-points';
import { isWizardFieldExtractorExtension } from '../../../extension-points';

/**
 * Extracted field data from a deployment, keyed by field ID.
 */
export type ExtractedFieldData = Record<string, unknown>;

/**
 * Hook that extracts initial data for dynamic wizard fields from a deployment.
 * This is used when editing an existing deployment to populate the wizard fields
 * with their current values.
 *
 * @param deployment - The deployment to extract data from, or undefined if creating new
 * @returns Object containing extracted field data, loading state, and errors
 */
export const useWizardFieldExtractors = (
  deployment?: Deployment | null,
): {
  extractedFieldData: ExtractedFieldData;
  extractorsLoaded: boolean;
  extractorErrors: unknown[];
} => {
  const [extractorExtensions, extractorsLoaded, extractorErrors] = useResolvedExtensions(
    isWizardFieldExtractorExtension,
  );

  const extractedFieldData = React.useMemo((): ExtractedFieldData => {
    if (!deployment) {
      return {};
    }

    const result: ExtractedFieldData = {};

    for (const extractor of extractorExtensions) {
      // Only extract if the platform matches
      if (extractor.properties.platform === deployment.modelServingPlatformId) {
        const { fieldId } = extractor.properties;
        const extractedValue = extractor.properties.extract(deployment);

        if (extractedValue !== undefined) {
          result[fieldId] = extractedValue;
        }
      }
    }

    return result;
  }, [deployment, extractorExtensions]);

  return {
    extractedFieldData,
    extractorsLoaded,
    extractorErrors,
  };
};
