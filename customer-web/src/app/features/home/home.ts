import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Categories } from './components/categories/categories';
import { Faq } from './components/faq/faq';
import { Hero } from './components/hero/hero';
import { HowItWorks } from './components/how-it-works/how-it-works';
import { OfferBanner } from './components/offer-banner/offer-banner';
import { PopularProducts } from './components/popular-products/popular-products';
import { WhyChooseUs } from './components/why-choose-us/why-choose-us';

@Component({
  selector: 'app-home',
  imports: [
    Hero,
    Categories,
    PopularProducts,
    HowItWorks,
    OfferBanner,
    WhyChooseUs,
    Faq,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
