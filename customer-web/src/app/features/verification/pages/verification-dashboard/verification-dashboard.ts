import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ProgressBar } from 'primeng/progressbar';
import { VerificationStepCardComponent } from '../../components/verification-step-card/verification-step-card';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-verification-dashboard',
  imports: [ProgressBar, VerificationStepCardComponent],
  templateUrl: './verification-dashboard.html',
  styleUrl: './verification-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationDashboard implements OnInit {
  private readonly verification = inject(VerificationService);

  readonly loading = this.verification.loading;
  readonly error = this.verification.error;
  readonly status = this.verification.status;
  readonly reloadTick = signal(0);

  readonly steps = computed(() => {
    this.reloadTick();
    const current = this.status();
    return current ? this.verification.buildStepCards(current) : [];
  });

  readonly trustBadges = [
    { icon: 'pi pi-shield', label: 'Secure' },
    { icon: 'pi pi-lock', label: 'Encrypted' },
    { icon: 'pi pi-verified', label: 'RBI Guidelines' },
    { icon: 'pi pi-bolt', label: 'Quick Approval' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.verification.getStatus().subscribe({
      next: () => this.reloadTick.update((n) => n + 1),
      error: () => undefined,
    });
  }
}
