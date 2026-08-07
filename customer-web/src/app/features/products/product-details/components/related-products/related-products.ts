import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import { ProductCardComponent } from '../../../../../shared/components/product-card/product-card';
import { ProductCardItem } from '../../../../../shared/models/product-card.model';

@Component({
  selector: 'app-related-products',
  imports: [ProductCardComponent],
  templateUrl: './related-products.html',
  styleUrl: './related-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedProductsComponent {
  readonly products = input.required<ProductCardItem[]>();

  readonly items = linkedSignal(() => this.products().map((item) => ({ ...item })));

  syncWishlist(product: ProductCardItem): void {
    this.items.update((list) =>
      list.map((item) =>
        item.id === product.id ? { ...item, wishlist: !item.wishlist } : item,
      ),
    );
  }
}
