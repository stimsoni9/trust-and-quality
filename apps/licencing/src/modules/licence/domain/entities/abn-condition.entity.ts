export enum AbnConditionKind {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
  PARTNERSHIP = 'partnership',
  TRUST = 'trust',
  OTHER = 'other'
}

export class AbnCondition {
  constructor(
    private readonly _categoryStateId: number,
    private readonly _kind: AbnConditionKind,
    private readonly _message: string,
    private readonly _id?: number,
  ) {}

  // Getters
  get id(): number | undefined { return this._id; }
  get categoryStateId(): number { return this._categoryStateId; }
  get kind(): AbnConditionKind { return this._kind; }
  get message(): string { return this._message; }

  // Business rules
  isValidKind(): boolean {
    return Object.values(AbnConditionKind).includes(this._kind);
  }

  hasValidMessage(): boolean {
    return this._message.trim().length > 0;
  }

  isCompanyCondition(): boolean {
    return this._kind === AbnConditionKind.COMPANY;
  }

  isIndividualCondition(): boolean {
    return this._kind === AbnConditionKind.INDIVIDUAL;
  }

  isPartnershipCondition(): boolean {
    return this._kind === AbnConditionKind.PARTNERSHIP;
  }

  isTrustCondition(): boolean {
    return this._kind === AbnConditionKind.TRUST;
  }

  isOtherCondition(): boolean {
    return this._kind === AbnConditionKind.OTHER;
  }

  // Domain methods
  updateMessage(newMessage: string): AbnCondition {
    if (!newMessage.trim()) {
      throw new Error('ABN condition message cannot be empty');
    }
    
    return new AbnCondition(
      this._categoryStateId,
      this._kind,
      newMessage,
      this._id
    );
  }

  changeKind(newKind: AbnConditionKind): AbnCondition {
    if (!Object.values(AbnConditionKind).includes(newKind)) {
      throw new Error('Invalid ABN condition kind');
    }

    return new AbnCondition(
      this._categoryStateId,
      newKind,
      this._message,
      this._id
    );
  }

  // Validation
  isValid(): boolean {
    return this.isValidKind() && 
           this.hasValidMessage() && 
           this._categoryStateId > 0;
  }

  // Factory method
  static create(
    categoryStateId: number,
    kind: AbnConditionKind,
    message: string,
  ): AbnCondition {
    const abnCondition = new AbnCondition(
      categoryStateId,
      kind,
      message
    );

    if (!abnCondition.isValid()) {
      throw new Error('Invalid ABN condition parameters');
    }

    return abnCondition;
  }

  // Static validation methods
  static isValidKind(kind: string): kind is AbnConditionKind {
    return Object.values(AbnConditionKind).includes(kind as AbnConditionKind);
  }

  static getValidKinds(): AbnConditionKind[] {
    return Object.values(AbnConditionKind);
  }
}
