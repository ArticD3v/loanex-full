import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { SplashScreen } from '../authentication/screens/SplashScreen';
import { LoginScreen } from '../authentication/screens/LoginScreen';
import { ForgotPasswordScreen } from '../authentication/screens/ForgotPasswordScreen';
import { OtpVerificationScreen } from '../authentication/screens/OtpVerificationScreen';
import { ResetPasswordScreen } from '../authentication/screens/ResetPasswordScreen';
import { DashboardScreen } from '../dashboard/screens/DashboardScreen';
import { ModulePlaceholderScreen } from '../dashboard/screens/ModulePlaceholderScreen';
import { NotificationsScreen } from '../dashboard/screens/NotificationsScreen';
import { MyProfileScreen } from '../dashboard/screens/MyProfileScreen';
import { ChangePasswordScreen } from '../dashboard/screens/ChangePasswordScreen';
import { ProductListScreen } from '../modules/products/screens/ProductListScreen';
import { AddProductScreen } from '../modules/products/screens/AddProductScreen';
import { ProductDetailsScreen } from '../modules/products/screens/ProductDetailsScreen';
import { CustomerListScreen } from '../customers/screens/CustomerListScreen';
import { CustomerDetailsScreen } from '../customers/screens/CustomerDetailsScreen';
import { OrderListScreen } from '../orders/screens/OrderListScreen';
import { OrderDetailsScreen } from '../orders/screens/OrderDetailsScreen';
import { EmiApplicationListScreen } from '../emi/screens/EmiApplicationListScreen';
import { EmiApplicationDetailsScreen } from '../emi/screens/EmiApplicationDetailsScreen';
import { CreditReviewDetailsScreen } from '../emi/screens/CreditReviewDetailsScreen';
import { DownPaymentDetailsScreen } from '../emi/screens/DownPaymentDetailsScreen';
import { ESignDetailsScreen } from '../emi/screens/ESignDetailsScreen';
import { EkycDetailsScreen } from '../emi/screens/EkycDetailsScreen';
import { MandateDetailsScreen } from '../emi/screens/MandateDetailsScreen';
import { DisbursementDetailsScreen } from '../emi/screens/DisbursementDetailsScreen';
import { EmiOrderDetailsScreen } from '../emi/screens/EmiOrderDetailsScreen';
import { DispatchDetailsScreen } from '../emi/screens/DispatchDetailsScreen';
import { FiCaseListScreen } from '../fi/screens/FiCaseListScreen';
import { FiCaseDetailsScreen } from '../fi/screens/FiCaseDetailsScreen';
import { ReportsHomeScreen } from '../reports/screens/ReportsHomeScreen';
import { UserListScreen } from '../users/screens/UserListScreen';
import { UserDetailsScreen } from '../users/screens/UserDetailsScreen';
import { AddUserScreen } from '../users/screens/AddUserScreen';
import { SettingsHomeScreen } from '../settings/screens/SettingsHomeScreen';
import { MastersHomeScreen } from '../settings/screens/MastersHomeScreen';
import { MasterListScreen } from '../settings/screens/MasterListScreen';
import { CategoriesMasterScreen } from '../settings/screens/CategoriesMasterScreen';
import { BranchMasterScreen } from '../settings/screens/BranchMasterScreen';
import { PincodeMasterScreen } from '../settings/screens/PincodeMasterScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const colors = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="MyProfile" component={MyProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="ModulePlaceholder" component={ModulePlaceholderScreen} />
        <Stack.Screen name="ProductList" component={ProductListScreen} />
        <Stack.Screen
          name="AddProduct"
          component={AddProductScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="CustomerList" component={CustomerListScreen} />
        <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
        <Stack.Screen name="OrderList" component={OrderListScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <Stack.Screen name="EmiApplicationList" component={EmiApplicationListScreen} />
        <Stack.Screen name="EmiApplicationDetails" component={EmiApplicationDetailsScreen} />
        <Stack.Screen name="CreditReviewDetails" component={CreditReviewDetailsScreen} />
        <Stack.Screen name="DownPaymentDetails" component={DownPaymentDetailsScreen} />
        <Stack.Screen name="ESignDetails" component={ESignDetailsScreen} />
        <Stack.Screen name="EkycDetails" component={EkycDetailsScreen} />
        <Stack.Screen name="MandateDetails" component={MandateDetailsScreen} />
        <Stack.Screen name="DisbursementDetails" component={DisbursementDetailsScreen} />
        <Stack.Screen name="EmiOrderDetails" component={EmiOrderDetailsScreen} />
        <Stack.Screen name="DispatchDetails" component={DispatchDetailsScreen} />
        <Stack.Screen name="FiCaseList" component={FiCaseListScreen} />
        <Stack.Screen name="FiCaseDetails" component={FiCaseDetailsScreen} />
        <Stack.Screen name="ReportsHome" component={ReportsHomeScreen} />
        <Stack.Screen name="UserList" component={UserListScreen} />
        <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
        <Stack.Screen
          name="AddUser"
          component={AddUserScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="SettingsHome" component={SettingsHomeScreen} />
        <Stack.Screen name="MastersHome" component={MastersHomeScreen} />
        <Stack.Screen name="MasterList" component={MasterListScreen} />
        <Stack.Screen name="CategoriesMaster" component={CategoriesMasterScreen} />
        <Stack.Screen name="BranchMaster" component={BranchMasterScreen} />
        <Stack.Screen name="PincodeMaster" component={PincodeMasterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
