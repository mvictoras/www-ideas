---
title: Efficient Data Representations
slug: efficient-data-representations
category: objective
importance: 1
description: Compact, computation-ready homomorphic representations that reduce the size of massive scientific datasets while keeping their analytical and visual fidelity, so they can be explored interactively.
figure:
  src: assets/img/research/representative-pixels.png
  alt: Three rows of panels, one each for 5%, 10% and 30% of total pixels, showing the selected representative pixels on a rendered volume, zoomed detail views, and the speed-up for each subset.
  caption: "Representative pixels for accelerating the reconstruction neural network: 5%, 10% and 30% of total pixels, with the speed-up each subset achieves."
---

### Research questions

- How can hierarchical multiresolution structures be implemented in multivariate homomorphic models to support scalable encoding and interactive access?
- What fidelity and performance benefits arise from combining neural and spline-based representations in scientific modeling?

We have begun investigating hybrid, multiresolution implicit neural representations (INRs) that adapt accuracy and network capacity dynamically, with the goal of supporting user-defined error tolerances across scalar fields, signed distance fields and finite-time Lyapunov exponent fields. We have also begun developing a spline-based architecture, distinct from Kolmogorov–Arnold networks. A proof-of-concept network with tensor-product spline activations reaches accuracy comparable to state-of-the-art methods on scientific data, and uncertainty quantification and adaptive model resolution are the next goals. We are converting the multivariate functional approximation (MFA) representation from a monolithic tessellation of tensor products to a patch-based, multiscale hierarchy; the new design reproduces all of the test cases from our 2023 LDAV paper. Work on importance-aware representations, which learn the pixels most important for efficient interactive visualization by jointly considering the data, user behavior and downstream reconstruction, has been completed.
