import { QueueName, getQueue } from './queue';
import { captureException } from './sentry';

// Type for processor function
type ProcessorFunction<T = any, R = any> = (data: T) => Promise<R>;

// Map of job processors
const processors: Record<string, Record<string, ProcessorFunction>> = {
  [QueueName.GENERATION]: {},
  [QueueName.EXPORT]: {},
};

/**
 * Register a processor for a specific job in a queue
 */
export function registerProcessor<T = any, R = any>(
  queueName: QueueName,
  jobName: string,
  processorFn: ProcessorFunction<T, R>
) {
  if (!processors[queueName]) {
    processors[queueName] = {};
  }

  processors[queueName][jobName] = processorFn;
  console.log(`Registered processor for job '${jobName}' in queue '${queueName}'`);
}

/**
 * Start processing jobs for all registered queues
 */
export function startWorkers(concurrency = 1) {
  Object.entries(processors).forEach(([queueName, jobProcessors]) => {
    const queue = getQueue(queueName as QueueName);

    if (!queue) {
      console.warn(`Queue '${queueName}' not initialized. Workers not started.`);
      return;
    }

    // Process specific job types
    Object.entries(jobProcessors).forEach(([jobName, processorFn]) => {
      queue.process(jobName, concurrency, async job => {
        try {
          console.log(`Processing job ${job.id} (${jobName}) from queue ${queueName}`);
          const result = await processorFn(job.data);
          console.log(`Completed job ${job.id} (${jobName}) from queue ${queueName}`);
          return result;
        } catch (error) {
          console.error(`Error processing job ${job.id} (${jobName}):`, error);
          captureException(error as Error, {
            context: 'Job processing error',
            queueName,
            jobName,
            jobId: job.id?.toString(),
          });
          throw error; // Re-throw to let Bull handle the failure
        }
      });

      console.log(
        `Started worker for job type '${jobName}' in queue '${queueName}' with concurrency ${concurrency}`
      );
    });
  });
}

/**
 * Stop all workers and clean up
 */
export async function stopWorkers() {
  // Bull automatically handles this when closing queues
  console.log('Workers stopped');
}
