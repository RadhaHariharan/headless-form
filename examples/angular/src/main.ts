import 'zone.js';
// Pull in the JIT compiler. Angular's partially-compiled libraries (and some
// platform injectables like PlatformNavigation) fall back to JIT when the app
// isn't run through the Angular Linker — which is the case for this Vite example.
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component.js';

bootstrapApplication(AppComponent, {
  providers: [],
}).catch(console.error);
