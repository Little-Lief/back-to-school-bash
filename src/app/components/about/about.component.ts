import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SheetsService, Sponsor, TIER_ORDER } from '../../services/sheets.service';

export interface NeedItem {
  name: string;
  detail: string;
  have: number;   // confirmed / donated — updated from Google Sheets
  need: number;   // target quantity (0 = open-ended, no cap shown)
  unit: string;
}

export interface NeedCategory {
  id: string;
  label: string;
  icon: string;
  items: NeedItem[];
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  private sheets = inject(SheetsService);

  // ── Funding goal ─────────────────────────────────────────────
  fundingGoal   = 10_000;
  fundingRaised =      0;   // overwritten by sheet data

  loading = false;
  lastUpdated: Date | null = null;
  error = false;

  // Sponsors pulled from the "sponsors" sheet tab
  sponsors: Sponsor[] = [];

  readonly tierLabels: Record<string, string> = {
    heavyweight: 'Heavyweight',
    champion:    'Champion',
    contender:   'Contender',
  };

  get sponsorGroups(): { tier: string; label: string; sponsors: Sponsor[] }[] {
    return TIER_ORDER
      .map(tier => ({
        tier,
        label: this.tierLabels[tier],
        sponsors: this.sponsors.filter(s => s.tier === tier),
      }))
      .filter(g => g.sponsors.length > 0);
  }

  get sheetsConnected(): boolean {
    return this.sheets.isConfigured;
  }

  get fundingPercent(): number {
    return Math.min(100, Math.round((this.fundingRaised / this.fundingGoal) * 100));
  }

  fmt(n: number): string {
    return n.toLocaleString('en-US');
  }

  // ── Needs data ───────────────────────────────────────────────
  // Update `have` values by editing the connected Google Sheet.
  // Or change them here directly if not using the sheet.
  needCategories: NeedCategory[] = [
    {
      id: 'supplies',
      label: 'School Supplies',
      icon: '🎒',
      items: [
        { name: 'Backpacks',                 detail: 'All sizes — elementary through high school', have: 0, need: 150, unit: 'backpacks' },
        { name: 'Composition Notebooks',     detail: 'Wide-ruled preferred',                       have: 0, need: 200, unit: 'notebooks' },
        { name: 'Pencils & Pens',            detail: '',                                            have: 0, need: 50,  unit: 'packs' },
        { name: 'Crayons & Colored Pencils', detail: '24-count boxes or larger',                   have: 0, need: 75,  unit: 'boxes' },
        { name: 'Glue Sticks',               detail: '',                                            have: 0, need: 100, unit: 'glue sticks' },
        { name: "Kids' Scissors",            detail: 'Safety scissors, ages 5–12',                 have: 0, need: 75,  unit: 'pairs' },
        { name: 'Rulers & Geometry Sets',    detail: 'Middle school supplies',                     have: 0, need: 50,  unit: 'sets' },
        { name: 'Folders & Binders',         detail: 'Plastic pocket folders, 1″ binders',         have: 0, need: 100, unit: 'folders' },
        { name: 'Pencil Pouches / Cases',    detail: '',                                            have: 0, need: 75,  unit: 'pouches' },
        { name: 'Erasers',                   detail: '',                                            have: 0, need: 150, unit: 'packs' },
        { name: 'Loose-Leaf Paper',          detail: 'College- and wide-ruled',                    have: 0, need: 50,  unit: 'reams' },
        { name: 'Gift Cards',                detail: 'Walmart, Target, or school supply stores',   have: 0, need: 25,  unit: 'gift cards' },
      ]
    },
    {
      id: 'food',
      label: 'Food & Drinks',
      icon: '🍕',
      items: [
        { name: 'Prepared / Ready-to-Eat Meals', detail: 'For families attending the event',        have: 0, need: 200, unit: 'servings' },
        { name: 'Snacks & Beverages',            detail: 'Pre-packaged, nut-free preferred',         have: 0, need: 300, unit: 'items' },
        { name: 'Grill / BBQ Setup',             detail: 'Equipment, fuel & someone to run it',     have: 0, need: 1,   unit: 'setup' },
      ]
    },
    {
      id: 'stations',
      label: 'Activity Stations',
      icon: '🎪',
      items: [
        { name: 'Bounce House',                detail: '',                                           have: 1, need: 3, unit: 'bounce houses' },
        { name: 'Face Painting',               detail: '',                                           have: 0, need: 2, unit: 'stations' },
        { name: 'Arts & Crafts Table',         detail: '',                                           have: 0, need: 2, unit: 'stations' },
        { name: 'Vision Screening',            detail: 'Licensed medical professional needed',      have: 0, need: 1, unit: 'station' },
        { name: 'Health & Wellness Screening', detail: 'Licensed medical professional needed',      have: 0, need: 1, unit: 'station' },
        { name: 'Games & Activities',          detail: '',                                           have: 0, need: 3, unit: 'stations' },
        { name: 'Haircuts',                    detail: 'Licensed barber or stylist',                 have: 0, need: 2, unit: 'stylists' },
        { name: 'Photo Station',               detail: 'Free back-to-school photos for families',   have: 0, need: 1, unit: 'station' },
      ]
    },
    {
      id: 'entertainment',
      label: 'Entertainment',
      icon: '🎤',
      items: [
        { name: 'Music Performance',    detail: '30-min stage set',         have: 0, need: 2, unit: 'performers' },
        { name: 'Dance Group',          detail: '30-min performance',        have: 0, need: 1, unit: 'group' },
        { name: 'Magic Show',           detail: '30-min set',                have: 0, need: 1, unit: 'performer' },
        { name: 'Comedy / Spoken Word', detail: '30-min set',                have: 0, need: 1, unit: 'performer' },
        { name: 'DJ',                   detail: 'Full-event sound & music',  have: 0, need: 1, unit: 'DJ' },
      ]
    },
    {
      id: 'volunteers',
      label: 'Volunteers',
      icon: '🙌',
      items: [
        { name: 'Setup Crew',               detail: 'Tables, tents & decorations — morning of event',  have: 0, need: 10, unit: 'volunteers' },
        { name: 'Greeters / Check-In',      detail: 'Welcome families and hand out materials',          have: 0, need: 5,  unit: 'volunteers' },
        { name: 'Activity Station Helpers', detail: 'Assist kids at stations throughout the day',       have: 0, need: 15, unit: 'volunteers' },
        { name: 'Supply Distribution',      detail: 'Hand out backpacks and school supplies',           have: 0, need: 8,  unit: 'volunteers' },
        { name: 'Food Service',             detail: 'Set up and serve food and drinks',                 have: 0, need: 8,  unit: 'volunteers' },
        { name: 'Stage Crew / MC Support',  detail: 'Entertainment setup and coordination',             have: 0, need: 4,  unit: 'volunteers' },
        { name: 'Cleanup Crew',             detail: 'Break down everything after the event',            have: 0, need: 10, unit: 'volunteers' },
      ]
    },
    {
      id: 'sponsorship',
      label: 'Sponsorship',
      icon: '🏆',
      items: [
        { name: 'Heavyweight — $1,000+', detail: 'Premium logo placement, stage recognition & social media spotlight', have: 0, need: 0, unit: 'confirmed' },
        { name: 'Champion — $500',       detail: 'Logo on event materials & prominent visibility',                     have: 0, need: 0, unit: 'confirmed' },
        { name: 'Contender — $250',      detail: 'Business name on event signage',                                     have: 0, need: 0, unit: 'confirmed' },
        { name: 'Community Sponsor',     detail: 'Any amount — every dollar goes directly to families',                have: 0, need: 0, unit: 'confirmed' },
      ]
    },
  ];

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadSheetData();
  }

  loadSheetData(): void {
    if (!this.sheetsConnected) return;

    this.loading = true;
    this.error = false;

    this.sheets.fetch().subscribe({
      next: payload => {
        this.fundingRaised = payload.fundingRaised ?? this.fundingRaised;
        this.applyItems(payload.items ?? []);
        this.sponsors = payload.sponsors ?? [];
        this.lastUpdated = new Date();
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private applyItems(rows: { category: string; name: string; have: number }[]): void {
    for (const cat of this.needCategories) {
      for (const item of cat.items) {
        const row = rows.find(r => r.category === cat.id && r.name === item.name);
        if (row !== undefined) {
          item.have = Number(row.have) || 0;
        }
      }
    }
  }

  // ── Mobile accordion ────────────────────────────────────────
  expandedCategories = new Set<string>();

  toggleCategory(cat: NeedCategory): void {
    this.expandedCategories.has(cat.id)
      ? this.expandedCategories.delete(cat.id)
      : this.expandedCategories.add(cat.id);
  }

  isExpanded(cat: NeedCategory): boolean {
    return this.expandedCategories.has(cat.id);
  }

  // ── Item helpers ─────────────────────────────────────────────
  pct(item: NeedItem): number {
    if (item.need === 0) return 0;
    return Math.min(100, Math.round((item.have / item.need) * 100));
  }

  isMet(item: NeedItem): boolean {
    return item.need > 0 && item.have >= item.need;
  }

  // ── Category / overall helpers ───────────────────────────────
  metFor(cat: NeedCategory): number {
    return cat.items.filter(i => this.isMet(i)).length;
  }

  get totalItems(): number {
    return this.needCategories.reduce((s, c) => s + c.items.length, 0);
  }

  get metItems(): number {
    return this.needCategories.reduce((s, c) => s + this.metFor(c), 0);
  }

  // ── Navigation ───────────────────────────────────────────────
  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
