# StackGen Backend

## Testing Sentry Integration

To test if Sentry is working correctly:

1. Make sure your `.env` file has a valid Sentry DSN:
   ```
   SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
   ```

2. Start the server:
   ```
   npx tsx index.ts
   ```

3. Trigger a test error by visiting or making a request to:
   ```
   http://localhost:3001/test-sentry
   ```

4. Check your Sentry dashboard at https://sentry.io/
   - You should see a new error event with the message "Test error for Sentry"
   - The dashboard will show details about the error including the stack trace

5. Sentry is working properly if:
   - The error appears in your Sentry dashboard
   - You can see detailed information about the error
   - User context, tags, and other metadata are included

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Workflows

1. **Pull Request Checks** (`.github/workflows/pull-request.yml`)
   - Runs tests and linting on all pull requests to the main branch
   - Blocks merging if tests or linting fail

2. **Continuous Integration** (`.github/workflows/ci.yml`)
   - Runs on both pull requests and pushes to main
   - Tests code with multiple Node.js versions (18.x and 20.x)
   - Uploads test results as artifacts

3. **Deployment** (`.github/workflows/deploy.yml`)
   - Triggered after successful merge to main
   - Runs tests again to ensure quality
   - Deploys code to your production environment

4. **Branch Protection** (`.github/workflows/branch-protection.yml`)
   - Sets up GitHub branch protection rules automatically
   - Requires passing CI checks before merging
   - Requires code review approval

### Running Tests Locally

Before pushing changes, run tests locally to ensure they pass:

```bash
# Run tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Auth System and Testing

The application includes a complete authentication system with:
- User signup and signin endpoints
- Password hashing with bcrypt
- JWT token generation for authenticated sessions

### Auth Endpoints

- `POST /auth/signup`: Create a new user account
  - Body: `{ email: string, password: string }`
  - Returns: Success message or error

- `POST /auth/signin`: Authenticate with credentials
  - Body: `{ email: string, password: string }`
  - Returns: Success message with JWT token or error

### Authentication Testing

The auth system is thoroughly tested with both unit and integration tests:

- **Controller Unit Tests**: Test auth functions in isolation with mocked dependencies
- **Route Integration Tests**: Test the complete HTTP request/response flow

#### Testing Best Practices

Here are the key patterns and fixes implemented in the auth tests:

1. **Proper Mock Implementation for Mongoose Models**:
   ```typescript
   // Create a proper constructor function for the User model
   const UserMock = function(this: any, data: any) {
     Object.assign(this, data);
     this.save = SaveMock; // Mock the save method on each instance
     return this;
   };
   
   // Add static methods to the constructor
   return {
     User: Object.assign(UserMock, {
       findOne: vi.fn() // Add static methods like findOne
     })
   };
   ```

2. **Correctly Mocking CommonJS Modules (bcrypt)**:
   ```typescript
   vi.mock('bcrypt', () => {
     const mockHash = vi.fn().mockResolvedValue('hashed_password');
     const mockCompare = vi.fn().mockResolvedValue(true);
     
     return {
       __esModule: true, // Important for CommonJS modules
       default: {
         hash: mockHash,
         compare: mockCompare
       },
       hash: mockHash,
       compare: mockCompare
     };
   });
   ```

3. **Robust HTTP Response Handling**:
   ```typescript
   // Separate status and send calls for better testability
   if (!user) {
     reply.status(404);
     return reply.send({ error: 'User not found' });
   }
   ```

4. **Proper Method Chaining in Mocks**:
   ```typescript
   mockReply = {
     send: vi.fn().mockReturnThis(),
     status: vi.fn().mockReturnThis()
   };
   ```

5. **Explicit Mock Resetting**:
   ```typescript
   beforeEach(() => {
     // Reset all mocks between tests
     vi.resetAllMocks();
     
     // Set default behaviors for commonly used mocks
     vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true));
     vi.mocked(jwt.signToken).mockReturnValue('test_token');
   });
   ```

#### Running Auth Tests

To run the auth tests:

```bash
# Run all tests
npx vitest run

# Run just the auth controller tests
npx vitest run test/controllers/authController.test.ts

# Run the auth route tests  
npx vitest run test/routes/auth.test.ts
```

## Redis Setup (Optional)

Redis is used for caching but is optional - the application will work without it.

### Option 1: Docker (Recommended)

The easiest way to run Redis locally is with Docker:

```
docker run --name stackgen-redis -p 6379:6379 -d redis
```

### Option 2: Installing Redis Locally

#### Windows:
1. Use Windows Subsystem for Linux (WSL) or
2. Download and install [Redis Stack](https://redis.io/download/)

#### Mac:
```
brew install redis
brew services start redis
```

#### Linux:
```
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

### Option 3: Cloud Redis

You can use a managed Redis service:
- [Upstash](https://upstash.com/) (Free tier available)
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)

Update your `.env` file with the connection string:
```
REDIS_URL=redis://username:password@host:port
```

### Testing Redis

To test if Redis is working correctly:
1. Start the server: `npx tsx index.ts`
2. Visit: `http://localhost:3001/test-redis`
3. If Redis is working, you'll see a success message
4. If Redis is not available, the server will continue to work without caching

## Troubleshooting

- If errors aren't showing up in Sentry:
  - Verify your DSN is correct
  - Make sure the server is running with the proper environment
  - Check that your Sentry project is configured correctly
  
- If Redis won't connect:
  - Verify Redis is running (`redis-cli ping` should return `PONG`)
  - Check your REDIS_URL in the `.env` file
  - The application will continue to work without Redis 