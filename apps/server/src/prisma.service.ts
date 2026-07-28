import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    let connectionString = process.env.DATABASE_URL || '';

    // Convert sslmode=require to sslmode=no-verify in non-prod environments to avoid pg-connection-string strict TLS enforcement
    if (!isProduction && connectionString.includes('sslmode=require')) {
      connectionString = connectionString.replace(
        'sslmode=require',
        'sslmode=no-verify',
      );
    }

    const caFilePath =
      process.env.DB_CA_PATH ||
      path.join(process.cwd(), 'certs/global-bundle.pem');

    const sslConfig =
      isProduction && fs.existsSync(caFilePath)
        ? {
            rejectUnauthorized: true,
            ca: fs.readFileSync(caFilePath).toString(),
          }
        : {
            rejectUnauthorized: false,
          };

    const pool = new Pool({
      connectionString,
      ssl: sslConfig,
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
