import { definePreset, palette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * LoanEx PrimeNG preset — Aura base aligned to the Design System brand.
 * Primary #0A2E6F · Secondary #D4A12A · Surfaces #F8FAFC / #FFFFFF
 */
const primaryScale = palette('#0A2E6F') as Record<number, string>;
const secondaryScale = palette('#D4A12A') as Record<number, string>;
const surfaceScale = palette('#F8FAFC') as Record<number, string>;

export const LoanExPreset = definePreset(Aura, {
  primitive: {
    // Map brand palettes onto Aura primitive slots
    blue: primaryScale,
    amber: secondaryScale,
    slate: surfaceScale,
  },
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
    colorScheme: {
      light: {
        primary: {
          color: '#0A2E6F',
          contrastColor: '#FFFFFF',
          hoverColor: '#082455',
          activeColor: '#061A3D',
        },
        highlight: {
          background: 'rgba(10, 46, 111, 0.1)',
          focusBackground: 'rgba(10, 46, 111, 0.16)',
          color: '#0A2E6F',
          focusColor: '#0A2E6F',
        },
        surface: {
          0: '#FFFFFF',
          50: '#F8FAFC',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
        formField: {
          background: '#FFFFFF',
          disabledBackground: '#F8FAFC',
          filledBackground: '#F8FAFC',
          filledHoverBackground: '#F1F5F9',
          filledFocusBackground: '#FFFFFF',
          borderColor: '#E5E7EB',
          hoverBorderColor: '#D1D5DB',
          focusBorderColor: '#0A2E6F',
          invalidBorderColor: '#DC2626',
          color: '#111827',
          disabledColor: '#9CA3AF',
          placeholderColor: '#9CA3AF',
          invalidPlaceholderColor: '#DC2626',
          floatLabelColor: '#6B7280',
          floatLabelFocusColor: '#0A2E6F',
          floatLabelActiveColor: '#6B7280',
          floatLabelInvalidColor: '#DC2626',
          iconColor: '#6B7280',
          shadow: '0 0 0 0 rgba(0,0,0,0)',
        },
        text: {
          color: '#111827',
          hoverColor: '#0A2E6F',
          mutedColor: '#6B7280',
          hoverMutedColor: '#4B5563',
        },
        content: {
          background: '#FFFFFF',
          hoverBackground: '#F8FAFC',
          borderColor: '#E5E7EB',
          color: '#111827',
          hoverColor: '#111827',
        },
        overlay: {
          select: {
            background: '#FFFFFF',
            borderColor: '#E5E7EB',
            color: '#111827',
          },
          popover: {
            background: '#FFFFFF',
            borderColor: '#E5E7EB',
            color: '#111827',
          },
          modal: {
            background: '#FFFFFF',
            borderColor: '#E5E7EB',
            color: '#111827',
          },
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '0.5rem',
        roundedBorderRadius: '9999px',
        gap: '0.5rem',
        paddingX: '1.25rem',
        paddingY: '0.75rem',
        sm: {
          fontSize: '0.75rem',
          paddingX: '0.75rem',
          paddingY: '0.5rem',
        },
        lg: {
          fontSize: '1rem',
          paddingX: '2rem',
          paddingY: '0.875rem',
        },
      },
      colorScheme: {
        light: {
          root: {
            primary: {
              background: '#0A2E6F',
              hoverBackground: '#082455',
              activeBackground: '#061A3D',
              borderColor: '#0A2E6F',
              hoverBorderColor: '#082455',
              activeBorderColor: '#061A3D',
              color: '#FFFFFF',
              hoverColor: '#FFFFFF',
              activeColor: '#FFFFFF',
              focusRing: {
                color: 'rgba(10, 46, 111, 0.35)',
                shadow: '0 0 0 3px rgba(10, 46, 111, 0.35)',
              },
            },
            secondary: {
              background: '#D4A12A',
              hoverBackground: '#B8881F',
              activeBackground: '#926B18',
              borderColor: '#D4A12A',
              hoverBorderColor: '#B8881F',
              activeBorderColor: '#926B18',
              color: '#111827',
              hoverColor: '#111827',
              activeColor: '#111827',
            },
            success: {
              background: '#16A34A',
              hoverBackground: '#15803D',
              activeBackground: '#166534',
              borderColor: '#16A34A',
              hoverBorderColor: '#15803D',
              activeBorderColor: '#166534',
              color: '#FFFFFF',
            },
            danger: {
              background: '#DC2626',
              hoverBackground: '#B91C1C',
              activeBackground: '#991B1B',
              borderColor: '#DC2626',
              hoverBorderColor: '#B91C1C',
              activeBorderColor: '#991B1B',
              color: '#FFFFFF',
            },
          },
        },
      },
    },
    inputtext: {
      root: {
        borderRadius: '0.5rem',
        paddingX: '1rem',
        paddingY: '0.75rem',
      },
    },
    textarea: {
      root: {
        borderRadius: '0.5rem',
        paddingX: '1rem',
        paddingY: '0.75rem',
      },
    },
    select: {
      root: {
        borderRadius: '0.5rem',
        paddingX: '1rem',
        paddingY: '0.75rem',
      },
    },
    card: {
      root: {
        borderRadius: '0.75rem',
        shadow: '0 2px 8px rgba(10, 46, 111, 0.06), 0 1px 2px rgba(17, 24, 39, 0.04)',
      },
      body: {
        padding: '1.5rem',
        gap: '1rem',
      },
    },
    tag: {
      root: {
        fontSize: '0.75rem',
        fontWeight: '600',
        borderRadius: '9999px',
        padding: '0.25rem 0.5rem',
      },
    },
    chip: {
      root: {
        borderRadius: '9999px',
        paddingX: '0.75rem',
        paddingY: '0.375rem',
      },
    },
    dialog: {
      root: {
        borderRadius: '0.75rem',
        shadow: '0 12px 28px rgba(17, 24, 39, 0.12)',
      },
    },
    toast: {
      root: {
        borderRadius: '0.75rem',
      },
    },
  },
});

export default LoanExPreset;
