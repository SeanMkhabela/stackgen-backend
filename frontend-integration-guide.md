# Stackgen Backend Integration Guide

This document provides comprehensive instructions for connecting frontend applications to the Stackgen backend API.

## Server Information

- **Base URL**: `http://localhost:3001` (Development) or your production URL
- **API Version**: v1 (implied in endpoints)
- **Content-Type**: `application/json` for all requests and responses

## Authentication

The backend supports two authentication methods:

### 1. JWT Authentication (for user sessions)

- Used for interactive user sessions in the frontend application
- JWT tokens have a limited lifespan and must be refreshed

#### Obtaining a JWT Token

```http
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Success Response (200):
```json
{
  "success": true,
  "message": "Authentication successful",
  "userId": "65f2b9a1e2df639ab1234567",
  "token": "eyJhbGciOiJ..." 
}
```

#### Using JWT Tokens

For authenticated requests, include the token in the Authorization header:

```http
GET /api-keys
Authorization: Bearer eyJhbGciOiJ...
```

### 2. API Key Authentication (for programmatic access)

- Suitable for server-to-server communication
- Does not expire as quickly as JWT tokens
- Can be revoked individually

#### Obtaining an API Key

API keys must be created through the application after authenticating with JWT:

```http
POST /api-keys
Authorization: Bearer eyJhbGciOiJ...
Content-Type: application/json

{
  "name": "My Frontend Integration", 
  "expiresIn": "90d"
}
```

Success Response (201):
```json
{
  "success": true,
  "key": "sk_live_abc123def456...", 
  "keyId": "65f2b9a1e2df639ab1234567",
  "expiresAt": "2023-06-01T00:00:00.000Z"
}
```

**IMPORTANT**: The full API key is only shown once upon creation. Store it securely.

#### Using API Keys

For authenticated requests, include the API key in the X-API-Key header:

```http
GET /generate/react
X-API-Key: sk_live_abc123def456...
```

## Rate Limiting

The API implements rate limiting based on the authentication credentials:

- **Default Limit**: 100 requests per minute per API key or IP address
- **Limit Headers**: Rate limit details are returned in the response headers:
  - `X-RateLimit-Limit`: Total requests allowed in the window
  - `X-RateLimit-Remaining`: Remaining requests in the current window
  - `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Error Handling

The API uses standard HTTP status codes. All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

Common error codes:
- **400**: Bad Request - Invalid input
- **401**: Unauthorized - Authentication required or credentials invalid
- **403**: Forbidden - Valid credentials but insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server-side issue

## CORS Support

The backend includes CORS support for frontend applications with these settings:

- **Allowed Origins**: All origins (`*`)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization
- **Credentials**: Supported

## Core API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Create a new user account |
| `/auth/signin` | POST | Sign in to an existing account |

### API Key Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api-keys` | POST | Create a new API key |
| `/api-keys` | GET | List all API keys for the authenticated user |
| `/api-keys/:keyId` | DELETE | Revoke an API key |

### Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate/:stack` | GET | Download a boilerplate for a specific stack |

### Jobs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/jobs` | Various | Manage generation jobs |

## Request/Response Examples

### 1. Creating a User Account

Request:
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

Response (201):
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "65f2b9a1e2df639ab1234567",
  "token": "eyJhbGciOiJ..."
}
```

### 2. Downloading a Boilerplate

Request:
```http
GET /generate/react
Authorization: Bearer eyJhbGciOiJ...
```

Response: Binary zip file with appropriate headers for download.

## Best Practices

1. **Store the JWT token securely** (e.g., in HttpOnly cookies or secure localStorage) in your frontend application.
   
2. **Implement token refresh** - JWT tokens expire, so refresh them before expiration.

3. **API Keys for server integration** - For server-side integration, use API keys instead of JWT tokens. These are more appropriate for automated, non-user-interactive contexts.

4. **Error handling** - Implement proper error handling in your frontend for all API responses, especially for authentication failures.

5. **Exponential backoff** - When hitting rate limits (429), implement exponential backoff before retrying.

6. **Security** - Never expose API keys in client-side code. They should only be used in server-to-server communication.

## Development vs. Production

1. **Development Mode**:
   - The backend includes special development-only routes and debug information
   - Swagger documentation is available at: `http://localhost:3001/documentation`
   - Dev API keys can be used for rapid testing

2. **Production Mode**:
   - Stricter security measures
   - No debug routes
   - Swagger documentation is disabled by default (unless ENABLE_SWAGGER=true)

## Implementation Examples

### Frontend Authentication Example (React/TypeScript)

```typescript
// api.ts - API client module
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear invalid credentials and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth methods
export const authAPI = {
  signup: (email: string, password: string, name: string) => 
    api.post('/auth/signup', { email, password, name }),
  
  signin: (email: string, password: string) => 
    api.post('/auth/signin', { email, password }),
    
  // Add other auth methods as needed
};

// API Key management
export const apiKeyAPI = {
  create: (name: string, expiresIn: string) => 
    api.post('/api-keys', { name, expiresIn }),
    
  list: () => api.get('/api-keys'),
  
  revoke: (keyId: string) => api.delete(`/api-keys/${keyId}`)
};

// Generation API
export const generateAPI = {
  downloadBoilerplate: (stack: string) => 
    api.get(`/generate/${stack}`, { responseType: 'blob' }),
    
  // Other generation methods
};

export default api;
```

### Server-side API Integration Example (Node.js)

```javascript
// backend-client.js - For server-to-server communication
const axios = require('axios');

class StackgenClient {
  constructor(apiKey, baseUrl = 'http://localhost:3001') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });
    
    // Add retry logic for rate limiting
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client(error.config);
        }
        return Promise.reject(error);
      }
    );
  }
  
  // API methods
  async generateCode(options) {
    try {
      const response = await this.client.post('/generate', options);
      return response.data;
    } catch (error) {
      console.error('Error generating code:', error.response?.data || error.message);
      throw error;
    }
  }
  
  // Add other methods as needed
}

module.exports = StackgenClient;
```

## Troubleshooting

| Problem | Possible Cause | Solution |
|---------|----------------|----------|
| "Authentication required" | Missing or invalid token/API key | Check that you're including the Authorization header with a valid token |
| "Invalid or expired token" | JWT token has expired | Get a new token by signing in again |
| "Rate limit exceeded" | Too many requests in a short period | Implement backoff strategy and consider batching requests |
| CORS errors | Incorrect CORS setup | Check that your frontend domain is allowed or use a proxy in development |

## Need Help?

If you encounter issues integrating with the backend, please check:

1. The API documentation at `/documentation` (development environment)
2. The error response messages for specific guidance
3. Contact the backend team through appropriate channels

---

This document is maintained by the Stackgen Backend Team and was last updated on April 7, 2025.
