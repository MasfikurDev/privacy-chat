import type { JSX } from 'preact';

/**
 * Type declarations for the Material Web custom elements used by the app.
 *
 * The elements are plain custom elements, so the props below are the subset
 * the app relies on. Anything a component supports as an attribute (for
 * example `aria-label`) keeps working through the regular HTML attributes.
 */
type MdElement<T extends HTMLElement = HTMLElement> = Omit<
  JSX.HTMLAttributes<T>,
  'type' | 'value' | 'size' | 'label' | 'selected' | 'open' | 'rows' | 'max' | 'min' | 'cols' | 'href' | 'disabled' | 'maxLength'
> & {
  type?: string;
  value?: string;
  size?: string;
  label?: string;
  selected?: boolean;
  open?: boolean;
  rows?: number;
  cols?: number;
  max?: number;
  min?: number;
  maxLength?: number;
  disabled?: boolean;
  href?: string;
};

interface MdButtonElement extends HTMLElement {
  disabled: boolean;
}

interface MdSwitchElement extends HTMLElement {
  selected: boolean;
}

interface MdTextFieldElement extends HTMLElement {
  value: string;
}

interface MdDialogElement extends HTMLElement {
  open: boolean;
}

type MdButtonAttributes = MdElement<MdButtonElement> & {
  onClick?: JSX.MouseEventHandler<MdButtonElement>;
  onInput?: JSX.GenericEventHandler<MdButtonElement>;
};

type MdIconButtonAttributes = MdButtonAttributes;

type MdSwitchAttributes = MdElement<MdSwitchElement> & {
  onChange?: JSX.GenericEventHandler<MdSwitchElement>;
};

type MdTextFieldAttributes = MdElement<MdTextFieldElement> & {
  onInput?: JSX.GenericEventHandler<MdTextFieldElement>;
  onKeyDown?: JSX.KeyboardEventHandler<MdTextFieldElement>;
  onChange?: JSX.GenericEventHandler<MdTextFieldElement>;
};

type MdDialogAttributes = MdElement<MdDialogElement>;

type MdListItemAttributes = MdElement & {
  onClick?: JSX.MouseEventHandler<HTMLElement>;
};

type MdListAttributes = MdElement;

type MdProgressAttributes = Omit<MdElement, 'value'> & {
  value?: number;
  onClick?: JSX.MouseEventHandler<HTMLElement>;
};

type MdFabAttributes = MdButtonAttributes;

type MdDividerAttributes = MdElement;

declare module 'preact/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': MdButtonAttributes;
      'md-outlined-button': MdButtonAttributes;
      'md-text-button': MdButtonAttributes;
      'md-filled-tonal-button': MdButtonAttributes;
      'md-icon-button': MdIconButtonAttributes;
      'md-filled-icon-button': MdIconButtonAttributes;
      'md-outlined-icon-button': MdIconButtonAttributes;
      'md-fab': MdFabAttributes;
      'md-switch': MdSwitchAttributes;
      'md-outlined-text-field': MdTextFieldAttributes;
      'md-dialog': MdDialogAttributes;
      'md-list': MdListAttributes;
      'md-list-item': MdListItemAttributes;
      'md-linear-progress': MdProgressAttributes;
      'md-divider': MdDividerAttributes;
    }
  }
}
