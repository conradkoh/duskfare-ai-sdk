# FileTool API Documentation

## Overview

The FileTool provides comprehensive file manipulation capabilities optimized for AI-driven code modifications. It supports two main operations:

1. **rewriteFile** - Replace entire file contents
2. **applyDiff** - Apply targeted changes using 10 different operation types

## API Reference

### rewriteFile(path: string, content: string): Promise<Result<void>>

Completely replaces file contents. Creates parent directories if they don't exist.

**Use when:**

- Creating new files
- Complete file rewrites are needed
- File is small (< 50 lines)

**Example:**

```typescript
const result = await fileTool.rewriteFile(
  "src/utils/math.ts",
  "export function add(a: number, b: number) {\n  return a + b;\n}"
);
```

---

### applyDiff(path: string, diff: Diff): Promise<Result<void>>

Applies targeted changes to an existing file using one or more operations.

**Use when:**

- Making targeted changes to large files
- Modifying specific sections
- Adding/removing/replacing code blocks
- Token efficiency is important

---

## Diff Operations

### Category 1: Simple Line-Based Operations

Best for single-line changes when you know exact line numbers.

#### insert

Insert a single line after a specified line number.

**Parameters:**

- `type`: "insert"
- `lineNumber`: Position to insert after (0 = beginning)
- `content`: Line content to insert

**Example:**

```json
{
  "operations": [
    {
      "type": "insert",
      "lineNumber": 5,
      "content": "  console.log('debug');"
    }
  ]
}
```

**Use when:**

- Adding a single line
- You know the exact position
- Simple, straightforward insertion

---

#### delete

Delete a single line at a specified line number.

**Parameters:**

- `type`: "delete"
- `lineNumber`: Line to delete (1-indexed)

**Example:**

```json
{
  "operations": [
    {
      "type": "delete",
      "lineNumber": 3
    }
  ]
}
```

**Use when:**

- Removing a single line
- You know the exact line number

---

#### replace

Replace a single line with new content.

**Parameters:**

- `type`: "replace"
- `lineNumber`: Line to replace (1-indexed)
- `content`: New line content

**Example:**

```json
{
  "operations": [
    {
      "type": "replace",
      "lineNumber": 10,
      "content": "  return result * 2;"
    }
  ]
}
```

**Use when:**

- Modifying a single line
- You know the exact line number

---

### Category 2: Block Operations

Best for multi-line changes when you know line numbers. Reduces cognitive load and token usage.

#### insert_block

Insert multiple lines at once.

**Parameters:**

- `type`: "insert_block"
- `lineNumber`: Position to insert after (0 = beginning)
- `lines`: Array of lines to insert

**Example:**

```json
{
  "operations": [
    {
      "type": "insert_block",
      "lineNumber": 9,
      "lines": [
        "",
        "  multiply(a: number, b: number): number {",
        "    return a * b;",
        "  }"
      ]
    }
  ]
}
```

**Use when:**

- Adding a method/function (multiple lines)
- Adding a code block
- You want to minimize operations

**Why better than multiple inserts:**

- ✅ Single operation instead of N operations
- ✅ No sequential line number calculation
- ✅ Clearer intent
- ✅ Fewer tokens

---

#### delete_range

Delete a range of consecutive lines.

**Parameters:**

- `type`: "delete_range"
- `startLine`: First line to delete (1-indexed, inclusive)
- `endLine`: Last line to delete (1-indexed, inclusive)

**Example:**

```json
{
  "operations": [
    {
      "type": "delete_range",
      "startLine": 15,
      "endLine": 22
    }
  ]
}
```

**Use when:**

- Removing a method/function
- Removing a code block
- Deleting multiple consecutive lines

**Why better than multiple deletes:**

- ✅ Single operation instead of N operations
- ✅ Clear start/end boundaries
- ✅ No confusing sequential deletes

---

#### replace_range

Replace a range of lines with new content.

**Parameters:**

- `type`: "replace_range"
- `startLine`: First line to replace (1-indexed, inclusive)
- `endLine`: Last line to replace (1-indexed, inclusive)
- `lines`: Array of replacement lines

**Example:**

```json
{
  "operations": [
    {
      "type": "replace_range",
      "startLine": 10,
      "endLine": 15,
      "lines": [
        "  async processData(data: string): Promise<void> {",
        "    await this.validate(data);",
        "    await this.save(data);",
        "  }"
      ]
    }
  ]
}
```

**Use when:**

- Refactoring a method
- Replacing a code block
- New content has different number of lines than original

---

### Category 3: Context-Based Operations

Best when you want maximum robustness. No line numbers needed - finds content automatically.

#### insert_after

Find content and insert a line after it.

**Parameters:**

- `type`: "insert_after"
- `searchContent`: Content to search for (partial match)
- `content`: Line to insert
- `occurrence`: (optional) Which occurrence to match (default: 1)

**Example:**

```json
{
  "operations": [
    {
      "type": "insert_after",
      "searchContent": "return a + b;",
      "content": "  console.log('Result:', result);"
    }
  ]
}
```

**With occurrence:**

```json
{
  "operations": [
    {
      "type": "insert_after",
      "searchContent": "return",
      "content": "  // Second return",
      "occurrence": 2
    }
  ]
}
```

**Use when:**

- You don't know exact line numbers
- File might change before execution
- You want self-verifying operations
- Maximum robustness needed

**Benefits:**

- ✅ No line numbers needed
- ✅ Self-verifying (fails if content not found)
- ✅ Robust to file changes
- ✅ Clear intent

---

#### insert_before

Find content and insert a line before it.

**Parameters:**

- `type`: "insert_before"
- `searchContent`: Content to search for (partial match)
- `content`: Line to insert
- `occurrence`: (optional) Which occurrence to match (default: 1)

**Example:**

```json
{
  "operations": [
    {
      "type": "insert_before",
      "searchContent": "return result;",
      "content": "  this.logger.debug('Processing complete');"
    }
  ]
}
```

**Use when:**

- Need to add code before a specific line
- Same benefits as `insert_after`

---

#### replace_content

Find exact content and replace it. Supports multi-line matching.

**Parameters:**

- `type`: "replace_content"
- `oldContent`: Exact content to find (must match exactly, including whitespace)
- `newContent`: Replacement content
- `occurrence`: (optional) Which occurrence to match (default: 1)

**Single-line example:**

```json
{
  "operations": [
    {
      "type": "replace_content",
      "oldContent": "function oldName() {",
      "newContent": "function newName() {"
    }
  ]
}
```

**Multi-line example:**

```json
{
  "operations": [
    {
      "type": "replace_content",
      "oldContent": "function calculate(x) {\n  return x * 2;\n}",
      "newContent": "async function calculate(x) {\n  const result = await transform(x);\n  return result * 2;\n}"
    }
  ]
}
```

**Use when:**

- Refactoring function names
- Changing method signatures
- Replacing code blocks
- You want exact matching for safety

**Benefits:**

- ✅ No line numbers
- ✅ Exact matching prevents accidental changes
- ✅ Multi-line support
- ✅ Great for refactoring

---

#### delete_content

Find exact content and delete it. Supports multi-line matching.

**Parameters:**

- `type`: "delete_content"
- `content`: Exact content to find and delete
- `occurrence`: (optional) Which occurrence to match (default: 1)

**Single-line example:**

```json
{
  "operations": [
    {
      "type": "delete_content",
      "content": "  console.log('debug');"
    }
  ]
}
```

**Multi-line example:**

```json
{
  "operations": [
    {
      "type": "delete_content",
      "content": "  @deprecated\n  oldMethod() {\n    console.log('old');\n  }"
    }
  ]
}
```

**Use when:**

- Removing debug statements
- Removing deprecated code
- You know exact content to remove

---

## Real-World Examples

### Example 1: Add a new method to a class

**File: `src/calculator.ts`**

```typescript
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
```

**Task:** Add multiply method

**Best approach - insert_block:**

```json
{
  "operations": [
    {
      "type": "insert_block",
      "lineNumber": 4,
      "lines": [
        "",
        "  multiply(a: number, b: number): number {",
        "    return a * b;",
        "  }"
      ]
    }
  ]
}
```

**Alternative - context-based (more robust):**

```json
{
  "operations": [
    {
      "type": "insert_after",
      "searchContent": "return a + b;",
      "content": "  }\n\n  multiply(a: number, b: number): number {\n    return a * b;"
    }
  ]
}
```

---

### Example 2: Remove deprecated method

**File: `src/service.ts`**

```typescript
export class UserService {
  // TODO: Remove this
  @deprecated
  oldMethod(): void {
    console.log("old");
  }

  newMethod(): void {
    console.log("new");
  }
}
```

**Task:** Remove deprecated method (lines 2-6)

**Best approach - delete_range:**

```json
{
  "operations": [
    {
      "type": "delete_range",
      "startLine": 2,
      "endLine": 6
    }
  ]
}
```

**Alternative - context-based (safest):**

```json
{
  "operations": [
    {
      "type": "delete_content",
      "content": "  // TODO: Remove this\n  @deprecated\n  oldMethod(): void {\n    console.log(\"old\");\n  }"
    }
  ]
}
```

---

### Example 3: Refactor function to async

**File: `src/processor.ts`**

```typescript
function processData(data: string): void {
  console.log(data);
  saveToDatabase(data);
}
```

**Task:** Make function async

**Best approach - replace_content:**

```json
{
  "operations": [
    {
      "type": "replace_content",
      "oldContent": "function processData(data: string): void {\n  console.log(data);\n  saveToDatabase(data);\n}",
      "newContent": "async function processData(data: string): Promise<void> {\n  console.log(data);\n  await saveToDatabase(data);\n}"
    }
  ]
}
```

---

### Example 4: Add import statement

**File: `src/index.ts`**

```typescript
import { User } from "./models/user";

export class App {
  // ...
}
```

**Task:** Add another import

**Best approach - insert_after:**

```json
{
  "operations": [
    {
      "type": "insert_after",
      "searchContent": "import { User } from './models/user';",
      "content": "import { Product } from './models/product';"
    }
  ]
}
```

**Alternative - line-based if you know it's line 1:**

```json
{
  "operations": [
    {
      "type": "insert",
      "lineNumber": 1,
      "content": "import { Product } from './models/product';"
    }
  ]
}
```

---

### Example 5: Multiple changes in sequence

**File: `src/math.ts`**

```typescript
export class Math {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }
}
```

**Task:**

1. Add type annotations to add method
2. Add multiply method
3. Remove subtract method

**Approach - multiple operations:**

```json
{
  "operations": [
    {
      "type": "replace_content",
      "oldContent": "  add(a, b) {\n    return a + b;\n  }",
      "newContent": "  add(a: number, b: number): number {\n    return a + b;\n  }"
    },
    {
      "type": "insert_after",
      "searchContent": "add(a: number, b: number): number",
      "content": "\n  multiply(a: number, b: number): number {\n    return a * b;\n  }"
    },
    {
      "type": "delete_content",
      "content": "  subtract(a, b) {\n    return a - b;\n  }"
    }
  ]
}
```

---

## Decision Guide

### Choose Simple Line-Based When:

- ✅ Single line changes
- ✅ You have exact line numbers
- ✅ File is small and stable
- ✅ Quick one-off changes

### Choose Block Operations When:

- ✅ Multi-line changes
- ✅ You have line numbers but want fewer operations
- ✅ Adding/removing code blocks
- ✅ Reducing cognitive load

### Choose Context-Based When:

- ✅ Maximum robustness needed
- ✅ File might change
- ✅ Don't want to track line numbers
- ✅ Exact matching important
- ✅ Self-verifying operations desired

---

## Important Notes

### Line Numbering

- **insert/insert_block**: `lineNumber` is where to insert AFTER (0 = beginning)
- **delete/replace**: `lineNumber` is 1-indexed (line 1 = first line)
- **ranges**: Both `startLine` and `endLine` are 1-indexed and inclusive

### Sequential Operations

Operations are applied in order. Line numbers in later operations refer to the state AFTER previous operations have been applied.

**Example:**

```json
{
  "operations": [
    { "type": "delete", "lineNumber": 2 },
    { "type": "insert", "lineNumber": 2, "content": "new line" }
  ]
}
```

After first operation, line 2 is deleted. The second operation inserts after what is NOW line 2 (which was line 3 originally).

### Content Matching

For context-based operations:

- **Partial matching**: `insert_after`/`insert_before` use `.includes()` - matches if line contains the search string
- **Exact matching**: `replace_content`/`delete_content` require exact match including whitespace
- **Multi-line**: Use `\n` to match multiple lines in `replace_content`/`delete_content`

### Occurrence Parameter

When multiple matches exist:

```json
{
  "type": "insert_after",
  "searchContent": "return",
  "content": "// comment",
  "occurrence": 2 // Matches the 2nd occurrence
}
```

### Error Handling

All operations return `Result<void>`:

- **Success**: `{ data: undefined, error: undefined }`
- **Failure**: `{ data: undefined, error: Error }`

Common errors:

- Line number out of bounds
- Content not found (context-based operations)
- File doesn't exist (for applyDiff)
- Invalid range (startLine > endLine)

---

## Performance Tips

1. **Use block operations** instead of multiple single-line operations
2. **Use context-based** when robustness > performance
3. **Batch operations** - apply multiple changes in one diff
4. **Minimize operations** - one `insert_block` beats four `insert` operations

---

## Token Efficiency

**Most Efficient (Tokens):**

1. Context-based with multi-line content
2. Block operations
3. Simple line-based operations

**Example token comparison for adding 4-line method:**

- Multiple `insert`: ~100 tokens
- Single `insert_block`: ~80 tokens
- Context-based: ~90 tokens (but more robust)

---

## Common Patterns

### Pattern: Add method after existing method

```json
{
  "type": "insert_after",
  "searchContent": "  } // end of previous method",
  "content": "\n\n  newMethod() {\n    // implementation\n  }"
}
```

### Pattern: Replace function signature

```json
{
  "type": "replace_content",
  "oldContent": "function name(params) {",
  "newContent": "async function name(params): Promise<ReturnType> {"
}
```

### Pattern: Remove multiple lines by range

```json
{
  "type": "delete_range",
  "startLine": 10,
  "endLine": 25
}
```

### Pattern: Add import at top

```json
{
  "type": "insert",
  "lineNumber": 0,
  "content": "import { Something } from 'somewhere';"
}
```

---

## Best Practices

1. **Prefer context-based for production systems** - more robust to changes
2. **Use block operations for multi-line changes** - clearer intent, fewer operations
3. **Verify content matches exactly** when using `replace_content`/`delete_content`
4. **Handle errors gracefully** - operations can fail
5. **Test with edge cases** - empty files, beginning/end insertions
6. **Document intent** - clear operation names help future maintainers
7. **Batch related changes** - multiple operations in one diff

---

## Examples for Prompt Engineering

When building prompts for AI systems to use this tool, include these patterns:

**For adding code:**

```
Use insert_block to add this method after line X:
- Fewer operations
- Clear intent
- Single line number to track
```

**For removing code:**

```
Use delete_range if you know line numbers, or delete_content if you know exact content:
- delete_range: Fast, requires line numbers
- delete_content: Robust, no line numbers needed
```

**For modifying code:**

```
Use replace_content when possible:
- No line numbers needed
- Self-verifying (fails if content doesn't match)
- Works with multi-line blocks
```

**For complex refactoring:**

```
Break into multiple context-based operations:
1. replace_content for the main change
2. insert_after for additions
3. delete_content for removals
Each operation is independent and self-verifying
```
