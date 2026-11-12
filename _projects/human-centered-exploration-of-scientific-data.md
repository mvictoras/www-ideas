---
title: Human-Centered Exploration of Scientific Data
slug: human-centered-exploration-of-scientific-data
category: objective
importance: 3
tagline: Ask the data a question, in your own words.
---

The most powerful visualization tools in science are also among the hardest to use. A simple question, such as where the gas is hottest or what a slice through a vortex would reveal, can mean writing and debugging scripts before the first image appears. IDEAS is building an AI assistant that works alongside the scientist. It understands what they are trying to find, drives the visualization tools for them, adapts to their level of expertise, and keeps a transparent record of every step, so that a discovery can be explained and reproduced.

That raises hard questions. How do you tell a language model what a scientist is looking at, right now, on the screen? When should a single generalist give way to a team of specialist agents? And how can every answer stay traceable?

Before building the assistant, we measured whether today's language models can do the job at all. NL2SciVis, our publicly released benchmark, asks models to write ParaView code for 15 core visualization operations and checks every result deterministically. Across more than 14,000 trials with four leading models, pass rates ranged from 48 to 96 percent. The most telling finding: 92 percent of failures came not from misunderstanding the request, but from code that broke when it ran.

That finding now shapes the assistant. Its planned design pairs an agent that writes visualization code with one that runs and checks it, together with a context engine that tracks what the scientist is seeing and a provenance system that records each interaction. Meanwhile, ChatVis turns plain-language requests into slices and galaxy-distribution views of HACC cosmology data. SASAV, a self-directed agent that profiles data, suggests transfer functions and plans its own views, has been applied to scientific exploration tasks.
