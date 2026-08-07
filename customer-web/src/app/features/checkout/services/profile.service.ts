import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface ProfileAddress {
  id: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  addressType: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfilePayload {
  id: string | null;
  fullName: string;
  email: string;
  mobile: string;
  dob: string | null;
  gender: Gender | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileResponse {
  profile: UserProfilePayload;
  address: ProfileAddress | null;
  billingAddress: ProfileAddress | null;
  billingSameAsShipping: boolean;
  addresses: ProfileAddress[];
  hasProfile: boolean;
  hasAddress: boolean;
}

export interface AddressListResponse {
  items: ProfileAddress[];
  totalItems: number;
}

export interface AddressPayload {
  addressLine1: string;
  addressLine2: string;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
  addressType?: 'SHIPPING' | 'BILLING';
}

export interface UpsertProfileRequest {
  fullName: string;
  email: string;
  dob: string;
  gender: Gender;
  address: {
    addressLine1: string;
    addressLine2: string;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  billingSameAsShipping: boolean;
  billingAddress?: UpsertProfileRequest['address'];
}

export interface UpdatePersonalRequest {
  fullName: string;
  email: string;
  dob: string;
  gender: Gender;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/profile`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  get(): Observable<ProfileResponse> {
    return this.wrap(this.http.get<ApiSuccess<ProfileResponse>>(this.baseUrl)).pipe(
      map((data) => ({
        ...data,
        addresses: data.addresses ?? (data.address ? [data.address] : []),
      })),
    );
  }

  create(payload: UpsertProfileRequest): Observable<ProfileResponse> {
    return this.wrap(this.http.post<ApiSuccess<ProfileResponse>>(this.baseUrl, payload));
  }

  update(payload: UpsertProfileRequest): Observable<ProfileResponse> {
    return this.wrap(this.http.put<ApiSuccess<ProfileResponse>>(this.baseUrl, payload));
  }

  updatePersonal(payload: UpdatePersonalRequest): Observable<ProfileResponse> {
    return this.wrap(
      this.http.put<ApiSuccess<ProfileResponse>>(`${this.baseUrl}/personal`, payload),
    );
  }

  listAddresses(): Observable<AddressListResponse> {
    return this.wrap(
      this.http.get<ApiSuccess<AddressListResponse>>(`${this.baseUrl}/addresses`),
    );
  }

  createAddress(payload: AddressPayload): Observable<AddressListResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<AddressListResponse>>(`${this.baseUrl}/addresses`, payload),
    );
  }

  updateAddress(addressId: string, payload: AddressPayload): Observable<AddressListResponse> {
    return this.wrap(
      this.http.put<ApiSuccess<AddressListResponse>>(
        `${this.baseUrl}/addresses/${addressId}`,
        payload,
      ),
    );
  }

  deleteAddress(addressId: string): Observable<AddressListResponse> {
    return this.wrap(
      this.http.delete<ApiSuccess<AddressListResponse>>(
        `${this.baseUrl}/addresses/${addressId}`,
      ),
    );
  }

  setDefaultAddress(addressId: string): Observable<AddressListResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<AddressListResponse>>(
        `${this.baseUrl}/addresses/${addressId}/default`,
        {},
      ),
    );
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private wrap<T>(source: Observable<ApiSuccess<T>>): Observable<T> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return source.pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
  }

  private extractError(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string } }).error;
      if (body?.message) return body.message;
    }
    return 'Unable to complete profile request.';
  }
}
