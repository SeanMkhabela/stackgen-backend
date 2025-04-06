import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signupHandler, signinHandler } from '../../controllers/authController';
import { User } from '../../models/User';
import bcrypt from 'bcrypt';
import * as jwt from '../../utils/jwt';

// Mock dependencies
vi.mock('../../models/User', () => {
  const SaveMock = vi.fn().mockResolvedValue(undefined);

  // Create a proper constructor function
  const UserMock = function (this: any, data: any) {
    Object.assign(this, data);
    this.save = SaveMock;
    return this;
  };

  // Add static methods to the constructor
  const findOneMock = vi.fn();

  return {
    User: Object.assign(UserMock, {
      findOne: findOneMock,
    }),
  };
});

// Mock bcrypt with proper default export
vi.mock('bcrypt', () => {
  const mockHash = vi.fn().mockResolvedValue('hashed_password');
  const mockCompare = vi.fn().mockResolvedValue(true);

  return {
    __esModule: true,
    default: {
      hash: mockHash,
      compare: mockCompare,
    },
    hash: mockHash,
    compare: mockCompare,
  };
});

// Mock the entire JWT module
vi.mock('../../utils/jwt', () => ({
  signToken: vi.fn().mockReturnValue('test_token'),
}));

describe('Auth Controller', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    };

    // Create a simpler mock for reply
    mockReply = {
      send: vi.fn().mockReturnThis(),
      status: vi.fn(function (this: any) {
        return this;
      }),
    };

    // Reset all mocks between tests
    vi.resetAllMocks();

    // Ensure bcrypt.compare returns true by default
    vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true));

    // Ensure jwt.signToken returns a token
    vi.mocked(jwt.signToken).mockReturnValue('test_token');
  });

  describe('signupHandler', () => {
    it('should create a new user if email does not exist', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      vi.mocked(User.findOne).mockResolvedValue(null);

      await signupHandler(mockRequest, mockReply);

      // Check that the right methods were called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockReply.send).toHaveBeenCalledWith({ message: 'User created successfully ✅' });
    });

    it('should return 409 if user already exists', async () => {
      // Mock User.findOne to return a user (user exists)
      vi.mocked(User.findOne).mockResolvedValue({
        _id: 'some_id',
        email: 'test@example.com',
      } as any);

      await signupHandler(mockRequest, mockReply);

      // Check that the right methods were called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockReply.status).toHaveBeenCalledWith(409);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User already exists' });
    });
  });

  describe('signinHandler', () => {
    it('should return token if credentials are valid', async () => {
      // Mock User.findOne to return a user
      const mockUser = {
        _id: 'some_id',
        email: 'test@example.com',
        password: 'hashed_password',
      };
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);

      // Override the default mock for this test to return a specific token
      vi.mocked(jwt.signToken).mockReturnValue('test_token');

      await signinHandler(mockRequest, mockReply);

      // Check that the right methods were called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');

      // Verify the token was generated
      expect(jwt.signToken).toHaveBeenCalled();

      // Check the send method was called with the token
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Signed in successfully ✅',
        token: 'test_token',
      });
    });

    it('should return 404 if user not found', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      vi.mocked(User.findOne).mockResolvedValue(null);

      await signinHandler(mockRequest, mockReply);

      // Check that the right methods were called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 401 if password is invalid', async () => {
      // Mock User.findOne to return a user
      vi.mocked(User.findOne).mockResolvedValue({
        _id: 'some_id',
        email: 'test@example.com',
        password: 'hashed_password',
      } as any);

      // Override for this test only - use mockImplementationOnce for type safety
      vi.mocked(bcrypt.compare).mockImplementationOnce(() => Promise.resolve(false));

      await signinHandler(mockRequest, mockReply);

      // Check that the right methods were called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid password' });
    });
  });
});
