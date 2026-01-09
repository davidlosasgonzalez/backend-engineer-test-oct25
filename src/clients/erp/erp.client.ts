import { ErpProduct, ErpProductsResponse } from '../../sync/types';

/**
 * Client for interacting with the ERP system API
 */
export class ErpClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl =
            baseUrl ??
            'https://stoplight.io/mocks/greenvase/greenvase-test/152899748';
    }

    /**
     * Fetches all products from the ERP by paginating through all pages
     * @param limit - Number of products per page (1-1000). Defaults to 1000
     * @param updatedAfter - Optional ISO date string to filter products updated after this date
     */
    async getAllProducts(
        limit: number = 1000,
        updatedAfter?: string,
    ): Promise<ErpProduct[]> {
        const allProducts: ErpProduct[] = [];
        let page: number = 0;
        let totalPages: number = 0;

        do {
            let url = `${this.baseUrl}/products?page=${page}&limit=${limit}`;
            if (updatedAfter) {
                url += `&updated_after=${updatedAfter}`;
            }

            const res: Response = await fetch(url);

            if (!res.ok) {
                throw new Error(
                    `ERP API error: HTTP ${res.status}. URL: ${url}`,
                );
            }

            const body = (await res.json()) as ErpProductsResponse;
            allProducts.push(...body.data);

            totalPages = body.pagination.total_pages;
            page++;
        } while (page < totalPages);

        return allProducts;
    }
}
