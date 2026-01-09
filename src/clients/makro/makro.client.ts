import { MakroBatchStockUpdate, MakroStockUpdate } from './types';

/**
 * Client for interacting with the Makro marketplace API
 */
export class MakroClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl =
            baseUrl ??
            'https://stoplight.io/mocks/greenvase/greenvase-test/1322555588';
    }

    /**
     * Updates stock for multiple products in a single batch request
     */
    async updateStockBatch(updates: MakroStockUpdate[]): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        const payload: MakroBatchStockUpdate = { updates };

        const res: Response = await fetch(
            `${this.baseUrl}/products/batch-stock`,
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
                `Makro API error: HTTP ${res.status}. URL: ${this.baseUrl}/products/batch-stock`,
            );
        }
    }
}
