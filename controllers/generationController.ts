import { FastifyRequest, FastifyReply } from 'fastify';
import { queueGenerateCode, queueOptimizeCode } from '../workers/generation';
import { captureException } from '../utils/sentry';

// Define a type extension for the user property
interface RequestWithUser {
  user?: {
    id: string;
  };
}

// Using Fastify's schema-to-type system with our extension
type GenerateCodeRequest = {
  Body: {
    prompt: string;
    language: string;
    maxTokens?: number;
  };
} & RequestWithUser;

type OptimizeCodeRequest = {
  Body: {
    code: string;
    language: string;
  };
} & RequestWithUser;

type JobStatusRequest = {
  Params: {
    id: string;
  };
};

/**
 * Queue a code generation job
 */
export async function generateCode(
  request: FastifyRequest<GenerateCodeRequest>,
  reply: FastifyReply
) {
  try {
    const { prompt, language, maxTokens } = request.body;
    // Use type assertion since we know user is added by auth middleware
    const userId = (request as unknown as { user?: { id: string } }).user?.id || 'anonymous';

    // Validate required fields
    if (!prompt || !language) {
      reply.status(400);
      return reply.send({ error: 'Missing required fields: prompt and language' });
    }

    // Queue the code generation job
    const job = await queueGenerateCode({
      prompt,
      language,
      userId,
      maxTokens,
    });

    if (!job) {
      reply.status(500);
      return reply.send({ error: 'Failed to queue job. Worker system might be unavailable.' });
    }

    // Return the job ID so the client can poll for results
    reply.status(202);
    return reply.send({
      message: 'Code generation job queued successfully',
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    captureException(error as Error, { context: 'Generate code controller' });
    reply.status(500);
    return reply.send({ error: 'Failed to generate code' });
  }
}

/**
 * Queue a code optimization job
 */
export async function optimizeCode(
  request: FastifyRequest<OptimizeCodeRequest>,
  reply: FastifyReply
) {
  try {
    const { code, language } = request.body;
    // Use type assertion since we know user is added by auth middleware
    const userId = (request as unknown as { user?: { id: string } }).user?.id || 'anonymous';

    // Validate required fields
    if (!code || !language) {
      reply.status(400);
      return reply.send({ error: 'Missing required fields: code and language' });
    }

    // Queue the code optimization job
    const job = await queueOptimizeCode({
      code,
      language,
      userId,
    });

    if (!job) {
      reply.status(500);
      return reply.send({ error: 'Failed to queue job. Worker system might be unavailable.' });
    }

    // Return the job ID so the client can poll for results
    reply.status(202);
    return reply.send({
      message: 'Code optimization job queued successfully',
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    captureException(error as Error, { context: 'Optimize code controller' });
    reply.status(500);
    return reply.send({ error: 'Failed to optimize code' });
  }
}

/**
 * Get the status of a job
 */
export async function getJobStatus(request: FastifyRequest<JobStatusRequest>, reply: FastifyReply) {
  try {
    const { id } = request.params;

    // This is a simplified example. In a real implementation, you would:
    // 1. Look up the job in Bull using Queue.getJob(id)
    // 2. Return the job status and any results

    // For now, we'll return a mock response
    reply.status(200);
    return reply.send({
      jobId: id,
      status: 'completed',
      result: {
        code: '// Generated code would be here\nfunction example() {\n  console.log("Hello World");\n}\n',
      },
    });
  } catch (error) {
    captureException(error as Error, { context: 'Get job status controller' });
    reply.status(500);
    return reply.send({ error: 'Failed to get job status' });
  }
}
