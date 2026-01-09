import { Module } from '@nestjs/common';
import { ErpClient } from './clients/erp/erp.client';
import { MakroClient } from './clients/makro/makro.client';
import { WooClient } from './clients/woo/woo.client';
import { StockSyncService } from './sync/stock-sync.service';
import { SyncStateService } from './state/sync-state.service';

@Module({
    providers: [
        ErpClient,
        MakroClient,
        WooClient,
        StockSyncService,
        SyncStateService,
    ],
})
export class AppModule {}
