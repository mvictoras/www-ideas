---
title: System Integration and Testing
slug: system-integration-and-testing
category: objective
importance: 4
tagline: Put the assistant where the science happens.
---

An assistant that only runs on a laptop is a demonstration. IDEAS is meant to work where discovery happens: beside live simulations on DOE supercomputers, and in the stream of data from DOE light sources. There, scientists can watch an experiment unfold, question it and steer it while it is still running.

The central question is one of timing. How can data streaming and execution control keep pace with workloads that mix simulation, experiment and AI, all at once?

The first link in that chain works. Globus Compute is configured and validated at the Argonne Leadership Computing Facility. AI agents running on a scientist's workstation, using Argonne's Argo language-model service, have reached out to a computing cluster to explore its file system, install software and generate images from cosmology simulation data. The assistant is acting, not only answering.

We are now building the orchestration layer that will coordinate data movement, computation and visualization, using Globus Flows, Globus Compute and the in situ visualization libraries Wilkins and Ascent. We are also setting the principles it will follow: urgent work first, workflows composed on the fly, and steering shared between AI agents and the people they serve. Connections to live simulations and to light-source data streams are under way.
