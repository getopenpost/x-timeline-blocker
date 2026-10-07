---
name: X Timeline Blocker
description: A minimal timer in the shared OpenPost Dither theme.
colors:
  focal: 'var(--action-focal)'
  focal-ink: 'var(--action-focal-foreground)'
  canvas: 'var(--background)'
  ink: 'var(--foreground)'
  muted-ink: 'var(--muted-foreground)'
typography:
  timer:
    fontFamily: 'var(--theme-font-mono)'
    fontSize: '64px'
    lineHeight: 1
    letterSpacing: '-0.03em'
  state:
    fontFamily: 'var(--theme-font-sans)'
    fontSize: '18px'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: '-0.015em'
  attribution:
    fontFamily: 'var(--theme-font-sans)'
    fontSize: '12px'
spacing:
  page-inline: '20px'
  page-block: '28px'
components:
  browse:
    backgroundColor: '{colors.focal}'
    textColor: '{colors.focal-ink}'
    height: '44px'
---

# Timer UI

## Overview

Use the bundled OpenPost Dither theme without local theme overrides. `WebThemeRuntime` applies the light or dark scheme from the system preference.

## Colors

Use the shared semantic tokens above. The orange Dither family owns both palettes, button states and focus colors.

## Typography

Import bundled Geist, Geist Mono and Manrope locally. Use tabular numerals for the timer. Avoid announcing every timer tick.

## Layout

The popup is 300 px wide and 340 px tall. The timeline gate fills its host timeline width at 340 px tall. Center the state label, countdown, action and OpenPost link. Keep inactive action space stable across timer transitions.

## Components

Use the shared focal Button and its Dither paint for Browse timeline and Retry. Show an action only when ready or recovering from an error. Keep the OpenPost link visible in every state.

The gate lives in an extension iframe, so website CSS cannot change its UI. Hide and make inert only the discovered home timeline region. Preserve navigation and compose.
