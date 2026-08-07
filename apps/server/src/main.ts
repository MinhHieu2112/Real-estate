import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import morgan from 'morgan';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());
  app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
  app.use(morgan('common'));

  // Restrict CORS to configured frontend domain(s)
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization, X-User-Role',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Set up port
  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
}

bootstrap();
