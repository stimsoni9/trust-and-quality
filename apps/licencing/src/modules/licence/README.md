# Licence Module - Hexagonal Architecture

This module has been refactored to follow **Hexagonal Architecture** principles, ensuring clean separation of concerns and framework independence.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Controllers (NestJS)                                      │
│  Application Services (Orchestration)                      │
├─────────────────────────────────────────────────────────────┤
│                    Domain Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Domain Entities (Business Rules)                          │
│  Domain Services (Complex Business Logic)                  │
│  Value Objects                                             │
├─────────────────────────────────────────────────────────────┤
│                      Ports                                  │
├─────────────────────────────────────────────────────────────┤
│  Repository Interfaces                                     │
│  Service Interfaces                                        │
├─────────────────────────────────────────────────────────────┤
│                    Adapters Layer                           │
├─────────────────────────────────────────────────────────────┤
│  TypeORM Repositories                                      │
│  Framework-Specific Implementations                        │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
licence/
├── domain/                           # Pure business logic
│   ├── entities/                     # Domain entities with business rules
│   │   ├── category-state.entity.ts
│   │   ├── abn-condition.entity.ts
│   │   └── licence-requirement-group.entity.ts
│   ├── services/                     # Domain services for complex business logic
│   │   └── licence-requirement-domain.service.ts
│   └── value-objects/                # Value objects (if needed)
├── application/                      # Application services (orchestration)
│   └── services/
│       └── licence-requirement.service.ts
├── ports/                           # Interface contracts
│   ├── licence-requirement.repository.port.ts
│   ├── data-import.port.ts
│   └── group-linking.port.ts
├── adapters/                        # Framework implementations
│   ├── repositories/
│   │   └── typeorm-licence-requirement.repository.ts
│   ├── data-import/
│   │   └── licence-data-import.adapter.ts
│   └── group-linking/
│       └── group-linking.adapter.ts
├── entities/                        # TypeORM entities (framework-specific)
├── dtos/                           # Data Transfer Objects (framework-specific)
├── licence.controller.ts            # NestJS controller
├── licence-refactored.module.ts     # New module wiring
└── README.md                       # This file
```

## 🎯 Key Principles

### 1. **Domain Layer Independence**

- **No framework dependencies** (NestJS, TypeORM, etc.)
- **Pure business logic** with no external concerns
- **Immutable entities** with business rule validation
- **Factory methods** for safe object creation

### 2. **Port-Adapter Pattern**

- **Ports** define contracts (interfaces)
- **Adapters** implement framework-specific logic
- **Dependency inversion** through interfaces
- **Easy to swap implementations**

### 3. **Application Services**

- **Orchestrate** domain operations
- **Coordinate** between different ports
- **Handle** application-level workflows
- **Transform** between domain and application layers

### 4. **Repository Pattern**

- **Abstract data access** behind interfaces
- **Domain entities** returned from repositories
- **Framework-specific** mapping in adapters
- **Testable** through interface mocking

## 🔧 Usage Examples

### Domain Entity Usage

```typescript
// Create domain entity with business rules
const categoryState = CategoryState.create(
  parentId,
  subId,
  "NSW",
  true,
  "Licence required for this category"
);

// Business rule validation
if (categoryState.requiresLicence()) {
  // Handle licence requirement
}

// Immutable updates
const updatedState = categoryState.updateLicenceNote("Updated note");
```

### Domain Service Usage

```typescript
// Validate import data using business rules
const validation = domainService.validateImportData(licenceData);
if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
}

// Calculate required licences using business logic
const requiredLicences = domainService.calculateRequiredLicences(
  groups,
  minRequired
);
```

### Repository Usage

```typescript
// Find through repository port (interface)
const categoryState = await repository.findCategoryState(
  parentId,
  subId,
  state
);

// Save through repository port
const savedState = await repository.saveCategoryState(categoryState);
```

## 🚀 Benefits

1. **Framework Independence**: Business logic can run without NestJS/TypeORM
2. **Testability**: Easy to mock ports and test domain logic in isolation
3. **Maintainability**: Clear separation of concerns and responsibilities
4. **Flexibility**: Easy to swap implementations (e.g., different databases)
5. **Scalability**: Clear boundaries for team development
6. **Domain Focus**: Business rules are explicit and centralized

## 🔄 Migration Path

1. **Phase 1**: Extract domain entities and services ✅
2. **Phase 2**: Define ports (interfaces) ✅
3. **Phase 3**: Create adapters for current implementations ✅
4. **Phase 4**: Refactor application service to use ports ✅
5. **Phase 5**: Update module wiring ✅
6. **Phase 6**: Test and validate functionality
7. **Phase 7**: Remove old implementation

## 🧪 Testing Strategy

### Domain Layer Testing

```typescript
describe("CategoryState", () => {
  it("should validate business rules", () => {
    const state = CategoryState.create(1, null, "NSW", true);
    expect(state.isValid()).toBe(true);
  });
});
```

### Port Testing

```typescript
describe("LicenceRequirementRepository", () => {
  it("should find category state", async () => {
    const mockRepo = createMockRepository();
    const result = await mockRepo.findCategoryState(1, 0, "NSW");
    expect(result).toBeDefined();
  });
});
```

### Application Service Testing

```typescript
describe("LicenceRequirementService", () => {
  it("should orchestrate domain operations", async () => {
    const mockRepo = createMockRepository();
    const mockDomainService = createMockDomainService();
    const service = new LicenceRequirementService(mockRepo, mockDomainService);

    const result = await service.getLicenceRequirementsWithAbn(1, 0, "company");
    expect(result).toBeDefined();
  });
});
```

## 📚 Next Steps

1. **Update the main app module** to use `LicenceRefactoredModule`
2. **Test all endpoints** to ensure functionality is preserved
3. **Add comprehensive tests** for domain logic
4. **Consider adding more domain services** for specific business areas
5. **Implement caching** through additional ports if needed
6. **Add event sourcing** through domain events if required

## 🎉 Conclusion

This refactoring transforms the monolithic `LicenceRequirementService` into a clean, maintainable, and testable architecture that follows SOLID principles and Domain-Driven Design practices. The business logic is now completely independent of the framework, making it easier to maintain, test, and evolve over time.
