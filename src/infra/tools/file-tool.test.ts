import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileToolImpl } from "./file-tool.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("FileToolImpl", () => {
  let fileTool: FileToolImpl;
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    fileTool = new FileToolImpl();
    // Create a temporary directory for test files
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-tool-test-"));
    testFilePath = path.join(testDir, "test-file.txt");
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("rewriteFile", () => {
    it("should create a new file with content", async () => {
      const content = "Hello, World!";
      const result = await fileTool.rewriteFile(testFilePath, content);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeUndefined();

      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(content);
    });

    it("should overwrite existing file content", async () => {
      // Create initial file
      await fs.writeFile(testFilePath, "Initial content");

      const newContent = "New content";
      const result = await fileTool.rewriteFile(testFilePath, newContent);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(newContent);
    });

    it("should handle empty content", async () => {
      const result = await fileTool.rewriteFile(testFilePath, "");

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe("");
    });

    it("should create parent directories if they don't exist", async () => {
      const nestedPath = path.join(testDir, "nested", "dir", "file.txt");
      const content = "Nested file content";

      const result = await fileTool.rewriteFile(nestedPath, content);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(nestedPath, "utf-8");
      expect(fileContent).toBe(content);
    });

    it("should return error when path is invalid", async () => {
      const invalidPath = "\0invalid";
      const result = await fileTool.rewriteFile(invalidPath, "content");

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeUndefined();
    });
  });

  describe("applyDiff", () => {
    beforeEach(async () => {
      // Create a test file with initial content
      const initialContent = `line 1
line 2
line 3
line 4
line 5`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should apply a single line insertion", async () => {
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 2, // Insert after line 2
            lines: ["inserted line"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
inserted line
line 3
line 4
line 5`);
    });

    it("should apply a single line deletion", async () => {
      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 3, // Delete line 3
            endLine: 3,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
line 4
line 5`);
    });

    it("should apply a single line replacement", async () => {
      const diff = {
        operations: [
          {
            type: "replace_range" as const,
            startLine: 3,
            endLine: 3,
            lines: ["replaced line 3"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
replaced line 3
line 4
line 5`);
    });

    it("should apply multiple operations in sequence", async () => {
      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 2, // Delete line 2 ("line 2")
            endLine: 2,
          },
          {
            type: "insert_block" as const,
            lineNumber: 2, // Insert after line 2 (which is now "line 3")
            lines: ["new line"],
          },
          {
            type: "replace_range" as const,
            startLine: 5, // Replace line 5 (which is now "line 5")
            endLine: 5,
            lines: ["final line"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 3
new line
line 4
final line`);
    });

    it("should handle inserting at the beginning", async () => {
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 0, // Insert at beginning
            lines: ["first line"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`first line
line 1
line 2
line 3
line 4
line 5`);
    });

    it("should handle inserting at the end", async () => {
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 5, // Insert after last line
            lines: ["last line"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
line 3
line 4
line 5
last line`);
    });

    it("should return error when file does not exist", async () => {
      const nonExistentPath = path.join(testDir, "non-existent.txt");
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 1,
            lines: ["new line"],
          },
        ],
      };

      const result = await fileTool.applyDiff(nonExistentPath, diff);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeUndefined();
    });

    it("should return error when line number is out of bounds for delete", async () => {
      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 99, // Line doesn't exist
            endLine: 99,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeUndefined();
    });

    it("should return error when line number is out of bounds for replace", async () => {
      const diff = {
        operations: [
          {
            type: "replace_range" as const,
            startLine: 99,
            endLine: 99,
            lines: ["replacement"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeUndefined();
    });

    it("should handle empty operations array", async () => {
      const diff = {
        operations: [],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
line 3
line 4
line 5`);
    });
  });

  describe("insert_block", () => {
    beforeEach(async () => {
      const initialContent = `line 1
line 2
line 3`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should insert multiple lines at once", async () => {
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 1,
            lines: ["new line 1", "new line 2", "new line 3"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
new line 1
new line 2
new line 3
line 2
line 3`);
    });

    it("should insert block at beginning", async () => {
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 0,
            lines: ["first", "second"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`first
second
line 1
line 2
line 3`);
    });

    it("should insert block at end", async () => {
      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 3,
            lines: ["new last", "very last"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
line 3
new last
very last`);
    });
  });

  describe("delete_range", () => {
    beforeEach(async () => {
      const initialContent = `line 1
line 2
line 3
line 4
line 5`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should delete a range of lines", async () => {
      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 2,
            endLine: 4,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 5`);
    });

    it("should delete a single line using range", async () => {
      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 3,
            endLine: 3,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 2
line 4
line 5`);
    });

    it("should return error when range is invalid", async () => {
      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 4,
            endLine: 2,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe("replace_range", () => {
    beforeEach(async () => {
      const initialContent = `line 1
line 2
line 3
line 4
line 5`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should replace a range of lines", async () => {
      const diff = {
        operations: [
          {
            type: "replace_range" as const,
            startLine: 2,
            endLine: 4,
            lines: ["replaced line 1", "replaced line 2"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
replaced line 1
replaced line 2
line 5`);
    });

    it("should replace with more lines than original", async () => {
      const diff = {
        operations: [
          {
            type: "replace_range" as const,
            startLine: 2,
            endLine: 3,
            lines: ["new 1", "new 2", "new 3", "new 4"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
new 1
new 2
new 3
new 4
line 4
line 5`);
    });
  });

  describe("insert_after (context-based)", () => {
    beforeEach(async () => {
      const initialContent = `function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should insert after found content", async () => {
      const diff = {
        operations: [
          {
            type: "insert_after" as const,
            searchContent: "return a + b;",
            content: "  console.log('adding');",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toContain("return a + b;\n  console.log('adding');");
    });

    it("should handle occurrence parameter", async () => {
      const initialContent = `return 1;
return 2;
return 3;`;
      await fs.writeFile(testFilePath, initialContent);

      const diff = {
        operations: [
          {
            type: "insert_after" as const,
            searchContent: "return",
            content: "// after second",
            occurrence: 2,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`return 1;
return 2;
// after second
return 3;`);
    });

    it("should return error when content not found", async () => {
      const diff = {
        operations: [
          {
            type: "insert_after" as const,
            searchContent: "nonexistent content",
            content: "new line",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Could not find occurrence");
      expect(result.error?.message).toContain("Found 0 matches total");
    });
  });

  describe("insert_before (context-based)", () => {
    beforeEach(async () => {
      const initialContent = `line 1
line 2
line 3`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should insert before found content", async () => {
      const diff = {
        operations: [
          {
            type: "insert_before" as const,
            searchContent: "line 2",
            content: "inserted before",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
inserted before
line 2
line 3`);
    });
  });

  describe("replace_content (context-based)", () => {
    beforeEach(async () => {
      const initialContent = `function oldName() {
  return 42;
}`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should replace single line content", async () => {
      const diff = {
        operations: [
          {
            type: "replace_content" as const,
            oldContent: "function oldName() {",
            newContent: "function newName() {",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toContain("function newName()");
      expect(fileContent).not.toContain("function oldName()");
    });

    it("should replace multi-line content", async () => {
      const diff = {
        operations: [
          {
            type: "replace_content" as const,
            oldContent: `function oldName() {
  return 42;
}`,
            newContent: `async function newName() {
  return await Promise.resolve(42);
}`,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toContain("async function newName()");
      expect(fileContent).toContain("await Promise.resolve(42)");
    });

    it("should handle occurrence parameter", async () => {
      const initialContent = `const x = 1;
const x = 2;
const x = 3;`;
      await fs.writeFile(testFilePath, initialContent);

      const diff = {
        operations: [
          {
            type: "replace_content" as const,
            oldContent: "const x = 2;",
            newContent: "const y = 2;",
            occurrence: 1,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`const x = 1;
const y = 2;
const x = 3;`);
    });

    it("should return error when content not found", async () => {
      const diff = {
        operations: [
          {
            type: "replace_content" as const,
            oldContent: "nonexistent",
            newContent: "replacement",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Could not find occurrence");
      expect(result.error?.message).toContain("Found 0 matches total");
    });
  });

  describe("delete_content (context-based)", () => {
    beforeEach(async () => {
      const initialContent = `line 1
line 2
line 3
line 4`;
      await fs.writeFile(testFilePath, initialContent);
    });

    it("should delete single line content", async () => {
      const diff = {
        operations: [
          {
            type: "delete_content" as const,
            content: "line 2",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 3
line 4`);
    });

    it("should delete multi-line content", async () => {
      const diff = {
        operations: [
          {
            type: "delete_content" as const,
            content: `line 2
line 3`,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toBe(`line 1
line 4`);
    });

    it("should return error when content not found", async () => {
      const diff = {
        operations: [
          {
            type: "delete_content" as const,
            content: "nonexistent",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Could not find occurrence");
      expect(result.error?.message).toContain("Found 0 matches total");
    });
  });

  describe("Real-world scenarios with new operations", () => {
    it("should add a method to a class using insert_block", async () => {
      const initialContent = `export class Calculator {
  add(a, b) {
    return a + b;
  }
}`;
      await fs.writeFile(testFilePath, initialContent);

      const diff = {
        operations: [
          {
            type: "insert_block" as const,
            lineNumber: 3,
            lines: ["", "  multiply(a, b) {", "    return a * b;", "  }"],
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toContain("multiply(a, b)");
      expect(fileContent).toContain("return a * b");
    });

    it("should remove deprecated method using delete_range", async () => {
      const initialContent = `export class Service {
  // TODO: Remove this
  @deprecated
  oldMethod() {
    console.log("old");
  }

  newMethod() {
    console.log("new");
  }
}`;
      await fs.writeFile(testFilePath, initialContent);

      const diff = {
        operations: [
          {
            type: "delete_range" as const,
            startLine: 2,
            endLine: 6,
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).not.toContain("oldMethod");
      expect(fileContent).not.toContain("@deprecated");
      expect(fileContent).toContain("newMethod");
    });

    it("should add method using context-based insert_after", async () => {
      const initialContent = `class Math {
  add(a, b) {
    return a + b;
  }
}`;
      await fs.writeFile(testFilePath, initialContent);

      const diff = {
        operations: [
          {
            type: "insert_after" as const,
            searchContent: "return a + b;",
            content: "  }",
          },
          {
            type: "insert_after" as const,
            searchContent: "  }",
            content: "",
          },
          {
            type: "insert_after" as const,
            searchContent: "",
            content: "  subtract(a, b) {",
            occurrence: 1,
          },
          {
            type: "insert_after" as const,
            searchContent: "  subtract(a, b) {",
            content: "    return a - b;",
          },
        ],
      };

      const result = await fileTool.applyDiff(testFilePath, diff);

      expect(result.error).toBeUndefined();
      const fileContent = await fs.readFile(testFilePath, "utf-8");
      expect(fileContent).toContain("subtract(a, b)");
    });
  });
});
