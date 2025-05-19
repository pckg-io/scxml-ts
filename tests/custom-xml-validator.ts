import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

// Define types
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
}

// Promisify exec function
const execPromise = promisify(exec);

/**
 * Generates a unique temporary file path for validation
 * @returns The path to a temporary file
 */
function generateTempFilePath(): string {
  const uniqueId = crypto.randomBytes(8).toString('hex');
  return path.join(__dirname, `temp-validation-${uniqueId}.xml`);
}

/**
 * Checks if required schema directories and files exist
 * @returns Path to the main schema file
 * @throws Error if schema files are not found
 */
function validateSchemaExists(): string {
  const xsdDir = path.join(__dirname, 'xsd');
  if (!fs.existsSync(xsdDir)) {
    throw new Error(`XSD directory not found: ${xsdDir}`);
  }
  
  const mainSchemaPath = path.join(xsdDir, 'scxml.xsd');
  if (!fs.existsSync(mainSchemaPath)) {
    throw new Error(`Main schema file not found: ${mainSchemaPath}`);
  }
  
  return mainSchemaPath;
}

/**
 * Validate XML against the SCXML schemas
 * 
 * @param xmlContent - The XML content to validate
 * @returns Promise resolving to validation result with status and errors
 */
export async function validateXML(xmlContent: string): Promise<ValidationResult> {
  const tempXmlFile = generateTempFilePath();
  
  try {
    // Write content to file
    fs.writeFileSync(tempXmlFile, xmlContent, {encoding: 'utf8', flag: 'w'});

    // Get schema path after validating it exists
    const mainSchemaPath = validateSchemaExists();

    // Build the xmllint command
    // --noout: Don't output the result tree
    // --schema: Validate against the given schema
    const command = `xmllint --noout --schema "${mainSchemaPath}" "${tempXmlFile}" 2>&1`;

    try {
      // Run xmllint
      const { stdout } = await execPromise(command);
      
      // If we get here, the validation succeeded
      if (stdout.includes('validates') || stdout === '') {
        return { valid: true, errors: [] };
      } else {
        return {
          valid: false,
          errors: [stdout]
        };
      }
    } catch (execError) {
      // If xmllint returns a non-zero exit code, it means validation failed
      const typedError = execError as ExecError;
      const errorMsg = typedError.stderr || typedError.stdout || 'Unknown error during validation';
      return {
        valid: false,
        errors: [errorMsg]
      };
    }
  } finally {
    // Clean up the temporary file
    try {
      if (fs.existsSync(tempXmlFile)) {
        fs.unlinkSync(tempXmlFile);
      }
    } catch (err) {
      const typedError = err as Error;
      console.error(`Warning: Could not delete temporary file ${tempXmlFile}: ${typedError.message}`);
    }
  }
}
