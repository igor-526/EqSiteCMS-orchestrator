/**
 * Common utilities for shipctl.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';

const ajv = new Ajv({ strict: true, allErrors: true });

/**
 * Creates state directory for a change.
 * @param {string} root - Monorepo root
 * @param {string} change - Change name
 * @returns {Promise<string>} State directory path
 */
export async function ensureStateDir(root, change) {
  const stateDir = path.join(root, '.qa/ship', change);
  await fs.mkdir(stateDir, { recursive: true });
  return stateDir;
}

/**
 * JSON output helper.
 * @param {boolean} ok
 * @param {Object} data
 * @returns {Object} Result object
 */
export function jsonOut(ok, data = {}) {
  return { ok, ...data };
}

/**
 * Acquires an advisory lock using flock.
 * For shipctl, locking is handled by the main dispatcher via self-reexec.
 * This helper is for reference; actual locking is in scripts/shipctl.
 *
 * @param {string} lockPath
 * @param {Function} fn
 * @returns {Promise<any>}
 */
export async function lockFile(lockPath, fn) {
  // In shipctl, locking is handled via self-reexec with flock.
  // This is a placeholder for modules that might need granular locks.
  return fn();
}

/**
 * Runs a child process and returns result.
 * @param {string} command
 * @param {string[]} args
 * @param {Object} options
 * @returns {Object} { status, stdout, stderr, error }
 */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    ...options
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error
  };
}

/**
 * Logs progress to stderr.
 * @param {string} message
 */
export function progress(message) {
  process.stderr.write(`${message}\n`);
}

/**
 * Writes state file with JSON Schema validation.
 * @param {string} filePath - Destination file path
 * @param {Object} data - Data to write
 * @param {string} schemaName - Schema file name (e.g., 'plan', 'merge-state')
 * @returns {Promise<void>}
 * @throws {Error} If validation fails (exit code 2 expected by caller)
 */
export async function writeStateFile(filePath, data, schemaName) {
  const schemaPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    'schemas',
    `${schemaName}.json`
  );
  
  let schema;
  try {
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    schema = JSON.parse(schemaContent);
  } catch (err) {
    throw new Error(`Failed to load schema ${schemaName}: ${err.message}`);
  }
  
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid) {
    const errors = validate.errors.map(e => {
      const path = e.instancePath || 'root';
      return `${path}: ${e.message}`;
    }).join('\n');
    
    throw new Error(`Schema validation failed for ${schemaName}:\n${errors}`);
  }
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
