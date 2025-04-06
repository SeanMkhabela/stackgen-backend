import { beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock mongoose model
vi.mock('mongoose', () => {
  const actualMongoose = vi.importActual('mongoose');
  return {
    ...actualMongoose,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    connection: {
      readyState: 1,
      dropDatabase: vi.fn().mockResolvedValue(undefined)
    }
  };
});

// Mock User model
vi.mock('../models/User', () => {
  // Create a constructor function for User that properly adds save method to instances
  const MockUser = vi.fn().mockImplementation(function(this: any, data: any) {
    Object.assign(this, data);
    // Make sure every instance has a save method
    this.save = vi.fn().mockImplementation(() => Promise.resolve(this));
    return this;
  });
  
  return {
    User: Object.assign(MockUser, {
      findOne: vi.fn()
    })
  };
});

// Mock Redis
vi.mock('../utils/redis', () => ({
  initRedis: vi.fn().mockResolvedValue(undefined),
  setCache: vi.fn().mockResolvedValue(undefined),
  getCache: vi.fn().mockResolvedValue({ data: 'test-data' }),
  closeRedis: vi.fn().mockResolvedValue(undefined),
  isRedisAvailable: vi.fn().mockReturnValue(true),
}));

// Mock Sentry
vi.mock('../utils/sentry', () => ({
  initSentry: vi.fn(),
  setupSentryFastifyPlugin: vi.fn(),
  captureException: vi.fn(),
}));

// Mock JWT functions
vi.mock('../utils/jwt', () => ({
  signToken: vi.fn().mockReturnValue('test_jwt_token'),
  verifyToken: vi.fn().mockReturnValue({ id: 'test_id', email: 'test@example.com' })
}));

// Connect to test MongoDB before all tests
beforeAll(async () => {
  /* 
  We're using mock MongoDB now, so no need to actually connect
  if (!process.env.MONGO_URI_TEST) {
    // Fall back to dev URI with test DB name
    const devUri = process.env.MONGO_URI || 'mongodb://localhost:27017/stackgen';
    process.env.MONGO_URI_TEST = devUri.replace(/\/[^/]+$/, '/stackgen_test');
  }
  
  await mongoose.connect(process.env.MONGO_URI_TEST);
  */
});

// Disconnect and cleanup after all tests
afterAll(async () => {
  /* 
  Using mock mongoose, so no need to actually disconnect
  if (mongoose.connection.readyState) {
    // Optional: Drop the test database
    // await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  */
}); 