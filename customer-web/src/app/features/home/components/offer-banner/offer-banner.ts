import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { OfferBannerContent } from '../../models/home-sections.models';
import { BannersApiService, StoreBanner } from '../../services/banners-api.service';

@Component({
  selector: 'app-offer-banner',
  imports: [RouterLink],
  templateUrl: './offer-banner.html',
  styleUrl: './offer-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferBanner {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly bannersApi = inject(BannersApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly content = signal<OfferBannerContent | null>(null);
  readonly loading = signal(true);

  // toObservable must be created in an injection context (field initializer),
  // not inside afterNextRender — calling it there throws NG0203.
  private readonly loaded$ = toObservable(this.bannersApi.loaded);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      // Performance: duplicate /banners request.
      // Primary banner request is already loaded on Home by Hero via bannersApi.list().
      // Keep this code commented for easy rollback.
      // this.bannersApi
      //   .list()
      //   .pipe(takeUntilDestroyed(this.destroyRef))
      //   .subscribe((banners) => {
      //     this.applyBanners(banners);
      //   });

      // Reuse banners already loaded into BannersApiService by the Hero request.
      this.loaded$
        .pipe(
          filter((loaded) => loaded),
          take(1),
          map(() => this.bannersApi.banners()),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((banners) => this.applyBanners(banners));
    });
  }

  private applyBanners(banners: StoreBanner[]): void {
    const promotional =
      banners.find(
        (banner) => String(banner.placement || '').toLowerCase() === 'promotional',
      ) ??
      banners.find((banner) => Number(banner.sortOrder) >= 10) ??
      banners[0];

    if (!promotional?.imageUrl) {
      this.content.set(null);
      this.loading.set(false);
      return;
    }

    const titleParts = this.splitTitle(promotional.title);
    const link = promotional.link?.trim() || '/products';
    const path = link.startsWith('http') ? '/products' : link.split('?')[0] || '/products';

    this.content.set({
      titleLine1: titleParts[0],
      titleLine2: titleParts[1],
      description:
        promotional.subtitle ||
        'Unlock exclusive EMI deals and limited-time savings on top brands.',
      ctaLabel: promotional.badgeText || 'Explore Offers',
      ctaPath: path,
      imageSrc: promotional.imageUrl,
      imageAlt: promotional.title || 'LoanEx promotional offer',
    });
    this.loading.set(false);
  }

  private splitTitle(title: string): [string, string] {
    const cleaned = (title || '').trim();
    if (!cleaned) return ['Exciting Offers.', 'Bigger Benefits.'];
    const parts = cleaned
      .split(/[.!?]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts.slice(1).join('. ')];
    const words = cleaned.split(/\s+/);
    if (words.length <= 2) return [cleaned, 'Bigger Benefits.'];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
}
