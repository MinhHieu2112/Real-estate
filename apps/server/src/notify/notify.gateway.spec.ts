import { Test, TestingModule } from '@nestjs/testing';
import { NotifyGateway } from './notify.gateway';
import { NotifyService } from './notify.service';

describe('NotifyGateway', () => {
  let gateway: NotifyGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotifyGateway, NotifyService],
    }).compile();

    gateway = module.get<NotifyGateway>(NotifyGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
