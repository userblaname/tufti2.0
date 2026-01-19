const fs = require('fs').promises;
const path = require('path');

/**
 * Memory Handler for Claude Memory Tool
 * Implements file-based memory storage with security protections
 */
class MemoryHandler {
    constructor(baseDir = './memories') {
        this.baseDir = path.resolve(baseDir);
        this.MAX_FILE_SIZE = 1024 * 1024; // 1MB
        this.MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB per user
        this.MAX_LINE_COUNT = 999999;
    }

    /**
     * Validate path to prevent directory traversal attacks
     * CRITICAL SECURITY FUNCTION
     */
    validatePath(requestedPath, userId) {
        // 1. Must start with /memories
        if (!requestedPath.startsWith('/memories')) {
            throw new Error('Invalid path: must start with /memories');
        }

        // 2. Reject traversal patterns
        if (requestedPath.includes('..') ||
            requestedPath.includes('%2e%2e') ||
            requestedPath.includes('..\\') ||
            requestedPath.includes('%2e%2e%5c')) {
            throw new Error('Invalid path: traversal patterns detected');
        }

        // 3. Build user-specific path
        const userDir = path.join(this.baseDir, userId);
        const requestedFile = requestedPath.slice('/memories'.length);
        const resolved = path.resolve(userDir, '.' + requestedFile);

        // 4. Verify within user's memory directory
        if (!resolved.startsWith(userDir)) {
            throw new Error('Path traversal detected');
        }

        return { userDir, resolved };
    }

    /**
     * Ensure user directory exists
     */
    async ensureUserDir(userDir) {
        try {
            await fs.access(userDir);
        } catch {
            await fs.mkdir(userDir, { recursive: true });
        }
    }

    /**
     * Calculate total size of user's memory files
     */
    async calculateUserSize(userDir) {
        let totalSize = 0;

        async function walk(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }
        }

        try {
            await walk(userDir);
        } catch (e) {
            // Directory doesn't exist yet
        }

        return totalSize;
    }

    /**
     * Format file size in human-readable format
     */
    formatSize(bytes) {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
    }

    /**
     * VIEW command: Show directory contents or file contents
     */
    async view(requestedPath, userId, viewRange = null) {
        const { userDir, resolved } = this.validatePath(requestedPath, userId);
        await this.ensureUserDir(userDir);

        try {
            const stats = await fs.stat(resolved);

            if (stats.isDirectory()) {
                // List directory contents (up to 2 levels deep)
                return await this.listDirectory(resolved, requestedPath, 0, 2);
            } else {
                // Return file contents with line numbers
                return await this.viewFile(resolved, requestedPath, viewRange);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                return `The path ${requestedPath} does not exist. Please provide a valid path.`;
            }
            throw error;
        }
    }

    /**
     * List directory contents recursively
     */
    async listDirectory(dirPath, displayPath, currentDepth, maxDepth) {
        let output = `Here're the files and directories up to 2 levels deep in ${displayPath}, excluding hidden items and node_modules:\n`;

        async function walk(dir, display, depth) {
            if (depth > maxDepth) return;

            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                // Skip hidden files and node_modules
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

                const fullPath = path.join(dir, entry.name);
                const displayFullPath = path.join(display, entry.name);

                if (entry.isDirectory()) {
                    const stats = await fs.stat(fullPath);
                    output += `${formatSize(stats.size)}\t${displayFullPath}\n`;
                    if (depth < maxDepth) {
                        await walk(fullPath, displayFullPath, depth + 1);
                    }
                } else {
                    const stats = await fs.stat(fullPath);
                    output += `${formatSize(stats.size)}\t${displayFullPath}\n`;
                }
            }
        }

        const formatSize = (bytes) => {
            if (bytes < 1024) return `${bytes}`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
            return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
        };

        try {
            const stats = await fs.stat(dirPath);
            output += `${formatSize(stats.size)}\t${displayPath}\n`;
            await walk(dirPath, displayPath, currentDepth);
        } catch (e) {
            // Empty directory
        }

        return output;
    }

    /**
     * View file contents with line numbers
     */
    async viewFile(filePath, displayPath, viewRange) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        if (lines.length > this.MAX_LINE_COUNT) {
            return `File ${displayPath} exceeds maximum line limit of ${this.MAX_LINE_COUNT} lines.`;
        }

        let output = `Here's the content of ${displayPath} with line numbers:\n`;

        const startLine = viewRange ? viewRange[0] : 1;
        const endLine = viewRange ? viewRange[1] : lines.length;

        for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
            const lineNum = String(i + 1).padStart(6, ' ');
            output += `${lineNum}\t${lines[i]}\n`;
        }

        return output;
    }

    /**
     * CREATE command: Create a new file
     */
    async create(requestedPath, userId, fileText) {
        const { userDir, resolved } = this.validatePath(requestedPath, userId);
        await this.ensureUserDir(userDir);

        // Check if file already exists
        try {
            await fs.access(resolved);
            return `Error: File ${requestedPath} already exists`;
        } catch {
            // File doesn't exist, proceed
        }

        // Check size limits
        const currentSize = await this.calculateUserSize(userDir);
        if (currentSize + fileText.length > this.MAX_TOTAL_SIZE) {
            return `Error: Memory quota exceeded. Current: ${this.formatSize(currentSize)}, Limit: ${this.formatSize(this.MAX_TOTAL_SIZE)}`;
        }

        // Create parent directories if needed
        const parentDir = path.dirname(resolved);
        await fs.mkdir(parentDir, { recursive: true });

        // Write file
        await fs.writeFile(resolved, fileText, 'utf-8');

        return `File created successfully at: ${requestedPath}`;
    }

    /**
     * STR_REPLACE command: Replace text in a file
     */
    async strReplace(requestedPath, userId, oldStr, newStr) {
        const { userDir, resolved } = this.validatePath(requestedPath, userId);

        try {
            const stats = await fs.stat(resolved);
            if (stats.isDirectory()) {
                return `Error: The path ${requestedPath} does not exist. Please provide a valid path.`;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                return `Error: The path ${requestedPath} does not exist. Please provide a valid path.`;
            }
            throw error;
        }

        const content = await fs.readFile(resolved, 'utf-8');
        const lines = content.split('\n');

        // Find occurrences
        const occurrences = [];
        lines.forEach((line, idx) => {
            if (line.includes(oldStr)) {
                occurrences.push(idx + 1);
            }
        });

        if (occurrences.length === 0) {
            return `No replacement was performed, old_str \`${oldStr}\` did not appear verbatim in ${requestedPath}.`;
        }

        if (occurrences.length > 1) {
            return `No replacement was performed. Multiple occurrences of old_str \`${oldStr}\` in lines: ${occurrences.join(', ')}. Please ensure it is unique`;
        }

        // Perform replacement
        const newContent = content.replace(oldStr, newStr);
        await fs.writeFile(resolved, newContent, 'utf-8');

        // Return snippet of edited file
        const newLines = newContent.split('\n');
        const changedLineIdx = occurrences[0] - 1;
        const start = Math.max(0, changedLineIdx - 2);
        const end = Math.min(newLines.length, changedLineIdx + 3);

        let snippet = 'The memory file has been edited.\n\n';
        for (let i = start; i < end; i++) {
            const lineNum = String(i + 1).padStart(6, ' ');
            snippet += `${lineNum}\t${newLines[i]}\n`;
        }

        return snippet;
    }

    /**
     * INSERT command: Insert text at a specific line
     */
    async insert(requestedPath, userId, insertLine, insertText) {
        const { userDir, resolved } = this.validatePath(requestedPath, userId);

        try {
            await fs.access(resolved);
        } catch {
            return `Error: The path ${requestedPath} does not exist`;
        }

        const content = await fs.readFile(resolved, 'utf-8');
        const lines = content.split('\n');

        if (insertLine < 0 || insertLine > lines.length) {
            return `Error: Invalid \`insert_line\` parameter: ${insertLine}. It should be within the range of lines of the file: [0, ${lines.length}]`;
        }

        // Insert text
        lines.splice(insertLine, 0, insertText.trimEnd());
        const newContent = lines.join('\n');

        await fs.writeFile(resolved, newContent, 'utf-8');

        return `The file ${requestedPath} has been edited.`;
    }

    /**
     * DELETE command: Delete a file or directory
     */
    async delete(requestedPath, userId) {
        const { userDir, resolved } = this.validatePath(requestedPath, userId);

        try {
            await fs.access(resolved);
        } catch {
            return `Error: The path ${requestedPath} does not exist`;
        }

        // Delete recursively
        await fs.rm(resolved, { recursive: true, force: true });

        return `Successfully deleted ${requestedPath}`;
    }

    /**
     * RENAME command: Rename or move a file/directory
     */
    async rename(oldPath, userId, newPath) {
        const { userDir: userDir1, resolved: oldResolved } = this.validatePath(oldPath, userId);
        const { userDir: userDir2, resolved: newResolved } = this.validatePath(newPath, userId);

        // Check source exists
        try {
            await fs.access(oldResolved);
        } catch {
            return `Error: The path ${oldPath} does not exist`;
        }

        // Check destination doesn't exist
        try {
            await fs.access(newResolved);
            return `Error: The destination ${newPath} already exists`;
        } catch {
            // Good, destination doesn't exist
        }

        // Create parent directory if needed
        const parentDir = path.dirname(newResolved);
        await fs.mkdir(parentDir, { recursive: true });

        // Rename
        await fs.rename(oldResolved, newResolved);

        return `Successfully renamed ${oldPath} to ${newPath}`;
    }

    /**
     * Execute memory command
     * Supports both:
     * - Simple format: { action: 'read'|'write', content: '...' }
     * - Full format: { command: 'view'|'create'|..., path: '...', ... }
     */
    async execute(command, userId) {
        console.log('[MemoryHandler] Executing command for user:', userId, command);

        try {
            // Handle simple action format (from custom tool)
            if (command.action) {
                const memoryPath = '/memories/notes.txt';

                if (command.action === 'read') {
                    console.log('[MemoryHandler] Simple read action');
                    return await this.view(memoryPath, userId);
                } else if (command.action === 'write') {
                    console.log('[MemoryHandler] Simple write action');
                    const content = command.content || '';

                    // Try to append to existing file, or create new
                    try {
                        const { userDir, resolved } = this.validatePath(memoryPath, userId);
                        await this.ensureUserDir(userDir);

                        // Read existing content
                        let existingContent = '';
                        try {
                            existingContent = await require('fs').promises.readFile(resolved, 'utf-8');
                        } catch (e) {
                            // File doesn't exist yet
                        }

                        // Append new content with timestamp
                        const timestamp = new Date().toISOString();
                        const newContent = existingContent + `\n[${timestamp}] ${content}`;

                        await require('fs').promises.mkdir(require('path').dirname(resolved), { recursive: true });
                        await require('fs').promises.writeFile(resolved, newContent.trim(), 'utf-8');

                        return `Memory updated successfully. Added: "${content}"`;
                    } catch (error) {
                        return `Error writing to memory: ${error.message}`;
                    }
                }

                return `Unknown action: ${command.action}`;
            }

            // Handle full command format
            switch (command.command) {
                case 'view':
                    return await this.view(command.path, userId, command.view_range);

                case 'create':
                    return await this.create(command.path, userId, command.file_text);

                case 'str_replace':
                    return await this.strReplace(command.path, userId, command.old_str, command.new_str);

                case 'insert':
                    return await this.insert(command.path, userId, command.insert_line, command.insert_text);

                case 'delete':
                    return await this.delete(command.path, userId);

                case 'rename':
                    return await this.rename(command.old_path, userId, command.new_path);

                default:
                    return `Error: Unknown command: ${command.command}`;
            }
        } catch (error) {
            console.error('[MemoryHandler] Error:', error);
            return `Error: ${error.message}`;
        }
    }
}

module.exports = MemoryHandler;
