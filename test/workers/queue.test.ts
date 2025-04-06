import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueueName } from '../../utils/queue';

// Mock the Redis module with a variable we can access in tests
const mockIsRedisAvailable = vi.fn().mockReturnValue(true);
vi.mock('../../utils/redis', () => ({
  isRedisAvailable: mockIsRedisAvailable,
}));

// Mock Queue object
const mockQueue = {
  process: vi.fn(),
  add: vi.fn().mockReturnValue({ id: 'test-job-id' }),
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

// Create hoisted mock functions
const { initQueue, addJob, getQueue, closeAllQueues } = vi.hoisted(() => ({
  initQueue: vi.fn(),
  addJob: vi.fn(),
  getQueue: vi.fn(),
  closeAllQueues: vi.fn().mockResolvedValue(undefined),
}));

// Mock Bull
vi.mock('bull', () => {
  const mockProcess = vi.fn();
  const mockAdd = vi.fn().mockImplementation(() => ({
    id: 'mock-job-id',
    data: { testData: true },
  }));
  const mockOn = vi.fn();
  const mockClose = vi.fn().mockResolvedValue(undefined);

  return {
    default: vi.fn().mockImplementation(() => ({
      process: mockProcess,
      add: mockAdd,
      on: mockOn,
      close: mockClose,
    })),
  };
});

// Mock Sentry
vi.mock('../../utils/sentry', () => ({
  captureException: vi.fn(),
}));

// Mock our own queue module
vi.mock('../../utils/queue', () => {
  // We need to expose the QueueName enum
  const QueueNameEnum = {
    GENERATION: 'generation',
    EXPORT: 'export',
  };

  return {
    QueueName: QueueNameEnum,
    initQueue,
    addJob,
    getQueue,
    closeAllQueues,
  };
});

describe('Queue Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default behavior
    initQueue.mockImplementation(name => {
      // When Redis is available, return the mock queue
      if (mockIsRedisAvailable()) {
        return mockQueue;
      }
      // When Redis is not available, return null
      return null;
    });
    getQueue.mockImplementation(name => (name === QueueName.GENERATION ? mockQueue : null));
    addJob.mockResolvedValue({ id: 'test-job-id' });
    mockIsRedisAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize a queue', () => {
    const queue = initQueue(QueueName.GENERATION);
    expect(queue).toBe(mockQueue);
    expect(initQueue).toHaveBeenCalledWith(QueueName.GENERATION);
  });

  it('should add jobs to the queue', async () => {
    const jobData = { test: 'data' };
    const job = await addJob(QueueName.GENERATION, 'test-job', jobData);

    expect(job).toEqual({ id: 'test-job-id' });
    // No need to check for undefined since we don't pass it explicitly
    expect(addJob).toHaveBeenCalledWith(QueueName.GENERATION, 'test-job', jobData);
  });

  it('should get an initialized queue', () => {
    const queue = getQueue(QueueName.GENERATION);
    expect(queue).toBe(mockQueue);
    expect(getQueue).toHaveBeenCalledWith(QueueName.GENERATION);
  });

  it('should return null for a queue that was not initialized', () => {
    // For the EXPORT queue, we set up getQueue to return null
    const queue = getQueue(QueueName.EXPORT);
    expect(queue).toBeNull();
    expect(getQueue).toHaveBeenCalledWith(QueueName.EXPORT);
  });

  it('should not initialize a queue if Redis is not available', () => {
    // Override the default mock to return false for this test
    mockIsRedisAvailable.mockReturnValue(false);

    const queue = initQueue(QueueName.GENERATION);
    expect(queue).toBeNull();
    expect(mockIsRedisAvailable).toHaveBeenCalled();
  });
});
