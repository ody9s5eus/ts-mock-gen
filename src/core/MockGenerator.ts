import { faker } from '@faker-js/faker';
import type { TypeSchema, TypeField } from './TypeParser';

export interface GeneratorOptions {
  quantity: number;
  includeOptional: boolean;
  rules: Record<string, string>; // fieldName -> fakerMethod path (e.g. "userId": "string.uuid")
}

export class MockGenerator {
  // Smart mapping dictionary
  private smartMap: Record<string, () => any> = {
    'id': () => faker.string.uuid(),
    'uuid': () => faker.string.uuid(),
    'email': () => faker.internet.email(),
    'name': () => faker.person.fullName(),
    'firstName': () => faker.person.firstName(),
    'lastName': () => faker.person.lastName(),
    'phone': () => faker.phone.number(),
    'phoneNumber': () => faker.phone.number(),
    'address': () => faker.location.streetAddress(),
    'city': () => faker.location.city(),
    'country': () => faker.location.country(),
    'zip': () => faker.location.zipCode(),
    'avatar': () => faker.image.avatar(),
    'image': () => faker.image.url(),
    'description': () => faker.lorem.sentence(),
    'content': () => faker.lorem.paragraph(),
    'date': () => faker.date.recent().toISOString(),
    'createdAt': () => faker.date.past().toISOString(),
    'updatedAt': () => faker.date.recent().toISOString(),
    'isActive': () => faker.datatype.boolean(),
    'age': () => faker.number.int({ min: 18, max: 90 }),
    'price': () => parseFloat(faker.commerce.price()),
  };

  public generate(schemas: TypeSchema[], options: GeneratorOptions): Record<string, any>[] {
    if (schemas.length === 0) return [];

    // Assuming we generate based on the first schema (root)
    // In a real app, user might select which interface to generate.
    const rootSchema = schemas[0];
    const result: Record<string, any>[] = [];

    for (let i = 0; i < options.quantity; i++) {
      result.push(this.generateItem(rootSchema.fields, options));
    }

    return result;
  }

  private generateItem(fields: TypeField[], options: GeneratorOptions): Record<string, any> {
    const item: Record<string, any> = {};

    for (const field of fields) {
      // Handle Optional
      if (field.isOptional && !options.includeOptional) {
        // Randomly skip optional fields if "includeOptional" is false?
        // Or strictly skip? Requirement says "Toggle for Include Optional Fields".
        // Usually means "force include" or "allow them to appear".
        // Let's assume toggle means "Always generate them" vs "Never generate them" or "Randomly".
        // Let's implement as: If toggle is OFF, skip them. If ON, include them.
        continue;
      }

      // Handle Override Rules
      if (options.rules[field.name]) {
        item[field.name] = this.applyRule(options.rules[field.name]);
        continue;
      }

      // Handle Smart Map
      if (this.smartMap[field.name.toLowerCase()]) {
        item[field.name] = this.smartMap[field.name.toLowerCase()]();
        continue;
      }

      // Partial match for smart map (e.g. "userEmail" -> "email")
      const lowerName = field.name.toLowerCase();
      const mappedKey = Object.keys(this.smartMap).find(key => lowerName.includes(key));
      if (mappedKey) {
          item[field.name] = this.smartMap[mappedKey]();
          continue;
      }

      // Fallback Generation
      item[field.name] = this.generateValue(field, options);
    }

    return item;
  }

  private generateValue(field: TypeField, options: GeneratorOptions): any {
    if (field.isArray) {
      // Generate array of 1-5 items
      const count = faker.number.int({ min: 1, max: 5 });
      const arr = [];
      for (let i = 0; i < count; i++) {
         // Create a temporary non-array field to generate element
         const elemField = { ...field, isArray: false };
         arr.push(this.generateValue(elemField, options));
      }
      return arr;
    }

    if (field.type === 'string') return faker.lorem.word();
    if (field.type === 'number') return faker.number.int({ min: 1, max: 1000 });
    if (field.type === 'boolean') return faker.datatype.boolean();

    if (field.type === 'object' && field.nested) {
        return this.generateItem(field.nested.fields, options);
    }

    if (field.type === 'union' && field.unionValues) {
        return faker.helpers.arrayElement(field.unionValues.map(v => v.replace(/^"|"$/g, ''))); // Strip quotes
    }

    if (field.type === 'enum' && field.unionValues) {
        return faker.helpers.arrayElement(field.unionValues.map(v => v.replace(/^"|"$/g, '')));
    }

    return null;
  }

  private applyRule(rule: string): any {
    // Rule format: "faker.module.method" or "module.method"
    // e.g. "string.uuid" -> faker.string.uuid()
    try {
        const parts = rule.replace('faker.', '').split('.');
        let func: any = faker;
        for (const part of parts) {
            func = func[part];
        }
        if (typeof func === 'function') {
            return func();
        }
    } catch (e) {
        console.warn(`Failed to apply rule: ${rule}`, e);
    }
    return null;
  }
}
