// Define mock functions before vi.mock
const mockSave = vi.fn().mockResolvedValue(true);
const mockFind = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockSelect = vi.fn();
const mockSort = vi.fn();
const mockCountDocuments = vi.fn().mockResolvedValue(0);

// Mock modules before imports to avoid hoisting issues
vi.mock('../../utils/apiKey', () => {
  return {
    generateApiKey: vi.fn().mockReturnValue('mock_generated_api_key'),
    default: {
      ApiKey: function (data: any) {
        return {
          ...data,
          _id: 'api_key_123',
          save: mockSave,
        };
      },
    },
  };
});

// Mock mongoose properly with a default export
vi.mock('mongoose', () => {
  const mongoose = {
    Types: {
      ObjectId: {
        isValid: vi.fn().mockReturnValue(true),
      },
    },
  };
  return {
    default: mongoose,
    ...mongoose,
  };
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createApiKey, listApiKeys, revokeApiKey } from '../../controllers/apiKeyController';
import apiKeyModule from '../../utils/apiKey';

const { ApiKey } = apiKeyModule;

// Set up the static methods on ApiKey used by the controller
ApiKey.find = mockFind;
ApiKey.findByIdAndUpdate = mockFindByIdAndUpdate;
ApiKey.countDocuments = mockCountDocuments;

describe('API Key Controller', () => {
  // Create mock request/reply objects
  const mockRequest = {
    body: {},
    query: {},
    params: {},
  } as any;

  const mockReply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as any;

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset request and reply mocks
    mockRequest.body = {};
    mockRequest.query = {};
    mockRequest.params = {};
    mockReply.status.mockClear();
    mockReply.send.mockClear();

    // Reset our function mocks
    mockSave.mockClear().mockResolvedValue(true);
    mockSort.mockClear().mockResolvedValue([]);
    mockSelect.mockClear().mockReturnValue({ sort: mockSort });
    mockFind.mockClear().mockReturnValue({ select: mockSelect });
    mockFindByIdAndUpdate.mockClear().mockResolvedValue({
      _id: 'key123',
      enabled: false,
    });
    mockCountDocuments.mockClear().mockResolvedValue(0);

    // Reset mongoose mocks
    mongoose.Types.ObjectId.isValid = vi.fn().mockReturnValue(true);
  });

  describe('createApiKey', () => {
    beforeEach(() => {
      // Setup createApiKey test
      mockRequest.body = {
        name: 'Test Key',
        userId: 'user123',
      };
    });

    it('should create a new API key with valid input', async () => {
      await createApiKey(mockRequest, mockReply);

      expect(mockSave).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'mock_generated_api_key',
          name: 'Test Key',
          id: 'api_key_123',
        })
      );
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = { name: 'Test Key' }; // Missing userId

      await createApiKey(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Name and userId are required' });
    });

    it('should return 400 if userId is invalid', async () => {
      mongoose.Types.ObjectId.isValid = vi.fn().mockReturnValue(false);

      await createApiKey(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid userId format' });
    });

    it('should handle database errors gracefully', async () => {
      mockSave.mockRejectedValueOnce(new Error('Database error'));
      console.error = vi.fn(); // Mock console.error

      await createApiKey(mockRequest, mockReply);

      expect(console.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Failed to create API key' });
    });
  });

  describe('listApiKeys', () => {
    const mockKeys = [
      { _id: 'key1', name: 'Key 1', owner: 'user123', createdAt: new Date() },
      { _id: 'key2', name: 'Key 2', owner: 'user123', createdAt: new Date() },
    ];

    beforeEach(() => {
      // Setup listApiKeys test
      mockRequest.query = { userId: 'user123' };

      // Mock the ApiKey.find method with proper chaining
      mockSort.mockResolvedValue(mockKeys);
      mockSelect.mockReturnValue({ sort: mockSort });
      mockFind.mockReturnValue({ select: mockSelect });
    });

    it('should list all API keys for a user', async () => {
      await listApiKeys(mockRequest, mockReply);

      expect(mockFind).toHaveBeenCalledWith({ owner: 'user123' });
      expect(mockReply.send).toHaveBeenCalledWith(mockKeys);
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.query = {};

      await listApiKeys(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'userId is required' });
    });

    it('should handle database errors gracefully', async () => {
      mockSort.mockRejectedValueOnce(new Error('Database error'));

      console.error = vi.fn(); // Mock console.error

      await listApiKeys(mockRequest, mockReply);

      expect(console.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Failed to list API keys' });
    });
  });

  describe('revokeApiKey', () => {
    beforeEach(() => {
      // Setup revokeApiKey test
      mockRequest.params = { keyId: 'key123' };

      // Mock the findByIdAndUpdate method
      mockFindByIdAndUpdate.mockResolvedValue({
        _id: 'key123',
        enabled: false,
      });
    });

    it('should revoke an API key', async () => {
      await revokeApiKey(mockRequest, mockReply);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'key123',
        { enabled: false },
        { new: true }
      );

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        message: 'API key revoked successfully',
      });
    });

    it('should return 400 if keyId is missing or invalid', async () => {
      mockRequest.params = {};

      await revokeApiKey(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Valid keyId is required' });
    });

    it('should return 404 if API key is not found', async () => {
      mockFindByIdAndUpdate.mockResolvedValueOnce(null);

      await revokeApiKey(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'API key not found' });
    });

    it('should handle database errors gracefully', async () => {
      mockFindByIdAndUpdate.mockRejectedValueOnce(new Error('Database error'));

      console.error = vi.fn(); // Mock console.error

      await revokeApiKey(mockRequest, mockReply);

      expect(console.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Failed to revoke API key' });
    });
  });
});
