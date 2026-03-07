/**
 * Publisher Module
 * Publishes posts to Moltbook with validation support
 */

const fs = require('fs');
const path = require('path');
const { validatePost } = require('./post-validator');

class Publisher {
  constructor(config = {}) {
    this.config = {
      apiBase: config.apiBase || 'https://moltbook.com/api/v1',
      apiKey: config.apiKey || process.env.MOLTBOOK_API_KEY,
      autoFix: config.autoFix !== false, // Default to true
      ...config
    };
  }

  /**
   * Validate a post file
   * @param {string} filePath - Path to the markdown file
   * @param {Object} options - Validation options
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[], fixedContent?: string}>}
   */
  async validate(filePath, options = {}) {
    const { fix = this.config.autoFix, verbose = false } = options;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        errors: [`File not found: ${filePath}`],
        warnings: []
      };
    }

    // Read file content
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to read file: ${error.message}`],
        warnings: []
      };
    }

    // Run validation
    const result = validatePost(content);
    
    if (verbose) {
      console.log(`\n🔍 Validating: ${filePath}`);
      console.log(`   Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
      
      if (result.errors.length > 0) {
        console.log(`\n   Errors (${result.errors.length}):`);
        result.errors.forEach(err => console.log(`   ❌ ${err}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(`\n   Warnings (${result.warnings.length}):`);
        result.warnings.forEach(warn => console.log(`   ⚠️  ${warn}`));
      }
    }

    // Save fixed content if requested and there are fixes
    if (fix && result.fixedContent !== content) {
      const fixedPath = filePath.replace('.md', '.fixed.md');
      fs.writeFileSync(fixedPath, result.fixedContent);
      if (verbose) {
        console.log(`\n   📝 Fixed content saved to: ${fixedPath}`);
      }
      result.fixedPath = fixedPath;
    }

    return result;
  }

  /**
   * Publish a post to Moltbook
   * @param {string} filePath - Path to the markdown file
   * @param {Object} options - Publish options
   * @returns {Promise<{success: boolean, postId?: string, error?: string, validation?: Object}>}
   */
  async publish(filePath, options = {}) {
    const { 
      validate: shouldValidate = true, 
      dryRun = false,
      verbose = true,
      community = null
    } = options;

    if (verbose) {
      console.log(`\n🚀 Publishing: ${filePath}`);
      if (dryRun) {
        console.log('   Mode: 🔍 DRY RUN (no actual changes)');
      }
    }

    // Validate before publishing (if enabled)
    let validation = null;
    if (shouldValidate) {
      validation = await this.validate(filePath, { fix: false, verbose });
      
      if (!validation.valid) {
        const errorMsg = `Validation failed: ${validation.errors.length} error(s) found. Use --validate to see details.`;
        if (verbose) {
          console.log(`\n   ❌ ${errorMsg}`);
          console.log('   Publishing blocked. Fix errors or use --no-validate to skip.');
        }
        return {
          success: false,
          error: errorMsg,
          validation
        };
      }
      
      if (verbose && validation.warnings.length > 0) {
        console.log(`   ⚠️  ${validation.warnings.length} warning(s) found (not blocking)`);
      }
    }

    // Dry run - stop here
    if (dryRun) {
      if (verbose) {
        console.log('\n   ✅ Validation passed');
        console.log('   🛑 Dry run - no actual publish performed');
      }
      return {
        success: true,
        dryRun: true,
        message: 'Dry run completed successfully',
        validation
      };
    }

    // Actual publish logic
    try {
      const content = validation?.fixedContent || fs.readFileSync(filePath, 'utf-8');
      const result = await this.doPublish(content, { community });
      
      if (verbose) {
        console.log(`\n   ✅ Published successfully!`);
        console.log(`   Post ID: ${result.postId}`);
        console.log(`   URL: ${result.url || 'N/A'}`);
      }
      
      return {
        success: true,
        postId: result.postId,
        url: result.url,
        validation
      };
    } catch (error) {
      const errorMsg = `Publish failed: ${error.message}`;
      if (verbose) {
        console.log(`\n   ❌ ${errorMsg}`);
      }
      return {
        success: false,
        error: errorMsg,
        validation
      };
    }
  }

  /**
   * Internal publish implementation
   * @param {string} content - Post content
   * @param {Object} options - Publish options
   * @returns {Promise<{postId: string, url?: string}>}
   */
  async doPublish(content, options = {}) {
    // This is a placeholder for actual API integration
    // In production, this would call the Moltbook API
    
    // For now, simulate a successful publish
    const postId = `post_${Date.now()}`;
    
    // TODO: Integrate with actual Moltbook API
    // const response = await fetch(`${this.config.apiBase}/posts`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.config.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     content,
    //     community: options.community
    //   })
    // });
    
    return {
      postId,
      url: `https://moltbook.com/post/${postId}`
    };
  }

  /**
   * Batch validate multiple files
   * @param {string[]} filePaths - Array of file paths
   * @param {Object} options - Validation options
   * @returns {Promise<{total: number, valid: number, invalid: number, results: Object[]}>}
   */
  async validateBatch(filePaths, options = {}) {
    const results = [];
    let valid = 0;
    let invalid = 0;

    console.log(`\n📦 Batch Validation: ${filePaths.length} file(s)`);
    console.log('=' .repeat(50));

    for (const filePath of filePaths) {
      const result = await this.validate(filePath, options);
      results.push({ filePath, ...result });
      
      if (result.valid) {
        valid++;
      } else {
        invalid++;
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log(`Results: ${valid} valid, ${invalid} invalid (${filePaths.length} total)`);

    return {
      total: filePaths.length,
      valid,
      invalid,
      results
    };
  }
}

module.exports = Publisher;
