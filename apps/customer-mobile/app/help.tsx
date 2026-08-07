import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';

const FAQS = [
  { q: 'How does EMI work?', a: 'Select an EMI-eligible product and choose your preferred tenure (3/6/9/12 months). After placing the order, an admin reviews your application. Once approved, you pay the downpayment and the remaining amount is split into monthly installments.' },
  { q: 'When do I pay the downpayment?', a: 'After the admin approves your EMI application and sends a proposal, you can view and accept it. Once accepted, you pay the downpayment to confirm the order.' },
  { q: 'Can I prepay my EMI?', a: 'Yes, you can pay individual upcoming installments early from the EMI Plans section. Contact support for full prepayment options.' },
  { q: 'What is the delivery time?', a: 'Standard delivery takes 5-7 business days after the order is confirmed. EMI orders are confirmed after downpayment is paid.' },
  { q: 'Can I return a product?', a: 'Return eligibility depends on the product. Check the product page for return window information. Items purchased on EMI follow the same return policy as regular purchases.' },
  { q: 'How do I track my order?', a: 'Go to My Orders and tap any order to view its detailed tracking page with timeline and status updates.' },
  { q: 'Is Cash on Delivery available?', a: 'Yes, COD is available for eligible products. You can select it at checkout for non-EMI orders.' },
];

const CONTACT_OPTIONS = [
  { icon: 'chat', label: 'Live Chat', desc: 'Chat with our support team', color: Colors.primary, action: () => Alert.alert('Live Chat', 'Our team is online 9 AM - 9 PM. This feature will be available soon.') },
  { icon: 'email', label: 'Email Us', desc: 'support@loanex.com', color: '#7C3AED', action: () => Alert.alert('Email', 'You can reach us at support@loanex.com. We respond within 24 hours.') },
  { icon: 'phone', label: 'Call Us', desc: '+91 1800-123-4567', color: Colors.success, action: () => Alert.alert('Call Support', 'Our toll-free number: 1800-123-4567\nAvailable 9 AM - 9 PM, Mon-Sat') },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Contact */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        {CONTACT_OPTIONS.map(opt => (
          <Pressable key={opt.label} style={styles.contactItem} onPress={opt.action}>
            <View style={[styles.contactIcon, { backgroundColor: opt.color + '18' }]}>
              <MaterialIcons name={opt.icon as any} size={22} color={opt.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>{opt.label}</Text>
              <Text style={styles.contactDesc}>{opt.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
          </Pressable>
        ))}

        {/* FAQs */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>Frequently Asked Questions</Text>
        {FAQS.map((faq, idx) => {
          const isOpen = expandedFAQ === String(idx);
          return (
            <View key={idx} style={styles.faqItem}>
              <Pressable style={styles.faqQ} onPress={() => setExpandedFAQ(isOpen ? null : String(idx))}>
                <Text style={styles.faqQtxt}>{faq.q}</Text>
                <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={20} color={Colors.textTertiary} />
              </Pressable>
              {isOpen && (
                <Text style={styles.faqAtxt}>{faq.a}</Text>
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerTxt}>LoanEx v1.0.0</Text>
          <Text style={styles.footerTxt}>Made with ❤️ in India</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  sectionTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  contactIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  contactDesc: { fontSize: Fonts.sm, color: Colors.textSecondary, marginTop: 2 },
  faqItem: { backgroundColor: Colors.surface, borderRadius: Radius.xl, marginBottom: Spacing.sm, overflow: 'hidden', ...Shadow.sm },
  faqQ: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  faqQtxt: { flex: 1, fontSize: Fonts.md, fontWeight: Fonts.medium, color: Colors.textPrimary, lineHeight: 21 },
  faqAtxt: { padding: Spacing.lg, paddingTop: 0, fontSize: Fonts.sm, color: Colors.textSecondary, lineHeight: 20 },
  footer: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 4 },
  footerTxt: { fontSize: Fonts.xs, color: Colors.textTertiary },
});
