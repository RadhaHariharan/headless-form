import {
  Directive,
  ElementRef,
  HostListener,
  Injector,
  Input,
  Renderer2,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import type { Signal, EffectRef, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import type { FormApi } from './inject-form.js';

/** Input type coercions that the directive understands. */
type FieldType = 'input' | 'checkbox' | 'radio' | 'number';

/**
 * Angular attribute directive that wires a native `<input>` (or any form control) to a
 * `FormApi` field — the Angular equivalent of `getInputProps()`.
 *
 * @remarks
 * - Writes `data-path` on the host element so that `form.getInputNode(path)` works.
 * - Supports `type="checkbox"`, `type="radio"`, and `type="number"` coercions.
 * - Tracks `blur` / `focus` for touch state.
 * - Works under `ChangeDetectionStrategy.OnPush` and in zoneless apps because it drives
 *   updates through Angular Signals (no Zone.js reliance).
 *
 * @example
 * ```html
 * <input [hfField]="form" path="user.email" />
 * <input [hfField]="form" path="accept" type="checkbox" />
 * <input [hfField]="form" path="age"    type="number" />
 * ```
 */
@Directive({
  standalone: true,
  selector: '[hfField]',
  exportAs: 'hfField',
})
export class HfFieldDirective implements OnInit, OnChanges, OnDestroy {
  /**
   * The `FormApi` instance this field belongs to.
   * Bound via `[hfField]="form"`.
   */
  @Input('hfField') form: FormApi<unknown, unknown, unknown> | null = null;

  /**
   * Dot-notation path of the field inside the form values, e.g. `"user.email"`.
   */
  @Input() path = '';

  /**
   * HTML input type hint. Governs how values are read and set on the element.
   * @defaultValue `'input'`
   */
  @Input() type: FieldType = 'input';

  /**
   * Signal exposing the current field error for template binding.
   * Reads as `null` when the field is valid or the directive is not yet bound.
   */
  readonly error: Signal<unknown> = signal<unknown>(null);

  /**
   * Signal that is `true` while the form is running async validation.
   */
  readonly isValidating: Signal<boolean> = signal<boolean>(false);

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly injector = inject(Injector);

  private syncEffect: EffectRef | null = null;
  private unwatch: (() => void) | null = null;

  /** @internal */
  ngOnInit(): void {
    this.setupBindings();
  }

  /** @internal */
  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['form'] !== undefined ||
      changes['path'] !== undefined ||
      changes['type'] !== undefined
    ) {
      this.teardown();
      if (this.form && this.path) this.setupBindings();
    }
  }

  /** @internal */
  ngOnDestroy(): void {
    this.teardown();
  }

  /** Maps the directive's FieldType to the core InputType (number inputs use 'input'). */
  private get coreType(): 'input' | 'checkbox' | 'radio' {
    return this.type === 'number' ? 'input' : this.type;
  }

  /** Forwards the host blur event to the core store (marks field as touched). */
  @HostListener('blur')
  onBlur(): void {
    if (!this.form || !this.path) return;
    this.form.getInputProps(this.path, { type: this.coreType }).onBlur?.();
  }

  /** Forwards the host focus event to the core store. */
  @HostListener('focus')
  onFocus(): void {
    if (!this.form || !this.path) return;
    this.form.getInputProps(this.path, { type: this.coreType }).onFocus?.();
  }

  /**
   * Forwards the host `change` event to the core store.
   *
   * @param event - The native DOM change event.
   */
  @HostListener('change', ['$event'])
  onChange(event: Event): void {
    if (!this.form || !this.path) return;
    this.form.getInputProps(this.path, { type: this.coreType }).onChange(event);
  }

  /**
   * Forwards the host `input` event to the core store (text and number inputs only).
   * Checkbox and radio rely on the `change` event.
   *
   * @param event - The native DOM input event.
   */
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (this.type === 'checkbox' || this.type === 'radio') return;
    if (!this.form || !this.path) return;
    this.form.getInputProps(this.path, { type: this.coreType }).onChange(event);
  }

  private setupBindings(): void {
    if (!this.form || !this.path) return;
    const { form, path } = this;

    this.renderer.setAttribute(this.el.nativeElement, 'data-path', path);

    const errorSig = this.error as ReturnType<typeof signal<unknown>>;
    const validatingSig = this.isValidating as ReturnType<typeof signal<boolean>>;

    this.syncEffect = runInInjectionContext(this.injector, () =>
      effect(
        () => {
          const errors = form.errors();
          const formValidating = form.validating();
          errorSig.set((errors[path] ?? null) as unknown);
          validatingSig.set(formValidating);
          this.syncDomValue(form, path);
        },
        { allowSignalWrites: true },
      ),
    );

    this.unwatch = form.watch(path as never, () => {
      this.syncDomValue(form, path);
    });
  }

  private syncDomValue(form: FormApi<unknown, unknown, unknown>, path: string): void {
    const el = this.el.nativeElement;
    const values = form.getValues() as Record<string, unknown>;
    const value = this.readNestedValue(values, path);
    const t = this.type;
    const elType: string = (el as HTMLInputElement).type ?? t;

    if (t === 'checkbox' || elType === 'checkbox') {
      this.renderer.setProperty(el, 'checked', Boolean(value));
    } else if (t === 'radio' || elType === 'radio') {
      this.renderer.setProperty(el, 'checked', el.value === String(value ?? ''));
    } else {
      this.renderer.setProperty(el, 'value', value == null ? '' : String(value));
    }
  }

  private readNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc !== null && acc !== undefined && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private teardown(): void {
    this.syncEffect?.destroy();
    this.syncEffect = null;
    this.unwatch?.();
    this.unwatch = null;
  }
}
