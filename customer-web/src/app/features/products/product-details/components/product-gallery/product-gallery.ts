import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { ProductImage } from '../../../models/product-details.models';

@Component({
  selector: 'app-product-gallery',
  imports: [NgStyle],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGalleryComponent {
  readonly images = input.required<ProductImage[]>();
  readonly productName = input.required<string>();

  readonly activeIndex = signal(0);
  readonly zoomStyle = signal<Record<string, string>>({});

  readonly visibleThumbs = computed(() => this.images().slice(0, 4));
  readonly hiddenCount = computed(() => Math.max(this.images().length - 4, 0));
  readonly activeImage = computed(() => {
    const list = this.images();
    return list[this.activeIndex()] ?? list[0];
  });

  constructor() {
    effect(() => {
      const list = this.images();
      void list;
      this.activeIndex.set(0);
      this.zoomStyle.set({});
    });
  }

  selectImage(index: number): void {
    this.activeIndex.set(index);
    this.zoomStyle.set({});
  }

  onZoomMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    this.zoomStyle.set({
      transform: 'scale(1.55)',
      'transform-origin': `${x}% ${y}%`,
    });
  }

  onZoomLeave(): void {
    this.zoomStyle.set({});
  }
}
