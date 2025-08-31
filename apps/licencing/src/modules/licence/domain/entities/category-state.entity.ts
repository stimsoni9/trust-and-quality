export class CategoryState {
  constructor(
    private readonly _parentCategoryId: number,
    private readonly _subCategoryId: number | null,
    private readonly _state: string,
    private readonly _licenceRequired: boolean,
    private readonly _licenceNote: string,
    private readonly _id?: number,
  ) {}

  // Getters
  get id(): number | undefined { return this._id; }
  get parentCategoryId(): number { return this._parentCategoryId; }
  get subCategoryId(): number | null { return this._subCategoryId; }
  get state(): string { return this._state; }
  get licenceRequired(): boolean { return this._licenceRequired; }
  get licenceNote(): string { return this._licenceNote; }

  // Business rules
  requiresLicence(): boolean {
    return this._licenceRequired;
  }

  isSubCategory(): boolean {
    return this._subCategoryId !== null;
  }

  isParentCategory(): boolean {
    return this._subCategoryId === null;
  }

  canProcessAbnConditions(): boolean {
    // Business rule: Only categories that require licences can have ABN conditions
    return this._licenceRequired;
  }

  hasValidState(): boolean {
    // Business rule: State must be a valid Australian state/territory
    const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'National'];
    return validStates.includes(this._state);
  }

  isCompatibleWithSubCategory(subCategoryId: number): boolean {
    // Business rule: Parent categories can have sub-categories, but sub-categories cannot have sub-categories
    if (this.isSubCategory()) {
      return false; // Sub-categories cannot have sub-categories
    }
    return subCategoryId > 0; // Parent categories can have sub-categories
  }

  // Domain methods
  updateLicenceNote(newNote: string): CategoryState {
    return new CategoryState(
      this._parentCategoryId,
      this._subCategoryId,
      this._state,
      this._licenceRequired,
      newNote,
      this._id
    );
  }

  toggleLicenceRequirement(): CategoryState {
    return new CategoryState(
      this._parentCategoryId,
      this._subCategoryId,
      this._state,
      !this._licenceRequired,
      this._licenceNote,
      this._id
    );
  }

  // Validation
  isValid(): boolean {
    return this.hasValidState() && 
           this._parentCategoryId > 0 &&
           (this._subCategoryId === null || this._subCategoryId > 0);
  }

  // Factory method
  static create(
    parentCategoryId: number,
    subCategoryId: number | null,
    state: string,
    licenceRequired: boolean,
    licenceNote: string = '',
  ): CategoryState {
    const categoryState = new CategoryState(
      parentCategoryId,
      subCategoryId,
      state,
      licenceRequired,
      licenceNote
    );

    if (!categoryState.isValid()) {
      throw new Error('Invalid category state parameters');
    }

    return categoryState;
  }
}
