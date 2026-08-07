import fs from 'node:fs';
import path from 'node:path';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

export function setupSwagger(app: Express): void {
  const openApiPath = path.resolve(process.cwd(), 'docs', 'openapi.json');
  const document = JSON.parse(fs.readFileSync(openApiPath, 'utf8')) as Record<string, unknown>;

  app.get('/api-docs.json', (_req, res) => {
    res.json(document);
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'LoanEx API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}
