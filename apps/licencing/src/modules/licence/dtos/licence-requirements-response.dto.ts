export class LicenceClassDto {
  name!: string;
  state!: string;
  authority!: string;
}

export class AuthorityDto {
  name!: string;
  abn_conditions!: Record<string, string>; // Dynamic ABN conditions filtered by type
}

export class GroupDto {
  name!: string;
  min_required!: number;
  state!: string;
  authority!: AuthorityDto;
  classes!: string[]; // Simple string array as per new schema
}

export class AbnConditionsDto {
  company?: string;
  individual?: string;
  partnership?: string;
  trust?: string;
  other?: string;
}

export class StateDataDto {
  licence_required!: boolean;
  licence_note!: string;
  groups!: string[]; // No ABN conditions at state level in new schema
}

export class CategoryDto {
  name!: string;
  sub_category_name?: string;
  is_parent!: boolean;
  states!: Record<string, StateDataDto>;
}

export class LicenceRequirementsResponseDto {
  groups!: Record<string, GroupDto>;
  categories!: CategoryDto[];
}
