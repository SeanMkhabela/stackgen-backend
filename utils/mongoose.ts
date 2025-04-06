import mongoose from 'mongoose';
import { executeWithCircuitBreaker } from './circuitBreaker';
import { captureException } from './sentry';

/**
 * Performs a database operation with a circuit breaker pattern
 *
 * @param operationName Name of the operation (used for circuit breaker identification)
 * @param dbOperation Function that performs the database operation
 * @param fallback Optional fallback function when the circuit is open
 * @returns Result of the database operation or fallback
 */
export async function withDatabaseCircuitBreaker<T>(
  operationName: string,
  dbOperation: () => Promise<T>,
  fallback?: () => Promise<T> | T
): Promise<T> {
  // Create a prefixed name for the circuit breaker
  const breakerName = `mongodb-${operationName}`;

  return executeWithCircuitBreaker<T>(
    breakerName,
    dbOperation,
    [], // No arguments - the operation function already has them
    fallback,
    {
      timeout: 5000, // 5 seconds timeout for database operations
      errorThresholdPercentage: 30, // Open circuit after 30% failures
      resetTimeout: 10000, // Try again after 10 seconds
    }
  );
}

/**
 * Safely executes a database find operation with circuit breaker pattern
 *
 * @param model The mongoose model to use
 * @param query The query to perform
 * @param projection Optional projection
 * @param options Optional find options
 * @returns The result of the find operation
 */
export async function safeFindOne<T>(
  model: mongoose.Model<T>,
  query: mongoose.FilterQuery<T>,
  projection?: mongoose.ProjectionType<T>,
  options?: mongoose.QueryOptions
): Promise<T | null> {
  try {
    return await withDatabaseCircuitBreaker<T | null>(
      `findOne-${model.modelName}`,
      async () => model.findOne(query, projection, options),
      async () => {
        console.warn(`Circuit open for ${model.modelName}.findOne operation. Returning null.`);
        return null;
      }
    );
  } catch (error) {
    console.error(`Error in ${model.modelName}.findOne operation:`, error);
    captureException(error as Error, { context: `MongoDB ${model.modelName}.findOne` });
    return null;
  }
}

/**
 * Safely executes a database find operation with circuit breaker pattern
 *
 * @param model The mongoose model to use
 * @param query The query to perform
 * @param projection Optional projection
 * @param options Optional find options
 * @returns The result of the find operation
 */
export async function safeFind<T>(
  model: mongoose.Model<T>,
  query: mongoose.FilterQuery<T>,
  projection?: mongoose.ProjectionType<T>,
  options?: mongoose.QueryOptions
): Promise<T[]> {
  try {
    return await withDatabaseCircuitBreaker<T[]>(
      `find-${model.modelName}`,
      async () => model.find(query, projection, options),
      async () => {
        console.warn(`Circuit open for ${model.modelName}.find operation. Returning empty array.`);
        return [] as unknown as T[];
      }
    );
  } catch (error) {
    console.error(`Error in ${model.modelName}.find operation:`, error);
    captureException(error as Error, { context: `MongoDB ${model.modelName}.find` });
    return [] as unknown as T[];
  }
}

/**
 * Safely executes a database create operation with circuit breaker pattern
 *
 * @param model The mongoose model to use
 * @param doc The document data to save
 * @returns The created document
 */
export async function safeCreate<T>(
  model: mongoose.Model<T>,
  doc: mongoose.AnyObject
): Promise<T | null> {
  try {
    return await withDatabaseCircuitBreaker<T | null>(
      `create-${model.modelName}`,
      async () => model.create(doc) as Promise<T>,
      async () => {
        console.warn(`Circuit open for ${model.modelName}.create operation. Returning null.`);
        return null;
      }
    );
  } catch (error) {
    console.error(`Error in ${model.modelName}.create operation:`, error);
    captureException(error as Error, { context: `MongoDB ${model.modelName}.create` });
    return null;
  }
}

/**
 * Safely executes a database update operation with circuit breaker pattern
 *
 * @param model The mongoose model to use
 * @param query The query to find documents to update
 * @param update The update to apply
 * @param options Optional update options
 * @returns The update result
 */
export async function safeUpdateOne<T>(
  model: mongoose.Model<T>,
  query: mongoose.FilterQuery<T>,
  update: mongoose.UpdateQuery<T>,
  options?: any // Using any type to bypass the type check issue
): Promise<mongoose.UpdateWriteOpResult | null> {
  try {
    return await withDatabaseCircuitBreaker<mongoose.UpdateWriteOpResult | null>(
      `updateOne-${model.modelName}`,
      async () => model.updateOne(query, update, options),
      async () => {
        console.warn(`Circuit open for ${model.modelName}.updateOne operation. Returning null.`);
        return null;
      }
    );
  } catch (error) {
    console.error(`Error in ${model.modelName}.updateOne operation:`, error);
    captureException(error as Error, { context: `MongoDB ${model.modelName}.updateOne` });
    return null;
  }
}

/**
 * Safely executes a database delete operation with circuit breaker pattern
 *
 * @param model The mongoose model to use
 * @param query The query to find documents to delete
 * @returns The deletion result
 */
export async function safeDeleteOne<T>(
  model: mongoose.Model<T>,
  query: mongoose.FilterQuery<T>
): Promise<mongoose.DeleteResult | null> {
  try {
    return await withDatabaseCircuitBreaker<mongoose.DeleteResult | null>(
      `deleteOne-${model.modelName}`,
      async () => model.deleteOne(query),
      async () => {
        console.warn(`Circuit open for ${model.modelName}.deleteOne operation. Returning null.`);
        return null;
      }
    );
  } catch (error) {
    console.error(`Error in ${model.modelName}.deleteOne operation:`, error);
    captureException(error as Error, { context: `MongoDB ${model.modelName}.deleteOne` });
    return null;
  }
}
