// Mock mongoose before imports
vi.mock('mongoose', () => {
  return {
    Schema: function(definition: Record<string, any>) { return definition; },
    model: vi.fn(),
    models: {
      ApiKey: { 
        findOne: vi.fn().mockImplementation((query) => {
          if (query && query.key === 'test_api_key') {
            return Promise.resolve({
              key: 'test_api_key',
              name: 'Test Key',
              owner: 'user123',
              lastUsed: null,
              save: vi.fn().mockResolvedValue(true)
            });
          } else if (query && query.key === 'invalid_key') {
            return Promise.resolve(null);
          } else {
            return Promise.resolve(null);
          }
        })
      }
    },
    Types: {
      ObjectId: {
        isValid: vi.fn().mockReturnValue(true)
      }
    }
  };
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateApiKey, validateApiKey } from '../../utils/apiKey';
import mongoose from 'mongoose';

describe('API Key Utilities', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate a 48-character hexadecimal string', () => {
      const apiKey = generateApiKey();
      expect(apiKey).toHaveLength(48);
      expect(apiKey).toMatch(/^[0-9a-f]+$/);
    });
    
    it('should generate unique keys on multiple calls', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('validateApiKey middleware', () => {
    // Setup mock request and reply objects
    const mockRequest = {
      headers: {},
      query: {},
      apiKey: undefined
    } as any;
    
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    } as any;

    beforeEach(() => {
      // Reset mocks
      mockRequest.headers = {};
      mockRequest.query = {};
      mockRequest.apiKey = undefined;
      mockReply.status.mockClear();
      mockReply.send.mockClear();
      
      // Reset mongoose.models.ApiKey.findOne mock for each test
      if (mongoose.models.ApiKey) {
        mongoose.models.ApiKey.findOne = vi.fn().mockImplementation((query) => {
          if (query && query.key === 'test_api_key') {
            return Promise.resolve({
              key: 'test_api_key',
              name: 'Test Key',
              owner: 'user123',
              lastUsed: null,
              save: vi.fn().mockResolvedValue(true)
            });
          } else if (query && query.key === 'error_key') {
            return Promise.reject(new Error('Database error'));
          } else {
            return Promise.resolve(null);
          }
        });
      }
    });

    it('should reject requests without an API key', async () => {
      await validateApiKey(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'API key is required' });
    });

    it('should accept valid API key from headers', async () => {
      mockRequest.headers['x-api-key'] = 'test_api_key';
      
      await validateApiKey(mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockRequest.apiKey).toBeDefined();
    });

    it('should accept valid API key from query parameters', async () => {
      mockRequest.query = { api_key: 'test_api_key' } as any;
      
      await validateApiKey(mockRequest, mockReply);
      
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockRequest.apiKey).toBeDefined();
    });

    it('should reject requests with invalid API key', async () => {
      mockRequest.headers['x-api-key'] = 'invalid_key';
      
      await validateApiKey(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid API key' });
    });

    it('should update the lastUsed timestamp on successful validation', async () => {
      mockRequest.headers['x-api-key'] = 'test_api_key';
      
      await validateApiKey(mockRequest, mockReply);
      
      // The mockRequest.apiKey should have a lastUsed property that is a Date
      expect(mockRequest.apiKey.lastUsed).toBeInstanceOf(Date);
      // The save method should have been called
      expect(mockRequest.apiKey.save).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers['x-api-key'] = 'error_key';
      
      console.error = vi.fn(); // Mock console.error
      
      await validateApiKey(mockRequest, mockReply);
      
      expect(console.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ 
        error: 'Internal server error during API key validation' 
      });
    });
  });
}); 