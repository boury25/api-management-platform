import { Request } from 'express';
import { PaginationMeta } from './apiResponse';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export function parsePagination(req: Request): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseSort(req: Request, allowedFields: string[], defaultField = 'createdAt'): SortOptions {
  const field = req.query.sortBy as string;
  const order = (req.query.order as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!field || !allowedFields.includes(field)) {
    return { field: defaultField, order };
  }

  return { field, order };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
