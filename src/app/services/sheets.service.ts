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
        // Log raw shape so we can see the sheet structure and map it
        console.log('[Sheets] Raw data received:', raw);
        return this.mapPayload(raw);
      }),
      catchError(err => {
        console.warn('[Sheets] Fetch failed — using hardcoded data.', err);
        return of({ fundingRaised: 0, items: [], sponsors: [] });
      })
    );
  }

  // ── Mapping ──────────────────────────────────────────────────
  // Updated once we can see what columns the sheet actually uses.
  private mapPayload(raw: Record<string, unknown[]>): SheetPayload {
    return {
      fundingRaised: this.parseFunding(raw),
      items:         this.parseItems(raw),
      sponsors:      this.parseSponsors(raw),
    };
  }

  private parseFunding(raw: Record<string, unknown[]>): number {
    // Try common tab names — will update once we see the real sheet
    const tab = raw['funding'] ?? raw['Funding'] ?? raw['FUNDING'] ?? [];
    const first = tab[0] as Record<string, unknown> | undefined;
    if (!first) return 0;
    // Try common column names
    const val = first['fundingraised'] ?? first['fundingRaised']
             ?? first['amount']        ?? first['raised']
             ?? Object.values(first)[0];
    return Number(val) || 0;
  }

  private parseItems(raw: Record<string, unknown[]>): SheetRow[] {
    const tab = raw['items'] ?? raw['Items'] ?? raw['ITEMS'] ?? [];
    return (tab as Record<string, unknown>[])
      .map(r => ({
        category: String(r['category'] ?? r['Category'] ?? '').trim(),
        name:     String(r['name']     ?? r['Name']     ?? r['item'] ?? '').trim(),
        have:     Number(r['have']     ?? r['Have']     ?? r['confirmed'] ?? 0),
      }))
      .filter(r => r.category && r.name);
  }

  private parseSponsors(raw: Record<string, unknown[]>): Sponsor[] {
    const tab = raw['sponsors'] ?? raw['Sponsors'] ?? raw['SPONSORS'] ?? [];
    return (tab as Record<string, unknown>[])
      .map(r => ({
        name:    String(r['name']    ?? r['Name']    ?? r['business'] ?? '').trim(),
        tier:    String(r['tier']    ?? r['Tier']    ?? r['level']    ?? '').trim().toLowerCase(),
        website: String(r['website'] ?? r['Website'] ?? r['url']      ?? r['link'] ?? '').trim(),
      }))
      .filter(r => r.name && (TIER_ORDER as readonly string[]).includes(r.tier));
  }
}
