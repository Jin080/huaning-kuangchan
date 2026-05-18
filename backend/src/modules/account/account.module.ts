import { Module } from '@nestjs/common';

import { EnterprisesModule } from '../enterprises/enterprises.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [EnterprisesModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
