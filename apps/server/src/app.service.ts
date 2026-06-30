import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  getDbHost() {
    return this.configService.get('DB_HOST');
  }
}
