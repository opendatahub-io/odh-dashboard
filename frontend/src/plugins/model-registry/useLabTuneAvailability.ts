const useLabTuneAvailability = (): { enabled: boolean; tooltip?: string } => {
  // In the model registry context (mod-arch-core), we don't have access to ODH dashboard feature flags
  // So we'll always enable LAB-tune and let the actual StartRunModal handle feature flag checks
  return {
    enabled: true,
  };
};

export default useLabTuneAvailability;
