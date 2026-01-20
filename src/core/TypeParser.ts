import { Project, InMemoryFileSystemHost, InterfaceDeclaration, TypeAliasDeclaration, Type, Node } from 'ts-morph';

export interface TypeField {
  name: string;
  type: string; // "string" | "number" | "boolean" | "object" | "array" | "union" | "enum" | "any"
  isArray: boolean;
  isOptional: boolean;
  nested?: TypeSchema; // For nested objects or arrays of objects
  unionValues?: string[]; // For string unions or enums
}

export interface TypeSchema {
  name: string;
  fields: TypeField[];
}

export class TypeParser {
  private project: Project;

  constructor() {
    const fileSystem = new InMemoryFileSystemHost();
    this.project = new Project({
      fileSystem,
      skipLoadingLibFiles: true,
      compilerOptions: {
        strict: true,
        noLib: true,
      },
    });
  }

  public parseSchema(code: string): TypeSchema[] {
    const sourceFile = this.project.createSourceFile('input.ts', code, { overwrite: true });

    const schemas: TypeSchema[] = [];

    const interfaces = sourceFile.getInterfaces();
    for (const iface of interfaces) {
      schemas.push(this.parseInterface(iface));
    }

    const typeAliases = sourceFile.getTypeAliases();
    for (const alias of typeAliases) {
      const schema = this.parseTypeAlias(alias);
      if (schema) {
        schemas.push(schema);
      }
    }

    return schemas;
  }

  private parseInterface(iface: InterfaceDeclaration): TypeSchema {
    const fields: TypeField[] = [];

    for (const prop of iface.getProperties()) {
      const typeNode = prop.getType();
      fields.push(this.analyzeType(prop.getName(), typeNode, prop.hasQuestionToken()));
    }

    return {
      name: iface.getName(),
      fields,
    };
  }

  private parseTypeAlias(alias: TypeAliasDeclaration): TypeSchema | null {
    const typeNode = alias.getType();

    if (typeNode.isObject() && !typeNode.isArray()) {
       const fields: TypeField[] = [];
       const properties = typeNode.getProperties();

       for (const prop of properties) {
         const decl = prop.getValueDeclaration();
         if (decl && Node.isPropertySignature(decl)) {
            fields.push(this.analyzeType(prop.getName(), decl.getType(), decl.hasQuestionToken()));
         } else if (decl && Node.isPropertyAssignment(decl)) {
             fields.push(this.analyzeType(prop.getName(), decl.getType(), false));
         } else {
             fields.push(this.analyzeType(prop.getName(), prop.getTypeAtLocation(alias), false));
         }
       }

       return {
         name: alias.getName(),
         fields
       };
    }

    return null;
  }

  private analyzeType(name: string, type: Type, isOptional: boolean): TypeField {
    const isArray = type.isArray();
    let effectiveType = isArray ? type.getArrayElementType()! : type;

    // Check if it's a union containing array (e.g. string[] | undefined)
    if (!isArray && effectiveType.isUnion()) {
       const nonUndefined = effectiveType.getUnionTypes().filter(t => !t.isUndefined());

       if (nonUndefined.length === 1) {
           const innerType = nonUndefined[0];

           if (innerType.isArray()) {
               // We found it's an array wrapped in a union
               // We need to construct the result manually because if we recurse, `isArray` logic inside might fail again if we don't pass `innerType` properly?
               // Actually recursing should work if innerType is the array type.
               return this.analyzeType(name, innerType, isOptional || effectiveType.getUnionTypes().some(t => t.isUndefined()));
           }

           // Sometimes ts-morph might wrap array in a way isArray() returns false but it text is "string[]"
           // This is a hacky fallback but useful for "Type | undefined" patterns
           const text = innerType.getText();
           if (text.endsWith("[]")) {
                const elementTypeText = text.slice(0, -2);
                 if (elementTypeText === "string") {
                     return { name, type: "string", isArray: true, isOptional: true };
                 }
                 if (elementTypeText === "number") {
                     return { name, type: "number", isArray: true, isOptional: true };
                 }
                 if (elementTypeText === "boolean") {
                     return { name, type: "boolean", isArray: true, isOptional: true };
                 }
                 return { name, type: "object", isArray: true, isOptional: true, nested: { name: elementTypeText, fields: [] } };
           }

           if (text.startsWith("Array<")) {
                const typeArgs = innerType.getTypeArguments();
                if (typeArgs.length > 0) {
                     // Recurse with the inner type of Array<T>, but FORCE isArray=true in the return
                     const innerResult = this.analyzeType(name, typeArgs[0], isOptional || effectiveType.getUnionTypes().some(t => t.isUndefined()));
                     // innerResult is the element type, so we set isArray=true
                     return { ...innerResult, isArray: true };
                }
           }
       }
    }

    // Remove undefined from union for optional check if not already handled by token
    if (effectiveType.isUnion()) {
        const unionTypes = effectiveType.getUnionTypes();
        const hasUndefined = unionTypes.some(t => t.isUndefined());
        if (hasUndefined) {
            isOptional = true;
        }
    }

    let typeStr = "any";
    let unionValues: string[] | undefined;
    let nested: TypeSchema | undefined;

    if (effectiveType.isString()) typeStr = "string";
    else if (effectiveType.isNumber()) typeStr = "number";
    else if (effectiveType.isBoolean()) typeStr = "boolean";
    else if (effectiveType.isEnum()) {
        typeStr = "enum";
        const symbol = effectiveType.getSymbol();
        if (symbol) {
            const decl = symbol.getDeclarations()[0];
            if (Node.isEnumDeclaration(decl)) {
                unionValues = decl.getMembers().map(m => {
                    const val = m.getValue();
                    return typeof val === 'string' ? `"${val}"` : String(val);
                });
            }
        }
    }
    else if (effectiveType.isUnion()) {
       const unionTypes = effectiveType.getUnionTypes().filter(t => !t.isUndefined());
       const isStringUnion = unionTypes.every(t => t.isStringLiteral());

       if (isStringUnion) {
           typeStr = "union";
           unionValues = unionTypes.map(t => t.getText());
       } else {
           typeStr = "union";
       }
    }
    else if (effectiveType.isObject()) {
        typeStr = "object";
        const props = effectiveType.getProperties();
        if (props.length > 0) {
            const nestedFields: TypeField[] = [];
             for (const prop of props) {
                 const propName = prop.getName();
                 if (propName.startsWith("__")) continue;

                 const symbol = effectiveType.getSymbol();
                 const isAnonymous = !symbol || symbol.getName() === "__type";

                 if (isAnonymous) {
                     const valDecl = prop.getValueDeclaration();
                     const propType = valDecl ? valDecl.getType() : prop.getTypeAtLocation(valDecl || effectiveType.getSymbol()?.getDeclarations()[0]!);

                     nestedFields.push(this.analyzeType(propName, propType, valDecl ? Node.isPropertySignature(valDecl) && valDecl.hasQuestionToken() : false));
                 }
             }
             if (nestedFields.length > 0) {
                 nested = {
                     name: name,
                     fields: nestedFields
                 };
             }
        }
    }

    return {
      name,
      type: typeStr,
      isArray,
      isOptional,
      unionValues,
      nested
    };
  }
}
