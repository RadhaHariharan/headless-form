import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectForm } from '@headless-form/angular';
import { HfFieldDirective } from '@headless-form/angular';

type Values = { tags: string[] };

@Component({
  standalone: true,
  selector: 'app-list-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HfFieldDirective],
  template: `
    <h2>List Fields</h2>

    <div *ngFor="let tag of tags; let i = index" style="display:flex;gap:.5rem;margin-bottom:.25rem">
      <input [hfField]="form" [path]="'tags.' + i" style="flex:1" [placeholder]="'Tag ' + (i + 1)" />
      <button type="button" (click)="form.removeListItem('tags', i)" style="background:#e53e3e;padding:.5rem">×</button>
    </div>

    <button type="button" (click)="form.insertListItem('tags', '')" style="background:#38a169;margin-top:.5rem">
      + Add tag
    </button>

    <pre style="margin-top:1rem">{{ debugJson() }}</pre>
  `,
})
export class ListFormComponent {
  form = injectForm<Values>({
    initialValues: { tags: ['angular', 'signals'] },
  });

  get tags(): string[] {
    return (this.form.getValues() as Values).tags;
  }

  debugJson(): string {
    return JSON.stringify(this.form.getValues(), null, 2);
  }
}
