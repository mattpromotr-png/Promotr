# Visual system

Derived once from `Convo Platofmr.png` and `Engagement Timeline.png`.

## Direction

- Premium nightlife aesthetic: near-black canvas, charcoal elevated cards, restrained cool-gray borders, high-contrast white headings, muted gray supporting text.
- Primary accent: violet-to-purple gradient with occasional magenta warmth. Use accents for actions, selected states, small glows, and focus rings—not for every surface.
- Generous rounded corners, tight but readable spacing, subtle shadows/glows, and crisp thin dividers.
- Wordmark treatment: uppercase `PROMOTR` with wide tracking; small violet descriptor text where useful.
- Dark theme is the reference/default. Light theme preserves the same hierarchy using soft gray-white surfaces and violet accents.

## UI tokens

```text
dark canvas       #07080d
dark surface      #0d1017
dark elevated     #12151e
dark border       rgba(255,255,255,.09)
text primary      #f7f7fb
text secondary    #a6a8b3
violet            #8b5cf6
purple            #6d28d9
magenta accent    #c026d3
success           #22c55e
danger            #ef4444
```

Use semantic CSS variables rather than these colors directly in components.

## Booking form

- Mobile-first single-column card; wider screens may use a concise venue/expectation panel beside it.
- Clearly label this as a booking inquiry and repeat that availability/entry is not guaranteed.
- Inputs use dark elevated surfaces, visible focus rings, accessible error text, and at least 44 px controls.
- Conditionally reveal bottle preference only for table/bottle service.
- Success page should feel celebratory without implying confirmation.

## Admin lead view

- Desktop: compact table/card hybrid with filters above.
- Mobile: stacked lead cards with contact details and status control.
- Handoff-required is prominent but not alarmist.
- Do not reproduce the reference sidebar, conversations, analytics, reservations, premium-plan widget, or fake profile metrics.

## Accessibility and motion

- Meet WCAG AA contrast, never encode status by color alone, use keyboard-visible focus, associate errors with fields, and expose live submission feedback.
- Honor `prefers-reduced-motion`; animations should be subtle opacity/position transitions only.
