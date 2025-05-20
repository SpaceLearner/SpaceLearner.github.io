---
layout: archive
title: "About Me"
permalink: /
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

I am currently a Research Engineer at Alibaba DAMO Academy. I received my Ph.D. from Peking University (PKU) in 2024 and my B.S. in Computer Science from Beijing Institute of Technology (BIT) in 2019.

My research interests include Multi-modal AI Agent, Embodied AI, and Reinforcement Learning.

Education
======
* Ph.D. in Peking University, 2019-2024
* B.S. in Beijing Institute of Technology, 2015-2019

Work experience
======
* Since 2022.09: Research Intern
  * Microsoft Research Asia
  * Duties included: developing graph algorithms for heterogeneous graphs and recommender systems.
  * Supervisor: Lun Du

* 2022.03-2022.09: Research Assistant
  * The Hong Kong University of Science and Technology
  * Duties included: Developing recommender system algorithms
  * Supervisor: Professor Sunghun Kim

* 2021.09-2022.03: Algorithm Engineer Intern
  * Meituan
  * Duties included: Developing re-ranking models for multi-stage advertisement system.
  * Leader: Zhiwei Liu

* 2020.09-2021.09: Research Intern
  * Microsoft Research Asia
  * Duties included: Merging pull requests
  * Supervisor: Yaming Yang
  
Publications
======
{% assign publications_by_year = site.publications | group_by_exp:"post", "post.date | date: '%Y'" | sort: "name" | reverse %}
{% for year_group in publications_by_year %}
  <h3>{{ year_group.name }}</h3>
  <ul>
    {% for post in year_group.items %}
      {% include archive-single-cv.html %}
    {% endfor %}
  </ul>
{% endfor %}
  
Talks
======
  <ul>{% for post in site.talks %}
    {% include archive-single-talk-cv.html %}
  {% endfor %}</ul>
  
Teaching
======
  <ul>{% for post in site.teaching %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
  
Service and leadership
======
* Reviewer for: KDD,WWW,TNNLS,CIKM,ICDM,VLDB
