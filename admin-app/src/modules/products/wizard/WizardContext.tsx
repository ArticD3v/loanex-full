import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProductFormData, initialFormData } from '../types/product';

interface WizardContextType {
  formData: ProductFormData;
  updateForm: (data: Partial<ProductFormData>) => void;
  resetForm: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);

  const updateForm = (data: Partial<ProductFormData>) => {
    setFormData((prev: ProductFormData) => ({ ...prev, ...data }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  return (
    <WizardContext.Provider value={{ formData, updateForm, resetForm, currentStep, setCurrentStep }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
