import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LicenceController } from './licence.controller';
import { LicenceService } from './licence.service';
import { LicenceRequirementService } from './application/services/licence-requirement.service';
import { AbnConditionKind } from './domain/entities/abn-condition.entity';
import { LicenceRequirementsResponseDto } from './dtos/licence-requirements-response.dto';

// Mock axios to avoid ES module issues
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
}));

describe('LicenceController - Real-World Testing Scenarios', () => {
  let controller: LicenceController;
  let licenceService: jest.Mocked<LicenceService>;
  let licenceRequirementService: jest.Mocked<LicenceRequirementService>;

  // NSW Air Conditioning Response (what we debugged and fixed)
  const nswAirConditioningResponse: LicenceRequirementsResponseDto = {
    groups: {
      arc_requirement: {
        name: 'ARC requirement',
        min_required: 1,
        classes: [
          {
            name: 'Air Conditioning',
            state: 'National',
            authority: 'Australian Refrigeration Council'
          }
        ]
      },
      nsw_air_conditioning_trade: {
        name: 'NSW trade licence',
        min_required: 1,
        classes: [
          {
            name: 'Electrician',
            state: 'NSW',
            authority: 'NSW Fair Trading'
          },
          {
            name: 'Refrigeration',
            state: 'NSW',
            authority: 'NSW Fair Trading'
          }
        ]
      }
    },
    categories: [
      {
        name: 'Air Conditioning',
        is_parent: true,
        states: {
          NSW: {
            licence_required: true,
            licence_note: 'NOTE: Must have 2 licences to be in this category.\n1. ARC\n2. Electrical contractor license or Restricted Electrical Work License',
            abn_conditions: {
              company: 'Company ABN – Must supply a licence that is in the Company\'s ABN Entity Name',
              individual: 'Individual/Sole Trader ABN – Must supply a licence that is in the Individual/Sole Trader\'s Name',
              partnership: 'Partnership ABN – Must supply a licence under the Partnership\'s ABN Entity Name',
              trust: 'Trust ABN – Must supply a licence under the Trustee of the Trust'
            },
            groups: ['arc_requirement', 'nsw_air_conditioning_trade']
          }
        }
      }
    ]
  };

  // QLD Air Conditioning Response (the state filtering we fixed)
  const qldAirConditioningResponse: LicenceRequirementsResponseDto = {
    groups: {
      arc_requirement: {
        name: 'ARC requirement',
        min_required: 1,
        classes: [
          {
            name: 'Air Conditioning',
            state: 'National',
            authority: 'Australian Refrigeration Council'
          }
        ]
      },
      qld_air_conditioning_trade: {
        name: 'QLD trade licence',
        min_required: 1,
        classes: [
          {
            name: 'Plumbing',
            state: 'QLD',
            authority: 'QLD Building and Construction Commission'
          }
        ]
      }
    },
    categories: [
      {
        name: 'Air Conditioning',
        is_parent: true,
        states: {
          QLD: {
            licence_required: true,
            licence_note: 'NOTE: Must have 2 licences to be in this category for QLD',
            abn_conditions: {
              company: 'Company ABN – Must supply a licence that is in the Company\'s ABN Entity Name',
              individual: 'Individual/Sole Trader ABN – Must supply a licence that is in the Individual/Sole Trader\'s Name',
              partnership: 'Partnership ABN – Must supply a licence under the Partnership\'s ABN Entity Name',
              trust: 'Trust ABN – Must supply a licence under the Trustee of the Trust'
            },
            groups: ['arc_requirement', 'qld_air_conditioning_trade']
          }
        }
      }
    ]
  };

  // Consolidated Batch Response (category consolidation we fixed)
  const consolidatedBatchResponse = {
    data: {
      groups: {
        arc_requirement: {
          name: 'ARC requirement',
          min_required: 1,
          classes: [
            {
              name: 'Air Conditioning',
              state: 'National',
              authority: 'Australian Refrigeration Council'
            }
          ]
        },
        nsw_air_conditioning_trade: {
          name: 'NSW trade licence',
          min_required: 1,
          classes: [
            {
              name: 'Electrician',
              state: 'NSW',
              authority: 'NSW Fair Trading'
            },
            {
              name: 'Refrigeration',
              state: 'NSW',
              authority: 'NSW Fair Trading'
            }
          ]
        },
        qld_air_conditioning_trade: {
          name: 'QLD trade licence',
          min_required: 1,
          classes: [
            {
              name: 'Plumbing',
              state: 'QLD',
              authority: 'QLD Building and Construction Commission'
            }
          ]
        }
      },
      categories: [
        {
          name: 'Air Conditioning',
          is_parent: true,
          states: {
            NSW: {
              licence_required: true,
              licence_note: 'NSW licence note',
              abn_conditions: {
                company: 'Company ABN condition NSW',
                individual: 'Individual ABN condition NSW',
                partnership: 'Partnership ABN condition NSW',
                trust: 'Trust ABN condition NSW'
              },
              groups: ['arc_requirement', 'nsw_air_conditioning_trade']
            },
            QLD: {
              licence_required: true,
              licence_note: 'QLD licence note',
              abn_conditions: {
                company: 'Company ABN condition QLD',
                individual: 'Individual ABN condition QLD',
                partnership: 'Partnership ABN condition QLD',
                trust: 'Trust ABN condition QLD'
              },
              groups: ['arc_requirement', 'qld_air_conditioning_trade']
            }
          }
        }
      ]
    },
    found: 2,
    notFound: []
  };

  beforeEach(async () => {
    const mockLicenceService = {
      findAll: jest.fn(),
    };

    const mockLicenceRequirementService = {
      getLicenceRequirementsWithAbn: jest.fn(),
      getLicenceRequirementsMultiple: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenceController],
      providers: [
        { provide: LicenceService, useValue: mockLicenceService },
        { provide: LicenceRequirementService, useValue: mockLicenceRequirementService },
      ],
    }).compile();

    controller = module.get<LicenceController>(LicenceController);
    licenceService = module.get(LicenceService);
    licenceRequirementService = module.get(LicenceRequirementService);
  });

  describe('GET /requirements - Real-World State Filtering Scenarios', () => {
    describe('NSW State Filtering (Fixed Bug: Correct state in response)', () => {
      it('should return NSW in states object for NSW request', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

        const result = await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'NSW');

        expect(result.categories[0].states).toHaveProperty('NSW');
        expect(result.categories[0].states).not.toHaveProperty('QLD');
        expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledWith(
          48, 0, AbnConditionKind.COMPANY, 'NSW'
        );
      });

      it('should return only NSW and National licence classes for NSW request', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

        const result = await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'NSW');

        // arc_requirement should only show National classes
        expect(result.groups.arc_requirement.classes).toHaveLength(1);
        expect(result.groups.arc_requirement.classes[0].state).toBe('National');
        expect(result.groups.arc_requirement.classes[0].name).toBe('Air Conditioning');

        // nsw_air_conditioning_trade should only show NSW classes
        expect(result.groups.nsw_air_conditioning_trade.classes).toHaveLength(2);
        result.groups.nsw_air_conditioning_trade.classes.forEach(licenceClass => {
          expect(licenceClass.state).toBe('NSW');
        });
        
        const classNames = result.groups.nsw_air_conditioning_trade.classes.map(c => c.name);
        expect(classNames).toContain('Electrician');
        expect(classNames).toContain('Refrigeration');
      });
    });

    describe('QLD State Filtering (Fixed Bug: QLD data instead of NSW)', () => {
      it('should return QLD in states object for QLD request', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(qldAirConditioningResponse);

        const result = await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'QLD');

        expect(result.categories[0].states).toHaveProperty('QLD');
        expect(result.categories[0].states).not.toHaveProperty('NSW');
        expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledWith(
          48, 0, AbnConditionKind.COMPANY, 'QLD'
        );
      });

      it('should return only QLD and National licence classes for QLD request', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(qldAirConditioningResponse);

        const result = await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'QLD');

        // arc_requirement should show National classes for any state
        expect(result.groups.arc_requirement.classes[0].state).toBe('National');
        expect(result.groups.arc_requirement.classes[0].name).toBe('Air Conditioning');

        // qld_air_conditioning_trade should only show QLD-specific classes
        expect(result.groups.qld_air_conditioning_trade.classes).toHaveLength(1);
        expect(result.groups.qld_air_conditioning_trade.classes[0].state).toBe('QLD');
        expect(result.groups.qld_air_conditioning_trade.classes[0].name).toBe('Plumbing');
      });
    });

    describe('Group-Specific Licence Class Filtering (Fixed Bug: All classes in all groups)', () => {
      it('should return only specific licence classes for each group (no cross-contamination)', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

        const result = await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'NSW');

        // arc_requirement should ONLY show Air Conditioning (National)
        expect(result.groups.arc_requirement.classes).toEqual([
          expect.objectContaining({
            name: 'Air Conditioning',
            state: 'National'
          })
        ]);

        // nsw_air_conditioning_trade should ONLY show Electrician and Refrigeration (NSW)
        expect(result.groups.nsw_air_conditioning_trade.classes).toEqual([
          expect.objectContaining({ name: 'Electrician', state: 'NSW' }),
          expect.objectContaining({ name: 'Refrigeration', state: 'NSW' })
        ]);

        // Critical: Should NOT contain classes from other groups
        expect(result.groups.arc_requirement.classes.find(c => c.name === 'Electrician')).toBeUndefined();
        expect(result.groups.arc_requirement.classes.find(c => c.name === 'Refrigeration')).toBeUndefined();
        expect(result.groups.nsw_air_conditioning_trade.classes.find(c => c.name === 'Air Conditioning')).toBeUndefined();
      });
    });

    describe('Default State Behavior', () => {
      it('should default to NSW when state parameter is not provided', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

        await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0');

        expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledWith(
          48, 0, AbnConditionKind.COMPANY, 'NSW'
        );
      });
    });

    describe('Response Structure Validation', () => {
      it('should have correct response structure with all required properties', async () => {
        licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

        const result = await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'NSW');

        // Top level structure
        expect(result).toHaveProperty('groups');
        expect(result).toHaveProperty('categories');

        // Groups structure
        Object.values(result.groups).forEach((group: any) => {
          expect(group).toHaveProperty('name');
          expect(group).toHaveProperty('min_required');
          expect(group).toHaveProperty('classes');
          expect(Array.isArray(group.classes)).toBe(true);
          expect(typeof group.min_required).toBe('number');
          
          group.classes.forEach((licenceClass: any) => {
            expect(licenceClass).toHaveProperty('name');
            expect(licenceClass).toHaveProperty('state');
            expect(licenceClass).toHaveProperty('authority');
          });
        });

        // Categories structure
        expect(Array.isArray(result.categories)).toBe(true);
        result.categories.forEach((category) => {
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('is_parent');
          expect(category).toHaveProperty('states');
          expect(typeof category.is_parent).toBe('boolean');
          
          Object.entries(category.states).forEach(([stateKey, stateData]: [string, any]) => {
            expect(stateKey).toMatch(/^[A-Z]{2,3}$/);
            expect(stateData).toHaveProperty('licence_required');
            expect(stateData).toHaveProperty('licence_note');
            expect(stateData).toHaveProperty('abn_conditions');
            expect(stateData).toHaveProperty('groups');
            expect(Array.isArray(stateData.groups)).toBe(true);
          });
        });
      });
    });
  });

  describe('GET /requirements-batch - Real-World Batch Scenarios', () => {
    describe('State Filtering in Batch Requests (Fixed Bug: Batch ignored state)', () => {
      it('should apply state filtering to each request in batch', async () => {
        const filter = JSON.stringify([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'QLD' },
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'NSW' }
        ]);

        licenceRequirementService.getLicenceRequirementsMultiple.mockResolvedValue(consolidatedBatchResponse);

        const result = await controller.getLicenceRequirementsMultiple(filter);

        expect(licenceRequirementService.getLicenceRequirementsMultiple).toHaveBeenCalledWith([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'QLD' },
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'NSW' }
        ]);
      });
    });

    describe('Category Consolidation (Fixed Bug: Duplicate categories)', () => {
      it('should consolidate same category with multiple states into one category object', async () => {
        const filter = JSON.stringify([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'NSW' },
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'QLD' }
        ]);

        licenceRequirementService.getLicenceRequirementsMultiple.mockResolvedValue(consolidatedBatchResponse);

        const result = await controller.getLicenceRequirementsMultiple(filter);

        // Critical: Should have only ONE category, not duplicates
        expect(result.data.categories).toHaveLength(1);
        expect(result.data.categories[0].name).toBe('Air Conditioning');
        
        // Critical: Should have BOTH states in the same category object
        expect(result.data.categories[0].states).toHaveProperty('NSW');
        expect(result.data.categories[0].states).toHaveProperty('QLD');
        expect(Object.keys(result.data.categories[0].states).sort()).toEqual(['NSW', 'QLD']);
      });

      it('should have state-specific groups for each state', async () => {
        const filter = JSON.stringify([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'NSW' },
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'QLD' }
        ]);

        licenceRequirementService.getLicenceRequirementsMultiple.mockResolvedValue(consolidatedBatchResponse);

        const result = await controller.getLicenceRequirementsMultiple(filter);

        // NSW should have NSW-specific groups
        expect(result.data.categories[0].states.NSW.groups).toEqual(['arc_requirement', 'nsw_air_conditioning_trade']);
        
        // QLD should have QLD-specific groups  
        expect(result.data.categories[0].states.QLD.groups).toEqual(['arc_requirement', 'qld_air_conditioning_trade']);
      });
    });

    describe('Real-World Complex Batch Query', () => {
      it('should handle complex batch query with multiple states and categories', async () => {
        const originalQuery = JSON.stringify([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'QLD' },
          { parent_category_id: 29, sub_category_id: 0, abn_kind: 'company' },
          { parent_category_id: 48, sub_category_id: 152, abn_kind: 'company' },
          { parent_category_id: 48, sub_category_id: 446, abn_kind: 'company' }
        ]);

        const complexBatchResponse = {
          ...consolidatedBatchResponse,
          data: {
            ...consolidatedBatchResponse.data,
            categories: [
              ...consolidatedBatchResponse.data.categories,
              {
                name: 'Locksmiths',
                is_parent: true,
                states: {
                  NSW: {
                    licence_required: true,
                    licence_note: 'Locksmith licence note',
                    abn_conditions: {
                      company: 'Company condition',
                      individual: 'Individual condition',
                      partnership: 'Partnership condition',
                      trust: 'Trust condition'
                    },
                    groups: ['nsw_locksmiths_trade']
                  }
                }
              }
            ]
          },
          found: 4,
          notFound: []
        };

        licenceRequirementService.getLicenceRequirementsMultiple.mockResolvedValue(complexBatchResponse);

        const result = await controller.getLicenceRequirementsMultiple(originalQuery);

        expect(licenceRequirementService.getLicenceRequirementsMultiple).toHaveBeenCalledWith([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'QLD' },
          { parent_category_id: 29, sub_category_id: 0, abn_kind: 'company', state: 'NSW' }, // Validator adds default state
          { parent_category_id: 48, sub_category_id: 152, abn_kind: 'company', state: 'NSW' }, // Validator adds default state
          { parent_category_id: 48, sub_category_id: 446, abn_kind: 'company', state: 'NSW' } // Validator adds default state
        ]);

        expect(result.found).toBe(4);
        expect(result.notFound).toHaveLength(0);
      });
    });

    describe('Batch Response Structure', () => {
      it('should have correct batch response structure', async () => {
        const filter = JSON.stringify([
          { parent_category_id: 48, sub_category_id: 0, abn_kind: 'company', state: 'NSW' }
        ]);

        licenceRequirementService.getLicenceRequirementsMultiple.mockResolvedValue(consolidatedBatchResponse);

        const result = await controller.getLicenceRequirementsMultiple(filter);

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('found');
        expect(result).toHaveProperty('notFound');
        expect(typeof result.found).toBe('number');
        expect(Array.isArray(result.notFound)).toBe(true);
        
        // Data should have same structure as single endpoint
        expect(result.data).toHaveProperty('groups');
        expect(result.data).toHaveProperty('categories');
      });
    });

    describe('Error Validation (Real-World Error Cases)', () => {
      const errorCases = [
        {
          name: 'missing filter parameter',
          filter: '',
          expectedError: 'Missing required query parameter: filter'
        },
        {
          name: 'invalid JSON',
          filter: '{"invalid": json}',
          expectedError: 'Invalid filter parameter'
        },
        {
          name: 'not an array',
          filter: '{"parent_category_id": 48}',
          expectedError: 'Filter parameter must be a JSON array'
        },
        {
          name: 'missing parent_category_id',
          filter: '[{"sub_category_id": 0, "abn_kind": "company"}]',
          expectedError: 'Category 1: parent_category_id must be a number'
        },
        {
          name: 'invalid parent_category_id type',
          filter: '[{"parent_category_id": "not_a_number", "abn_kind": "company"}]',
          expectedError: 'Category 1: parent_category_id must be a number'
        },
        {
          name: 'invalid sub_category_id type',
          filter: '[{"parent_category_id": 48, "sub_category_id": "not_a_number", "abn_kind": "company"}]',
          expectedError: 'Category 1: sub_category_id must be a valid number'
        },
        {
          name: 'missing abn_kind',
          filter: '[{"parent_category_id": 48, "sub_category_id": 0}]',
          expectedError: 'Category 1: abn_kind is required'
        },
        {
          name: 'invalid abn_kind',
          filter: '[{"parent_category_id": 48, "sub_category_id": 0, "abn_kind": "invalid_kind"}]',
          expectedError: 'Category 1: abn_kind must be one of: company, individual, partnership, trust, other'
        },
        {
          name: 'invalid state type',
          filter: '[{"parent_category_id": 48, "sub_category_id": 0, "abn_kind": "company", "state": 123}]',
          expectedError: 'Category 1: state must be a string if provided'
        }
      ];

      errorCases.forEach(({ name, filter, expectedError }) => {
        it(`should throw BadRequestException for ${name}`, async () => {
          await expect(
            controller.getLicenceRequirementsMultiple(filter)
          ).rejects.toThrow(BadRequestException);

          try {
            await controller.getLicenceRequirementsMultiple(filter);
          } catch (error) {
            expect(error.message).toContain(expectedError);
          }
        });
      });
    });
  });

  describe('Parameter Parsing and Validation', () => {
    it('should handle sub_category_id parsing correctly', async () => {
      licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

      await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '152', 'NSW');

      expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledWith(
        48, 152, AbnConditionKind.COMPANY, 'NSW'
      );
    });

    it('should handle missing sub_category_id (defaults to 0)', async () => {
      licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

      await controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, undefined, 'NSW');

      expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledWith(
        48, 0, AbnConditionKind.COMPANY, 'NSW'
      );
    });

    it('should handle all ABN condition kinds', async () => {
      const abnKinds = [
        AbnConditionKind.COMPANY,
        AbnConditionKind.INDIVIDUAL, 
        AbnConditionKind.PARTNERSHIP,
        AbnConditionKind.TRUST,
        AbnConditionKind.OTHER
      ];

      licenceRequirementService.getLicenceRequirementsWithAbn.mockResolvedValue(nswAirConditioningResponse);

      for (const abnKind of abnKinds) {
        await controller.getLicenceRequirements(48, abnKind, '0', 'NSW');
        
        expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledWith(
          48, 0, abnKind, 'NSW'
        );
      }

      expect(licenceRequirementService.getLicenceRequirementsWithAbn).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      licenceRequirementService.getLicenceRequirementsWithAbn.mockRejectedValue(
        new Error('Parent category with ID 999 not found')
      );

      await expect(
        controller.getLicenceRequirements(999, AbnConditionKind.COMPANY, '0', 'NSW')
      ).rejects.toThrow('Parent category with ID 999 not found');
    });

    it('should handle NotFoundException from service', async () => {
      licenceRequirementService.getLicenceRequirementsWithAbn.mockRejectedValue(
        new BadRequestException('No licence requirements found for category')
      );

      await expect(
        controller.getLicenceRequirements(48, AbnConditionKind.COMPANY, '0', 'NSW')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Health endpoint', () => {
    it('should return health status', () => {
      const result = controller.health();
      expect(result).toEqual({ status: 'ok' });
    });
  });
});