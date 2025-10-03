import fs from "fs/promises";
import path from "path";
import type { Result } from "../../types/Result.js";

/**
 * Represents a single diff operation that can be applied to a file
 */
export type DiffOperation =
  // Line/block operations (with line numbers)
  | {
      type: "insert_block";
      /** Line number after which to insert (0 = beginning of file) */
      lineNumber: number;
      /** Array of lines to insert (use single-element array for one line) */
      lines: string[];
    }
  | {
      type: "delete_range";
      /** Starting line number to delete (1-indexed, inclusive) */
      startLine: number;
      /** Ending line number to delete (1-indexed, inclusive). Use same as startLine to delete one line. */
      endLine: number;
    }
  | {
      type: "replace_range";
      /** Starting line number to replace (1-indexed, inclusive) */
      startLine: number;
      /** Ending line number to replace (1-indexed, inclusive). Use same as startLine to replace one line. */
      endLine: number;
      /** Array of lines to replace with */
      lines: string[];
    }
  // Context-based operations (find by content - no line numbers)
  | {
      type: "insert_after";
      /** Content to search for in the file (uses partial matching with .includes()) */
      searchContent: string;
      /** Content to insert after the found line */
      content: string;
      /** Which occurrence to match (1-indexed, default: 1). Specify to handle ambiguity. */
      occurrence?: number;
    }
  | {
      type: "insert_before";
      /** Content to search for in the file (uses partial matching with .includes()) */
      searchContent: string;
      /** Content to insert before the found line */
      content: string;
      /** Which occurrence to match (1-indexed, default: 1). Specify to handle ambiguity. */
      occurrence?: number;
    }
  | {
      type: "replace_content";
      /** Exact content to find and replace (can be multi-line, must match exactly) */
      oldContent: string;
      /** New content to replace with */
      newContent: string;
      /** Which occurrence to match (1-indexed, default: 1). Specify to handle ambiguity. */
      occurrence?: number;
    }
  | {
      type: "delete_content";
      /** Content to find and delete (can be multi-line, must match exactly) */
      content: string;
      /** Which occurrence to match (1-indexed, default: 1). Specify to handle ambiguity. */
      occurrence?: number;
    };

/**
 * Represents a collection of diff operations to apply to a file
 */
export interface Diff {
  /** Array of operations to apply in sequence */
  operations: DiffOperation[];
}

/**
 * Tool for performing file operations
 */
export interface FileTool {
  /**
   * Rewrites an entire file with new content
   * @param path - Path to the file
   * @param content - New content to write
   * @returns Result indicating success or error
   */
  rewriteFile(path: string, content: string): Promise<Result<void>>;

  /**
   * Applies a diff to a file
   * @param path - Path to the file
   * @param diff - Diff operations to apply
   * @returns Result indicating success or error
   */
  applyDiff(path: string, diff: Diff): Promise<Result<void>>;
}

/**
 * Implementation of FileTool for file system operations
 */
export class FileToolImpl implements FileTool {
  /**
   * Rewrites an entire file with new content, creating parent directories if needed
   * @param filePath - Path to the file
   * @param content - New content to write
   * @returns Result indicating success or error
   */
  async rewriteFile(filePath: string, content: string): Promise<Result<void>> {
    try {
      // Ensure parent directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(filePath, content, "utf-8");

      return { data: undefined, error: undefined } as unknown as Result<void>;
    } catch (error) {
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error(String(error)),
      } as unknown as Result<void>;
    }
  }

  /**
   * Applies a diff to a file by reading, modifying, and writing back
   * @param filePath - Path to the file
   * @param diff - Diff operations to apply
   * @returns Result indicating success or error
   */
  async applyDiff(filePath: string, diff: Diff): Promise<Result<void>> {
    try {
      // Read the file
      const content = await fs.readFile(filePath, "utf-8");
      let lines = content.split("\n");

      // Apply each operation in sequence
      for (const operation of diff.operations) {
        switch (operation.type) {
          case "insert_block": {
            // Insert multiple lines after the specified line number
            if (
              operation.lineNumber < 0 ||
              operation.lineNumber > lines.length
            ) {
              throw new Error(
                `insert_block: Line number ${operation.lineNumber} is out of bounds (file has ${lines.length} lines)`,
              );
            }
            lines.splice(operation.lineNumber, 0, ...operation.lines);
            break;
          }

          case "delete_range": {
            // Delete a range of lines (inclusive)
            if (
              operation.startLine < 1 ||
              operation.endLine > lines.length ||
              operation.startLine > operation.endLine
            ) {
              throw new Error(
                `delete_range: Range ${operation.startLine}-${operation.endLine} is invalid (file has ${lines.length} lines)`,
              );
            }
            const deleteCount = operation.endLine - operation.startLine + 1;
            lines.splice(operation.startLine - 1, deleteCount);
            break;
          }

          case "replace_range": {
            // Replace a range of lines with new lines
            if (
              operation.startLine < 1 ||
              operation.endLine > lines.length ||
              operation.startLine > operation.endLine
            ) {
              throw new Error(
                `replace_range: Range ${operation.startLine}-${operation.endLine} is invalid (file has ${lines.length} lines)`,
              );
            }
            const deleteCount = operation.endLine - operation.startLine + 1;
            lines.splice(
              operation.startLine - 1,
              deleteCount,
              ...operation.lines,
            );
            break;
          }

          case "insert_after": {
            // Find content and insert after it
            const occurrence = operation.occurrence ?? 1;
            const result = this.findContentLine(
              lines,
              operation.searchContent,
              occurrence,
            );
            if (result.index === -1) {
              throw new Error(
                `insert_after: Could not find occurrence ${occurrence} of "${operation.searchContent}". Found ${result.totalMatches} matches total.`,
              );
            }
            lines.splice(result.index + 1, 0, operation.content);
            break;
          }

          case "insert_before": {
            // Find content and insert before it
            const occurrence = operation.occurrence ?? 1;
            const result = this.findContentLine(
              lines,
              operation.searchContent,
              occurrence,
            );
            if (result.index === -1) {
              throw new Error(
                `insert_before: Could not find occurrence ${occurrence} of "${operation.searchContent}". Found ${result.totalMatches} matches total.`,
              );
            }
            lines.splice(result.index, 0, operation.content);
            break;
          }

          case "replace_content": {
            // Find content and replace it
            const occurrence = operation.occurrence ?? 1;
            const result = this.findAndReplaceContent(
              lines,
              operation.oldContent,
              operation.newContent,
              occurrence,
            );
            if (!result.found) {
              const preview =
                operation.oldContent.length > 50
                  ? operation.oldContent.substring(0, 50) + "..."
                  : operation.oldContent;
              throw new Error(
                `replace_content: Could not find occurrence ${occurrence} of content. Found ${result.totalMatches} matches total. Searching for: "${preview}"`,
              );
            }
            lines = result.lines;
            break;
          }

          case "delete_content": {
            // Find content and delete it
            const occurrence = operation.occurrence ?? 1;
            const result = this.findAndDeleteContent(
              lines,
              operation.content,
              occurrence,
            );
            if (!result.found) {
              const preview =
                operation.content.length > 50
                  ? operation.content.substring(0, 50) + "..."
                  : operation.content;
              throw new Error(
                `delete_content: Could not find occurrence ${occurrence} of content. Found ${result.totalMatches} matches total. Searching for: "${preview}"`,
              );
            }
            lines = result.lines;
            break;
          }
        }
      }

      // Write the modified content back
      await fs.writeFile(filePath, lines.join("\n"), "utf-8");

      return { data: undefined, error: undefined } as unknown as Result<void>;
    } catch (error) {
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error(String(error)),
      } as unknown as Result<void>;
    }
  }

  /**
   * Find a line containing the specified content
   * @param lines - Array of lines to search
   * @param searchContent - Content to search for
   * @param occurrence - Which occurrence to find (1-indexed)
   * @returns Object with line index (0-based, -1 if not found) and total matches found
   */
  private findContentLine(
    lines: string[],
    searchContent: string,
    occurrence: number,
  ): { index: number; totalMatches: number } {
    let count = 0;
    let foundIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line !== undefined && line.includes(searchContent)) {
        count++;
        if (count === occurrence && foundIndex === -1) {
          foundIndex = i;
          // Continue counting to get total matches
        }
      }
    }

    return { index: foundIndex, totalMatches: count };
  }

  /**
   * Find and replace content (can be multi-line)
   * @param lines - Array of lines
   * @param oldContent - Content to find
   * @param newContent - Content to replace with
   * @param occurrence - Which occurrence to replace
   * @returns Updated lines, whether content was found, and total matches
   */
  private findAndReplaceContent(
    lines: string[],
    oldContent: string,
    newContent: string,
    occurrence: number,
  ): { lines: string[]; found: boolean; totalMatches: number } {
    const oldContentLines = oldContent.split("\n");
    const newContentLines = newContent.split("\n");

    // Find all occurrences first
    let totalMatches = 0;
    let targetIndex = -1;
    let startIndex = 0;

    while (startIndex < lines.length) {
      // Check if we have a match starting at startIndex
      let matches = true;
      for (let i = 0; i < oldContentLines.length; i++) {
        if (
          startIndex + i >= lines.length ||
          lines[startIndex + i] !== oldContentLines[i]
        ) {
          matches = false;
          break;
        }
      }

      if (matches) {
        totalMatches++;
        if (totalMatches === occurrence) {
          targetIndex = startIndex;
        }
        startIndex += oldContentLines.length;
      } else {
        startIndex++;
      }
    }

    // If we found the target occurrence, replace it
    if (targetIndex !== -1) {
      const result = [
        ...lines.slice(0, targetIndex),
        ...newContentLines,
        ...lines.slice(targetIndex + oldContentLines.length),
      ];
      return { lines: result, found: true, totalMatches };
    }

    return { lines, found: false, totalMatches };
  }

  /**
   * Find and delete content (can be multi-line)
   * @param lines - Array of lines
   * @param content - Content to find and delete
   * @param occurrence - Which occurrence to delete
   * @returns Updated lines, whether content was found, and total matches
   */
  private findAndDeleteContent(
    lines: string[],
    content: string,
    occurrence: number,
  ): { lines: string[]; found: boolean; totalMatches: number } {
    const contentLines = content.split("\n");

    // Find all occurrences first
    let totalMatches = 0;
    let targetIndex = -1;
    let startIndex = 0;

    while (startIndex < lines.length) {
      // Check if we have a match starting at startIndex
      let matches = true;
      for (let i = 0; i < contentLines.length; i++) {
        if (
          startIndex + i >= lines.length ||
          lines[startIndex + i] !== contentLines[i]
        ) {
          matches = false;
          break;
        }
      }

      if (matches) {
        totalMatches++;
        if (totalMatches === occurrence) {
          targetIndex = startIndex;
        }
        startIndex += contentLines.length;
      } else {
        startIndex++;
      }
    }

    // If we found the target occurrence, delete it
    if (targetIndex !== -1) {
      const result = [
        ...lines.slice(0, targetIndex),
        ...lines.slice(targetIndex + contentLines.length),
      ];
      return { lines: result, found: true, totalMatches };
    }

    return { lines, found: false, totalMatches };
  }
}
