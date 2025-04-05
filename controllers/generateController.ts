import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

// Define compatible stacks and their availability
const supportedStacks = {
  // Boilerplates that actually exist on disk and are fully implemented
  implemented: [
    'react-express',
  ],
  
  // Boilerplates that should be shown in the UI as available options
  // even if not yet implemented (will show proper message when selected)
  uiVisible: [
    'react-express',
    'react-fastify',
    'vue-express',
    'nextjs-express',
    'angular-express'
  ],
  
  // Frontend options
  frontends: ['react', 'nextjs', 'vue', 'angular', 'svelte'],
  
  // Backend options
  backends: ['express', 'fastify', 'nest', 'django', 'laravel'],
  
  // Compatibility matrix
  compatibility: {
    react: ['express', 'fastify', 'nest'],
    nextjs: ['express', 'nest'],
    vue: ['express', 'fastify', 'nest'],
    angular: ['express', 'nest'],
    svelte: ['express', 'fastify']
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

    // === Validate frontend ===
    if (!supportedStacks.frontends.includes(frontend)) {
      return sendErrorResponse(reply, 400, {
        error: `Unsupported frontend: ${frontend}`,
        message: `The frontend "${frontend}" is not supported. Please choose from: ${supportedStacks.frontends.map(f => supportedStacks.prettyNames[f]).join(', ')}.`,
        availableFrontends: supportedStacks.frontends
      });
    }

    // === Validate backend ===
    if (!supportedStacks.backends.includes(backend)) {
      return sendErrorResponse(reply, 400, {
        error: `Unsupported backend: ${backend}`,
        message: `The backend "${backend}" is not supported. Please choose from: ${supportedStacks.backends.map(b => supportedStacks.prettyNames[b]).join(', ')}.`,
        availableBackends: supportedStacks.backends
      });
    }

    // === Validate compatibility ===
    if (!supportedStacks.compatibility[frontend]?.includes(backend)) {
      const compatibleBackends = supportedStacks.compatibility[frontend].map(b => supportedStacks.prettyNames[b]).join(', ');
      return sendErrorResponse(reply, 400, {
        error: `Incompatible stack combination: ${frontend} with ${backend}`,
        message: `${supportedStacks.prettyNames[frontend]} is not recommended to use with ${supportedStacks.prettyNames[backend]}. For ${supportedStacks.prettyNames[frontend]}, we recommend: ${compatibleBackends}.`,
        compatibleOptions: supportedStacks.compatibility[frontend]
      });
    }

    // Find the stack template path
    const stackName = `${frontend}-${backend}`;
    const stackPath = findStackPath(stackName);

    // If stack template not found
    if (!stackPath) {
      return handleMissingStack(reply, frontend, backend, stackName);
    }

    // Set response headers for ZIP file
    setCorsHeaders(reply);
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename=${stackName}.zip`);

    // Create and configure archive
    const archive = archiver('zip', { zlib: { level: 9 } });
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

    // Finalize and return the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error generating stack:', error);
    return sendErrorResponse(reply, 500, {
      error: 'Server error',
      message: 'An error occurred while generating the stack'
    });
  }
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
function findStackPath(stackName: string): string | null {
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
  frontend: string, 
  backend: string, 
  stackName: string
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
      const [frontEnd, backEnd] = stack.split('-');
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

