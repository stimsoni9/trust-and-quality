export interface ImportResult {
  processed: number;
  missing: Array<{
    name: string;
    sub_category_name?: string;
    reason: string;
    type: 'parent' | 'sub';
  }>;
}

export const DATA_IMPORT_PORT = Symbol('DataImportPort');

export interface DataImportPort {
  /**
   * Import licence data from external source (FULL IMPORT - clears all existing data)
   */
  importLicenceData(data: any): Promise<ImportResult>;

  /**
   * Selectively update only the specific licence data provided (PARTIAL UPDATE - preserves other data)
   */
  updateLicenceDataSelectively(data: any): Promise<ImportResult>;

  /**
   * Load authorities from external data
   */
  loadAuthorities(groups: any): Promise<void>;

  /**
   * Load licence types from external data
   */
  loadLicenceTypes(groups: any): Promise<void>;

  /**
   * Load licence requirement groups from external data
   */
  loadLicenceRequirementGroups(groups: any): Promise<void>;

  /**
   * Load category states from external data
   */
  loadCategoryStates(categories: any[]): Promise<ImportResult>;

  /**
   * Clear all existing data (for fresh import)
   */
  clearExistingData(): Promise<void>;
}
