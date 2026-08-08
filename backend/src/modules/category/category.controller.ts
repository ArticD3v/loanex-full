import { randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { jsonDb } from '../../config/json-db';
import { authenticate } from '../../common/middleware/authenticate';
import { requirePermission } from '../../common/middleware/require-permission';
import { asyncHandler } from '../../common/utils/async-handler';

export const categoryRouter = Router();

function mapCategory(cat: any, productCount = 0) {
  return {
    id: cat.id,
    name: cat.name,
    parentId: cat.parentId ?? null,
    description: cat.description || '',
    icon: cat.icon || '',
    color: cat.color || '',
    bgColor: cat.bgColor || '',
    status: cat.status || 'active',
    sortOrder: Number(cat.sortOrder ?? 0),
    productCount,
    createdAt: cat.createdAt,
  };
}

function countProductsForCategory(categoryId: string, categoryName: string): number {
  return jsonDb
    .getCollection('products')
    .filter((p: any) => {
      if (p.status && p.status !== 'active') return false;
      if (p.categoryId && p.categoryId === categoryId) return true;
      if (p.category && String(p.category).toLowerCase() === categoryName.toLowerCase()) return true;
      return false;
    }).length;
}

// GET /api/v1/categories - List all categories
categoryRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = jsonDb
      .getCollection('categories')
      .slice()
      .sort(
        (a: any, b: any) =>
          Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
          String(a.name || '').localeCompare(String(b.name || '')),
      );

    return res.json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories.map((cat: any) =>
        mapCategory(cat, countProductsForCategory(cat.id, cat.name)),
      ),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/categories - Create new category
categoryRouter.post(
  '/',
  authenticate,
  requirePermission('products.create'),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, icon, color, bgColor, status, sortOrder, parentId } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const parent = parentId ? jsonDb.findOne('categories', { id: parentId }) : null;
    if (parentId && !parent) {
      return res.status(400).json({
        success: false,
        message: 'Parent category not found',
      });
    }

    const existing = jsonDb
      .getCollection('categories')
      .find((c: any) => String(c.name || '').toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Category already exists',
        data: mapCategory(existing, countProductsForCategory(existing.id, existing.name)),
      });
    }

    const category = await jsonDb.insertAwaited('categories', {
      id: randomUUID(),
      name: name.trim(),
      parentId: parentId || null,
      description: description?.trim() || '',
      icon: icon?.trim() || '',
      color: color?.trim() || '',
      bgColor: bgColor?.trim() || '',
      status: status || 'active',
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: mapCategory(category, 0),
    });
  } catch (error) {
    next(error);
  }
}));

// GET /api/v1/categories/:id - Get a single category
categoryRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = jsonDb.findOne('categories', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    return res.json({
      success: true,
      message: 'Category fetched successfully',
      data: mapCategory(existing, countProductsForCategory(existing.id, existing.name)),
    });
  }),
);

// PUT /api/v1/categories/:id - Update category
categoryRouter.put(
  '/:id',
  authenticate,
  requirePermission('products.edit'),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, bgColor, status, sortOrder, parentId } = req.body;

    const existing = jsonDb.findOne('categories', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (parentId === id) {
      return res.status(400).json({
        success: false,
        message: 'A category cannot be its own parent',
      });
    }

    const updated = await jsonDb.updateAwaited(
      'categories',
      { id },
      {
        name: name ? name.trim() : existing.name,
        parentId: parentId !== undefined ? (parentId || null) : existing.parentId ?? null,
        description: description !== undefined ? description : existing.description,
        icon: icon !== undefined ? icon : existing.icon,
        color: color !== undefined ? color : existing.color,
        bgColor: bgColor !== undefined ? bgColor : existing.bgColor,
        status: status !== undefined ? status : existing.status,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      },
    );

    return res.json({
      success: true,
      message: 'Category updated successfully',
      data: mapCategory(updated, countProductsForCategory(updated.id, updated.name)),
    });
  } catch (error) {
    next(error);
  }
}));

// DELETE /api/v1/categories/:id - Delete category
categoryRouter.delete(
  '/:id',
  authenticate,
  requirePermission('products.delete'),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = jsonDb.findOne('categories', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const children = jsonDb.findMany('categories', { parentId: id });
    if (children.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category has subcategories. Delete subcategories first.',
      });
    }

    jsonDb.delete('categories', { id });

    return res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}));
