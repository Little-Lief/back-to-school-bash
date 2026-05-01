import { Component } from '@angular/core';

const SHARE_URL  = 'https://event.thejonesgym.com';
const SHARE_TEXT = 'Jones Gym 4th Annual Back to School Bash — August 15, 2026. Free school supplies, food, activities & more for kids in the community!';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  copied = false;

  get canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  shareLinks = {
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
    x:         `https://twitter.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
    linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
    whatsapp:  `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`,
  };

  async nativeShare() {
    try {
      await navigator.share({ title: 'Back to School Bash', text: SHARE_TEXT, url: SHARE_URL });
    } catch { /* user cancelled */ }
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      this.copied = true;
      setTimeout(() => this.copied = false, 2500);
    } catch { /* fallback: select text */ }
  }
}
