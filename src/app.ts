// Express application setup
import express, { Application } from 'express';
import path from 'path';
import { requestIdMiddleware } from './middleware/request-id';
import { requestLoggerMiddleware } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import healthRouter from './routes/health';
import statusRouter from './routes/api/status';
import rolesRouter from './routes/api/roles';
import usersRouter from './routes/api/users';
import authRouter from './routes/api/auth';
import modulesRouter from './routes/api/modules';
import accessRulesRouter from './routes/api/access-rules';
import navigationRouter from './routes/api/navigation';
import clientsRouter from './routes/api/clients';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static frontend
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Request ID and logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Routes
  app.use('/health', healthRouter);
  app.use('/api/status', statusRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/modules', modulesRouter);
  app.use('/api/access-rules', accessRulesRouter);
  app.use('/api/navigation', navigationRouter);
  app.use('/api/clients', clientsRouter);

  // Root endpoint - Home page
  app.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>App Factory Suite</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e94560;
          }
          .container { text-align: center; animation: fadeIn 1s ease-in; }
          h1 { font-size: 5rem; font-weight: 900; letter-spacing: 0.3rem; text-shadow: 4px 4px 8px rgba(0,0,0,0.3); margin-bottom: 1rem; }
          .subtitle { font-size: 1.5rem; opacity: 0.9; margin-bottom: 3rem; color: #fff; }
          .links { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
          .link { padding: 0.75rem 1.5rem; background: rgba(233,69,96,0.2); border: 2px solid rgba(233,69,96,0.4); border-radius: 8px; color: #fff; text-decoration: none; font-weight: 600; transition: all 0.3s ease; }
          .link:hover { background: rgba(233,69,96,0.4); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>App Factory</h1>
          <p class="subtitle">AI-First Business Application Platform</p>
          <div class="links">
            <a href="/health" class="link">Health Check</a>
            <a href="/api/status" class="link">API Status</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
