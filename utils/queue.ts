// Use require for CommonJS modules to avoid TypeScript issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Bull = require('bull');
import { captureException } from './sentry';
import { isRedisAvailable } from './redis';

// Define type for Queue from Bull
type BullQueue<T = any> = {
  add: (name: string, data: T, options?: any) => Promise<BullJob<T>>;
  on: (event: string, callback: (job?: any, error?: Error) => void) => void;
  close: () => Promise<void>;
  process: (name: string, concurrency: number, processor: (job: any) => Promise<any>) => void;
};

// Define type for Job from Bull
type BullJob<T = any> = {
  id?: string | number;
  data: T;
  name: string;
};

// Define type for job options
type BullJobOptions = {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: string;
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  priority?: number;
};

// Define queue names
export enum QueueName {
  GENERATION = 'generation',
  EXPORT = 'export',
}

// Store all queues
const queues: Record<string, BullQueue> = {};

/**
 * Initialize a queue with the given name
 */
export function initQueue(name: QueueName): BullQueue | null {
  try {
    if (!isRedisAvailable()) {
      console.warn(`Redis is not available. Queue '${name}' will not be initialized.`);
      return null;
    }

    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    // Create a new queue
    const queue = new Bull(name, {
      redis: redisUrl,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    // Set up event handlers
    queue.on('error', (error: Error) => {
      console.error(`Queue ${name} error:`, error);
      captureException(error, { context: `Queue ${name}` });
    });

    queue.on('failed', (job: BullJob, error: Error) => {
      console.error(`Job ${job.id} in queue ${name} failed:`, error);
      captureException(error, {
        context: `Queue ${name} job failure`,
        jobId: job.id?.toString(),
        jobName: job.name,
      });
    });

    // Store the queue
    queues[name] = queue;

    console.log(`✅ Queue '${name}' initialized`);
    return queue;
  } catch (error) {
    console.error(`Failed to initialize queue '${name}':`, error);
    captureException(error as Error, { context: 'Queue initialization' });
    return null;
  }
}

/**
 * Get a queue by name
 */
export function getQueue(name: QueueName): BullQueue | null {
  return queues[name] || null;
}

/**
 * Initialize all queues
 */
export function initAllQueues(): void {
  Object.values(QueueName).forEach(name => initQueue(name as QueueName));
}

/**
 * Add a job to a queue
 */
export async function addJob<T>(
  queueName: QueueName,
  jobName: string,
  data: T,
  options?: BullJobOptions
): Promise<BullJob<T> | null> {
  const queue = getQueue(queueName);

  if (!queue) {
    console.warn(`Queue '${queueName}' not initialized. Job '${jobName}' not added.`);
    return null;
  }

  try {
    return await queue.add(jobName, data, options);
  } catch (error) {
    console.error(`Failed to add job '${jobName}' to queue '${queueName}':`, error);
    captureException(error as Error, {
      context: 'Add job to queue',
      queueName,
      jobName,
    });
    return null;
  }
}

/**
 * Close all queues
 */
export async function closeAllQueues(): Promise<void> {
  const promises = Object.values(queues).map(queue => queue.close());
  await Promise.all(promises);
  console.log('All queues closed');
}
