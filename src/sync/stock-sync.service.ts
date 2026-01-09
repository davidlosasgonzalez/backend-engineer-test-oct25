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
        let products: ErpProduct[];
        if (mode === 'incremental') {
            const lastSyncAt = this.syncState.getLastSyncAt(channelName);
            products = lastSyncAt
                ? await this.erpClient.getAllProducts(1000, lastSyncAt)
                : await this.erpClient.getAllProducts();
        } else {
            products = await this.erpClient.getAllProducts();
        }

        const totalProductsFromErp = products.length;
        products = filterProductsByWorker(products, totalWorkers, workerId);

        if (products.length === 0) {
            if (totalWorkers > 1) {
                console.log(
                    `Worker ${workerId + 1} of ${totalWorkers}: No products assigned`,
                );
            } else {
                console.log('No products to sync');
            }
            return;
        }

        const workerInfo =
            totalWorkers > 1
                ? `Worker ${workerId + 1} of ${totalWorkers}: `
                : '';
        console.log(
            `${workerInfo}Found ${totalProductsFromErp} products from ERP, processing ${products.length} products`,
        );

        const updates: T[] = products.map(productsMapper);

        const batches = Math.ceil(updates.length / batchSize);
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await updateFn(batch);
        }

        console.log(
            `${workerInfo}Updated ${products.length} products in ${batches} batch(es)`,
        );

        if (mode === 'incremental') {
            this.syncState.recordSyncBatch(
                channelName,
                products.map((product) => ({
                    sku: product.sku,
                    lastUpdatedAt: product.updated_at,
                })),
            );
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
