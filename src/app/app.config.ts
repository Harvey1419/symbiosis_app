import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

// Symbiosis theme — based on Stitch "Luminous Dark Management" style guide
// Default DARK. User can toggle to light via ThemeToggleButton.
const SymbiosisPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e6f0f1',
      100: '#b8d3d5',
      200: '#8ab6ba',
      300: '#5c989e',
      400: '#2e7b83',
      500: '#0a3a3c',
      600: '#032425',
      700: '#021a1b',
      800: '#021415',
      900: '#010e0f',
      950: '#000807',
    },
    colorScheme: {
      dark: {
        primary: {
          color: '#f1ff58',
          contrastColor: '#032425',
          hoverColor: '#f5ff8a',
          activeColor: '#d4e234',
        },
        highlight: {
          background: '#f1ff58',
          focusBackground: '#d4e234',
          color: '#032425',
          focusColor: '#032425',
        },
        surface: {
          0: '#ffffff',
          50: '#f5f6f6',
          100: '#c8e9e9',
          200: '#a6d0bc',
          300: '#8a9f96',
          400: '#474835',
          500: '#1b393a',
          600: '#1a3d3e',
          700: '#143a3b',
          800: '#0a2f30',
          900: '#032425',
          950: '#001717',
        },
        formField: {
          background: '#0a2f30',
          borderColor: '#1a3d3e',
          focusBorderColor: '#f1ff58',
        },
      },
      light: {
        primary: {
          color: '#032425',
          contrastColor: '#ffffff',
          hoverColor: '#0a3a3c',
          activeColor: '#021a1b',
        },
        highlight: {
          background: '#f1ff58',
          focusBackground: '#d4e234',
          color: '#032425',
          focusColor: '#032425',
        },
        surface: {
          0: '#ffffff',
          50: '#f8faf9',
          100: '#f1f3ee',
          200: '#e5eae6',
          300: '#d4dad7',
          400: '#9aa6a3',
          500: '#6f7d7a',
          600: '#4f6967',
          700: '#3a504e',
          800: '#283838',
          900: '#1a2828',
          950: '#0d1818',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: SymbiosisPreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: false,
        },
      },
    }),
    ConfirmationService,
    MessageService,
  ],
};