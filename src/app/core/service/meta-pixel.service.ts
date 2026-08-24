import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Meta (Facebook) Pixel wrapper, used only to attribute paid ad spend to the
 * two moments that matter commercially: an account being created and the
 * Buy Now button being pressed.
 *
 * Scope is deliberately narrow because this is a clinical application:
 *
 * - Exactly one PageView is sent, at app bootstrap. Route changes are never
 *   reported, so Meta never learns that a browser opened a patient profile or
 *   a dental chart.
 * - Only opaque plan identifiers and prices are ever sent as parameters. No
 *   patient data, no doctor identity, no email address.
 * - Automatic Advanced Matching and automatic event detection must stay OFF in
 *   Events Manager. Both scrape form fields and button text from the page,
 *   which in this app could capture patient names.
 *
 * Like {@link AnalyticsService}, tracking must never interrupt a clinical
 * workflow, so every call is guarded and failures are swallowed.
 */
@Injectable({ providedIn: 'root' })
export class MetaPixelService {
  private ready = false;

  /** Load the pixel once, at bootstrap. Safe to call repeatedly. */
  init(): void {
    if (this.ready || !this.enabled()) {
      return;
    }

    try {
      this.injectPixelScript();
      this.fbq('init', environment.metaPixelId);
      // The single PageView for the whole session. It sets the _fbp cookie,
      // which is what lets Meta tie a later conversion back to the ad click.
      this.fbq('track', 'PageView');
      this.ready = true;
    } catch (error) {
      console.warn('[meta-pixel] failed to initialise', error);
    }
  }

  /** A doctor finished signup and the free trial started. */
  registrationCompleted(): void {
    this.track('CompleteRegistration');
  }

  /**
   * The doctor pressed Buy Now. Fired on the press itself rather than after
   * the checkout session is created, so a backend failure still counts as
   * purchase intent.
   */
  checkoutButtonPressed(price?: { price?: number; priceId?: string; duration?: string }): void {
    this.track('InitiateCheckout', {
      value: price?.price ?? 0,
      currency: 'USD',
      content_ids: [price?.priceId ?? 'unknown'],
      content_name: price?.duration ?? 'unknown',
      num_items: 1,
    });
  }

  private enabled(): boolean {
    return /^\d{15,16}$/.test(environment.metaPixelId ?? '');
  }

  private track(eventName: string, params: Record<string, unknown> = {}): void {
    if (!this.enabled()) {
      return;
    }
    // A conversion can be the first pixel call of the session if the doctor
    // arrived on a cached page load, so make sure the base code exists.
    this.init();
    try {
      this.fbq('track', eventName, params);
    } catch (error) {
      console.warn('[meta-pixel] failed to track event', eventName, error);
    }
  }

  private fbq(...args: unknown[]): void {
    const queue = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    queue?.(...args);
  }

  /**
   * Meta's base snippet, unminified. It installs a queue so calls made before
   * fbevents.js finishes downloading are replayed rather than lost.
   *
   * No Subresource Integrity hash: Meta ships fbevents.js as a mutable file
   * with no published digest, so pinning one would break the pixel on their
   * next release.
   */
  private injectPixelScript(): void {
    const target = window as unknown as {
      fbq?: FbqFunction;
      _fbq?: FbqFunction;
    };

    if (target.fbq) {
      return;
    }

    const fbq = function (this: unknown, ...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue.push(args);
      }
    } as FbqFunction;

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    target.fbq = fbq;
    target._fbq = target._fbq ?? fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
}

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: { apply(context: unknown, args: unknown[]): void };
  push?: unknown;
  loaded?: boolean;
  version?: string;
  queue: unknown[];
}
