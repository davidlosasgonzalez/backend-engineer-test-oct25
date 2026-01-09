export interface MakroStockUpdate {
    product_id: string;
    quantity: number;
}

export interface MakroBatchStockUpdate {
    updates: MakroStockUpdate[];
}
