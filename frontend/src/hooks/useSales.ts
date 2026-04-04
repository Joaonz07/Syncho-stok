import { useState, useEffect, useCallback } from 'react';
import type { Sale, CreateSaleRequest } from '@shared/types';
import { salesApi } from '../services/api';

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salesApi.list();
      setSales(res.data.data);
    } catch {
      setError('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const createSale = useCallback(async (data: CreateSaleRequest) => {
    const res = await salesApi.create(data);
    setSales((prev) => [res.data.data, ...prev]);
    return res.data.data;
  }, []);

  return { sales, loading, error, refetch: fetchSales, createSale };
}
