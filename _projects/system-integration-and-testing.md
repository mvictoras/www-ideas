---
title: System Integration and Testing
slug: system-integration-and-testing
category: objective
importance: 4
tagline: Put the assistant where the science happens.
# The 2x2 card summary on Home (issue #20): authored once, here — not a cut
# of the Research essay.
summary: >-
  IDEAS is meant to run beside live simulations on DOE supercomputers and in
  the data streams of DOE light sources, so scientists can watch, question
  and steer an experiment while it runs. AI agents already reach from a
  workstation to an Argonne cluster to act on cosmology data.
# Placeholder card figure (issue #20): the maintainer will supply an image at
# least 1200px wide; until then the overview crop stands in.
figure:
  src: assets/img/objectives/overview-sources.png
  alt: "Detail of the IDEAS overview diagram: scientific sources, namely Argonne, the Advanced Photon Source, HACC, NekRS and other science codes and facilities."
  caption: "Where the science happens: Argonne facilities, the Advanced Photon Source, and simulation codes such as HACC and NekRS. Detail of the IDEAS overview."
  credit: IDEAS team, Argonne Base proposal (2025).
  fit: contain
---

An assistant that only runs on a laptop is a demonstration. IDEAS is meant to work where discovery happens: beside live simulations on DOE supercomputers, and in the stream of data from DOE light sources. There, scientists can watch an experiment unfold, question it and steer it while it is still running.

The central question is one of timing. How can data streaming and execution control keep pace with workloads that mix simulation, experiment and AI, all at once?

The first link in that chain works. Globus Compute is configured and validated at the Argonne Leadership Computing Facility. AI agents running on a scientist's workstation, using Argonne's Argo language-model service, have reached out to a computing cluster to explore its file system, install software and generate images from cosmology simulation data. The assistant is acting, not only answering.

We are now building the orchestration layer that will coordinate data movement, computation and visualization, using Globus Flows, Globus Compute and the in situ visualization libraries Wilkins and Ascent. We are also setting the principles it will follow: urgent work first, workflows composed on the fly, and steering shared between AI agents and the people they serve. Connections to live simulations and to light-source data streams are under way.
