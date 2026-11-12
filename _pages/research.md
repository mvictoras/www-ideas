---
layout: page
title: Research
permalink: /research/
nav_order: 2
description: The four IDEAS research objectives
nav: true
---

IDEAS (Intelligent Data Exploration Assistant for Science) builds an AI-powered scientific assistant that helps researchers explore massive datasets. It starts from compact, computation-ready data representations, renders directly from them, puts them in front of scientists through human-centered assistants, and binds the whole stack into DOE supercomputing and experimental facilities. Its work is organized around four interconnected objectives, each matched to a priority research direction from the DOE Visualization for Scientific Discovery, Decision-Making, and Communication Workshop.

{% assign objectives = site.projects | where: "category", "objective" | sort: "importance" %}
{% for objective in objectives %}
<section class="objective" id="{{ objective.slug }}">
  <h2>{{ objective.title }}</h2>
  <p class="objective-summary">{{ objective.description }}</p>
  {{ objective.content | markdownify }}
</section>
{% endfor %}
