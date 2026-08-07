import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  imports: [RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly displayName = computed(() => this.user()?.fullName?.trim() || '—');
  readonly email = computed(() => this.user()?.email?.trim() || '—');
  readonly mobile = computed(() => this.user()?.mobile?.trim() || '—');
}
