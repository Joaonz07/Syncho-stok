import { useState, useEffect, useCallback } from 'react';
import type { Product, CreateProductRequest, UpdateProductRequest } from '@shared/types';
import { productsApi } from '../services/api';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsApi.list();
      setProducts(res.data.data);
    } catch {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(async (data: CreateProductRequest) => {
    const res = await productsApi.create(data);
    setProducts((prev) => [...prev, res.data.data]);
    return res.data.data;
  }, []);

  const updateProduct = useCallback(async (id: string, data: UpdateProductRequest) => {
    const res = await productsApi.update(id, data);
    setProducts((prev) => prev.map((p) => (p.id === id ? res.data.data : p)));
    return res.data.data;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await productsApi.delete(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
