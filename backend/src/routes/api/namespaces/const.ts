export enum NamespaceApplicationCase {
  /**
   * Supports the flow for when a project is created in the DSG create project flow.
   */
  DSG_CREATION,
  /**
   * Upgrade an existing DSG project to work with model mesh.
   */
  MODEL_MESH_PROMOTION,
  /**
   * Upgrade an existing DSG project to work with model kserve.
   */
  KSERVE_PROMOTION,
  /**
   * Nvidia NIMs run on KServe but have different requirements than regular models.
   */
  KSERVE_NIM_PROMOTION,
  /**
   * Downgrade a project from Modelmesh, Kserve or NIM so the platform can be selected again.
   */
  RESET_MODEL_SERVING_PLATFORM,
}
