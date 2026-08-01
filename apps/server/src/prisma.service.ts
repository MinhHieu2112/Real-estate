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
    const connectionString = process.env.DATABASE_URL || '';

    const caFilePath =
      process.env.DB_CA_PATH ||
      path.join(__dirname, '../certs/global-bundle.pem');

    const ssl = fs.existsSync(caFilePath)
      ? { rejectUnauthorized: true, ca: fs.readFileSync(caFilePath) }
      : { rejectUnauthorized: false };

    const pool = new Pool({
      connectionString,
      ssl,
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
