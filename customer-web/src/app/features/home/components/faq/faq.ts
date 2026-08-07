import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { FAQ_ITEMS } from '../../data/home-sections-mock.data';

@Component({
  selector: 'app-faq',
  imports: [RouterLink, Accordion, AccordionPanel, AccordionHeader, AccordionContent],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Faq {
  readonly items = signal(FAQ_ITEMS);
  readonly activeValue = signal<string | number | null>('0');

  stepLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
