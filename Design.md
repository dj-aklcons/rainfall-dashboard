---
name: Te Penapena
version: 1.0.0
author: Conservation Team Leader
tokens:
  color:
    brand:
      primary: "#124E4A" # Deep Teal: Institutional authority
      secondary: "#4576BB" # Mid Blue: Environmental/Water monitoring
      accent: "#52C0AA" # Light Teal: Safe zones / active states
    semantic:
      critical: "#A03022" # Deep Red: Biohazard/Mould
      warning: "#C95032" # Soft Red: Quarantine/Action needed
      success: "#14A68B" # Deep Teal Success: Stable state
      info: "#124E4A"
    surface:
      background: "#FFFFFF"
      triage: "#CCE7D3" # Pale Mint: Observational surface
      sidebar: "#124E4A"
    text:
      primary: "#000000"
      secondary: "#8D8D8B" # Council Gray
      on-brand: "#FFFFFF"
    border:
      default: "#CCE7D3"
  typography:
    family:
      heading: "National 2, serif"
      body: "Ubuntu, sans-serif"
      code: "monospace"
    size:
      display: "32px"
      h1: "24px"
      h2: "20px"
      body: "16px"
      meta: "12px"
      label: "10px"
    weight:
      bold: "700"
      medium: "500"
      regular: "400"
  spacing:
    section: "72px"
    group: "40px"
    stack: "24px"
    inline: "16px"
    tight: "8px"
  radius:
    structural: "0px" # Sharp corners for formal authority
    interactive: "30px" # Rounded for buttons/inputs only
  elevation:
    flat: "none"
    raised: "1px 2px 6px rgba(0,0,0,0.14)" # Council Standard
    floating: "0px 3px 6px rgba(0,0,0,0.16)" # Hover/Interaction
---

# Te Penapena: Design Intent

The **Te Penapena** design system provides a visual framework for the Conservation Team's oversight of Documentary Heritage. It balances the authoritative formality of a public institution with the clinical precision of a conservation lab.

## Visual Identity & Atmosphere

The identity is defined by **Institutional Kaitiakitanga**. It moves away from generic corporate aesthetics toward a palette that evokes the deep teals of historic bindings and the cool mints of clean-room environments. The atmosphere is calm, precise, and deliberate.

### Semantic Logic

* **Primary Anchor:** The use of **Deep Teal (#124E4A)** as the primary navigational anchor establishes a sense of permanence and professional stewardship.
* **Triage Strategy:** The **Pale Mint (#CCE7D3)** surface is used specifically for "Triage" and "Observational" zones. This subtle shift in background colour alerts the user that they are viewing items under active assessment without the alarm of a critical red.
* **Hazard Hierarchy:** **Deep Red (#A03022)** is reserved strictly for biohazards (mould, infestation) and disaster response. **Soft Red (#C95032)** is used for administrative "Action Required" states, creating a clear hierarchy of urgency.
* **Environmental Blue:** Blue tones are stripped from the primary branding and reserved exclusively for water-related data—specifically environmental monitoring (RH/Temp) and HVAC oversight.

## Layout & Formalism

Following Auckland Council Libraries' standards, the structure is strictly **rectilinear**.

* **Geometry:** 0px border-radii on all containers, sidebars, and cards communicate institutional weight and precision.
* **The "Pill" Exception:** Rounding (30px) is applied *only* to interactive elements (buttons, search bars) to provide a clear affordance that these elements are "tools" to be used, distinct from the "collections" being viewed.
* **Whitespace:** High margins (up to 72px) ensure that technical data does not feel crowded, reducing the risk of human error during complex documentation tasks.

## Typography

* **National 2 (Serif):** Used for primary headers to project authority and heritage expertise.
* **Ubuntu (Sans-serif):** Used for all data-dense areas. Its high x-height and clean curves ensure that environmental logs and treatment reports remain legible on tablets in the stacks or during transit.

## Accessibility

All pairings are designed to reach **WCAG AA** as a minimum. Pure Black on White is the standard for treatment logs to ensure maximum contrast in the varied lighting conditions of storage vaults and conservation labs.