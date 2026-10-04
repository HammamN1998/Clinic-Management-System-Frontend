import { Directive, ElementRef, Renderer2, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const ARABIC_INDIC_ZERO = 0x0660; // ٠ .. ٩
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0; // ۰ .. ۹ (Persian/Urdu keyboards)
const ARABIC_DECIMAL_SEPARATOR = '\u066b'; // ٫

/**
 * Keeps only what can form a non-negative decimal, translating Arabic-Indic digits
 * on the way. Thousands separators and minus signs are dropped.
 */
function toDecimalText(raw: string): string {
  let text = '';
  let hasSeparator = false;

  for (const char of raw) {
    const code = char.codePointAt(0) as number;
    let digit = -1;

    if (char >= '0' && char <= '9') {
      digit = code - 0x30;
    } else if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      digit = code - ARABIC_INDIC_ZERO;
    } else if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      digit = code - EXTENDED_ARABIC_INDIC_ZERO;
    }

    if (digit >= 0) {
      text += digit;
    } else if (!hasSeparator && (char === '.' || char === ARABIC_DECIMAL_SEPARATOR)) {
      hasSeparator = true;
      text += '.';
    }
  }

  return text;
}

/**
 * Money input that accepts Arabic-Indic digits.
 *
 * `type="number"` cannot be used for this: the browser blanks any value that is not
 * written in ASCII digits, so a doctor typing ١٢٠ leaves the control holding null while
 * the field still shows the number. This reads the text as typed, converts it, and
 * reports a real `number` to the form so totals keep adding up rather than concatenating.
 */
@Directive({
  selector: 'input[appNumericInput]',
  standalone: true,
  host: {
    inputmode: 'decimal',
    '(input)': 'handleInput()',
    '(blur)': 'handleBlur()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumericInputDirective),
      multi: true,
    },
  ],
})
export class NumericInputDirective implements ControlValueAccessor {
  private propagateChange: (value: number | null) => void = () => undefined;
  private propagateTouched: () => void = () => undefined;

  constructor(
    private readonly element: ElementRef<HTMLInputElement>,
    private readonly renderer: Renderer2,
  ) {}

  handleInput(): void {
    const input = this.element.nativeElement;
    const raw = input.value;
    const text = toDecimalText(raw);

    if (text !== raw) {
      // Something was converted or dropped, so put the caret back where the doctor left it
      // instead of letting the rewrite push it to the end.
      const caret = Math.max(
        0,
        Math.min(text.length, (input.selectionStart ?? raw.length) - (raw.length - text.length)),
      );
      this.write(text);
      input.setSelectionRange(caret, caret);
    }

    const parsed = Number.parseFloat(text);
    this.propagateChange(Number.isNaN(parsed) ? null : parsed);
  }

  handleBlur(): void {
    this.propagateTouched();
  }

  writeValue(value: unknown): void {
    this.write(typeof value === 'number' && Number.isFinite(value) ? String(value) : '');
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagateTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.element.nativeElement, 'disabled', isDisabled);
  }

  private write(text: string): void {
    this.renderer.setProperty(this.element.nativeElement, 'value', text);
  }
}
