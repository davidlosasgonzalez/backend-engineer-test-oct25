export interface WooStockUpdate {
    product_id: number;
    stock_quantity: number;
}

export interface WooBulkStockUpdate {
    updates: WooStockUpdate[];
}
