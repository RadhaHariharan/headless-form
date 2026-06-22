import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactFormComponent } from './contact-form.component.js';
import { UncontrolledFormComponent } from './uncontrolled-form.component.js';
import { ListFormComponent } from './list-form.component.js';

type TabId = 'controlled' | 'uncontrolled' | 'list';

@Component({
  standalone: true,
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ContactFormComponent, UncontrolledFormComponent, ListFormComponent],
  template: `
    <h1>&#64;headless-form/angular <span class="badge">Angular 18</span></h1>

    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
      <button *ngFor="let t of tabs" (click)="activeTab = t.id"
        [style.background]="activeTab === t.id ? '#2b6cb0' : '#e2e8f0'"
        [style.color]="activeTab === t.id ? '#fff' : '#2d3748'"
        style="border:none;border-radius:4px;padding:.375rem 1rem;cursor:pointer;font-size:.875rem">
        {{ t.label }}
      </button>
    </div>

    <div class="section">
      <app-contact-form *ngIf="activeTab === 'controlled'" />
      <app-uncontrolled-form *ngIf="activeTab === 'uncontrolled'" />
      <app-list-form *ngIf="activeTab === 'list'" />
    </div>
  `,
})
export class AppComponent {
  activeTab: TabId = 'controlled';
  tabs: Array<{ id: TabId; label: string }> = [
    { id: 'controlled', label: 'Controlled' },
    { id: 'uncontrolled', label: 'Uncontrolled' },
    { id: 'list', label: 'List Fields' },
  ];
}
