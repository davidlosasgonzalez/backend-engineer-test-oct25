import { ErpProduct, ErpProductsResponse } from '../../sync/types';

/**
 * Client for interacting with the ERP system API
 */
export class ErpClient {
    private readonly baseUrl: string;

    /**
     * @param baseUrl - Optional base URL for the ERP API. Defaults to mock server
     */
    constructor(baseUrl?: string) {
        this.baseUrl =
            baseUrl ??
            'https://stoplight.io/mocks/greenvase/greenvase-test/152899748';
    }

    /**
     * Fetches a paginated list of products from the ERP
     * @param page - Page number (0-indexed)
     * @param limit - Number of products per page (1-1000)
     * @returns Paginated response with products
     */
    async getProducts(page: number = 0, limit: number = 100): Promise<ErpProductsResponse> {
        if (page < 0) {
            throw new Error('Page must be >= 0');
        }
        if (limit < 1 || limit > 1000) {
            throw new Error('Limit must be between 1 and 1000');
        }

        const url = new URL(`${this.baseUrl}/products`);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('limit', limit.toString());

        const res: Response = await fetch(url.toString());

        if (!res.ok) {
            throw new Error(
                `ERP API error: HTTP ${res.status}. URL: ${url.toString()}`,
            );
        }

        const data = (await res.json()) as ErpProductsResponse;
        return data;
    }

    /**
     * Fetches all products from the ERP by paginating through all pages
     * @param limit - Number of products per page (1-1000). Defaults to 1000 for efficiency
     * @returns Array of all products
     */
    async getAllProducts(limit: number = 1000): Promise<ErpProduct[]> {
        const allProducts: ErpProduct[] = [];
        let page: number = 0;
        let hasMore: boolean = true;

        while (hasMore) {
            const res: ErpProductsResponse = await this.getProducts(page, limit);
            allProducts.push(...res.data);

            hasMore = page + 1 < res.pagination.total_pages;
            page++;
        }
        return allProducts;
    }
}
