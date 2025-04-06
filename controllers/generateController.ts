import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { isRedisAvailable, getCache, setCache } from '../utils/redis';

// Define frontend and backend types for type safety
type Frontend = 'react' | 'nextjs' | 'vue' | 'angular' | 'svelte';
type Backend = 'express' | 'fastify' | 'nest' | 'django' | 'laravel';
type StackName = `${Frontend}-${Backend}`;

// Define compatible stacks and their availability
const supportedStacks = {
  // Boilerplates that actually exist on disk and are fully implemented
  implemented: [
    'react-express',
  ] as StackName[],
  
  // Boilerplates that should be shown in the UI as available options
  // even if not yet implemented (will show proper message when selected)
  uiVisible: [
    'react-express',
    'react-fastify',
    'vue-express',
    'nextjs-express',
    'angular-express'
  ] as StackName[],
  
  // Frontend options
  frontends: ['react', 'nextjs', 'vue', 'angular', 'svelte'] as Frontend[],
  
  // Backend options
  backends: ['express', 'fastify', 'nest', 'django', 'laravel'] as Backend[],
  
  // Compatibility matrix
  compatibility: {
    react: ['express', 'fastify', 'nest'] as Backend[],
    nextjs: ['express', 'nest'] as Backend[],
    vue: ['express', 'fastify', 'nest'] as Backend[],
    angular: ['express', 'nest'] as Backend[],
    svelte: ['express', 'fastify'] as Backend[]
  },
  
  // User-friendly names
  prettyNames: {
    react: 'React',
    nextjs: 'Next.js',
    vue: 'Vue.js',
    angular: 'Angular',
    svelte: 'Svelte',
    express: 'Express.js',
    fastify: 'Fastify',
    nest: 'NestJS',
    django: 'Django',
    laravel: 'Laravel'
  }
};

/**
 * Generates a full-stack project template based on frontend and backend selections
 * 
 * @param request Fastify request with frontend and backend query parameters
 * @param reply Fastify reply to return either error or ZIP file
 */
export async function generateStack(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Parse query parameters
    const { frontend, backend } = request.query as { frontend: string; backend: string };
    console.log('Query parameters:', { frontend, backend });

    // Set CORS headers for all responses
    setCorsHeaders(reply);

    // Validate stack combination
    const validationError = validateStackCombination(frontend, backend, reply);
    if (validationError) return validationError;

    // Create the stack name from validated inputs - now we know they are valid types
    const validFrontend = frontend as Frontend;
    const validBackend = backend as Backend;
    const stackName = `${validFrontend}-${validBackend}` as StackName;
    
    // Try to get from cache first
    const cachedResponse = await tryGetFromCache(stackName, reply);
    if (cachedResponse) return cachedResponse;
    
    // Find the stack template path
    const stackPath = findStackPath(stackName);

    // If stack template not found
    if (!stackPath) {
      return handleMissingStack(reply, validFrontend, validBackend, stackName);
    }

    return await createAndSendArchive(stackPath, stackName, reply);
    
  } catch (error) {
    console.error('Error generating stack:', error);
    return sendErrorResponse(reply, 500, {
      error: 'Server error',
      message: 'An error occurred while generating the stack'
    });
  }
}

/**
 * Validates frontend and backend combination
 * Returns error response if invalid, otherwise null
 */
function validateStackCombination(frontend: string, backend: string, reply: FastifyReply) {
  // Validate frontend
  if (!isFrontend(frontend)) {
    return sendErrorResponse(reply, 400, {
      error: `Unsupported frontend: ${frontend}`,
      message: `The frontend "${frontend}" is not supported. Please choose from: ${supportedStacks.frontends.map(f => supportedStacks.prettyNames[f]).join(', ')}.`,
      availableFrontends: supportedStacks.frontends
    });
  }

  // Validate backend
  if (!isBackend(backend)) {
    return sendErrorResponse(reply, 400, {
      error: `Unsupported backend: ${backend}`,
      message: `The backend "${backend}" is not supported. Please choose from: ${supportedStacks.backends.map(b => supportedStacks.prettyNames[b]).join(', ')}.`,
      availableBackends: supportedStacks.backends
    });
  }

  // Validate compatibility - if we reached here, frontend and backend are valid types
  if (!supportedStacks.compatibility[frontend]?.includes(backend)) {
    const compatibleBackends = supportedStacks.compatibility[frontend].map(b => supportedStacks.prettyNames[b]).join(', ');
    return sendErrorResponse(reply, 400, {
      error: `Incompatible stack combination: ${frontend} with ${backend}`,
      message: `${supportedStacks.prettyNames[frontend]} is not recommended to use with ${supportedStacks.prettyNames[backend]}. For ${supportedStacks.prettyNames[frontend]}, we recommend: ${compatibleBackends}.`,
      compatibleOptions: supportedStacks.compatibility[frontend]
    });
  }
  
  return null;
}

/**
 * Attempts to retrieve the stack from cache
 * Returns the cached response if found, otherwise null
 */
async function tryGetFromCache(stackName: StackName, reply: FastifyReply) {
  if (!isRedisAvailable()) {
    console.log('Redis not available, skipping cache check');
    return null;
  }
  
  const cacheKey = `stack:${stackName}`;
  const cachedData = await getCache<Buffer>(cacheKey);
  
  if (!cachedData) {
    console.log(`Cache miss for ${stackName}, generating new stack`);
    return null;
  }
  
  console.log(`Cache hit for ${stackName}`);
  
  // Set response headers for ZIP file
  setCorsHeaders(reply);
  reply.header('Content-Type', 'application/zip');
  reply.header('Content-Disposition', `attachment; filename=${stackName}.zip`);
  
  // Handle different types of cached data
  if (Buffer.isBuffer(cachedData)) {
    return reply.send(cachedData);
  } else if (typeof cachedData === 'object') {
    console.log('Converting cached object to string before sending');
    return reply.send(JSON.stringify(cachedData));
  }
  
  console.log('Cached data is not in a usable format, generating new stack');
  return null;
}

/**
 * Creates and sends a ZIP archive of the stack
 */
async function createAndSendArchive(stackPath: string, stackName: StackName, reply: FastifyReply) {
  // Set response headers for ZIP file
  setCorsHeaders(reply);
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
      }
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
  archive.on('error', function(err) {
    console.error('Archive error:', err);
    throw err;
  });

  // Finalize the archive and store in cache
  await archive.finalize();
  
  // Save to cache if Redis is available
  if (isRedisAvailable() && cacheBuffers.length > 0) {
    const cacheData = Buffer.concat(cacheBuffers);
    const cacheKey = `stack:${stackName}`;
    
    // Cache for 24 hours (86400 seconds)
    await setCache(cacheKey, cacheData, 86400);
    console.log(`Saved ${stackName} to cache (${cacheData.length} bytes)`);
  }
  
  return reply;
}

// Type guard for Frontend
function isFrontend(value: string): value is Frontend {
  return supportedStacks.frontends.includes(value as Frontend);
}

// Type guard for Backend
function isBackend(value: string): value is Backend {
  return supportedStacks.backends.includes(value as Backend);
}

/**
 * Sets CORS headers on the response
 */
function setCorsHeaders(reply: FastifyReply) {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Sends a standardized error response with CORS headers
 */
function sendErrorResponse(reply: FastifyReply, statusCode: number, payload: object) {
  return reply.status(statusCode)
    .header('Access-Control-Allow-Origin', '*')
    .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .send(payload);
}

/**
 * Finds the path to the requested stack template
 */
function findStackPath(stackName: StackName): string | null {
  // First check if the stack is supposed to be implemented
  if (!supportedStacks.implemented.includes(stackName)) {
    return null;
  }

  const projectRoot = process.cwd();
  const possiblePaths = [
    path.join(projectRoot, 'boilerplates', stackName),
    path.resolve(__dirname, '..', 'boilerplates', stackName),
    path.resolve(__dirname, '..', '..', 'boilerplates', stackName)
  ];

  console.log('Checking paths:');
  for (let i = 0; i < possiblePaths.length; i++) {
    const exists = fs.existsSync(possiblePaths[i]);
    console.log(`${i + 1}:`, possiblePaths[i], exists);
    if (exists) return possiblePaths[i];
  }

  return null;
}

/**
 * Handles the case when the requested stack template is not found
 */
function handleMissingStack(
  reply: FastifyReply, 
  frontend: Frontend, 
  backend: Backend, 
  stackName: StackName
) {
  console.log(`Stack "${stackName}" not found - we need to notify the user`);
  
  // If the stack is shown in the UI but not yet implemented
  if (supportedStacks.uiVisible.includes(stackName) && !supportedStacks.implemented.includes(stackName)) {
    return sendErrorResponse(reply, 404, { 
      error: 'Stack in development',
      message: `The ${supportedStacks.prettyNames[frontend]} + ${supportedStacks.prettyNames[backend]} stack is currently in development. You can see it in the UI, but it's not ready for download yet. Currently, only the React + Express.js stack is fully implemented.`,
      implementedStacks: supportedStacks.implemented,
      status: 'coming_soon'
    });
  }
  
  // If the stack isn't even in the UI options
  if (!supportedStacks.uiVisible.includes(stackName)) {
    // Check if compatible but not yet available
    if (supportedStacks.compatibility[frontend]?.includes(backend)) {
      return sendErrorResponse(reply, 404, { 
        error: 'Stack not available yet', 
        message: `The ${supportedStacks.prettyNames[frontend]} + ${supportedStacks.prettyNames[backend]} stack is compatible but not yet available. Currently, only the React + Express.js stack is available.`,
        availableStacks: supportedStacks.uiVisible
      });
    }
    
    // Show available stacks
    const availableStacks = supportedStacks.uiVisible.map(stack => {
      const [frontEnd, backEnd] = stack.split('-') as [Frontend, Backend];
      return `${supportedStacks.prettyNames[frontEnd]} + ${supportedStacks.prettyNames[backEnd]}`;
    }).join(', ');
    
    return sendErrorResponse(reply, 404, { 
      error: 'Stack not found', 
      message: `The ${supportedStacks.prettyNames[frontend]} + ${supportedStacks.prettyNames[backend]} stack doesn't have a pre-built template yet. Currently available templates: ${availableStacks}. Please choose one of these combinations.`,
      availableStacks: supportedStacks.uiVisible
    });
  }
  
  // Log available boilerplates for debugging
  try {
    const projectRoot = process.cwd();
    if (fs.existsSync(path.join(projectRoot, 'boilerplates'))) {
      console.log('Contents of boilerplates:', fs.readdirSync(path.join(projectRoot, 'boilerplates')));
    }
  } catch (e) {
    console.error('Error listing boilerplates:', e);
  }
  
  return sendErrorResponse(reply, 404, { 
    error: 'Stack not found',
    message: 'The requested stack template was not found on the server.'
  });
}

/**
 * Recursively adds a directory to the archive, excluding node_modules
 */
function addDirectoryToArchive(dirPath: string, archiveDirName: string, archive: archiver.Archiver) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    // Skip node_modules and dot files/directories (like .git)
    if (file === 'node_modules' || file.startsWith('.')) continue;
    
    const filePath = path.join(dirPath, file);
    const relativePath = path.relative(dirPath, filePath);
    const archivePath = path.join(archiveDirName, relativePath);
    
    if (fs.statSync(filePath).isDirectory()) {
      addDirectoryToArchive(filePath, archivePath, archive);
    } else {
      archive.append(fs.createReadStream(filePath), { name: archivePath });
    }
  }
}

