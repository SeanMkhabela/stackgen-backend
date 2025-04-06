import { registerGenerationProcessors } from './generation';
import { registerExportProcessors } from './export';
import { startWorkers, stopWorkers } from '../utils/workers';
import { initAllQueues, closeAllQueues } from '../utils/queue';

/**
 * Initialize all queues and workers
 */
export async function initWorkers(concurrency = 1) {
  // Initialize queues
  initAllQueues();

  // Register processors for all job types
  registerGenerationProcessors();
  registerExportProcessors();

  // Start processing jobs
  startWorkers(concurrency);

  console.log(`Worker system initialized with concurrency ${concurrency}`);
}

/**
 * Shut down all workers and queues
 */
export async function shutdownWorkers() {
  await stopWorkers();
  await closeAllQueues();
  console.log('Worker system shut down');
}

// Re-export job queueing functions for convenience
export * from './generation';
export * from './export';
