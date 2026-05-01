import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SheetRow   { category: string; name: string; have: number; }
export interface Sponsor    { name: string; tier: string; website: string; }
export interface SheetPayload {
  fundingRaised: number;
  items: SheetRow[];
  sponsors: Sponsor[];
}

export const TIER_ORDER = ['heavyweight', 'champion', 'contender'] as const;
export type DisplayTier = typeof TIER_ORDER[number];

// ── Known sponsor websites (form doesn't collect URLs, so we maintain this) ──
const SPONSOR_WEBSITES: Record<string, string> = {
  'gurrera plumbing': 'https://www.gurreraplumbing.com',
};

// ── Column keys exactly as returned by the Apps Script (lowercased headers) ──
const COL_PARTICIPATION = "how would you like to participate? this is a free event for the community and kids, and we kindly ask that all items and services be offered at no cost.";
const COL_ACTIVITY      = "activity or services stations";
const COL_SUPPLY        = "supply donations";
const COL_SPONSOR_LEVEL = "sponsorship levels. ability to contribute directly to the execution of this community event and receive featured recognition.";
const COL_ENTERTAINMENT = "entertainment options, 30 minutes on the main stage";
const COL_BUSINESS      = "business name";
const COL_CONTACT       = "contact person";

@Injectable({ providedIn: 'root' })
export class SheetsService {
  private http = inject(HttpClient);

  get isConfigured(): boolean {
    return environment.sheetsScriptUrl.trim().length > 0 &&
           environment.sheetsSecretToken.trim().length > 0;
  }

  fetch(): Observable<SheetPayload> {
    if (!this.isConfigured) {
      return of({ fundingRaised: 0, items: [], sponsors: [] });
    }

    const url = `${environment.sheetsScriptUrl}?token=${encodeURIComponent(environment.sheetsSecretToken)}`;

    return this.http.get<Record<string, unknown[]>>(url).pipe(
      map(raw => {
        console.log('[Sheets] Raw data received:', raw);
        return this.mapPayload(raw);
      }),
      catchError(err => {
        console.warn('[Sheets] Fetch failed:', err);
        return of({ fundingRaised: 0, items: [], sponsors: [] });
      })
    );
  }

  // ── Mapping ───────────────────────────────────────────────────────────────────
  private mapPayload(raw: Record<string, unknown[]>): SheetPayload {
    // All responses live in the single "form responses 1" tab
    const rows = (raw['form responses 1'] ?? []) as Record<string, unknown>[];

    return {
      fundingRaised: this.extractFunding(rows),
      items:         this.extractItems(rows),
      sponsors:      this.extractSponsors(rows),
    };
  }

  // Returns a lowercased string for a column value
  private val(row: Record<string, unknown>, key: string): string {
    return String(row[key] ?? '').trim().toLowerCase();
  }

  // Best display name for a row (business name preferred, fall back to contact)
  private displayName(row: Record<string, unknown>): string {
    return String(row[COL_BUSINESS] ?? '').trim() ||
           String(row[COL_CONTACT]  ?? '').trim();
  }

  // ── Funding raised ────────────────────────────────────────────────────────────
  private extractFunding(rows: Record<string, unknown>[]): number {
    let total = 0;
    for (const row of rows) {
      const level = this.val(row, COL_SPONSOR_LEVEL);
      if (!level) continue;
      if      (level.includes('1000')) total += 1000;
      else if (level.includes('500'))  total += 500;
      else if (level.includes('250'))  total += 250;
    }
    return total;
  }

  // ── Sponsor wall ──────────────────────────────────────────────────────────────
  private extractSponsors(rows: Record<string, unknown>[]): Sponsor[] {
    const result: Sponsor[] = [];
    for (const row of rows) {
      const level = this.val(row, COL_SPONSOR_LEVEL);
      if (!level) continue;

      const name = this.displayName(row);
      if (!name) continue;

      let tier = '';
      if      (level.includes('1000') || level.includes('heavyweight'))                      tier = 'heavyweight';
      else if (level.includes('500')  || level.includes('champion'))                         tier = 'champion';
      else if (level.includes('250')  || level.includes('strength builder') ||
               level.includes('contender'))                                                  tier = 'contender';

      if (tier) {
        const website = SPONSOR_WEBSITES[name.toLowerCase()] ?? '';
        result.push({ name, tier, website });
      }
    }
    return result;
  }

  // ── Needs tracker items ───────────────────────────────────────────────────────
  private extractItems(rows: Record<string, unknown>[]): SheetRow[] {
    const counts: Record<string, Record<string, number>> = {
      supplies: {}, food: {}, stations: {},
      entertainment: {}, volunteers: {}, sponsorship: {},
    };

    const inc = (cat: string, name: string) =>
      counts[cat][name] = (counts[cat][name] || 0) + 1;

    for (const row of rows) {
      const part      = this.val(row, COL_PARTICIPATION);
      const activity  = this.val(row, COL_ACTIVITY);
      const supply    = this.val(row, COL_SUPPLY);
      const level     = this.val(row, COL_SPONSOR_LEVEL);
      const entertain = this.val(row, COL_ENTERTAINMENT);

      // ── Activity stations ────────────────────────────────────────────
      if (part.includes('bounce house') || activity.includes('bounce house'))
        inc('stations', 'Bounce House');

      if (part.includes('face paint') || activity.includes('face paint'))
        inc('stations', 'Face Painting');

      if (activity.includes('haircut') || part.includes('haircut'))
        inc('stations', 'Haircuts');

      if (activity.includes('game'))
        inc('stations', 'Games & Activities');

      if (activity.includes('photo') || part.includes('photo'))
        inc('stations', 'Photo Station');

      // ── Food ─────────────────────────────────────────────────────────
      if (part.includes('food') || activity.includes('food vendor'))
        inc('food', 'Prepared / Ready-to-Eat Meals');

      // ── School supplies ───────────────────────────────────────────────
      if (supply.includes('school supplies') || supply.includes('school supply'))
        inc('supplies', 'Gift Cards'); // placeholder — maps to school supplies bucket

      // ── Volunteers ────────────────────────────────────────────────────
      if (part.includes('volunteer') ||
          activity.includes('extra hands') ||
          activity.includes('anywhere you need')) {
        inc('volunteers', 'Activity Station Helpers');
      }

      // ── Entertainment ─────────────────────────────────────────────────
      if (entertain) {
        if      (entertain.includes('music') || entertain.includes('band') || entertain.includes('sing'))
          inc('entertainment', 'Music Performance');
        else if (entertain.includes('dance'))
          inc('entertainment', 'Dance Group');
        else if (entertain.includes('magic'))
          inc('entertainment', 'Magic Show');
        else if (entertain.includes('dj'))
          inc('entertainment', 'DJ');
        else if (entertain.includes('comedy') || entertain.includes('spoken'))
          inc('entertainment', 'Comedy / Spoken Word');
      }

      // ── Sponsorship tiers ─────────────────────────────────────────────
      if (level) {
        if      (level.includes('1000') || level.includes('heavyweight'))
          inc('sponsorship', 'Heavyweight — $1,000+');
        else if (level.includes('500')  || level.includes('champion'))
          inc('sponsorship', 'Champion — $500');
        else if (level.includes('250')  || level.includes('strength builder'))
          inc('sponsorship', 'Contender — $250');
        else
          inc('sponsorship', 'Community Sponsor');
      }
    }

    // Flatten counts into SheetRow array
    return Object.entries(counts).flatMap(([category, items]) =>
      Object.entries(items).map(([name, have]) => ({ category, name, have }))
    );
  }
}
