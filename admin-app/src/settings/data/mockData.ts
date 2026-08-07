export interface SettingCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: 'company',
    title: 'Company',
    icon: 'business-outline',
    description: 'Company settings',
  },
  {
    id: 'branches',
    title: 'Branches',
    icon: 'map-outline',
    description: 'Branch settings',
  },
  {
    id: 'masters',
    title: 'Masters',
    icon: 'library-outline',
    description: 'Master data settings',
  },
  {
    id: 'charges',
    title: 'Charges',
    icon: 'cash-outline',
    description: 'Charges settings',
  },
  {
    id: 'city-master',
    title: 'City Master',
    icon: 'location-outline',
    description: 'Manage cities',
  },
  {
    id: 'pincode-master',
    title: 'Pincode Master',
    icon: 'navigate-outline',
    description: 'Manage serviceable pincodes',
  },
  {
    id: 'emi-plan-master',
    title: 'EMI Plan Master',
    icon: 'calendar-outline',
    description: 'Manage EMI plan templates',
  },
  {
    id: 'sms-template',
    title: 'SMS Template',
    icon: 'chatbubble-outline',
    description: 'SMS communication templates',
  },
  {
    id: 'whatsapp-template',
    title: 'WhatsApp Template',
    icon: 'logo-whatsapp',
    description: 'WhatsApp communication templates',
  },
  {
    id: 'invoice-template',
    title: 'Invoice Template',
    icon: 'document-text-outline',
    description: 'Invoice layout templates',
  },
  {
    id: 'receipt-template',
    title: 'Receipt Template',
    icon: 'receipt-outline',
    description: 'Receipt layout templates',
  },
  {
    id: 'notification-settings',
    title: 'Notification Settings',
    icon: 'notifications-outline',
    description: 'Push and alert preferences',
  },
  {
    id: 'app-version-control',
    title: 'App Version Control',
    icon: 'phone-portrait-outline',
    description: 'Force update and version rules',
  },
  {
    id: 'terms-conditions',
    title: 'Terms & Conditions',
    icon: 'shield-checkmark-outline',
    description: 'Legal terms and policies',
  },
];
