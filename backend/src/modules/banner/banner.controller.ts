import { randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { jsonDb } from '../../config/json-db';

export const bannerRouter = Router();

// GET /api/v1/banners - List all active banners
bannerRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = jsonDb
      .findMany('banners', { status: 'active' })
      .sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    return res.json({
      success: true,
      message: 'Banners fetched successfully',
      data: banners.map((b: any) => {
        const sortOrder = Number(b.sort_order ?? b.sortOrder ?? 0);
        const placement =
          b.placement ??
          b.type ??
          (sortOrder >= 20 ? 'product' : sortOrder >= 10 ? 'promotional' : 'home');
        return {
          id: b.id,
          title: b.title ?? '',
          subtitle: b.subtitle ?? '',
          badgeText: b.badgeText ?? b.badge_text ?? '',
          imageUrl: b.image_url ?? b.imageUrl ?? '',
          link: b.link ?? '/',
          placement,
          sortOrder,
          status: b.status ?? 'active',
          createdAt: b.createdAt ?? b.created_at,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/banners - Create banner
bannerRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, subtitle, badgeText, imageUrl, link, sortOrder, placement } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Banner title is required' });
    }
    if (!imageUrl?.trim()) {
      return res.status(400).json({ success: false, message: 'Banner imageUrl is required' });
    }
    const resolvedPlacement = String(placement || 'home').toLowerCase();
    const resolvedSort =
      sortOrder != null
        ? Number(sortOrder)
        : resolvedPlacement === 'promotional'
          ? 10
          : resolvedPlacement === 'product'
            ? 20
            : 0;
    const banner = await jsonDb.insertAwaited('banners', {
      id: randomUUID(),
      title: title.trim(),
      subtitle: subtitle?.trim() ?? '',
      badgeText: badgeText?.trim() ?? '',
      badge_text: badgeText?.trim() ?? '',
      image_url: imageUrl.trim(),
      imageUrl: imageUrl.trim(),
      link: link?.trim() ?? '/',
      placement: resolvedPlacement,
      sort_order: resolvedSort,
      status: 'active',
    });
    return res.status(201).json({
      success: true,
      message: 'Banner created',
      data: {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        badgeText: banner.badgeText ?? banner.badge_text ?? '',
        imageUrl: banner.image_url ?? banner.imageUrl ?? '',
        link: banner.link,
        placement: banner.placement ?? resolvedPlacement,
        sortOrder: banner.sort_order ?? resolvedSort,
        status: banner.status,
        createdAt: banner.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/banners/:id - Delete banner
bannerRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = jsonDb.findOne('banners', { id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    await jsonDb.deleteAwaited('banners', { id });
    return res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
});
