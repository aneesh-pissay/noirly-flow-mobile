---
name: Dot-Matrix Editorial
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c9c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#ffffff'
  on-tertiary: '#342f2d'
  tertiary-container: '#eae1dd'
  on-tertiary-container: '#696360'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c9c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#eae1dd'
  tertiary-fixed-dim: '#cec5c1'
  on-tertiary-fixed: '#1f1b19'
  on-tertiary-fixed-variant: '#4b4643'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
  muted-text: rgba(245, 245, 245, 0.60)
  border-gray: '#333333'
typography:
  display-matrix:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.05em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.1em
  numeral-xl:
    fontFamily: Space Mono
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 40px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  touch-target: 44px
---

## Brand & Style

This design system adheres to a rigorous **Dot-Matrix Editorial** aesthetic, blending high-end fashion typography with lo-fi, technical hardware motifs. It is a strictly monochrome environment that eschews traditional depth markers (shadows, gradients, blurs) in favor of texture, perforation, and tonal inversion.

The personality is experimental, clinical, and uncompromising. It targets a tech-literate, design-forward audience that appreciates utility presented through a stark, rhythmic lens. Every UI element is treated as a piece of printed data on a continuous digital receipt, emphasizing a mobile-first, vertical flow.

## Colors

The palette is strictly grayscale to maintain an editorial, high-contrast feel. The canvas is **true black (#000000)**, providing infinite depth and energy efficiency for OLED displays.

- **Primary:** Off-white used for high-readability text and primary button backgrounds (when inverted).
- **Secondary:** Near-black used for card surfaces to provide a subtle structural shift from the background.
- **Muted:** Low-opacity white for metadata, captions, and secondary labels.
- **Inversion:** Interactivity is signaled through color inversion (white backgrounds with black content) rather than chromatic shifts.

## Typography

Typography is the primary decorative element. We use a trio of fonts to balance utility and character:

1.  **Display/Accents:** Use a "perforated" or "dot-matrix" treatment for large numerals and select headlines. In code, this is achieved by pairing **Space Grotesk** with custom masking or **Space Mono** for a rigid technical feel.
2.  **Body:** **Inter** provides a neutral, highly legible sans-serif experience for all long-form content and labels.
3.  **Utility:** **Space Mono** is used for timestamps, counts, and metadata to reinforce the hardware/editorial narrative.

**Styling Note:** For "perforated" headers, use CSS text-stroke or background-clip masks to simulate a dotted pattern.

## Layout & Spacing

The layout is a rigorous **Single-Column Fluid Grid** optimized for mobile scrolling. 

- **Vertical Rhythm:** Built on a 4px baseline. All heights and paddings must be multiples of 4.
- **Borders:** All dividers and container edges must use a **dashed/perforated hairline (1px)** stroke. Solid lines are prohibited unless used for filled-inversion states.
- **Touch Targets:** Every interactive element must maintain a minimum 44x44px area to ensure accessibility on mobile devices.
- **Margins:** Standard horizontal padding of 20px on mobile to prevent content from touching the screen edges.

## Elevation & Depth

This system avoids the concept of "Z-space" in favor of **Tonal Layering**. 

- **Surface 0 (Background):** True Black.
- **Surface 1 (Cards/Inputs):** Near-Black (#0D0D0D) with a dashed white border (opacity 20%).
- **Interaction:** Depth is not signaled by shadows, but by **Inversion**. A "raised" or "active" element is filled with solid white, forcing the text inside it to become black.
- **Borders:** Use `border-style: dashed;` with a `dash-array` of 2px or 4px for all containers.

## Shapes

The shape language is sharp and industrial. 

- **Corners:** Use a global radius of **0px (Sharp)** for buttons, cards, and input fields to maintain the brutalist editorial feel. A minimal radius of **4px** is permitted only for components requiring softer differentiation, but sharp is the default.
- **Avatars:** Strictly circular, but must be framed by a **dotted/perforated ring border** to distinguish them from the rest of the square-edged UI.

## Components

### Buttons
- **Primary:** Solid off-white background, black text, sharp corners.
- **Secondary:** Transparent background, white dashed border, white text.
- **Active State:** Complete tonal inversion.

### Tab Bar (Bottom)
- 4 items: Inbox, Board, Search, Menu.
- Layout: 1px dashed top border. 
- Active state: The individual tab icon/label area flips to a solid white background with black content.

### List Rows
- Separated by 1px dashed lines.
- Swipe Action: Left-swipe reveals a hidden utility area with a dashed-edge reveal. No shadows on the reveal; just a shift in surface color to #0D0D0D.

### Inputs & Form Fields
- Background: #0D0D0D.
- Border: 1px dashed white (40% opacity).
- Focused state: Border becomes solid white or thicker dashed.

### Cards
- No shadows. Use #0D0D0D background and 1px dashed borders. 
- Headers inside cards should use `label-mono` for a "serial number" or technical data effect.