export class LicenceRequirementGroup {
  constructor(
    private readonly _name: string,
    private readonly _key: string,
    private readonly _minRequired: number,
    private readonly _state: string,
    private readonly _authorityName: string,
    private readonly _abnCompany: string | null = null,
    private readonly _abnIndividual: string | null = null,
    private readonly _abnPartnership: string | null = null,
    private readonly _abnTrust: string | null = null,
    private readonly _isActive: boolean = true,
    private readonly _parentCategoryId: number | null = null,
    private readonly _subCategoryId: number | null = null,
    private readonly _id?: number,
  ) {}

  // Getters
  get id(): number | undefined { return this._id; }
  get name(): string { return this._name; }
  get key(): string { return this._key; }
  get minRequired(): number { return this._minRequired; }
  get state(): string { return this._state; }
  get authorityName(): string { return this._authorityName; }
  get abnCompany(): string | null { return this._abnCompany; }
  get abnIndividual(): string | null { return this._abnIndividual; }
  get abnPartnership(): string | null { return this._abnPartnership; }
  get abnTrust(): string | null { return this._abnTrust; }
  get isActive(): boolean { return this._isActive; }
  get parentCategoryId(): number | null { return this._parentCategoryId; }
  get subCategoryId(): number | null { return this._subCategoryId; }

  // Business rules
  isValidMinRequired(): boolean {
    return this._minRequired > 0;
  }

  hasValidKey(): boolean {
    return this._key.trim().length > 0 && /^[a-z0-9_]+$/.test(this._key);
  }

  hasValidName(): boolean {
    return this._name.trim().length > 0;
  }

  isAssignedToCategory(): boolean {
    return this._parentCategoryId !== null || this._subCategoryId !== null;
  }

  isAssignedToParentCategory(): boolean {
    return this._parentCategoryId !== null && this._subCategoryId === null;
  }

  isAssignedToSubCategory(): boolean {
    return this._parentCategoryId !== null && this._subCategoryId !== null;
  }

  canBeActivated(): boolean {
    return this.hasValidKey() && this.hasValidName() && this.isValidMinRequired();
  }

  // Domain methods
  activate(): LicenceRequirementGroup {
    if (!this.canBeActivated()) {
      throw new Error('Cannot activate group: validation failed');
    }

    return new LicenceRequirementGroup(
      this._name,
      this._key,
      this._minRequired,
      this._state,
      this._authorityName,
      this._abnCompany,
      this._abnIndividual,
      this._abnPartnership,
      this._abnTrust,
      true, // isActive
      this._parentCategoryId,
      this._subCategoryId,
      this._id
    );
  }

  deactivate(): LicenceRequirementGroup {
    return new LicenceRequirementGroup(
      this._name,
      this._key,
      this._minRequired,
      this._state,
      this._authorityName,
      this._abnCompany,
      this._abnIndividual,
      this._abnPartnership,
      this._abnTrust,
      false, // isActive
      this._parentCategoryId,
      this._subCategoryId,
      this._id
    );
  }

  assignToParentCategory(parentCategoryId: number): LicenceRequirementGroup {
    if (parentCategoryId <= 0) {
      throw new Error('Invalid parent category ID');
    }

    return new LicenceRequirementGroup(
      this._name,
      this._key,
      this._minRequired,
      this._state,
      this._authorityName,
      this._abnCompany,
      this._abnIndividual,
      this._abnPartnership,
      this._abnTrust,
      this._isActive,
      parentCategoryId,
      null, // Clear sub-category assignment
      this._id
    );
  }

  assignToSubCategory(parentCategoryId: number, subCategoryId: number): LicenceRequirementGroup {
    if (parentCategoryId <= 0 || subCategoryId <= 0) {
      throw new Error('Invalid category IDs');
    }

    return new LicenceRequirementGroup(
      this._name,
      this._key,
      this._minRequired,
      this._state,
      this._authorityName,
      this._abnCompany,
      this._abnIndividual,
      this._abnPartnership,
      this._abnTrust,
      this._isActive,
      parentCategoryId,
      subCategoryId,
      this._id
    );
  }

  updateMinRequired(newMinRequired: number): LicenceRequirementGroup {
    if (newMinRequired <= 0) {
      throw new Error('Minimum required must be greater than 0');
    }

    return new LicenceRequirementGroup(
      this._name,
      this._key,
      newMinRequired,
      this._state,
      this._authorityName,
      this._abnCompany,
      this._abnIndividual,
      this._abnPartnership,
      this._abnTrust,
      this._isActive,
      this._parentCategoryId,
      this._subCategoryId,
      this._id
    );
  }

  // Validation
  isValid(): boolean {
    return this.hasValidKey() && 
           this.hasValidName() && 
           this.isValidMinRequired();
  }

  // Factory method
  static create(
    name: string,
    key: string,
    minRequired: number,
    parentCategoryId?: number,
    subCategoryId?: number,
  ): LicenceRequirementGroup {
    const group = new LicenceRequirementGroup(
      name,
      key,
      minRequired,
      'NSW', // Default state
      'Unknown', // Default authority
      null, // abnCompany
      null, // abnIndividual
      null, // abnPartnership
      null, // abnTrust
      true, // isActive
      parentCategoryId || null,
      subCategoryId || null
    );

    if (!group.isValid()) {
      throw new Error('Invalid licence requirement group parameters');
    }

    return group;
  }

  // Static validation methods
  static isValidKey(key: string): boolean {
    return key.trim().length > 0 && /^[a-z0-9_]+$/.test(key);
  }

  static isValidMinRequired(minRequired: number): boolean {
    return minRequired > 0;
  }
}
