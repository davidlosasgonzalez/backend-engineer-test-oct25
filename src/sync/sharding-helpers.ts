import { ErpProduct } from './types';

/**
 * Sharding utilities for distributing work across multiple workers
 */
function hashString(sku: string): number {
    let hash = 0;
    for (let i = 0; i < sku.length; i++) {
        const charCode = sku.charCodeAt(i);
        hash = (hash << 5) - hash + charCode;
    }
    return Math.abs(hash);
}

/**
 * Determines if a product should be processed by the given worker
 * @param sku - Product SKU
 * @param totalWorkers - Total number of workers
 * @param workerId - Current worker ID (0-indexed)
 */
export function shouldProcessProduct(
    sku: string,
    totalWorkers: number,
    workerId: number,
): boolean {
    const hash = hashString(sku);
    return hash % totalWorkers === workerId;
}

/**
 * Filters products to only those that should be processed by the given worker
 * @param products - Array of products to filter
 * @param totalWorkers - Total number of workers for sharding
 * @param workerId - Current worker ID (0-indexed)
 * @returns Filtered array of products assigned to this worker
 */
export function filterProductsByWorker(
    products: ErpProduct[],
    totalWorkers: number,
    workerId: number,
): ErpProduct[] {
    if (totalWorkers === 1) {
        return products;
    }
    return products.filter((product) =>
        shouldProcessProduct(product.sku, totalWorkers, workerId),
    );
}
