// Inventory objects the DRA UI must never read: it only GETs named ResourceClaims and ResourceClaimTemplates.
const DRA_INVENTORY_ROUTES: RegExp[] = [
  /^\/api\/k8s\/apis\/resource\.k8s\.io\/[^/]+\/(?:namespaces\/[^/]+\/)?(?:deviceclasses|resourceslices)(?:\/|$)/,
  /^\/api\/k8s\/api\/v1\/nodes(?:\/|$)/,
];

/** Fails the test on any DeviceClass, ResourceSlice, or Node request; register before visiting the page. */
export const failOnDraInventoryRequests = (): void => {
  DRA_INVENTORY_ROUTES.forEach((pathname) => {
    cy.intercept({ pathname }, (req) => {
      throw new Error(
        `Unexpected ${req.method} ${req.url}: the dashboard must not read DeviceClasses, ResourceSlices, or Nodes.`,
      );
    });
  });
};
