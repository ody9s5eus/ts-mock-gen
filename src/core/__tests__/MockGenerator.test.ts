import { describe, it, expect } from 'vitest';
import { MockGenerator } from '../MockGenerator';
import type { TypeSchema } from '../TypeParser';

describe('MockGenerator', () => {
  const generator = new MockGenerator();

  const mockSchema: TypeSchema = {
    name: 'User',
    fields: [
      { name: 'id', type: 'string', isArray: false, isOptional: false },
      { name: 'email', type: 'string', isArray: false, isOptional: false },
      { name: 'age', type: 'number', isArray: false, isOptional: false },
      { name: 'isActive', type: 'boolean', isArray: false, isOptional: true },
    ]
  };

  it('should generate data based on schema', () => {
    const result = generator.generate([mockSchema], { quantity: 2, includeOptional: true, rules: {} });
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('email');
    expect(typeof result[0].email).toBe('string');
    expect(result[0].email).toContain('@'); // Smart mapping check
  });

  it('should respect custom rules', () => {
    // const rules = { 'age': 'number.int' }; // Should generate a number
    // Let's use a specific one to verify precedence
    // "id" maps to uuid by default. Let's map it to something else, e.g. "lorem.word"
    const customRules = { 'id': 'lorem.word' };

    const result = generator.generate([mockSchema], { quantity: 1, includeOptional: true, rules: customRules });
    expect(result[0].id).not.toContain('-'); // UUID usually has dashes, single word doesn't usually (simple check)
    // Better check:
    // If we map to helper.arrayElement... hard to pass args.
    // Let's map 'age' to 'datatype.boolean' (invalid type but checks invocation) -> wait, returns boolean

    const boolRules = { 'age': 'datatype.boolean' };
    const res2 = generator.generate([mockSchema], { quantity: 1, includeOptional: true, rules: boolRules });
    expect(typeof res2[0].age).toBe('boolean');
  });

  it('should handle nested objects', () => {
    const nestedSchema: TypeSchema = {
        name: 'Config',
        fields: [
            {
                name: 'meta',
                type: 'object',
                isArray: false,
                isOptional: false,
                nested: {
                    name: 'Meta',
                    fields: [
                        { name: 'version', type: 'number', isArray: false, isOptional: false }
                    ]
                }
            }
        ]
    };

    const result = generator.generate([nestedSchema], { quantity: 1, includeOptional: true, rules: {} });
    expect(result[0]).toHaveProperty('meta');
    expect(result[0].meta).toHaveProperty('version');
    expect(typeof result[0].meta.version).toBe('number');
  });

  it('should handle arrays', () => {
      const arraySchema: TypeSchema = {
          name: 'List',
          fields: [
              { name: 'tags', type: 'string', isArray: true, isOptional: false }
          ]
      };

      const result = generator.generate([arraySchema], { quantity: 1, includeOptional: true, rules: {} });
      expect(Array.isArray(result[0].tags)).toBe(true);
      expect(result[0].tags.length).toBeGreaterThan(0);
      expect(typeof result[0].tags[0]).toBe('string');
  });
});
