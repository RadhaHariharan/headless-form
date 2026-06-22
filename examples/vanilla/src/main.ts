import { createFormStore, isEmail, isNotEmpty } from '@headless-form/core';

type Values = { name: string; email: string };

const form = createFormStore<Values, Values, string>({
  initialValues: { name: '', email: '' },
  validate: {
    name: isNotEmpty('Name is required'),
    email: isEmail('Invalid email address'),
  },
});

// DOM refs
const nameInput = document.querySelector<HTMLInputElement>('#name')!;
const emailInput = document.querySelector<HTMLInputElement>('#email')!;
const nameError = document.querySelector<HTMLElement>('#name-error')!;
const emailError = document.querySelector<HTMLElement>('#email-error')!;
const renderCount = document.querySelector<HTMLElement>('#render-count')!;
const demoForm = document.querySelector<HTMLFormElement>('#demo-form')!;

let subscriberFires = 0;

// Subscribe to store state changes and re-render only when needed.
form.subscribe(() => {
  subscriberFires += 1;
  renderCount.textContent = String(subscriberFires);

  const snap = form.getSnapshot();

  // Update error display
  nameError.textContent = (snap.errors['name'] as string | undefined) ?? '';
  emailError.textContent = (snap.errors['email'] as string | undefined) ?? '';

  // Toggle invalid attribute
  nameInput.toggleAttribute('data-invalid', Boolean(snap.errors['name']));
  emailInput.toggleAttribute('data-invalid', Boolean(snap.errors['email']));
});

// Wire input events to the store
const nameProps = form.getInputProps('name');
const emailProps = form.getInputProps('email');

nameInput.addEventListener('input', nameProps.onChange);
emailInput.addEventListener('input', emailProps.onChange);

nameInput.addEventListener('blur', () => nameProps.onBlur?.());
emailInput.addEventListener('blur', () => emailProps.onBlur?.());

// Submit handler
demoForm.addEventListener('submit', form.onSubmit(
  (values) => {
    alert(`Submitted!\n${JSON.stringify(values, null, 2)}`);
    form.reset();
  },
  (errors) => {
    console.warn('Validation errors:', errors);
  },
));
