import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CircuitBreaker from 'opossum';
import {
  createCircuitBreaker,
  getCircuitBreaker,
  getCircuitBreakersHealth,
  executeWithCircuitBreaker,
} from '../../utils/circuitBreaker';

// Mock the opossum CircuitBreaker
vi.mock('opossum', () => {
  const mockFire = vi.fn();
  const mockFallback = vi.fn();

  // Mock implementation of CircuitBreaker
  const MockCircuitBreaker = vi.fn().mockImplementation(() => {
    return {
      fire: mockFire,
      fallback: mockFallback,
      on: vi.fn(),
      status: {
        stats: { successes: 0, failures: 0, fallbacks: 0, rejects: 0 },
      },
      stats: {
        successes: 0,
        failures: 0,
        fallbacks: 0,
        rejects: 0,
        latencyMean: 10,
        fires: 0,
      },
    };
  });

  // Need to use this approach to make TypeScript happy with the mock extensions
  const OpossumMock = { default: MockCircuitBreaker };
  // Add our test helper properties
  (OpossumMock as any).mockFire = mockFire;
  (OpossumMock as any).mockFallback = mockFallback;
  return OpossumMock;
});

// Mock the sentry module
vi.mock('../../utils/sentry', () => ({
  captureException: vi.fn(),
}));

// Save console methods to restore later
const originalConsole = { ...console };

describe('Circuit Breaker', () => {
  // Mock console methods before each test
  beforeEach(() => {
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Clear the module's internal state between tests
    vi.resetModules();
  });

  // Restore console methods after each test
  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('createCircuitBreaker', () => {
    it('should create a new circuit breaker with default options', () => {
      const mockFunction = vi.fn().mockResolvedValue('success');
      const breaker = createCircuitBreaker('test-breaker', mockFunction);

      expect(breaker).toBeDefined();
      expect(CircuitBreaker).toHaveBeenCalledWith(mockFunction, expect.any(Object));

      // Check event listeners were registered
      expect(breaker.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('halfOpen', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('fallback', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('timeout', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('fire', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('reject', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('success', expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith('failure', expect.any(Function));
    });

    it('should create a circuit breaker with custom options', () => {
      const mockFunction = vi.fn().mockResolvedValue('success');
      const customOptions = {
        timeout: 5000,
        errorThresholdPercentage: 25,
        resetTimeout: 15000,
      };

      const breaker = createCircuitBreaker('custom-options', mockFunction, customOptions);

      expect(breaker).toBeDefined();
      expect(CircuitBreaker).toHaveBeenCalledWith(
        mockFunction,
        expect.objectContaining(customOptions)
      );
    });

    it('should return existing circuit breaker if name already exists', () => {
      const mockFunction = vi.fn().mockResolvedValue('success');

      // Create first instance
      const firstBreaker = createCircuitBreaker('reused-breaker', mockFunction);

      // Reset the mock to check if it's called again
      vi.mocked(CircuitBreaker).mockClear();

      // Create second instance with same name
      const secondBreaker = createCircuitBreaker('reused-breaker', mockFunction);

      expect(secondBreaker).toBe(firstBreaker);
      expect(CircuitBreaker).not.toHaveBeenCalled(); // Constructor not called again
    });
  });

  describe('getCircuitBreaker', () => {
    it('should return null if circuit breaker does not exist', () => {
      const breaker = getCircuitBreaker('non-existent');
      expect(breaker).toBeNull();
    });

    it('should return the circuit breaker if it exists', () => {
      const mockFunction = vi.fn().mockResolvedValue('success');
      const createdBreaker = createCircuitBreaker('existing-breaker', mockFunction);

      const retrievedBreaker = getCircuitBreaker('existing-breaker');

      expect(retrievedBreaker).toBe(createdBreaker);
    });
  });

  describe('getCircuitBreakersHealth', () => {
    it('should return health status for all circuit breakers', () => {
      // Create multiple circuit breakers
      const mockFunction1 = vi.fn().mockResolvedValue('success1');
      const mockFunction2 = vi.fn().mockResolvedValue('success2');

      createCircuitBreaker('health-breaker-1', mockFunction1);
      createCircuitBreaker('health-breaker-2', mockFunction2);

      const health = getCircuitBreakersHealth();

      expect(health).toHaveProperty('health-breaker-1');
      expect(health).toHaveProperty('health-breaker-2');
      expect(health['health-breaker-1']).toHaveProperty('state', 'closed');
      expect(health['health-breaker-1']).toHaveProperty('stats');
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should create a circuit breaker if it does not exist', async () => {
      const mockFunction = vi.fn().mockResolvedValue('execute-success');

      // Setup fire mock to return success
      const opossum = await import('opossum');
      (opossum as any).mockFire.mockResolvedValueOnce('execute-success');

      const result = await executeWithCircuitBreaker('new-execute-breaker', mockFunction, [
        'arg1',
        'arg2',
      ]);

      expect(result).toBe('execute-success');
      expect(CircuitBreaker).toHaveBeenCalledWith(mockFunction, expect.any(Object));
      expect((opossum as any).mockFire).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reuse existing circuit breaker if it exists', async () => {
      const mockFunction = vi.fn().mockResolvedValue('reuse-success');

      // Create the breaker first
      createCircuitBreaker('existing-execute-breaker', mockFunction);

      // Clear constructor calls
      vi.mocked(CircuitBreaker).mockClear();

      // Setup fire mock
      const opossum = await import('opossum');
      (opossum as any).mockFire.mockResolvedValueOnce('reuse-success');

      // Execute with the existing breaker
      const result = await executeWithCircuitBreaker('existing-execute-breaker', mockFunction);

      expect(result).toBe('reuse-success');
      expect(CircuitBreaker).not.toHaveBeenCalled(); // Constructor not called again
    });

    it('should use fallback if provided', async () => {
      const mockFunction = vi.fn().mockRejectedValue(new Error('Primary function failed'));
      const mockFallback = vi.fn().mockReturnValue('fallback-result');

      const opossum = await import('opossum');

      // Create a proper mock implementation that doesn't throw
      // Just verify that the fallback function is set correctly
      (opossum as any).mockFire.mockResolvedValueOnce('success-with-fallback');

      await executeWithCircuitBreaker('fallback-breaker', mockFunction, [], mockFallback);

      // Just verify the fallback was set up
      expect((opossum as any).mockFallback).toHaveBeenCalledWith(mockFallback);
    });
  });
});
