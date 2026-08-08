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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TRUST_HIGHLIGHTS } from '../../data/hero-mock.data';
import { BannersApiService, StoreBanner } from '../../services/banners-api.service';

export interface HeroSlideView {
  id: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  image: string;
  bgGradient: string;
  ctaText: string;
  ctaPath: string;
  ctaQueryParams?: Record<string, string>;
  secondaryCtaText: string;
  secondaryCtaPath: string;
}

const HERO_GRADIENTS = [
  'linear-gradient(135deg, #0a2e6f 0%, #1e40af 50%, #3b82f6 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'linear-gradient(135deg, #065f46 0%, #047857 50%, #10b981 100%)',
];

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bannersApi = inject(BannersApiService);

  readonly trust = TRUST_HIGHLIGHTS;
  readonly slides = signal<HeroSlideView[]>([]);
  readonly loading = signal(true);
  readonly activeIndex = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private timerStarted = false;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      this.bannersApi
        .list()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((banners) => {
          const homeBanners = banners.filter((banner) => {
            const placement = String(banner.placement || 'home').toLowerCase();
            return placement === 'home' || placement === 'product';
          });
          const source = homeBanners.length > 0 ? homeBanners : banners;
          this.slides.set(source.map((banner, index) => this.toSlide(banner, index)));
          this.loading.set(false);
          this.activeIndex.set(0);
          this.maybeStartTimer();
        });

      this.destroyRef.onDestroy(() => {
        if (this.timer) clearInterval(this.timer);
      });
    });
  }

  setSlide(index: number): void {
    const total = this.slides().length;
    if (total === 0) return;
    this.activeIndex.set(((index % total) + total) % total);
    this.resetTimer();
  }

  nextSlide(): void {
    const total = this.slides().length;
    if (total === 0) return;
    this.activeIndex.update((idx) => (idx + 1) % total);
  }

  prevSlide(): void {
    const total = this.slides().length;
    if (total === 0) return;
    this.activeIndex.update((idx) => (idx - 1 + total) % total);
  }

  private toSlide(banner: StoreBanner, index: number): HeroSlideView {
    const titleParts = this.splitTitle(banner.title);
    const link = banner.link?.trim() || '/products';
    const { path, queryParams } = this.parseLink(link);

    return {
      id: banner.id,
      badge: banner.badgeText || 'LoanEx Offer',
      titleLine1: titleParts[0],
      titleLine2: titleParts[1],
      description: banner.subtitle || 'Shop on easy EMI with instant digital approval.',
      image: banner.imageUrl,
      bgGradient: HERO_GRADIENTS[index % HERO_GRADIENTS.length],
      ctaText: 'Shop Now',
      ctaPath: path,
      ctaQueryParams: queryParams,
      secondaryCtaText: 'Check Eligibility',
      secondaryCtaPath: '/verification',
    };
  }

  private splitTitle(title: string): [string, string] {
    const cleaned = title.trim();
    if (!cleaned) return ['Shop the latest', 'On Easy EMI'];
    const words = cleaned.split(/\s+/);
    if (words.length <= 3) return [cleaned, 'On Easy EMI'];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  private parseLink(link: string): { path: string; queryParams?: Record<string, string> } {
    if (link.startsWith('http://') || link.startsWith('https://')) {
      try {
        const url = new URL(link);
        const queryParams: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
        return {
          path: url.pathname || '/products',
          queryParams: Object.keys(queryParams).length ? queryParams : undefined,
        };
      } catch {
        return { path: '/products' };
      }
    }

    const [pathPart, queryPart] = link.split('?');
    const path = pathPart || '/products';
    if (!queryPart) return { path };

    const queryParams: Record<string, string> = {};
    for (const pair of queryPart.split('&')) {
      const [key, value] = pair.split('=');
      if (key) queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
    return {
      path,
      queryParams: Object.keys(queryParams).length ? queryParams : undefined,
    };
  }

  private maybeStartTimer(): void {
    if (!isPlatformBrowser(this.platformId) || this.timerStarted) return;
    if (this.slides().length <= 1) return;
    this.timerStarted = true;
    this.startTimer();
  }

  private startTimer(): void {
    this.timer = setInterval(() => this.nextSlide(), 5000);
  }

  private resetTimer(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.slides().length > 1) this.startTimer();
  }
}
