import { Injectable } from '@nestjs/common';
import { ErpClient } from '../clients/erp/erp.client';
import { MakroClient } from '../clients/makro/makro.client';
import { WooClient } from '../clients/woo/woo.client';
import { ErpProduct } from './types';
import { MakroStockUpdate } from '../clients/makro/types';
import { WooStockUpdate } from '../clients/woo/types';

/**
 * Service responsible for synchronizing stock from ERP to target channels
 */
@Injectable()
export class StockSyncService {
    constructor(
        private readonly erpClient: ErpClient,
        private readonly makroClient: MakroClient,
        private readonly wooClient: WooClient,
    ) {}

    /**
     * Synchronizes stock from ERP to Makro
     * @param batchSize - Number of products to update per batch request
     */
    async syncToMakro(batchSize: number = 100): Promise<void> {
        const products: ErpProduct[] = await this.erpClient.getAllProducts();

        const updates: MakroStockUpdate[] = products.map((product) => ({
            product_id: product.sku, // Using SKU as product_id in Makro
            quantity: product.stock.quantity,
        }));

        // Process in batches
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await this.makroClient.updateStockBatch(batch);
        }
    }

    /**
     * Synchronizes stock from ERP to WooCommerce
     * @param batchSize - Number of products to update per batch request
     */
    async syncToWoo(batchSize: number = 100): Promise<void> {
        const products: ErpProduct[] = await this.erpClient.getAllProducts();

        const updates: WooStockUpdate[] = products.map((product) => ({
            product_id: product.id, // Using ERP product ID as WooCommerce product_id
            stock_quantity: product.stock.quantity,
        }));

        // Process in batches
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await this.wooClient.updateStockBulk(batch);
        }
    }
}
