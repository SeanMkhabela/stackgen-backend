import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { StackName, supportedStacks, Frontend, Backend } from '../types/stack';
import { validateStackCombination, sendErrorResponse } from '../utils/validation';
import { tryGetFromCache, handleStackCache } from '../utils/cache';
import { isRedisAvailable } from '../utils/redis';

/**
 * Generates a full-stack project template based on frontend and backend selections
 */
export async function generateStack(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { frontend, backend } = request.query as { frontend: string; backend: string };

    // Validate stack combination
    const validationError = validateStackCombination(frontend, backend);
    if (validationError) return sendErrorResponse(reply, 400, validationError);

    // Create the stack name from validated inputs
    const stackName = `${frontend}-${backend}` as StackName;

    // Try to get from cache first
    const cachedData = await tryGetFromCache<Buffer>(`stack:${stackName}`, reply);
    if (cachedData) {
      return handleStackCache(stackName, cachedData, reply);
    }

    // Find the stack template path
    const stackPath = findStackPath(stackName);
    if (!stackPath) {
      return handleMissingStack(reply, frontend as Frontend, backend as Backend, stackName);
    }

    return await createAndSendArchive(stackPath, stackName, reply);
  } catch (error) {
    console.error('Error generating stack:', error);
    return sendErrorResponse(reply, 500, {
      error: 'Server error',
      message: 'An error occurred while generating the stack',
    });
  }
}

/**
 * Finds the path to a stack template
 */
function findStackPath(stackName: StackName): string | null {
  const stackPath = path.join(__dirname, '..', 'boilerplates', stackName);
  return fs.existsSync(stackPath) ? stackPath : null;
}

/**
 * Handles the case when a stack template is not found
 */
function handleMissingStack(
  reply: FastifyReply,
  frontend: Frontend,
  backend: Backend,
  stackName: StackName
) {
  const isImplemented = supportedStacks.implemented.includes(stackName);
  const isVisible = supportedStacks.uiVisible.includes(stackName);

  if (isVisible && !isImplemented) {
    return sendErrorResponse(reply, 501, {
      error: 'Stack not implemented',
      message: `The ${supportedStacks.prettyNames[frontend]} + ${supportedStacks.prettyNames[backend]} stack is coming soon!`,
      details: {
        frontend: supportedStacks.prettyNames[frontend],
        backend: supportedStacks.prettyNames[backend],
        status: 'planned',
      },
    });
  }

  return sendErrorResponse(reply, 404, {
    error: 'Stack not found',
    message: 'The requested stack template does not exist',
    details: {
      frontend: supportedStacks.prettyNames[frontend],
      backend: supportedStacks.prettyNames[backend],
      status: 'unavailable',
    },
  });
}

/**
 * Creates and sends a ZIP archive of the stack
 */
async function createAndSendArchive(stackPath: string, stackName: StackName, reply: FastifyReply) {
  // Set response headers for ZIP file
  reply.header('Content-Type', 'application/zip');
  reply.header('Content-Disposition', `attachment; filename=${stackName}.zip`);

  // Create and configure archive
  const archive = archiver('zip', { zlib: { level: 9 } });

  // Setup cache writer if Redis is available
  const cacheBuffers: Buffer[] = [];
  let cacheStream: any = null;

  if (isRedisAvailable()) {
    const stream = require('stream');
    cacheStream = new stream.Writable({
      write(chunk: Buffer, encoding: string, callback: Function) {
        cacheBuffers.push(Buffer.from(chunk));
        callback();
      },
    });
    archive.pipe(cacheStream);
  }

  // Pipe to response
  archive.pipe(reply.raw);

  // Add frontend and backend directories to archive
  const frontendPath = path.join(stackPath, 'frontend');
  const backendPath = path.join(stackPath, 'backend');

  if (fs.existsSync(frontendPath)) addDirectoryToArchive(frontendPath, 'frontend', archive);
  if (fs.existsSync(backendPath)) addDirectoryToArchive(backendPath, 'backend', archive);

  // Handle archive errors
  archive.on('error', function (err) {
    console.error('Archive error:', err);
    throw err;
  });

  // Finalize the archive and store in cache
  await archive.finalize();

  // Save to cache if Redis is available
  if (isRedisAvailable() && cacheBuffers.length > 0) {
    const cacheData = Buffer.concat(cacheBuffers);
    await handleStackCache(stackName, cacheData, reply);
  }

  return reply;
}

/**
 * Adds a directory to the archive
 */
function addDirectoryToArchive(
  dirPath: string,
  archiveDirName: string,
  archive: archiver.Archiver
) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively add subdirectories
      addDirectoryToArchive(filePath, path.join(archiveDirName, file), archive);
    } else {
      // Add file to archive
      archive.file(filePath, { name: path.join(archiveDirName, file) });
    }
  });
}
