import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Language-specific hints help Claude identify class structures
 * correctly across different programming paradigms
 */
const LANGUAGE_HINTS: Record<string, string> = {
  TypeScript: `
    - Look for 'class' declarations, 'interface' declarations, and 'type' aliases for object shapes
    - Extract property types from TypeScript type annotations
    - Identify 'extends' for inheritance and 'implements' for interface implementation
    - Look for decorators (@Entity, @Injectable, etc.) that indicate important classes
    - Abstract classes should be marked with <<abstract>>
  `,
  JavaScript: `
    - Look for ES6 'class' declarations
    - Check for prototype-based inheritance patterns
    - Identify constructor functions that act as classes
    - Note that types may not be explicit; infer from usage where possible
  `,
  Python: `
    - Look for 'class' declarations
    - Check for inheritance in class definition parentheses: class Child(Parent)
    - Look for type hints in method signatures and variable annotations
    - Identify dataclasses and Pydantic models as important classes
    - Check for abstract base classes (ABC) indicating interfaces
    - Protocol classes should be treated as interfaces
  `,
  Java: `
    - Look for 'class' and 'interface' declarations
    - Identify 'extends' for inheritance and 'implements' for interfaces
    - Note access modifiers (public, private, protected)
    - Look for annotations (@Entity, @Service, etc.) indicating important classes
    - Abstract classes should be marked with <<abstract>>
    - Enums can be included as special classes
  `,
  'C#': `
    - Look for 'class', 'interface', 'struct', and 'record' declarations
    - Identify inheritance with ':' syntax
    - Note access modifiers and properties with getters/setters
    - Look for attributes ([Serializable], etc.) on important classes
    - Abstract classes should be marked with <<abstract>>
  `,
  Go: `
    - Look for 'type X struct' declarations (these are your classes)
    - Look for 'type X interface' declarations
    - Identify method receivers: 'func (x *X) Method()' means X has Method
    - Note embedded structs for composition (shown as inheritance in diagram)
    - Go doesn't have classes, so structs with methods are the equivalent
  `,
  Rust: `
    - Look for 'struct' declarations (these are your classes)
    - Look for 'trait' declarations (these are your interfaces)
    - Identify 'impl Trait for Struct' for interface implementation
    - Check 'impl Struct' blocks for methods belonging to each struct
    - Note derive macros that indicate important traits
  `,
  Kotlin: `
    - Look for 'class', 'data class', 'sealed class', 'object', and 'interface' declarations
    - Identify inheritance with ':' syntax
    - Note that Kotlin has primary constructors in the class header
    - Companion objects can be noted but are secondary to main classes
  `,
  Ruby: `
    - Look for 'class' declarations
    - Identify inheritance with '<' syntax: class Child < Parent
    - Look for 'module' declarations that act as mixins
    - attr_reader, attr_writer, attr_accessor define properties
    - Methods defined with 'def' keyword
  `,
  PHP: `
    - Look for 'class', 'interface', 'trait', and 'abstract class' declarations
    - Identify 'extends' for inheritance and 'implements' for interfaces
    - Note visibility modifiers (public, private, protected)
    - Look for type hints in method signatures (PHP 7+)
  `,
  Swift: `
    - Look for 'class', 'struct', 'protocol', and 'enum' declarations
    - Identify inheritance with ':' syntax
    - Note that structs are value types but still worth including
    - Extensions add methods to types but don't need separate diagram entries
  `,
  Scala: `
    - Look for 'class', 'case class', 'trait', and 'object' declarations
    - Identify inheritance with 'extends' and mixin with 'with'
    - Traits are similar to interfaces but can have implementation
    - Companion objects pair with classes but are secondary
  `,
};

/**
 * Input parameters for class diagram generation
 */
export interface ClassDiagramInput {
  repoName: string;
  owner: string;
  language: string | null;
  files: { path: string; content: string }[];
  tree: string[];
  options: {
    focusDirectory?: string;
    excludePatterns?: string[];
    maxClasses?: number;
    includePrivate?: boolean;
  };
}

/**
 * Result of class diagram generation including metadata
 */
export interface ClassDiagramResult {
  mermaid: string;
  classCount: number;
  relationshipCount: number;
  language: string | null;
}

/**
 * Generate a Mermaid class diagram from repository source files
 * 
 * This function analyzes the provided source files to identify classes,
 * interfaces, their properties, methods, and relationships, then outputs
 * a valid Mermaid class diagram that can be rendered in GitHub or any
 * Mermaid-compatible viewer.
 */
export async function generateClassDiagram(input: ClassDiagramInput): Promise<ClassDiagramResult> {
  const { repoName, owner, language, files, options } = input;
  
  // Get language-specific analysis hints
  const langHints = language ? LANGUAGE_HINTS[language] || '' : '';
  
  // Filter files if a focus directory was specified
  let relevantFiles = files;
  if (options.focusDirectory) {
    relevantFiles = files.filter(f => f.path.startsWith(options.focusDirectory!));
  }
  
  // If no files remain after filtering, return an empty diagram with a note
  if (relevantFiles.length === 0) {
    return {
      mermaid: 'classDiagram\n    note "No source files found to analyze"',
      classCount: 0,
      relationshipCount: 0,
      language,
    };
  }
  
  // Prepare file contents for the prompt, truncating very large files
  const maxFileSize = 15000; // Characters per file to avoid token limits
  const fileContents = relevantFiles
    .map(f => {
      const truncatedContent = f.content.length > maxFileSize 
        ? f.content.substring(0, maxFileSize) + '\n// ... truncated for length'
        : f.content;
      return `### File: ${f.path}\n\`\`\`\n${truncatedContent}\n\`\`\``;
    })
    .join('\n\n');

  const prompt = `You are an expert software architect analyzing a codebase to generate a class diagram. Your task is to identify all significant classes, interfaces, and their relationships, then output a valid Mermaid class diagram.

## Repository: ${owner}/${repoName}
## Primary Language: ${language || 'Unknown'}

## Language-Specific Guidance
${langHints}

## Analysis Instructions

Carefully analyze the source files to identify:

1. **Classes and Interfaces**: Find all class, interface, struct, trait, or equivalent declarations. Focus on domain classes (models, services, controllers) rather than utility classes or simple data containers.

2. **Properties/Fields**: For each class, identify the important properties. Include:
   - Property name
   - Type (if available)
   - Visibility: + public, - private, # protected, ~ package/internal

3. **Methods**: For each class, identify the key methods. Include:
   - Method name
   - Parameters with types (simplified, e.g., "id: string" not full signatures)
   - Return type (if available)
   - Visibility modifier
   - Mark abstract methods with asterisk: +abstractMethod()*

4. **Relationships**: Identify how classes relate to each other:
   - Inheritance: Child --|> Parent (solid line, closed arrow)
   - Interface Implementation: Class ..|> Interface (dashed line, closed arrow)
   - Composition: Container *-- Part (solid line, filled diamond) - strong ownership
   - Aggregation: Container o-- Part (solid line, empty diamond) - weak ownership
   - Association: ClassA --> ClassB (solid line, open arrow) - uses/references
   - Dependency: ClassA ..> ClassB (dashed line, open arrow) - depends on

## Mermaid Syntax Reference

Use this exact syntax structure:

\`\`\`mermaid
classDiagram
    class ClassName {
        +string publicProperty
        -int privateProperty
        #bool protectedProperty
        +publicMethod(param: type) returnType
        -privateMethod() void
        +abstractMethod()* void
    }
    
    class InterfaceName {
        <<interface>>
        +requiredMethod() void
    }
    
    class AbstractClass {
        <<abstract>>
        +concreteMethod() void
        +abstractMethod()* void
    }
    
    Parent <|-- Child : extends
    Interface <|.. Implementation : implements
    Whole *-- Part : contains
    Container o-- Item : has
    ClassA --> ClassB : uses
    ClassA ..> ClassB : depends on
\`\`\`

## Important Guidelines

1. **Limit scope**: Include at most ${options.maxClasses || 20} of the most important classes. Prioritize:
   - Domain models and entities (User, Order, Product, etc.)
   - Service classes with business logic
   - Controllers/handlers for main features
   - Core interfaces that define contracts
   
2. **Exclude from the diagram**:
   - Test classes and test utilities
   - Simple DTOs with only properties and no behavior
   - Generated code or framework boilerplate
   - Third-party library classes
   - Configuration classes with only constants
   - Exception classes (unless central to the domain)

3. **Keep it readable**:
   - Include only 3-5 most important methods per class
   - Skip getters/setters unless they contain logic
   - Use short, clear relationship labels
   - Group related classes visually when possible

4. **Mark special types**:
   - Use <<interface>> for interfaces
   - Use <<abstract>> for abstract classes
   - Use <<enumeration>> for enums if included
   - Use <<service>> or <<entity>> annotations if helpful

5. **Relationship labels**: Add brief labels to relationships that clarify the association, like "manages", "creates", "validates", "stores"

## Output Format

Output ONLY the Mermaid code block. Start with \`\`\`mermaid and end with \`\`\`. 

Do not include:
- Any explanation before the diagram
- Any notes after the diagram
- Any markdown outside the code fence

The diagram must be syntactically valid Mermaid that renders without errors.

## Source Files to Analyze

${fileContents}

## Generated Class Diagram:`;

  // Call Claude to generate the diagram
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseContent = response.content[0];
  if (responseContent.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  // Extract and validate the Mermaid code
  let mermaid = extractMermaidCode(responseContent.text);
  const validation = validateMermaidSyntax(mermaid);
  
  // If validation found issues, attempt to fix them
  if (!validation.valid) {
    console.warn('Mermaid validation issues:', validation.errors);
    mermaid = attemptMermaidFix(mermaid, validation.errors);
  }

  // Count elements for metadata
  const classCount = countClasses(mermaid);
  const relationshipCount = countRelationships(mermaid);

  return {
    mermaid,
    classCount,
    relationshipCount,
    language,
  };
}

/**
 * Extract Mermaid code from Claude's response
 * Handles various formats Claude might use
 */
function extractMermaidCode(text: string): string {
  // First, try to find a mermaid-specific code block
  const mermaidMatch = text.match(/```mermaid\s*\n([\s\S]*?)```/);
  if (mermaidMatch) {
    return mermaidMatch[1].trim();
  }
  
  // Try a generic code block that starts with classDiagram
  const codeMatch = text.match(/```\s*\n?(classDiagram[\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  
  // Try any code block
  const anyCodeMatch = text.match(/```\s*\n?([\s\S]*?)```/);
  if (anyCodeMatch) {
    return anyCodeMatch[1].trim();
  }
  
  // If no code blocks found, check if the response itself looks like Mermaid
  if (text.trim().startsWith('classDiagram')) {
    return text.trim();
  }
  
  // Last resort: return the whole text and hope for the best
  return text.trim();
}

/**
 * Validate Mermaid class diagram syntax
 * Returns validation status and list of detected errors
 */
function validateMermaidSyntax(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = code.split('\n');
  
  // Check for required diagram declaration
  if (!code.trim().startsWith('classDiagram')) {
    errors.push('Missing classDiagram declaration at start');
  }
  
  // Check for balanced braces in class definitions
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    braceDepth += opens - closes;
    
    if (braceDepth < 0) {
      errors.push(`Unbalanced closing brace at line ${i + 1}`);
    }
  }
  if (braceDepth !== 0) {
    errors.push(`Unbalanced braces: ${braceDepth > 0 ? 'missing closing' : 'extra closing'} brace(s)`);
  }
  
  // Check for duplicate class keyword
  if (code.includes('class class ')) {
    errors.push('Duplicate "class" keyword found');
  }
  
  // Check for empty class names
  if (/class\s+{/.test(code)) {
    errors.push('Empty class name found');
  }
  
  // Check for invalid characters in class names
  const classNames = code.match(/class\s+(\w+)/g);
  if (classNames) {
    for (const match of classNames) {
      const name = match.replace('class ', '');
      if (/^\d/.test(name)) {
        errors.push(`Class name "${name}" cannot start with a number`);
      }
    }
  }
  
  // Check relationship syntax
  const relationshipPatterns = [
    /<\|--/, // Inheritance
    /<\|\.\./, // Implementation
    /\*--/, // Composition
    /o--/, // Aggregation
    /-->/, // Association
    /\.\.>/, // Dependency
    /--/, // Simple association
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, comments, class definitions, and members
    if (!line || line.startsWith('classDiagram') || line.startsWith('class ') || 
        line.startsWith('+') || line.startsWith('-') || line.startsWith('#') || 
        line.startsWith('~') || line === '{' || line === '}' ||
        line.startsWith('<<') || line.startsWith('note')) {
      continue;
    }
    
    // If line contains relationship indicators but doesn't match valid patterns
    if ((line.includes('--') || line.includes('..')) && 
        !line.includes('{') && !line.includes('}')) {
      const hasValidPattern = relationshipPatterns.some(pattern => pattern.test(line));
      if (!hasValidPattern) {
        // This might be a relationship line with invalid syntax
        // But don't flag it as error since we might have false positives
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Attempt to fix common Mermaid syntax issues
 */
function attemptMermaidFix(code: string, errors: string[]): string {
  let fixed = code;
  
  // Add classDiagram declaration if missing
  if (!fixed.trim().startsWith('classDiagram')) {
    fixed = 'classDiagram\n' + fixed;
  }
  
  // Fix duplicate class keywords
  fixed = fixed.replace(/class\s+class\s+/g, 'class ');
  
  // Fix unbalanced braces by tracking and closing open ones
  const lines = fixed.split('\n');
  const fixedLines: string[] = [];
  let braceDepth = 0;
  let inClassBlock = false;
  
  for (const line of lines) {
    let processedLine = line;
    
    // Track class block entry
    if (line.includes('class ') && line.includes('{')) {
      inClassBlock = true;
      braceDepth++;
      fixedLines.push(processedLine);
      continue;
    }
    
    // Track class block exit
    if (line.trim() === '}') {
      if (braceDepth > 0) {
        braceDepth--;
        if (braceDepth === 0) {
          inClassBlock = false;
        }
      }
      fixedLines.push('    }');
      continue;
    }
    
    // Ensure proper indentation for class members
    if (inClassBlock && line.trim().length > 0 && !line.trim().startsWith('class ')) {
      const trimmed = line.trim();
      // Skip if it's an annotation
      if (trimmed.startsWith('<<') && trimmed.endsWith('>>')) {
        fixedLines.push('        ' + trimmed);
      } else if (trimmed.startsWith('+') || trimmed.startsWith('-') || 
                 trimmed.startsWith('#') || trimmed.startsWith('~')) {
        fixedLines.push('        ' + trimmed);
      } else {
        fixedLines.push(processedLine);
      }
      continue;
    }
    
    fixedLines.push(processedLine);
  }
  
  // Close any unclosed braces
  while (braceDepth > 0) {
    fixedLines.push('    }');
    braceDepth--;
  }
  
  return fixedLines.join('\n');
}

/**
 * Count the number of classes defined in the diagram
 */
function countClasses(code: string): number {
  // Match "class ClassName" but not relationship lines
  const classMatches = code.match(/^\s*class\s+\w+/gm);
  return classMatches ? classMatches.length : 0;
}

/**
 * Count the number of relationships in the diagram
 */
function countRelationships(code: string): number {
  const relationshipPatterns = [
    /<\|--/g,   // Inheritance
    /<\|\.\./g, // Implementation  
    /\*--/g,    // Composition
    /o--/g,     // Aggregation
    /-->/g,     // Association (but not part of other arrows)
    /\.\.\>/g,  // Dependency
  ];
  
  let count = 0;
  
  // Process line by line to avoid counting arrows inside class definitions
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip class definition lines and member lines
    if (trimmed.startsWith('class ') || trimmed.startsWith('+') || 
        trimmed.startsWith('-') || trimmed.startsWith('#') ||
        trimmed.startsWith('~') || trimmed === '{' || trimmed === '}' ||
        trimmed.startsWith('<<') || trimmed.startsWith('classDiagram')) {
      continue;
    }
    
    // Count relationship arrows in this line
    for (const pattern of relationshipPatterns) {
      const matches = trimmed.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
  }
  
  return count;
}
