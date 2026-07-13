import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './tenant/tenant.module';
import { ManagerModule } from './manager/manager.module';
import { LeaseModule } from './lease/lease.module';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    ManagerModule,
    LeaseModule,
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
