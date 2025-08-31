export const GROUP_LINKING_PORT = Symbol('GroupLinkingPort');

export interface GroupLinkingPort {
  /**
   * Link all category states to their respective groups
   */
  linkAllCategoryStatesToGroups(categories: any[]): Promise<void>;

  /**
   * Link a specific category state to licence requirement groups
   */
  linkLicenceRequirementGroups(categoryStateId: number, groupKeys: string[]): Promise<void>;

  /**
   * Link licence types to requirement groups
   */
  linkLicenceTypesToGroups(groupId: number, licenceTypeIds: number[]): Promise<void>;

  /**
   * Unlink all groups from a category state
   */
  unlinkGroupsFromCategoryState(categoryStateId: number): Promise<void>;

  /**
   * Clear all group linking relationships
   */
  clearAllGroupLinks(): Promise<void>;
}
