import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { LotReviewsModule } from './modules/lot-reviews/lot-reviews.module';
import { AccountModule } from './modules/account/account.module';
import { AuctionClosingModule } from './modules/auction-closing/auction-closing.module';
import { BidsModule } from './modules/bids/bids.module';
import { BlacklistModule } from './modules/blacklist/blacklist.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ContentsModule } from './modules/contents/contents.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { EnterprisesModule } from './modules/enterprises/enterprises.module';
import { LotsModule } from './modules/lots/lots.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PortalModule } from './modules/portal/portal.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { ResultsModule } from './modules/results/results.module';

@Module({
  imports: [
    AuthModule,
    FilesModule,
    HealthModule,
    LoggingModule,
    ContentsModule,
    EnterprisesModule,
    AccountModule,
    DepositsModule,
    LotsModule,
    LotReviewsModule,
    BidsModule,
    AuctionClosingModule,
    ResultsModule,
    ContractsModule,
    RefundsModule,
    BlacklistModule,
    NotificationsModule,
    PortalModule,
  ],
})
export class AppModule {}
