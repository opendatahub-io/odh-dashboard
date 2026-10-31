type AnnotatedResource = {
  metadata: {
    annotations?: Record<string, string | undefined>;
  };
};

/** Reads accelerator identifiers without requiring a particular Kubernetes resource kind. */
export const getCompatibleIdentifiers = (object: AnnotatedResource): string[] => {
  try {
    const annotation = object.metadata.annotations?.['opendatahub.io/recommended-accelerators'];
    if (annotation) {
      const identifiers: unknown = JSON.parse(annotation);
      if (Array.isArray(identifiers)) {
        return identifiers;
      }
    }
  } catch (error) {
    // Ignore invalid JSON in resource annotations.
  }
  return [];
};

export const isCompatibleWithIdentifier = (
  identifier?: string,
  object?: AnnotatedResource,
): boolean => {
  if (!object || !identifier) {
    return false;
  }

  return getCompatibleIdentifiers(object).some((compatible) => compatible === identifier);
};
