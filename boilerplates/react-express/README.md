# React + Express Boilerplate

This is a full-stack boilerplate with React (TypeScript) frontend and Express.js backend, with pre-configured connectivity between the two.

## Pre-Configured Frontend-Backend Connectivity

This boilerplate comes with pre-configured connectivity between the React frontend and Express backend:

- **API Proxy**: The Vite development server is configured to proxy all `/api` requests to the Express backend automatically
- **CORS Support**: The Express backend is configured with CORS to allow cross-origin requests during development
- **Demo API Endpoints**: Several sample API endpoints are implemented in the Express server
- **Demo Components**: The React frontend includes example components that demonstrate API connectivity

This means you can start developing your full-stack application without worrying about setting up the communication between frontend and backend.

## Supported Technology Stacks

Our platform supports various combinations of frontend and backend technologies:

### Frontend Options
- **React** - A JavaScript library for building user interfaces
- **Next.js** - React framework with SSR capabilities
- **Vue.js** - Progressive JavaScript framework 
- **Angular** - Platform for building mobile and desktop web apps
- **Svelte** - Compiler-based framework for building UIs

### Backend Options
- **Express.js** - Fast, unopinionated, minimalist web framework for Node.js
- **Fastify** - Fast and low overhead web framework for Node.js
- **NestJS** - Progressive Node.js framework for building server-side applications
- **Django** - High-level Python web framework
- **Laravel** - PHP web application framework

### Features
- TypeScript integration
- ESLint configuration
- Tailwind CSS setup
- Testing frameworks
- State management solutions

## Getting Started

This boilerplate includes two main folders:
- `frontend/` - A React application built with Vite and TypeScript
- `backend/` - An Express.js API server

### Installation

1. **Setup the Backend**
   ```bash
   cd backend
   npm install
   node index.js
   ```
   The backend will run on port 3000 by default.

2. **Setup the Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The frontend will run on port 5173 by default.

> **Note about TypeScript Errors**: If you see TypeScript errors in your editor before running `npm install`, this is normal. These errors will disappear once dependencies are installed, as the type definitions will become available.

### How the Connectivity Works

1. **API Requests**: The frontend can make API calls to the backend using relative URLs (e.g., `/api/status`). Vite's development server will automatically proxy these requests to the backend.

2. **CORS Configuration**: The Express backend is configured to accept requests from the frontend during development.

3. **Demo Endpoints**: The boilerplate includes several example API endpoints:
   - `GET /api` - Returns a simple greeting message
   - `GET /api/status` - Returns the current status and timestamp
   - `POST /api/echo` - Echoes back any data sent to it

### Why are node_modules not included?

The `node_modules` directories are intentionally excluded from this boilerplate to:
- Reduce the download size significantly
- Avoid platform-specific binaries that may not work on your system
- Follow best practices for distributing code templates

### Next Steps

Once you have both services running:
1. The frontend will be available at: http://localhost:5173
2. The backend API will be available at: http://localhost:3000

You can start building your application by:
- Adding components to the React frontend
- Creating new API endpoints in the Express backend
- Connecting a database to the backend
- Adding authentication

## Technology Compatibility

Not all frontend and backend combinations are equally compatible. Our platform recommends combinations that are known to work well together based on industry best practices and common usage patterns. For example:

- **React** works well with Express.js, Fastify, and NestJS
- **Next.js** is best paired with Express.js or NestJS
- **Vue.js** pairs nicely with Express.js, Fastify, or NestJS
- **Angular** is most compatible with Express.js and NestJS
- **Svelte** works well with Express.js and Fastify

Different combinations may require different integration approaches. Refer to the individual technology documentation for specific integration guidance.