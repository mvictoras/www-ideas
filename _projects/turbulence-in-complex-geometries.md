---
title: Turbulence in Complex Geometries
slug: turbulence-in-complex-geometries
category: use-case
status: active
importance: 2
tagline: The hardest flows hide inside the most complex machines.
---

Turbulence in Complex Geometries takes on the flows that matter in engineering, where the physics and the geometry are both unforgiving. The motivating problems come from next-generation reactors: pebble-bed cores and the breeding blankets of fusion machines, where performance depends on complex internal geometry and multiphysics interactions — particularly between liquid-metal coolant flow and strong magnetic fields. Scientists model these systems with NekRS, an exascale-ready, GPU-accelerated computational fluid dynamics code, at extreme resolution; the resulting massive, multivariable datasets demand expert-driven, time-intensive analysis.

IDEAS attacks the data side of that bottleneck. Implicit neural representations and multivariate functional approximations compress and structure the fields for efficient access, so scientists can interactively explore the time-varying data with natural-language queries and context-aware visual tools, automatically detect behaviors such as flow stagnation or pressure anomalies, and adapt the visualization to the user's focus.

The controlled testbed is the Taylor-Green Vortex: a box geometry with simple initial conditions that nonetheless spontaneously generates the full complexity of turbulence. It benchmarks vortex identification, challenges volume rendering and Lagrangian particle tracking, and — because any research group can reproduce it — enables meaningful comparison across teams. Natural-language-driven slice visualizations already run against it, and datasets for the more complex engineering geometries, including the pebble-bed reactor and the fusion breeding blanket, extend the testbed toward the motivating problems.
