import { Request, Response } from 'express';

import { sendSuccess } from '../../../common/utils/api-response';

import type { ListProductsQuery, ProductIdParam, ProductSlugParam } from '../dto/product.dto';

import { productService } from '../service/product.service';



export class ProductController {

  list = async (req: Request, res: Response) => {

    const data = await productService.list(req.validatedQuery as ListProductsQuery);

    return sendSuccess(res, data, 'Products fetched');

  };



  getById = async (req: Request, res: Response) => {

    const { productId } = req.validatedParams as ProductIdParam;

    const data = await productService.getById(productId);

    return sendSuccess(res, data, 'Product fetched');

  };



  getBySlug = async (req: Request, res: Response) => {
    const { slug } = req.validatedParams as ProductSlugParam;
    const data = await productService.getBySlug(slug);
    return sendSuccess(res, data, 'Product fetched');
  };

  create = async (req: Request, res: Response) => {
    const body = (req as any).validatedBody || req.body;
    const data = await productService.create(body);
    return sendSuccess(res, data, 'Product created successfully');
  };

  update = async (req: Request, res: Response) => {
    const { productId } = req.validatedParams as ProductIdParam;
    const body = req.body; // Since we might not have a specific validator for update yet, we'll use raw body or partial schema
    const data = await productService.update(productId, body);
    return sendSuccess(res, data, 'Product updated successfully');
  };

  remove = async (req: Request, res: Response) => {
    const { productId } = req.validatedParams as ProductIdParam;
    const data = await productService.remove(productId);
    return sendSuccess(res, data, 'Product deleted successfully');
  };
}



export const productController = new ProductController();

