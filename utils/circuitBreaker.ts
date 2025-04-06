import CircuitBreaker from 'opossum';
import { captureException } from './sentry';

// Default circuit breaker options
const DEFAULT_OPTIONS: CircuitBreaker.Options = {
  timeout: 10000, // Time in ms before a request is considered failed
  errorThresholdPercentage: 50, // Percentage of failures before opening the circuit
  resetTimeout: 30000, // Time in ms to wait before trying again
  rollingCountTimeout: 60000, // Statistical time window for failure rate calculation
  rollingCountBuckets: 10, // Number of buckets within the statistical window
  volumeThreshold: 5, // Minimum number of requests before applying error percentage check
  errorFilter: err => {
    // Optional filter to determine if an error should count as a failure
    return false; // By default, all errors count as failures
  },
};

// Store circuit breakers by name
const circuitBreakers: Record<string, CircuitBreaker> = {};

/**
 * Creates a circuit breaker for a specific function
 *
 * @param name Unique name for the circuit breaker
 * @param fn The function to protect with the circuit breaker
 * @param options Custom options for the circuit breaker
 * @returns Circuit breaker instance
 */
export function createCircuitBreaker<T>(
  name: string,
  fn: (...args: any[]) => Promise<T>,
  options: Partial<CircuitBreaker.Options> = {}
): CircuitBreaker {
  if (circuitBreakers[name]) {
    return circuitBreakers[name];
  }

  const circuitBreakerOptions = { ...DEFAULT_OPTIONS, ...options };
  const breaker = new CircuitBreaker(fn, circuitBreakerOptions);

  // Set up event listeners
  breaker.on('open', () => {
    console.warn(`Circuit ${name} opened - requests will fail fast`);
  });

  breaker.on('halfOpen', () => {
    console.info(`Circuit ${name} half-open - trying a test request`);
  });

  breaker.on('close', () => {
    console.info(`Circuit ${name} closed - service is operational`);
  });

  breaker.on('fallback', result => {
    console.warn(`Circuit ${name} used fallback`);
  });

  breaker.on('timeout', result => {
    console.warn(`Circuit ${name} request timed out`);
  });

  breaker.on('fire', () => {
    // Optional - for high volume services, you may want to disable this
    console.debug(`Circuit ${name} executing request`);
  });

  breaker.on('reject', () => {
    console.warn(`Circuit ${name} rejected request (circuit open)`);
  });

  breaker.on('success', () => {
    // Optional - for high volume services, you may want to disable this
    console.debug(`Circuit ${name} successful request`);
  });

  breaker.on('failure', error => {
    console.error(`Circuit ${name} request failed:`, error);
    captureException(error, { context: `CircuitBreaker ${name}` });
  });

  // Store the breaker for reuse
  circuitBreakers[name] = breaker;
  return breaker;
}

/**
 * Get an existing circuit breaker by name
 *
 * @param name Name of the circuit breaker
 * @returns The circuit breaker or null if not found
 */
export function getCircuitBreaker(name: string): CircuitBreaker | null {
  return circuitBreakers[name] || null;
}

/**
 * Get the health status of all circuit breakers
 *
 * @returns Object with status information for all circuit breakers
 */
export function getCircuitBreakersHealth(): Record<
  string,
  {
    state: string;
    stats: any;
  }
> {
  const health: Record<
    string,
    {
      state: string;
      stats: any;
    }
  > = {};

  Object.entries(circuitBreakers).forEach(([name, breaker]) => {
    health[name] = {
      state: breaker.status.stats ? 'closed' : 'open', // Using stats presence as a way to determine state
      stats: breaker.stats,
    };
  });

  return health;
}

/**
 * Execute a function with the specified circuit breaker, creating one if it doesn't exist
 *
 * @param name Circuit breaker name
 * @param fn Function to execute
 * @param args Arguments to pass to the function
 * @param fallback Optional fallback function if the circuit is open
 * @param options Optional circuit breaker options
 * @returns Result of the function or fallback
 */
export async function executeWithCircuitBreaker<T>(
  name: string,
  fn: (...args: any[]) => Promise<T>,
  args: any[] = [],
  fallback?: (...args: any[]) => Promise<T> | T,
  options: Partial<CircuitBreaker.Options> = {}
): Promise<T> {
  // Get or create the circuit breaker
  let breaker = getCircuitBreaker(name);

  if (!breaker) {
    breaker = createCircuitBreaker(name, fn, options);
  }

  // Set fallback if provided
  if (fallback) {
    breaker.fallback(fallback);
  }

  // Use type assertion to ensure the return type matches T
  return breaker.fire(...args) as Promise<T>;
}
