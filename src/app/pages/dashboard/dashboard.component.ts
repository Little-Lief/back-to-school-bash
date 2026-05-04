import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { SheetsService, Sponsor, TIER_ORDER } from '../../services/sheets.service';
import { NeedItem, NeedCategory } from '../../components/about/about.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private sheets = inject(SheetsService);

  // ── Funding ──────────────────────────────────────────────────
  fundingGoal    = 15_000;
  fundingPledged = 0;
  fundingPaid    = 0;

  // ── State ────────────────────────────────────────────────────
  loading      = false;
  lastUpdated: Date | null = null;
  error        = false;
  sponsors: Sponsor[] = [];

  // ── Tier labels / sponsor wall ────────────────────────────────
  readonly tierLabels: Record<string, string> = {
    heavyweight: 'Heavyweight',
    champion:    'Champion',
    contender:   'Contender',
    community:   'Community Sponsor',
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

  // ── Needs categories (exact copy from about.component.ts) ────
  needCategories: NeedCategory[] = [
    {
      id: 'supplies',
      label: 'School Supplies',
      icon: '🎒',
      items: [
        // Backpacks — from Amazon wish list
        { name: 'Backpacks — Girls (ages 5–8)',        detail: 'mibasies, various colors',                   have: 0, need: 30,  unit: 'backpacks' },
        { name: 'Backpacks — Boys (ages 5–8)',         detail: 'mibasies, various colors',                   have: 0, need: 20,  unit: 'backpacks' },
        { name: 'Backpacks — Classic 17″',             detail: 'Trailmaker, neutral colors',                 have: 0, need: 40,  unit: 'backpacks' },
        { name: 'Backpacks — Various Styles',          detail: 'rickyh style, all ages',                     have: 0, need: 50,  unit: 'backpacks' },
        // Notebooks
        { name: 'Composition Notebooks',               detail: 'Oxford Spiral, 6-pack',                      have: 5, need: 40,  unit: 'packs'     },
        // Pencils — from Amazon wish list
        { name: 'Pencils & Pens (Wood-Cased)',         detail: 'Amazon Basics',                              have: 0, need: 35,  unit: 'packs'     },
        { name: 'Pencils & Pens (Mechanical)',         detail: 'BIC Xtra-Smooth, 10-pack',                   have: 0, need: 100, unit: 'packs'     },
        // Crayons — from Amazon wish list
        { name: 'Crayons & Colored Pencils (36ct)',    detail: 'Crayola',                                    have: 5, need: 100, unit: 'boxes'     },
        { name: 'Crayons & Colored Pencils (Crayons)', detail: 'Crayola 24ct, 3-pack',                       have: 0, need: 35,  unit: 'packs'     },
        // Highlighters — from Amazon wish list
        { name: 'Highlighters',                        detail: 'V-Opitos 30-pack',                           have: 0, need: 35,  unit: 'packs'     },
        // Glue sticks — from Amazon wish list
        { name: 'Glue Sticks',                         detail: "Elmer's Disappearing Purple, 3-pack",        have: 5, need: 100, unit: 'sticks'    },
        // Scissors — from Amazon wish list
        { name: "Kids' Scissors",                      detail: 'BURVAGY Safety Scissors, 16-pack',           have: 0, need: 10,  unit: 'sets'      },
        // Rulers — not on Amazon list, keep for sheet tracking
        { name: 'Rulers & Geometry Sets',              detail: 'Middle school supplies',                     have: 0, need: 50,  unit: 'sets'      },
        // Folders & Binders — from Amazon wish list
        { name: 'Folders & Binders (Pocket Folders)',  detail: 'Amazon Basics Heavy Duty',                   have: 5, need: 40,  unit: 'folders'   },
        { name: 'Folders & Binders (3-Ring Binders)',  detail: 'SUNEE 1-inch, 6-pack',                       have: 0, need: 30,  unit: 'binders'   },
        // Pencil pouches — from Amazon wish list
        { name: 'Pencil Pouches / Cases',              detail: 'YEGEER for 3-ring binder',                   have: 0, need: 35,  unit: 'pouches'   },
        // Erasers — not on Amazon list, keep for sheet tracking
        { name: 'Erasers',                             detail: '',                                            have: 0, need: 150, unit: 'packs'     },
        // Paper — from Amazon wish list
        { name: 'Loose-Leaf Paper (College Ruled)',    detail: 'Rosmonde, 6×150 sheets',                     have: 0, need: 10,  unit: 'packs'     },
        { name: 'Loose-Leaf Paper (Filler)',           detail: 'Top Flight, 150 sheets',                     have: 0, need: 20,  unit: 'packs'     },
        // Gift cards — not on Amazon list, keep for sheet tracking
        { name: 'Gift Cards',                          detail: 'Walmart, Target, or school supply stores',   have: 0, need: 25,  unit: 'gift cards'},
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

  // ── Mobile accordion state ────────────────────────────────────
  expandedCategories = new Set<string>();

  toggleCategory(cat: NeedCategory): void {
    this.expandedCategories.has(cat.id)
      ? this.expandedCategories.delete(cat.id)
      : this.expandedCategories.add(cat.id);
  }

  isExpanded(cat: NeedCategory): boolean {
    return this.expandedCategories.has(cat.id);
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error   = false;
    this.sheets.fetch().subscribe({
      next: payload => {
        this.fundingPledged = payload.fundingPledged ?? this.fundingPledged;
        this.fundingPaid    = payload.fundingPaid    ?? this.fundingPaid;
        this.applyItems(payload.items ?? []);
        this.sponsors    = payload.sponsors ?? [];
        this.lastUpdated = new Date();
        this.loading     = false;
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      },
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

  // ── Computed getters ──────────────────────────────────────────

  /** Days remaining until Aug 1 2026 */
  get daysUntilEvent(): number {
    const event = new Date(2026, 7, 1); // month is 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    event.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((event.getTime() - today.getTime()) / 86_400_000));
  }

  /** Sum of `have` across every volunteer item */
  get totalVolunteers(): number {
    const cat = this.needCategories.find(c => c.id === 'volunteers');
    return cat ? cat.items.reduce((s, i) => s + i.have, 0) : 0;
  }

  /** Sum of `have` across every stations item */
  get confirmedStations(): number {
    const cat = this.needCategories.find(c => c.id === 'stations');
    return cat ? cat.items.reduce((s, i) => s + i.have, 0) : 0;
  }

  /** Sum of `have` for all 4 backpack items */
  get totalBackpacks(): number {
    const cat = this.needCategories.find(c => c.id === 'supplies');
    if (!cat) return 0;
    return cat.items
      .filter(i => i.name.startsWith('Backpacks'))
      .reduce((s, i) => s + i.have, 0);
  }

  /**
   * Percentage of non-backpack supply items where have > 0.
   * Rounded to nearest whole number.
   */
  get supplyProgress(): number {
    const cat = this.needCategories.find(c => c.id === 'supplies');
    if (!cat) return 0;
    const nonBp = cat.items.filter(i => !i.name.startsWith('Backpacks'));
    if (nonBp.length === 0) return 0;
    const haveAny = nonBp.filter(i => i.have > 0).length;
    return Math.round((haveAny / nonBp.length) * 100);
  }

  /**
   * Estimated number of backpacks that can be fully filled.
   * Uses per-item multipliers to convert packs/boxes → per-child count,
   * then finds the most limiting supply item, then takes Math.min with totalBackpacks.
   *
   * Multipliers:
   *   Composition Notebooks      × 3  (Oxford 6-pack → 2 per child → each pack covers ~3 kids? use 3)
   *   Pencils (Wood-Cased)       × 1  (1 pack per backpack)
   *   Pencils (Mechanical)       × 1
   *   Crayons/Colored Pencils    × 1  (any crayon item)
   *   Glue Sticks                × 1  (3-pack → 1 per child)
   *   Kids' Scissors (16-pack)   × 16
   *   Pencil Pouches / Cases     × 1
   */
  get estimatedFillable(): number {
    const backpacks = this.totalBackpacks;
    if (backpacks === 0) return 0;

    const cat = this.needCategories.find(c => c.id === 'supplies');
    if (!cat) return 0;

    const multipliers: { name: string; multiplier: number }[] = [
      { name: 'Composition Notebooks',               multiplier: 3  },
      { name: 'Pencils & Pens (Wood-Cased)',         multiplier: 1  },
      { name: 'Pencils & Pens (Mechanical)',         multiplier: 1  },
      { name: 'Crayons & Colored Pencils (36ct)',    multiplier: 1  },
      { name: 'Crayons & Colored Pencils (Crayons)', multiplier: 1  },
      { name: 'Glue Sticks',                         multiplier: 1  },
      { name: "Kids' Scissors",                      multiplier: 16 },
      { name: 'Pencil Pouches / Cases',              multiplier: 1  },
    ];

    let limiting = backpacks;
    for (const { name, multiplier } of multipliers) {
      const item = cat.items.find(i => i.name === name);
      if (!item || item.have === 0) continue;
      const childCount = item.have * multiplier;
      limiting = Math.min(limiting, childCount);
    }
    return limiting;
  }

  get pledgedPercent(): number {
    return Math.min(100, Math.round((this.fundingPledged / this.fundingGoal) * 100));
  }

  get paidPercent(): number {
    return Math.min(100, Math.round((this.fundingPaid / this.fundingGoal) * 100));
  }

  // ── Item helpers ──────────────────────────────────────────────
  pct(item: NeedItem): number {
    if (item.need === 0) return 0;
    return Math.min(100, Math.round((item.have / item.need) * 100));
  }

  isMet(item: NeedItem): boolean {
    return item.need > 0 && item.have >= item.need;
  }
}
