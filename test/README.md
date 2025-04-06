# Testing in StackGen Backend

This project uses Vitest for unit and integration testing, along with Supertest for HTTP testing.

## Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

- `test/controllers/` - Tests for controller functions
- `test/routes/` - API integration tests using Supertest
- `test/utils/` - Tests for utility functions
- `test/setup.ts` - Global test setup and mock configurations

## Mocking Dependencies

For tests, we mock the following external dependencies:

- MongoDB (User model) - Mock functions for database operations
- Redis - Mock functions for caching operations
- Sentry - Mock functions for error reporting

## Example Tests

- Unit tests for controllers (`authController.test.ts`)
- API integration tests (`auth.test.ts`)
- Redis utility tests (`redis.test.ts`)
- Server ping test (`server.test.ts`)

## Adding New Tests

When adding new tests:

1. Follow the existing patterns for unit or integration tests
2. Use mocks for external dependencies
3. Make sure to write tests for both success and error scenarios
4. For API tests, use Supertest with the test server
