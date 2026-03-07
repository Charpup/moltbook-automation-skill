/**
 * Post Validator Module
 * Validates and fixes common Markdown formatting issues
 */

/**
 * Detect JSON escape issues (escaped newlines that should be actual newlines)
 * @param {string} content - The content to check
 * @returns {boolean} - True if escaped newlines are found
 */
function hasEscapedNewlines(content) {
  return content.includes('\\n') && !content.includes('\n');
}

/**
 * Fix common escape sequence issues
 * @param {string} content - The content to fix
 * @returns {string} - Fixed content
 */
function fixCommonIssues(content) {
  let fixed = content;
  
  // Replace escaped newlines with actual newlines
  fixed = fixed.replace(/\\n/g, '\n');
  
  // Replace escaped quotes with actual quotes
  fixed = fixed.replace(/\\"/g, '"');
  
  // Replace escaped tabs with spaces
  fixed = fixed.replace(/\\t/g, '    ');
  
  // Replace escaped backslashes (single backslash)
  fixed = fixed.replace(/\\\\/g, '\\');
  
  return fixed;
}

/**
 * Validate GFM (GitHub Flavored Markdown) table format
 * @param {string} content - The content to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
function validateTables(content) {
  const errors = [];
  const lines = content.split('\n');
  
  // Table state tracking
  let inTable = false;
  let tableStartLine = -1;
  let hasSeparator = false;
  let tableColumns = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if line looks like a table row (contains |)
    const pipeCount = (line.match(/\|/g) || []).length;
    
    if (pipeCount >= 1 && !line.startsWith('```') && !line.startsWith('~~~')) {
      // This could be a table row
      const isSeparator = /^\s*[|]?\s*:?-+\s*:?\s*(?:\|\s*:?-+\s*:?\s*)*[|]?\s*$/.test(line);
      
      // Count columns (cells separated by |)
      const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
      const currentColumns = cells.length;
      
      if (!inTable) {
        // Starting a new table
        inTable = true;
        tableStartLine = i + 1;
        hasSeparator = false;
        tableColumns = currentColumns;
      } else {
        // Continuing a table
        if (isSeparator) {
          hasSeparator = true;
          // Verify separator has same column count
          const sepColumns = line.split('|').filter(c => /-+/.test(c)).length;
          if (sepColumns !== tableColumns && sepColumns > 0) {
            errors.push(`Table at line ${tableStartLine}: separator has ${sepColumns} columns but header has ${tableColumns}`);
          }
        } else if (currentColumns !== tableColumns && currentColumns > 0) {
          // Column count mismatch
          errors.push(`Table at line ${tableStartLine}: row ${i + 1} has ${currentColumns} columns but expected ${tableColumns}`);
        }
      }
    } else {
      // Not a table row - check if we were in a table
      if (inTable) {
        // Table ended, validate it had proper structure
        if (!hasSeparator && tableStartLine > 0) {
          errors.push(`Table at line ${tableStartLine} missing separator line between header and data`);
        }
        inTable = false;
        hasSeparator = false;
        tableColumns = 0;
      }
    }
  }
  
  // Check for unclosed table at end of content
  if (inTable && !hasSeparator) {
    errors.push(`Table at line ${tableStartLine} missing separator line between header and data`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate code block formatting
 * @param {string} content - The content to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
function validateCodeBlocks(content) {
  const errors = [];
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let codeBlockStart = -1;
  let codeBlockFence = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for code block fence (``` or ~~~)
    const fenceMatch = line.match(/^(```+|~~~+)(.*)$/);
    
    if (fenceMatch) {
      if (!inCodeBlock) {
        // Opening fence
        inCodeBlock = true;
        codeBlockStart = i + 1;
        codeBlockFence = fenceMatch[1];
      } else if (fenceMatch[1].length >= codeBlockFence.length) {
        // Closing fence (must be at least as long as opening)
        inCodeBlock = false;
        codeBlockFence = '';
      }
    }
  }
  
  // Check for unclosed code block
  if (inCodeBlock) {
    errors.push(`Unclosed code block starting at line ${codeBlockStart}`);
  }
  
  // Check for common issues with inline code markers
  let backtickCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count backticks that aren't part of a fence
    if (!line.match(/^(```+|~~~+)$/)) {
      const matches = line.match(/`/g);
      if (matches) {
        backtickCount += matches.length;
      }
    }
  }
  
  // Odd number of backticks (outside of fences) might indicate issues
  // This is a heuristic check
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Perform full post validation with auto-fix
 * @param {string} content - The content to validate
 * @returns {{valid: boolean, errors: string[], warnings: string[], fixedContent: string}} - Full validation result
 */
function validatePost(content) {
  const errors = [];
  const warnings = [];
  
  // Fix common issues first
  const fixedContent = fixCommonIssues(content);
  
  // Check for escaped newlines
  if (hasEscapedNewlines(content)) {
    warnings.push('Content contains escaped newlines (\\n) that have been fixed');
  }
  
  // Validate tables
  const tableResult = validateTables(fixedContent);
  if (!tableResult.valid) {
    errors.push(...tableResult.errors.map(e => `Table: ${e}`));
  }
  
  // Validate code blocks
  const codeBlockResult = validateCodeBlocks(fixedContent);
  if (!codeBlockResult.valid) {
    errors.push(...codeBlockResult.errors.map(e => `Code Block: ${e}`));
  }
  
  // Additional checks
  const lines = fixedContent.split('\n');
  
  // Check for potential formatting issues
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for mixed list markers
    if (line.match(/^\s*[-*+]\s/) && line.match(/^\s*\d+\.\s/)) {
      warnings.push(`Line ${i + 1}: Mixed list markers detected`);
    }
    
    // Check for very long lines
    if (line.length > 200) {
      warnings.push(`Line ${i + 1}: Very long line (${line.length} chars)`);
    }
  }
  
  // Check for broken links
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkPattern.exec(fixedContent)) !== null) {
    const url = linkMatch[2];
    if (url.startsWith(' ') || url.endsWith(' ')) {
      warnings.push(`Link URL has extra spaces: "${url}"`);
    }
  }
  
  // Check for unbalanced emphasis markers
  const asteriskCount = (fixedContent.match(/\*/g) || []).length;
  const underscoreCount = (fixedContent.match(/_/g) || []).length;
  
  if (asteriskCount % 2 !== 0) {
    warnings.push('Potential unbalanced asterisks (*) in content');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixedContent
  };
}

// Export all functions
module.exports = {
  hasEscapedNewlines,
  validateTables,
  validateCodeBlocks,
  validatePost,
  fixCommonIssues
};
