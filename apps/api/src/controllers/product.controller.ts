import type { Request, Response } from 'express';

import {
  createProductSchema,
  productParamSchema,
  productQuerySchema,
  productReadScopeQuerySchema,
  updateProductSchema,
} from '../schemas/product.schema.js';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from '../services/product.service.js';
import { getAuthUserOrThrow } from '../utils/auth-user.js';

export async function listProductsHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const query = productQuerySchema.parse(req.query);
  const result = await listProducts(authUser, query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getProductByIdHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { productId } = productParamSchema.parse(req.params);
  const query = productReadScopeQuerySchema.parse(req.query);
  const data = await getProductById(authUser, productId, query.companyId);

  res.status(200).json({ data });
}

export async function createProductHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const payload = createProductSchema.parse(req.body);
  const data = await createProduct(authUser, payload);

  res.status(201).json({ data });
}

export async function updateProductHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { productId } = productParamSchema.parse(req.params);
  const payload = updateProductSchema.parse(req.body);
  const data = await updateProduct(authUser, productId, payload);

  res.status(200).json({ data });
}

export async function deleteProductHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { productId } = productParamSchema.parse(req.params);
  await deleteProduct(authUser, productId);

  res.status(200).json({
    data: {
      ok: true,
    },
  });
}
