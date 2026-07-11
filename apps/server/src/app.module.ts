import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TenantModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
