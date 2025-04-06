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