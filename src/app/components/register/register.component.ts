import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Option { value: string; label: string; }

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  form: FormGroup;
  submitted = false;
  success = false;

  roles: Option[] = [
    { value: 'sponsor',       label: 'Become a Sponsor' },
    { value: 'volunteer',     label: 'Volunteer' },
    { value: 'vendor',        label: 'Vendor / Activity Station' },
    { value: 'food',          label: 'Food & Drinks Donor' },
    { value: 'supplies',      label: 'Supply Donation' },
    { value: 'entertainment', label: 'Entertainment / Performer' },
    { value: 'other',         label: 'Other' },
  ];

  subOptionLabels: Record<string, string> = {
    sponsor:       'Sponsorship Tier',
    volunteer:     'Volunteer Position',
    vendor:        'Activity / Station Type',
    food:          'What Will You Provide?',
    supplies:      'What Will You Donate?',
    entertainment: 'Performance Type',
  };

  subOptions: Record<string, Option[]> = {
    sponsor: [
      { value: 'heavyweight', label: 'Heavyweight — $1,000+' },
      { value: 'champion',    label: 'Champion — $500' },
      { value: 'contender',   label: 'Contender — $250' },
      { value: 'community',   label: 'Community Sponsor — Any Amount' },
    ],
    volunteer: [
      { value: 'setup',              label: 'Setup Crew — tables, tents & decorations' },
      { value: 'greeter',            label: 'Greeter / Check-In — welcome families & hand out materials' },
      { value: 'station-helper',     label: 'Activity Station Helper — assist kids at stations' },
      { value: 'supply-distro',      label: 'Supply Distribution — hand out backpacks & supplies' },
      { value: 'food-service',       label: 'Food Service — set up & serve food and drinks' },
      { value: 'stage-crew',         label: 'Stage Crew / MC Support — entertainment & sound' },
      { value: 'cleanup',            label: 'Cleanup Crew — break down after the event' },
      { value: 'other',              label: 'Other — tell us in the notes below' },
    ],
    vendor: [
      { value: 'bounce-house',       label: 'Bounce House' },
      { value: 'face-painting',      label: 'Face Painting' },
      { value: 'arts-crafts',        label: 'Arts & Crafts Table' },
      { value: 'vision-screening',   label: 'Vision Screening' },
      { value: 'health-screening',   label: 'Health / Wellness Screening' },
      { value: 'games',              label: 'Games & Activities' },
      { value: 'haircuts',           label: 'Haircuts' },
      { value: 'other',              label: 'Other — tell us in the notes below' },
    ],
    food: [
      { value: 'prepared-meals',     label: 'Prepared / Ready-to-Eat Meals' },
      { value: 'snacks-beverages',   label: 'Snacks & Beverages' },
      { value: 'grill',              label: 'Grill / BBQ Setup' },
      { value: 'other',              label: 'Other — tell us in the notes below' },
    ],
    supplies: [
      { value: 'backpacks',          label: 'Backpacks' },
      { value: 'school-supplies',    label: 'School Supplies (notebooks, pens, crayons, etc.)' },
      { value: 'snacks',             label: 'Snacks (pre-packaged)' },
      { value: 'gift-cards',         label: 'Gift Cards (Walmart, Target, or school stores)' },
      { value: 'other',              label: 'Other — tell us in the notes below' },
    ],
    entertainment: [
      { value: 'music',              label: 'Music Performance' },
      { value: 'dance',              label: 'Dance Group' },
      { value: 'magic',              label: 'Magic Show' },
      { value: 'comedy',             label: 'Comedy / Spoken Word' },
      { value: 'dj',                 label: 'DJ' },
      { value: 'other',              label: 'Other — tell us in the notes below' },
    ],
  };

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name:         ['', Validators.required],
      organization: [''],
      email:        ['', [Validators.required, Validators.email]],
      phone:        [''],
      role:         ['', Validators.required],
      subOption:    [''],
      website:      [''],
      message:      [''],
    });
  }

  get selectedRole(): string {
    return this.form.get('role')?.value ?? '';
  }

  get currentSubOptions(): Option[] | null {
    return this.subOptions[this.selectedRole] ?? null;
  }

  get currentSubLabel(): string {
    return this.subOptionLabels[this.selectedRole] ?? 'Specify';
  }

  get isOther(): boolean {
    const role = this.selectedRole;
    const sub  = this.form.get('subOption')?.value;
    return role === 'other' || sub === 'other';
  }

  onRoleChange(): void {
    this.form.get('subOption')?.reset('');
    this.form.get('website')?.reset('');
  }

  fieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.submitted));
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const v = this.form.value;

    // Map our fields to the Google Form entry IDs
    const entryMap: Record<string, string> = {
      'entry.464642927':  v.name         ?? '',   // Contact Person
      'entry.1286419950': v.organization ?? '',   // Business Name
      'entry.980066357':  v.email        ?? '',   // Email address
      'entry.574497675':  v.phone        ?? '',   // Phone number
      'entry.1832023793': this.roleLabel(v.role), // How would you like to participate?
    };

    // Sub-options each have their own entry depending on role
    const subLabel = this.subOptionLabel(v.role, v.subOption);
    if (subLabel) {
      const subEntry: Record<string, string> = {
        sponsor:       'entry.472412222',  // Sponsorship levels
        vendor:        'entry.1388657329', // Activity / services stations
        supplies:      'entry.1857708770', // Supply donations
        entertainment: 'entry.270268180',  // Entertainment options
      };
      if (subEntry[v.role]) entryMap[subEntry[v.role]] = subLabel;
    }

    // For sponsors, embed website in the participation field so the sheet can read it
    if (v.role === 'sponsor' && v.website) {
      entryMap['entry.1832023793'] =
        `${entryMap['entry.1832023793']} | Website: ${v.website}`.trim();
    }

    // Notes / message — append to a combined field if present
    if (v.message) {
      entryMap['entry.1832023793'] =
        `${entryMap['entry.1832023793']} — ${v.message}`.trim();
    }

    const body = new URLSearchParams(entryMap);

    // Google Forms doesn't return CORS headers so we use no-cors.
    // The request still goes through — we just can't read the response.
    fetch(
      'https://docs.google.com/forms/d/e/1FAIpQLSd0Hcv1M8grTbIpeP6C-QnpFi2O8LRFp9y_5VbFHOZJAUmUcw/formResponse',
      { method: 'POST', mode: 'no-cors', body }
    ).finally(() => {
      this.success = true;
      this.form.reset();
      this.submitted = false;
    });
  }

  private roleLabel(roleValue: string): string {
    return this.roles.find(r => r.value === roleValue)?.label ?? roleValue;
  }

  private subOptionLabel(roleValue: string, subValue: string): string {
    if (!subValue) return '';
    const opts = this.subOptions[roleValue] ?? [];
    return opts.find(o => o.value === subValue)?.label ?? subValue;
  }
}
