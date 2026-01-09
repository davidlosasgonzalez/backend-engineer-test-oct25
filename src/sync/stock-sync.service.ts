import { Injectable } from '@nestjs/common';
import { ErpClient } from '../clients/erp/erp.client';
import { MakroClient } from '../clients/makro/makro.client';
import { WooClient } from '../clients/woo/woo.client';
import { SyncStateService } from '../state/sync-state.service';
import { ErpProduct, SyncMode } from './types';
import { filterProductsByWorker } from './sharding-helpers';

/**
 * Service responsible for synchronizing stock from ERP to target channels
 */
@Injectable()
export class StockSyncService {
    constructor(
        private readonly erpClient: ErpClient,
        private readonly makroClient: MakroClient,
        private readonly wooClient: WooClient,
        private readonly syncState: SyncStateService,
    ) {}

    /**
     * Generic method to synchronize stock to any channel
     * Uses streaming to process products page by page, reducing memory usage
     * Applies sharding during streaming to distribute work across workers
     * @param channelName - Name of the target channel (e.g., 'makro', 'woo')
     * @param productsMapper - Function to transform ErpProduct to channel-specific update format
     * @param updateFn - Function to send batch updates to the channel
     * @param mode - Sync mode: 'full' or 'incremental'
     * @param batchSize - Number of products per batch update
     * @param totalWorkers - Total number of workers for sharding
     * @param workerId - Current worker ID (0-indexed)
     */
    private async syncToChannel<T>(
        channelName: string,
        productsMapper: (product: ErpProduct) => T,
        updateFn: (batch: T[]) => Promise<void>,
        mode: SyncMode,
        batchSize: number,
        totalWorkers: number,
        workerId: number,
    ): Promise<void> {
        const lastSyncAt =
            mode === 'incremental'
                ? this.syncState.getLastSyncAt(channelName) ?? undefined
                : undefined;

        const productStream = this.erpClient.getAllProducts(1000, lastSyncAt);

        let batch: T[] = [];
        let totalProcessed = 0;
        let totalFromErp = 0;
        let mostRecentUpdatedAt: string | null = null;

        const workerInfo =
            totalWorkers > 1
                ? `Worker ${workerId + 1} of ${totalWorkers}: `
                : '';

        for await (const page of productStream) {
            totalFromErp += page.length;

            const workerProducts = filterProductsByWorker(
                page,
                totalWorkers,
                workerId,
            );

            for (const product of workerProducts) {
                batch.push(productsMapper(product));

                if (mode === 'incremental') {
                    if (
                        !mostRecentUpdatedAt ||
                        product.updated_at > mostRecentUpdatedAt
                    ) {
                        mostRecentUpdatedAt = product.updated_at;
                    }
                }

                if (batch.length >= batchSize) {
                    await updateFn(batch);
                    totalProcessed += batch.length;
                    batch = [];
                }
            }
        }

        if (batch.length > 0) {
            await updateFn(batch);
            totalProcessed += batch.length;
        }

        if (totalProcessed === 0) {
            if (totalWorkers > 1) {
                console.log(
                    `Worker ${workerId + 1} of ${totalWorkers}: No products assigned`,
                );
            } else {
                console.log('No products to sync');
            }
            return;
        }

        const batches = Math.ceil(totalProcessed / batchSize);
        console.log(
            `${workerInfo}Found ${totalFromErp} products from ERP, processed ${totalProcessed} products in ${batches} batch(es)`,
        );

        if (mode === 'incremental' && mostRecentUpdatedAt) {
            this.syncState.recordSyncUpdate(channelName, mostRecentUpdatedAt);
        }
    }

    /**
     * Synchronizes stock from ERP to Makro
     * @param mode - Sync mode: 'full' or 'incremental'
     * @param batchSize - Number of products per batch
     * @param totalWorkers - Total number of workers for sharding
     * @param workerId - Current worker ID (0-indexed)
     */
    async syncToMakro(
        mode: SyncMode = 'full',
        batchSize: number = 100,
        totalWorkers: number = 1,
        workerId: number = 0,
    ): Promise<void> {
        await this.syncToChannel(
            'makro',
            (product) => ({
                product_id: product.sku, // Makro uses SKU as product_id
                quantity: product.stock.quantity,
            }),
            (batch) => this.makroClient.updateStockBatch(batch),
            mode,
            batchSize,
            totalWorkers,
            workerId,
        );
    }

    /**
     * Synchronizes stock from ERP to WooCommerce
     * @param mode - Sync mode: 'full' or 'incremental'
     * @param batchSize - Number of products per batch
     * @param totalWorkers - Total number of workers for sharding
     * @param workerId - Current worker ID (0-indexed)
     */
    async syncToWoo(
        mode: SyncMode = 'full',
        batchSize: number = 100,
        totalWorkers: number = 1,
        workerId: number = 0,
    ): Promise<void> {
        await this.syncToChannel(
            'woo',
            (product) => ({
                product_id: product.id, // WooCommerce uses ERP product ID
                stock_quantity: product.stock.quantity,
            }),
            (batch) => this.wooClient.updateStockBulk(batch),
            mode,
            batchSize,
            totalWorkers,
            workerId,
        );
    }
}
