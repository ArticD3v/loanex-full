import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { EmiPlanSelectionService } from '../../../emi/services/emi-plan-selection.service';
import { CheckoutIntentService } from '../../services/checkout-intent.service';
import {
  Gender,
  ProfileService,
  UpsertProfileRequest,
} from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

@Component({
  selector: 'app-personal-details',
  imports: [ReactiveFormsModule],
  templateUrl: './personal-details.html',
  styleUrl: './personal-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalDetailsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileApi = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly emiPlan = inject(EmiPlanSelectionService);
  private readonly checkoutIntent = inject(CheckoutIntentService);
  private readonly auth = inject(AuthService);

  readonly states = INDIAN_STATES;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasProfile = signal(false);

  readonly form = this.fb.nonNullable.group({
    fullName: [{ value: '', disabled: true }],
    mobile: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
    dob: [{ value: '', disabled: true }],
    gender: [{ value: '' as Gender | '', disabled: true }],
    addressLine1: ['', [Validators.required, Validators.maxLength(120)]],
    addressLine2: ['', [Validators.maxLength(200)]],
    landmark: [''],
    city: ['', [Validators.required, Validators.maxLength(80)]],
    state: ['', [Validators.required]],
    pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    country: [{ value: 'India', disabled: true }],
    billingSameAsShipping: [true],
    billingAddressLine1: [''],
    billingAddressLine2: [''],
    billingLandmark: [''],
    billingCity: [''],
    billingState: [''],
    billingPincode: [''],
    billingCountry: [{ value: 'India', disabled: true }],
  });

  ngOnInit(): void {
    this.form.controls.billingSameAsShipping.valueChanges.subscribe((same) => {
      this.syncBillingValidators(Boolean(same));
    });
    this.syncBillingValidators(true);
    this.load();
  }

  goBack(): void {
    const plan = this.emiPlan.get();
    if (plan?.productId) {
      void this.router.navigateByUrl(`/products/${plan.productId}`);
      return;
    }
    this.location.back();
  }

  onPincodeInput(control: 'pincode' | 'billingPincode', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    this.form.controls[control].setValue(value);
    input.value = value;
  }

  saveAndContinue(): void {
    this.form.markAllAsTouched();
    this.syncBillingValidators(this.form.controls.billingSameAsShipping.value);

    if (this.form.invalid) {
      this.error.set('Please correct the highlighted fields.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UpsertProfileRequest = {
      fullName: raw.fullName.trim(),
      email: raw.email.trim(),
      dob: raw.dob,
      gender: raw.gender as Gender,
      address: {
        addressLine1: raw.addressLine1.trim(),
        addressLine2: raw.addressLine2.trim(),
        landmark: raw.landmark.trim() || null,
        city: raw.city.trim(),
        state: raw.state,
        pincode: raw.pincode,
        country: 'India',
      },
      billingSameAsShipping: raw.billingSameAsShipping,
    };

    if (!raw.billingSameAsShipping) {
      payload.billingAddress = {
        addressLine1: raw.billingAddressLine1.trim(),
        addressLine2: raw.billingAddressLine2.trim(),
        landmark: raw.billingLandmark.trim() || null,
        city: raw.billingCity.trim(),
        state: raw.billingState,
        pincode: raw.billingPincode,
        country: 'India',
      };
    }

    this.saving.set(true);
    this.error.set(null);

    const request$ = this.hasProfile()
      ? this.profileApi.update(payload)
      : this.profileApi.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.auth.updateUser({
          fullName: raw.fullName.trim(),
          email: raw.email.trim(),
        });
        const intent = this.checkoutIntent.get();
        // Only follow BUY_NOW intent for its own productId — never fall back to a
        // stale intent while an EMI plan for another product is active.
        if (intent?.mode === 'BUY_NOW' && intent.productId) {
          void this.router.navigate(['/checkout'], {
            queryParams: {
              productId: intent.productId,
              ...(intent.variantId ? { variantId: intent.variantId } : {}),
              quantity: intent.quantity || 1,
            },
          });
          return;
        }
        if (intent?.mode === 'CART') {
          void this.router.navigate(['/checkout'], { queryParams: { mode: 'cart' } });
          return;
        }
        const plan = this.emiPlan.get();
        if (plan?.productId) {
          void this.router.navigate(['/checkout'], {
            queryParams: { productId: plan.productId },
          });
          return;
        }
        void this.router.navigateByUrl('/checkout');
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.profileApi.error() ?? 'Unable to save personal details.');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.profileApi.get().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.hasProfile.set(data.hasProfile);
        this.form.patchValue({
          fullName: data.profile.fullName ?? '',
          mobile: data.profile.mobile ?? '',
          email: data.profile.email ?? '',
          dob: data.profile.dob ?? '',
          gender: data.profile.gender ?? '',
          addressLine1: data.address?.addressLine1 ?? '',
          addressLine2: data.address?.addressLine2 ?? '',
          landmark: data.address?.landmark ?? '',
          city: data.address?.city ?? '',
          state: data.address?.state ?? '',
          pincode: data.address?.pincode ?? '',
          country: data.address?.country ?? 'India',
          billingSameAsShipping: data.billingSameAsShipping,
          billingAddressLine1: data.billingAddress?.addressLine1 ?? '',
          billingAddressLine2: data.billingAddress?.addressLine2 ?? '',
          billingLandmark: data.billingAddress?.landmark ?? '',
          billingCity: data.billingAddress?.city ?? '',
          billingState: data.billingAddress?.state ?? '',
          billingPincode: data.billingAddress?.pincode ?? '',
          billingCountry: data.billingAddress?.country ?? 'India',
        });
        this.syncBillingValidators(data.billingSameAsShipping);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.profileApi.error() ?? 'Unable to load profile.');
      },
    });
  }

  private syncBillingValidators(same: boolean): void {
    const billingControls = [
      this.form.controls.billingAddressLine1,
      this.form.controls.billingAddressLine2,
      this.form.controls.billingCity,
      this.form.controls.billingState,
      this.form.controls.billingPincode,
    ] as const;

    if (same) {
      for (const control of billingControls) {
        control.clearValidators();
        control.updateValueAndValidity({ emitEvent: false });
      }
      return;
    }

    this.form.controls.billingAddressLine1.setValidators([
      Validators.required,
      Validators.maxLength(120),
    ]);
    this.form.controls.billingAddressLine2.setValidators([Validators.maxLength(200)]);
    this.form.controls.billingCity.setValidators([
      Validators.required,
      Validators.maxLength(80),
    ]);
    this.form.controls.billingState.setValidators([Validators.required]);
    this.form.controls.billingPincode.setValidators([
      Validators.required,
      Validators.pattern(/^\d{6}$/),
    ]);

    for (const control of billingControls) {
      control.updateValueAndValidity({ emitEvent: false });
    }
  }
}
