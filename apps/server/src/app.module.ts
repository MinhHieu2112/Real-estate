import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './tenant/tenant.module';
import { ManagerModule } from './manager/manager.module';
import { LeaseModule } from './lease/lease.module';
import { ApplicationModule } from './application/application.module';
import { PropertyModule } from './property/property.module';
import { LocationModule } from './location/location.module';
import { MessageModule } from './message/message.module';
import { NotifyModule } from './notify/notify.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TenantModule,
    ManagerModule,
    LeaseModule,
    ApplicationModule,
    PropertyModule,
    LocationModule,
    MessageModule,
    NotifyModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
