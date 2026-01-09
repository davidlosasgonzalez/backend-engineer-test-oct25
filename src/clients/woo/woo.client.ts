import { WooBulkStockUpdate, WooStockUpdate } from './types';

/**
 * Client for interacting with the WooCommerce API
 */
export class WooClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl =
            baseUrl ??
            'https://stoplight.io/mocks/greenvase/greenvase-test/1322555590';
    }

    /**
     * Updates stock for multiple products in a single bulk request
     */
    async updateStockBulk(updates: WooStockUpdate[]): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        const payload: WooBulkStockUpdate = { updates };

        const res: Response = await fetch(
            `${this.baseUrl}/products/bulk-stock`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            },
        );

        if (!res.ok) {
            throw new Error(
                `WooCommerce API error: HTTP ${res.status}. URL: ${this.baseUrl}/products/bulk-stock`,
            );
        }
    }
}
