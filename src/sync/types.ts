// ERP product shape used by both the ERP client and the sync service
export interface ErpProduct {
    id: number;
    name: string;
    sku: string;
    price: number;
    category_id: number;
    stock: StockInfo;
    created_at: string;
    updated_at: string;
}

export interface StockInfo {
    product_id: number;
    quantity: number;
    reserved_quantity: number;
    last_updated: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export interface ErpProductsResponse {
    data: ErpProduct[];
    pagination: Pagination;
    total: number;
}

export type SyncTarget = 'makro' | 'woo';
export type SyncMode = 'full' | 'incremental';
