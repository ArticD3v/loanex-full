import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useOrders } from '../hooks/useOrders';
import { useKYC } from '../hooks/useKYC';
import { getAddresses } from '../services/addressService';
import { createNotification } from '../services/notificationService';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { calculateEMI, generateSchedule } from '../services/emiService';
import { EMICalcResult, Address } from '../types';
import RazorpayCheckout from '../components/feature/RazorpayCheckout';
import { PaymentResult } from '../services/razorpayService';
import { getProductById } from '../services/productService';

const showAlert = (title: string, msg: string, onOk?: () => void) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n${msg}`); onOk?.(); }
  else Alert.alert(title, msg, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
};

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();
  const { isKYCComplete, kycLoading } = useKYC();

  useEffect(() => {
    if (!user) {
      router.replace({ pathname: '/auth/login', params: { returnTo: '/checkout' } });
    }
  }, [user]);

  const { buyNowId, tenure } = useLocalSearchParams<{ buyNowId?: string; tenure?: string }>();
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);

  useEffect(() => {
    if (buyNowId) {
      getProductById(buyNowId).then(p => {
        if (p) setBuyNowProduct(p);
      });
    }
  }, [buyNowId]);

  const displayItems = useMemo(() => {
    if (buyNowId) {
      if (!buyNowProduct) return [];
      return [{ product: buyNowProduct, quantity: 1, selectedTenure: tenure ? parseInt(tenure, 10) : undefined }];
    }
    // Disable EMI for multiple items by stripping selectedTenure
    if (cartItems.length > 1) {
      return cartItems.map(item => ({ ...item, selectedTenure: undefined }));
    }
    return cartItems;
  }, [buyNowId, buyNowProduct, cartItems, tenure]);

  const [name, setName] = useState(user?.name && !user.name.startsWith('User') ? user.name : '');
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressText, setAddressText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  // Payment method: 'cod' (Cash on Delivery) or 'razorpay' (Pay Online via Razorpay)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayPayload, setRazorpayPayload] = useState<{
    userId: string; items: any[]; subtotal: number; total: number;
    paymentMethod: 'cod' | 'emi'; address: string; phone: string;
    addressId?: string; addressSnapshot?: any; emiDetails?: any;
  } | null>(null);

  // Load saved addresses
  useFocusEffect(useCallback(() => {
    if (user) {
      getAddresses(user.id).then(addrs => {
        setSavedAddresses(addrs);
        const def = addrs.find(a => a.isDefault);
        if (def && !selectedAddress) {
          setSelectedAddress(def);
        }
      });
    }
  }, [user]));

  // Find EMI item
  const emiItem = displayItems.find(ci => ci.selectedTenure && ci.product.emiAvailable);
  const emiCalc = useMemo<EMICalcResult | null>(() => {
    if (!emiItem) return null;
    const p = emiItem.product;
    return calculateEMI({
      sellingPrice: p.price, downPayment: p.downPayment, downPaymentType: p.downPaymentType,
      firstPaymentRule: p.firstPaymentRule, serviceCharge: p.serviceCharge,
      deliveryCharge: p.deliveryCharge, tenure: emiItem.selectedTenure!,
    });
  }, [emiItem]);

  const subtotal = displayItems.reduce((s, ci) => s + ci.product.price * ci.quantity, 0);
  const isEMIOrder = !!emiCalc;

  const currentAddress = selectedAddress
    ? `${selectedAddress.fullAddress}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`
    : addressText;

  // ─── Prepare order payload (shared between COD and Razorpay) ────────────
  function buildOrderPayload() {
    const items = displayItems.map(ci => ({
      productId: ci.product.id, productName: ci.product.name,
      image: ci.product.image, quantity: ci.quantity, price: ci.product.price,
    }));
    const schedule = emiCalc ? generateSchedule(emiCalc) : [];
    const firstDealer = emiItem?.product.dealers[0];
    const dealerSnapshot = firstDealer ? {
      dealerCode: firstDealer.dealerCode, dealerName: firstDealer.dealerName,
      dealerAddress: firstDealer.dealerAddress, dealerMobile: firstDealer.dealerMobile,
      purchasePrice: firstDealer.purchasePrice,
      grossMargin: emiItem!.product.price - firstDealer.purchasePrice,
    } : undefined;
    const emiDetails = emiCalc ? {
      tenure: emiCalc.tenure, firstPaymentRule: emiItem!.product.firstPaymentRule,
      downPaymentAmount: emiCalc.downPaymentAmount, serviceCharge: emiItem!.product.serviceCharge,
      deliveryCharge: emiItem!.product.deliveryCharge, totalPayable: emiCalc.totalPayable,
      balanceForEMI: emiCalc.balanceForEMI, regularEMIAmount: emiCalc.regularEMIAmount,
      finalEMIAmount: emiCalc.finalEMIAmount, months: emiCalc.tenure,
      monthlyAmount: emiCalc.regularEMIAmount, totalAmount: emiCalc.totalPayable,
      interestRate: 0, schedule, dealerId: firstDealer?.id, dealerSnapshot,
    } : undefined;
    const addressSnapshot = selectedAddress ? {
      label: selectedAddress.label, fullAddress: selectedAddress.fullAddress,
      city: selectedAddress.city, state: selectedAddress.state, pincode: selectedAddress.pincode,
    } : undefined;
    return {
      userId: user?.id ?? 'guest', items, subtotal,
      total: isEMIOrder ? emiCalc!.totalPayable : subtotal,
      paymentMethod: (isEMIOrder ? 'emi' : 'cod') as 'cod' | 'emi',
      address: currentAddress.trim(), phone: user?.phone ?? '',
      addressId: selectedAddress?.id, addressSnapshot, emiDetails,
    };
  }

  // ─── Actually submit the order to Supabase ──────────────────────────────
  async function submitOrder(payload: {
    userId: string; items: any; subtotal: number; total: number;
    paymentMethod: 'cod' | 'emi'; address: string; phone: string;
    addressId?: string; addressSnapshot?: any; emiDetails?: any;
  }) {
    await addOrder(payload as any);
    if (!buyNowId) clearCart();

    // ── Fire activity-driven notification ──
    const itemNames = (payload.items || []).slice(0, 2).map((i: any) => i.productName).filter(Boolean).join(', ');
    if (isEMIOrder) {
      createNotification({
        userId: payload.userId,
        title: 'EMI Application Submitted',
        message: `Your EMI application for ${itemNames || 'your order'} is submitted. Awaiting admin review.`,
        type: 'emi',
        route: '/(tabs)/emis',
      });
    } else {
      const paidBy = paymentMethod === 'razorpay' ? 'Razorpay' : 'Cash on Delivery';
      createNotification({
        userId: payload.userId,
        title: 'Order Placed',
        message: `Order for ${itemNames || 'your items'} placed successfully. Payment via ${paidBy}.`,
        type: paymentMethod === 'razorpay' ? 'payment' : 'order',
        route: '/orders',
      });
    }

    setLoading(false);
    showAlert('Order Placed!', isEMIOrder
      ? `EMI application submitted successfully! Please wait for admin review. You'll pay the downpayment of ₹${emiCalc!.downPaymentAmount.toLocaleString('en-IN')} after approval.`
      : `Your order has been placed successfully! Payment received via ${paymentMethod === 'razorpay' ? 'Razorpay' : 'Cash on Delivery'}.`,
      () => router.replace('/(tabs)' as any)
    );
  }

  // ─── KYC guard ───────────────────────────────────────────────────────
  const requireKYC = () => {
    if (kycLoading) return false;
    if (!isKYCComplete) {
      Alert.alert(
        'Verification Required',
        'Please complete your KYC (identity verification) before placing an order. This includes name, address, Aadhar, PAN, and CIBIL check.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => router.push('/kyc-verification' as any) },
        ]
      );
      return false;
    }
    return true;
  };

  // ─── Place Order (COD) ────────────────────────────────────────────────
  const handlePlaceOrderCOD = async () => {
    if (!currentAddress.trim()) { showAlert('Address Required', 'Please select or enter your delivery address.'); return; }
    if (displayItems.length === 0) { showAlert('Empty Cart', 'No items in cart.'); return; }
    if (isEMIOrder && !requireKYC()) return;
    setLoading(true);
    try {
      const payload = buildOrderPayload();
      await submitOrder(payload);
    } catch (e: any) {
      setLoading(false);
      showAlert('Error', e.message || 'Failed to place order.');
    }
  };

  // ─── Place Order (Razorpay) ─────────────────────────────────────────────
  const handlePlaceOrderOnline = async () => {
    if (!currentAddress.trim()) { showAlert('Address Required', 'Please select or enter your delivery address.'); return; }
    if (displayItems.length === 0) { showAlert('Empty Cart', 'No items in cart.'); return; }
    if (isEMIOrder && !requireKYC()) return;
    // Store the payload — order will be placed after payment success
    setRazorpayPayload(buildOrderPayload());
    setShowRazorpay(true);
  };

  // ─── Razorpay callbacks ─────────────────────────────────────────────────
  const handleRazorpaySuccess = async (result: PaymentResult) => {
    if (!razorpayPayload) {
      showAlert('Error', 'Order payload missing. Please try again.');
      return;
    }
    setLoading(true);
    try {
      await submitOrder(razorpayPayload);
    } catch (e: any) {
      setLoading(false);
      showAlert('Error', 'Payment succeeded but order placement failed: ' + (e.message || ''));
    }
  };

  const handleRazorpayCancel = () => {
    setShowRazorpay(false);
    setRazorpayPayload(null);
  };

  const handleRazorpayError = (error: string) => {
    console.warn('[Checkout] Razorpay error:', error);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (buyNowId && !buyNowProduct) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (displayItems.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, paddingTop: insets.top }}>
        <MaterialIcons name="shopping-cart" size={64} color={Colors.border} />
        <Text style={{ fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginTop: 16 }}>Cart is Empty</Text>
        <Pressable style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.xl }} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={{ color: '#fff', fontWeight: Fonts.bold }}>Browse Products</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* Order Items */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Order Items ({displayItems.length})</Text>
          {displayItems.map(ci => (
            <View key={ci.product.id} style={s.itemRow}>
              <Image source={{ uri: ci.product.image }} style={s.itemImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={2}>{ci.product.name}</Text>
                <Text style={s.itemQty}>Qty: {ci.quantity}</Text>
                {ci.selectedTenure && <Text style={s.itemEMI}>{ci.selectedTenure}-month EMI plan selected</Text>}
              </View>
              <Text style={s.itemPrice}>₹{(ci.product.price * ci.quantity).toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        {/* EMI Plan Summary */}
        {isEMIOrder && emiCalc && emiItem && (
          <View style={s.card}>
            <Text style={s.cardTitle}>EMI Plan Summary</Text>
            <View style={s.emiPlanHeader}>
              <MaterialIcons name="account-balance" size={22} color={Colors.primary} />
              <Text style={s.emiPlanTitle}>{emiCalc.tenure}-Month EMI Plan</Text>
            </View>
            {[
              { label: 'Down Payment (After Approval)', value: `₹${emiCalc.downPaymentAmount.toLocaleString('en-IN')}`, bold: false, accent: false },
              ...(emiItem.product.serviceCharge > 0 ? [{ label: 'Service Charge', value: `₹${emiItem.product.serviceCharge.toLocaleString('en-IN')}`, bold: false, accent: false }] : []),
              ...(emiItem.product.deliveryCharge > 0 ? [{ label: 'Delivery Charge', value: `₹${emiItem.product.deliveryCharge.toLocaleString('en-IN')}`, bold: false, accent: false }] : []),
              { label: 'Balance for EMI', value: `₹${emiCalc.balanceForEMI.toLocaleString('en-IN')}`, bold: false, accent: true },
              { label: `Monthly EMI (${emiCalc.futureEMICount} installments)`, value: `₹${emiCalc.regularEMIAmount.toLocaleString('en-IN')}/mo`, bold: false, accent: false },
              ...(emiCalc.isRounded ? [{ label: 'Last EMI (adjusted)', value: `₹${emiCalc.finalEMIAmount.toLocaleString('en-IN')}`, bold: false, accent: false }] : []),
              { label: 'Total Payable (All Inclusive)', value: `₹${emiCalc.totalPayable.toLocaleString('en-IN')}`, bold: true, accent: false },
            ].map((r, i) => (
              <View key={i} style={s.summRow}>
                <Text style={[s.summKey, r.bold && s.summKeyBold]}>{r.label}</Text>
                <Text style={[s.summVal, r.accent && { color: Colors.primary, fontSize: Fonts.md }, r.bold && { fontSize: Fonts.xl, fontWeight: Fonts.bold }]}>{r.value}</Text>
              </View>
            ))}
            <View style={s.dueDateBox}>
              <MaterialIcons name="calendar-today" size={14} color={Colors.success} />
              <Text style={s.dueDateTxt}>
                First EMI due on {emiCalc.firstDueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={s.noteBox}>
              <MaterialIcons name="info-outline" size={14} color={Colors.textTertiary} />
              <Text style={s.noteTxt}>EMI plan is subject to approval. You will be notified once approved.</Text>
            </View>
          </View>
        )}

        {/* Order Items Summary */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <Text style={s.cardTitle}>Order Summary</Text>
            <Pressable onPress={() => router.back()}><Text style={{ color: Colors.primary, fontWeight: Fonts.bold }}>Edit Cart</Text></Pressable>
          </View>
          {displayItems.map((item, idx) => (
            <View key={item.product.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx === displayItems.length - 1 ? 0 : Spacing.md }}>
              <Image source={{ uri: item.product.image }} style={{ width: 50, height: 50, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt }} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={{ fontSize: Fonts.sm, fontWeight: Fonts.medium, color: Colors.textPrimary }} numberOfLines={2}>{item.product.name}</Text>
                <Text style={{ fontSize: Fonts.xs, color: Colors.textTertiary }}>Qty: {item.quantity}</Text>
              </View>
              <Text style={{ fontSize: Fonts.sm, fontWeight: Fonts.bold }}>₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        {/* Payment & Order Totals (for non-EMI orders) */}
        {!isEMIOrder && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Payment Method</Text>

            {/* Payment method selector */}
            <Pressable
              style={[s.payOption, paymentMethod === 'cod' && s.payOptionSelected]}
              onPress={() => setPaymentMethod('cod')}
            >
              <MaterialIcons
                name={paymentMethod === 'cod' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20} color={paymentMethod === 'cod' ? Colors.primary : Colors.textTertiary}
              />
              <View style={[s.payOptionIcon, { backgroundColor: Colors.successLight }]}>
                <MaterialIcons name="money" size={20} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.payOptionLabel}>Cash on Delivery</Text>
                <Text style={s.payOptionDesc}>Pay when your order arrives</Text>
              </View>
            </Pressable>

            <Pressable
              style={[s.payOption, paymentMethod === 'razorpay' && s.payOptionSelected]}
              onPress={() => setPaymentMethod('razorpay')}
            >
              <MaterialIcons
                name={paymentMethod === 'razorpay' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20} color={paymentMethod === 'razorpay' ? Colors.primary : Colors.textTertiary}
              />
              <View style={[s.payOptionIcon, { backgroundColor: Colors.primaryLight }]}>
                <MaterialIcons name="payment" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.payOptionLabel}>Pay Online (Razorpay)</Text>
                <Text style={s.payOptionDesc}>Credit/Debit Card · UPI · Net Banking · Wallet</Text>
              </View>
            </Pressable>

            {/* Order total */}
            <View style={[s.summRow, { marginTop: Spacing.md }]}>
              <Text style={s.summKey}>Subtotal</Text>
              <Text style={s.summVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.summRow}>
              <Text style={s.summKey}>Delivery</Text>
              <Text style={[s.summVal, { color: Colors.success }]}>FREE</Text>
            </View>
            <View style={[s.summRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
              <Text style={s.summKeyBold}>Total</Text>
              <Text style={[s.summVal, { fontSize: Fonts.xxl, fontWeight: Fonts.bold }]}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Delivery Address */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Delivery Details</Text>
          <Text style={s.inputLabel}>Full Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={Colors.textTertiary} />

          <Text style={s.inputLabel}>Delivery Address *</Text>
          {savedAddresses.length > 0 ? (
            <>
              <Pressable style={s.addressPickerBtn} onPress={() => setShowAddressPicker(true)}>
                {selectedAddress ? (
                  <View style={{ flex: 1 }}>
                    <View style={s.addressLabelRow}>
                      <View style={s.labelBadge}><Text style={s.labelBadgeTxt}>{selectedAddress.label}</Text></View>
                      {selectedAddress.isDefault && <View style={s.defaultBadge}><Text style={s.defaultBadgeTxt}>Default</Text></View>}
                    </View>
                    <Text style={s.addressPickerText} numberOfLines={2}>
                      {selectedAddress.fullAddress}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                    </Text>
                  </View>
                ) : (
                  <Text style={[s.addressPickerText, { color: Colors.textTertiary }]}>Select a saved address</Text>
                )}
                <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
              </Pressable>
              <Pressable style={s.addAddrLink} onPress={() => setShowAddForm(true)}>
                <MaterialIcons name="add" size={16} color={Colors.primary} />
                <Text style={s.addAddrLinkTxt}>Or enter a new address</Text>
              </Pressable>
            </>
          ) : null}

          {/* Show text input when no saved addresses or "add new" is toggled */}
          {(savedAddresses.length === 0 || showAddForm) && (
            <>
              <TextInput style={[s.input, s.inputMulti]} value={addressText} onChangeText={setAddressText}
                placeholder="House/Flat No., Street, Area, City, Pincode" placeholderTextColor={Colors.textTertiary}
                multiline numberOfLines={3} textAlignVertical="top" />
              {showAddForm && (
                <Pressable style={s.useExistingLink} onPress={() => setShowAddForm(false)}>
                  <Text style={s.addAddrLinkTxt}>Choose from saved addresses</Text>
                </Pressable>
              )}
            </>
          )}

          <Text style={s.inputLabel}>Mobile</Text>
          <View style={s.mobileRow}>
            <View style={s.mobilePrefix}><Text style={{ color: Colors.textSecondary, fontWeight: Fonts.medium }}>+91</Text></View>
            <Text style={s.mobileVal}>{user?.phone ?? '—'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar — action changes based on payment method */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.payToday}>
            {isEMIOrder ? 'Awaiting Approval' : `Total: ₹${subtotal.toLocaleString('en-IN')}`}
          </Text>
          <Text style={s.paySubtext}>
            {isEMIOrder
              ? `Admin reviews then you pay ₹${emiCalc!.downPaymentAmount.toLocaleString('en-IN')}`
              : paymentMethod === 'razorpay'
              ? 'Pay via Razorpay (Test Mode)'
              : 'Cash on Delivery'}
          </Text>
        </View>

        {isEMIOrder ? (
          <Pressable style={[s.placeBtn, loading && s.placeBtnDisabled]} onPress={handlePlaceOrderCOD} disabled={loading}>
            <MaterialIcons name="account-balance" size={18} color="#fff" />
            <Text style={s.placeBtnTxt}>{loading ? 'Placing...' : 'Buy on EMI'}</Text>
          </Pressable>
        ) : paymentMethod === 'razorpay' ? (
          <Pressable style={[s.placeBtn, loading && s.placeBtnDisabled]} onPress={handlePlaceOrderOnline} disabled={loading}>
            <MaterialIcons name="payment" size={18} color="#fff" />
            <Text style={s.placeBtnTxt}>{loading ? 'Placing...' : 'Pay with Razorpay'}</Text>
          </Pressable>
        ) : (
          <Pressable style={[s.placeBtn, loading && s.placeBtnDisabled]} onPress={handlePlaceOrderCOD} disabled={loading}>
            <MaterialIcons name="shopping-bag" size={18} color="#fff" />
            <Text style={s.placeBtnTxt}>{loading ? 'Placing...' : 'Place Order (COD)'}</Text>
          </Pressable>
        )}
      </View>

      {/* Address Picker Modal */}
      <Modal visible={showAddressPicker} animationType="slide" transparent onRequestClose={() => setShowAddressPicker(false)}>
        <View style={s.modalOverlay}>
          <Pressable style={s.modalDismiss} onPress={() => setShowAddressPicker(false)} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Address</Text>
              <Pressable onPress={() => setShowAddressPicker(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={savedAddresses}
              keyExtractor={a => a.id}
              contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.addressCard, selectedAddress?.id === item.id && s.addressCardSelected]}
                  onPress={() => { setSelectedAddress(item); setShowAddressPicker(false); setShowAddForm(false); }}
                >
                  <View style={s.addressLabelRow}>
                    <View style={s.labelBadge}><Text style={s.labelBadgeTxt}>{item.label}</Text></View>
                    {item.isDefault && <View style={s.defaultBadge}><Text style={s.defaultBadgeTxt}>Default</Text></View>}
                  </View>
                  <Text style={s.addressCardText}>{item.fullAddress}, {item.city}, {item.state} - {item.pincode}</Text>
                </Pressable>
              )}
            />
            <Pressable style={s.newAddrBtn} onPress={() => { setShowAddressPicker(false); router.push('/add-address' as any); }}>
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={s.newAddrBtnTxt}>Add New Address</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Razorpay Checkout Modal */}
      <RazorpayCheckout
        visible={showRazorpay}
        amount={subtotal}
        description={`LoanEx Order ${razorpayPayload ? `#${razorpayPayload.items.length} items` : ''}`}
        prefillEmail={user?.email || ''}
        prefillContact={user?.phone || ''}
        allowDemoFallback={true}
        onDemoFallback={() => {
          // Fallback: place order with demo payment
          setShowRazorpay(false);
          if (razorpayPayload) {
            submitOrder(razorpayPayload);
          }
        }}
        onSuccess={handleRazorpaySuccess}
        onCancel={handleRazorpayCancel}
        onError={handleRazorpayError}
        onClose={() => { setShowRazorpay(false); setRazorpayPayload(null); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.sm as object },
  cardTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  itemImg: { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  itemName: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  itemQty: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  itemEMI: { fontSize: Fonts.xs, color: Colors.primary, fontWeight: Fonts.medium, marginTop: 2 },
  itemPrice: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  emiPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.md },
  emiPlanTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.primary },
  summRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  summKey: { fontSize: Fonts.sm, color: Colors.textSecondary, flex: 1 },
  summKeyBold: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  summVal: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  dueDateBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, backgroundColor: Colors.successLight, padding: Spacing.md, borderRadius: Radius.md },
  dueDateTxt: { fontSize: Fonts.sm, color: Colors.success, fontWeight: Fonts.medium, flex: 1 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, backgroundColor: Colors.surfaceAlt, padding: Spacing.md, borderRadius: Radius.md },
  noteTxt: { fontSize: Fonts.xs, color: Colors.textTertiary, flex: 1, lineHeight: 17 },
  payMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, backgroundColor: Colors.successLight, padding: Spacing.md, borderRadius: Radius.md },
  payMethodTxt: { fontSize: Fonts.md, color: Colors.success, fontWeight: Fonts.medium },
  inputLabel: { fontSize: Fonts.sm, fontWeight: Fonts.medium, color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.md, color: Colors.textPrimary },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md },
  mobilePrefix: { paddingRight: 8, borderRightWidth: 1, borderRightColor: Colors.border },
  mobileVal: { fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, ...Shadow.lg as object },
  payToday: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  paySubtext: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radius.xl },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },

  // Address picker
  addressPickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, minHeight: 60 },
  addressPickerText: { flex: 1, fontSize: Fonts.md, color: Colors.textPrimary, lineHeight: 20 },
  addressLabelRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: 4 },
  labelBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  labelBadgeTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, color: Colors.primary },
  defaultBadge: { backgroundColor: Colors.successLight, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  defaultBadgeTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, color: Colors.success },
  addAddrLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, marginTop: 4 },
  addAddrLinkTxt: { fontSize: Fonts.sm, color: Colors.primary, fontWeight: Fonts.medium },
  useExistingLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm },

  // Address picker modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sheetTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  addressCard: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: Colors.borderLight },
  addressCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  addressCardText: { fontSize: Fonts.md, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  newAddrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: Radius.xl },
  newAddrBtnTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },

  // Payment method selector
  payOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 2, borderColor: Colors.borderLight },
  payOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  payOptionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  payOptionLabel: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  payOptionDesc: { fontSize: Fonts.sm, color: Colors.textSecondary, marginTop: 2 },
});
