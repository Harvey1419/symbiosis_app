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

// Symbiosis theme — based on Aura but with brand colors
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
      light: {
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.500}',
          activeColor: '{primary.700}',
        },
        highlight: {
          background: '#f1ff58',
          focusBackground: '#d4e234',
          color: '#032425',
          focusColor: '#032425',
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
          darkModeSelector: false,
          cssLayer: false,
        },
      },
    }),
    ConfirmationService,
    MessageService,
  ],
};