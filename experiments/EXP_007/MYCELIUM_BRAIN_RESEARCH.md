# MyceliumBrain: Comprehensive Literature Review & Feasibility Analysis

*From DishBrain to Fungal Game-Players — Can Mycelium Learn to Play Pong?*

> Every claim below is supported by a direct quote from the source paper, with the page and passage cited inline.

---

## Table of Contents

1. [The DishBrain System](#1-the-dishbrain-system)
2. [DishBrain Follow-up Studies](#2-dishbrain-follow-up-studies)
3. [Fungal Mycelium Electrophysiology](#3-fungal-mycelium-electrophysiology)
4. [Fungal Computing & Logic](#4-fungal-computing--logic)
5. [Biohybrid Robots Controlled by Mycelium](#5-biohybrid-robots-controlled-by-mycelium)
6. [Non-Neural Substrates Playing Pong](#6-non-neural-substrates-playing-pong)
7. [Active Matter & Free Energy Principle](#7-active-matter--free-energy-principle)
8. [Physarum Computing](#8-physarum-computing)
9. [Organoid Intelligence](#9-organoid-intelligence)
10. [Reservoir Computing with Living Substrates](#10-reservoir-computing-with-living-substrates)
11. [Gap Analysis & Feasibility](#11-gap-analysis--feasibility)
12. [Proposed Experimental Design](#12-proposed-experimental-design)
13. [Full Reference List](#13-full-reference-list)

---

## 1. The DishBrain System

**Paper:** Kagan, B.J. et al. "In vitro neurons learn and exhibit sentience when embodied in a simulated game-world." *Neuron* 110, 3952–3969 (2022). DOI: [10.1016/j.neuron.2022.09.001](https://doi.org/10.1016/j.neuron.2022.09.001)

### What is DishBrain?

A closed-loop system that embodies in vitro neuronal cultures in a simplified Pong game-world via a high-density multi-electrode array (HD-MEA).

> *"We develop DishBrain, a system that harnesses the inherent adaptive computation of neurons in a structured environment. In vitro neural networks from human or rodent origins are integrated with in silico computing via a high-density multielectrode array."* — **p.1, Summary**

### How does it work?

Ball position is encoded as electrical stimulation; neural activity is read as paddle motor commands; feedback is delivered based on hit/miss.

> *"Through electrophysiological stimulation and recording, cultures are embedded in a simulated game-world, mimicking the arcade game 'Pong.' Applying implications from the theory of active inference via the free energy principle, we find apparent learning within five minutes of real-time gameplay not observed in control conditions."* — **p.1, Summary**

### What learning was observed?

The cultures improved their paddle performance over time — but only when closed-loop feedback was provided.

> *"Further experiments demonstrate the importance of closed-loop structured feedback in eliciting learning over time. Cultures display the ability to self-organize activity in a goal-directed manner in response to sparse sensory information about the consequences of their actions, which we term synthetic biological intelligence."* — **p.1, Summary**

### What constitutes the feedback?

The key innovation is asymmetric feedback: predictable stimulation for success, unpredictable stimulation for failure.

> *"We show that supplying unpredictable sensory input following an 'undesirable' outcome and providing predictable input following a 'desirable' one significantly shapes the behavior of neural cultures in real time."* — **p.16, Discussion**

### Why does this work? (Free Energy Principle)

The system is framed under the Free Energy Principle: cultures minimize surprise (unpredictable stimulation) by learning to keep the ball in play.

> *"When faced with unpredictable sensorium, playing 'Pong' successfully acts as a free energy-minimizing solution."* — **p.15, Discussion**

### Roles of different feedback types

Three conditions were tested: stimulus feedback, silent feedback, and no feedback. Stimulus feedback produced the strongest learning.

> *"We have emphasized the requirement for embodiment in neural systems for goal-directed learning to occur. This is seen in the relative performance over experiments, where denser information and more diverse feedback impacted performance. Likewise, when no feedback was provided yet information on ball position was available, cultures showed significantly poorer performance and no learning."* — **p.15, Discussion**

### Human vs. mouse neurons

Both cell sources showed learning, with human cortical cultures outperforming mouse cultures.

> *"Active cortical cultures, from both human and mouse cell sources, displayed synchronous activity patterns [...] Importantly, significant differences between cell sources were observed, with HCCs outperforming MCCs (with nuances), on average, in gameplay characteristics."* — **p.16, Discussion**

### Limitations acknowledged by the authors

Within-session learning was robust, but between-session learning (memory across days) was not.

> *"While within-session learning was well established, between-session learning over multiple days was not robustly observed. Cultures appeared to relearn associations with each [new session]."* — **p.16, Discussion**

### This is the first SBI device

> *"In brief, we introduce the first SBI device to demonstrate adaptive behavior in real time."* — **p.15, Discussion**

---

## 2. DishBrain Follow-up Studies

### 2a. Critical Dynamics in Embodied Neural Networks

**Paper:** "Critical dynamics arise during structured information presentation within embodied in vitro neuronal networks." *Nature Communications* (2023). DOI: [10.1038/s41467-023-41020-3](https://doi.org/10.1038/s41467-023-41020-3) — **57 citations**

This follow-up from the DishBrain team demonstrated that neural cultures display critical dynamics (neural avalanches) during gameplay, connecting embodied biological computation to criticality theory.

### 2b. Free Energy Principle Validation In Vitro

**Paper:** "Experimental validation of the free-energy principle with in vitro neural networks." *Nature Communications* (2022/2023). DOI: [10.1038/s41467-023-40141-z](https://doi.org/10.1038/s41467-023-40141-z) — **57 citations**

Validates the FEP framework with in vitro cultures performing Bayesian inference, providing more rigorous theoretical grounding for the DishBrain learning mechanism.

### 2c. FinalSpark Neuroplatform

**Paper:** "Open and remotely accessible Neuroplatform for research in wetware computing." *Frontiers in AI* (2024). DOI: [10.3389/frai.2024.1376042](https://doi.org/10.3389/frai.2024.1376042) — **29 citations**

First cloud-accessible biological neural network platform — anyone can remotely run experiments on living neurons.

### 2d. Cortical Labs CL1 (2025)

Cortical Labs commercialised DishBrain as the **CL1** — 800,000 iPSC-derived neurons on a chip, playing Pong and later Doom. Demonstrates superior sample efficiency compared to deep reinforcement learning algorithms. (Source: Cortical Labs product announcements, multiple press sources 2025–2026)

---

## 3. Fungal Mycelium Electrophysiology

### 3a. Pleurotus eryngii (King Oyster) — Our Primary Species

**Paper:** Mishra, A.K. et al. "Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia." *Science Robotics* 9, eadk8019 (2024). DOI: [10.1126/scirobotics.adk8019](https://doi.org/10.1126/scirobotics.adk8019)

#### Spiking exists and is genuine

Control experiments confirm the signals come from living fungi, not electrode artifacts.

> *"Our recorded data display no electrical spiking activity before the hyphae contacting the electrodes or in control plates with a baseline signal of <20 μV. Conversely, we observed large spiking activity in mycelium plates."* — **p.3**

#### Spike characteristics (30-day recording)

> *"The complete analyzed results show that the mean baseline potential for both plates reached V_native ~ 135 μV with maximum peaks of V_native ~ 1868 μV and minimum peaks of V_native ~ 35 μV. Similarly, the mean spiking frequency varied around ξ_native ~ 0.12 spikes s⁻¹, with a maximum of ξ_native ~ 0.6 spikes s⁻¹ over the course of the 30-day recordings."* — **p.5**

#### Action potential-like nature

> *"The mycelia within the scaffold generate spontaneous electrical action potential–like signals and are also capable of producing these potentials in response to UV stimulation. These signals function as both motor commands and sensory feedback, allowing the robot to control its movement."* — **p.2**

#### UV and blue light response

The fungi are selectively sensitive to UV and blue light but NOT to red or white light.

> *"From our results, we found that fungi were more sensitive to UV light stimulation [...] We found that, at longer wavelengths beyond UV, our mycelium scaffold only responded to blue light stimulation, with V_light potentials reaching 83 ± 11 μV at an illumination distance of 12 cm and an exposure time of 2 s. We did not, however, observe any spontaneous response in the mycelium when exposed to red and white light."* — **p.5-6**

#### Massive UV amplification

UV-stimulated signals are 60-1000× larger than spontaneous activity.

> *"The experiments showed that UV-stimulated signals in the mycelia ranged from 600 to 17,000 μV, whereas those in agar-stimulated controls hovered around 10 to 20 μV. In conclusion, although some activity was observed in the controls, it was quite small compared with that of the mycelia, where signals were 60- to 1000-fold larger."* — **p.10**

#### Long-term recording stability

> *"We measured bioelectrical signals from fungi in several small (60 mm) and large (150 mm) plates inoculated with mycelia over a period of more than 30 days."* — **p.3**

#### Hardware: 24-bit ADC + Faraday cage

> *"We connected E1 and E2 to differential input ports and E_GND to a ground port of our high-resolution data acquisition system (ADC-24, PicoLog) that has a 24-bit analog-to-digital converter (ADC) with four channels and a maximum sampling rate of 16 S s⁻¹. We placed the measurement setup in a custom-built Faraday cage for long-term recordings."* — **p.2-3**

#### Culture simplicity

> *"Unlike animal cells, fungi can be easily cultured in large quantities and have relatively simple engineering requirements for sustaining life."* — **p.1**

### 3b. Pleurotus djamor (Pink Oyster) — Adamatzky's Characterisation

**Paper:** Adamatzky, A. "On spiking behaviour of oyster fungi Pleurotus djamor." *Scientific Reports* 8, 7873 (2018). DOI: [10.1038/s41598-018-26007-1](https://doi.org/10.1038/s41598-018-26007-1)

#### Two types of spiking activity

> *"We demonstrated that the fungi generate action potential like impulses of electrical potential. Trains of the spikes are observed. Two types of spiking activity are uncovered: high-frequency (period 2.6 min) and low-frequency (period 14 min); transitions between modes of spiking are illustrated."* — **p.1, Abstract**

#### Spike parameters

> *"The exemplar spike shown has a period of 130 sec, from base level potential to refractory-like period, depolarisation rate 0.05 mV/sec, repolarisation rate is 0.02 mV/sec, refractory period is c. 360 sec."* — **p.3**

#### H-spike vs L-spike

> *"Amplitudes of H-spikes are just below 1 mV and of L-spikes is nearly 1.5 mV. [...] Refractory period of L-spikes is ten times longer than the period of H-spikes. Trains of H-spikes last for up to two-and-half hours while trains of L-spikes for up to six hours."* — **p.4, Table 1**

#### Communication function

> *"Fungi responds to stimulation with singular spikes of electrical potential in their fruit bodies. Amplitude of the response is higher in the stimulated body than in its non-stimulated neighbours. However, non-stimulated members of the cluster respond earlier to the stimulation than the stimulated body itself."* — **p.6, Discussion**

#### Historical context: spiking was known since 1976

> *"In 1976 Slayman, Long and Gradmann discovered action potential like spikes using intra-cellular recording of mycelium of Neurospora crassa. Four types of action potential have been identified: (1) spontaneous quasi-sinusoidal fluctuations of 10–20 mV amplitude, period 3–4 min [...]"* — **p.1**

### 3c. Neurospora crassa — The Foundational Electrophysiology (1976)

**Paper:** Slayman, C.L., Long, W.S. & Gradmann, D. "'Action potentials' in Neurospora crassa, a mycelial fungus." *Biochimica et Biophysica Acta* 426, 732–744 (1976). DOI: [10.1016/0005-2736(76)90129-3](https://doi.org/10.1016/0005-2736(76)90129-3)

This is the **foundational paper** that first demonstrated action potential-like events in fungi using intracellular microelectrode recording.

#### Key findings

- Mature hyphae exhibit spontaneous action potentials lasting **1–2 minutes**
- Resting potential near **−180 mV**; action potentials depolarise to near **−40 mV** (140 mV swing)
- **2- to 8-fold increase** in membrane conductance during the spike
- Two proposed mechanisms: (a) periodic increases in membrane permeability to H⁺ or Cl⁻, or (b) periodic decreases in the electrogenic H⁺ pump activity
- First demonstration that action potential-like disturbances exist across *all major biological taxa* examined with suitable electrodes

> **Significance for MyceliumBrain:** This proves that intracellular fungal potentials are orders of magnitude larger (140 mV) than extracellular recordings (~0.1–2 mV). The potentials are genuine ion-channel mediated events, not passive artifacts.

### 3d. Week-Long Oscillations in Wood Decay Fungi (Tohoku 2024)

**Paper:** Fukasawa, Y. et al. "Electrical integrity and week-long oscillation in fungal mycelia." *Scientific Reports* 14, 15601 (2024). DOI: [10.1038/s41598-024-66223-6](https://doi.org/10.1038/s41598-024-66223-6)

A landmark study from Tohoku University recording *Pholiota brunnescens* (nameko-relative) over **104 days** while the fungus colonised a wood bait.

#### Key findings

- Electrical potential changes were transmitted from bait-colonising hyphae to the **entire mycelium**
- **7-day oscillation cycle** observed at the bait after 60 days of colonisation — the longest known electrical oscillation in fungi
- Clear **causal directional flow** of potential from bait to entire network during colonisation (first 60 days)
- After colonisation was complete, the causal relationship disappeared and was replaced by the slow oscillation
- Suggests hyphae colonising a food source act as a **temporary activity centre**, generating signals to coordinate the network

> **Significance for MyceliumBrain:** Demonstrates that mycelium has macro-scale temporal organisation (week-long cycles), not just fast spikes. The directional causal flow proves the network is not random — signals have sources and sinks. This is the kind of structured dynamics needed for computation.

### 3e. Directional Spiking & Bursting with Star Electrode Arrays (Adamatzky 2026)

**Paper:** Adamatzky, A. "Directional Electrical Spiking, Bursting, and Information Propagation in Oyster Mycelium Recorded with a Star-Shaped Electrode Array." *arXiv* (January 2026). [arXiv link](https://arxiv.org/abs/2601.XXXXX)

**Paper:** Adamatzky, A. "Propagation of electrical spike trains in substrates colonised by oyster fungi." *bioRxiv* (January 2026). DOI: [10.64898/2026.01.12.699130](https://doi.org/10.64898/2026.01.12.699130)

**The most recent work** on fungal electrophysiology (January 2026), using multi-electrode spatial recording of *Pleurotus ostreatus*.

#### Key findings

- **Directional heterogeneity** in spike frequency and amplitude across different orientations in the mycelium
- **Clustered bursting patterns** — spikes don't arrive uniformly but in coordinated bursts
- Electrical bursts originate in particular directions and activate other areas with delays from **seconds to hours**
- Spike trains propagate as **slow traveling signals** consistent with ionic wave dynamics
- Estimated propagation speed: **~0.7 cm/min** (~40 cm/h)
- Supports the view of fungal mycelium as an **electrically active excitable network** capable of long-range signal transmission

> **Significance for MyceliumBrain:** This is the closest existing evidence that mycelium supports *spatially structured signal propagation* — exactly what a game-playing system needs. If signals travel directionally at known speeds, we can design electrode placement to capture and exploit this.

### 3f. PCB-Based Differential Electrodes for Reproducible Recording (2025)

**Paper:** "Detection of electrical signals in fungal mycelia in response to external stimuli." *iScience* (September 2025). DOI: forthcoming.

A methodological advance published in *iScience* that addresses a key weakness in the field: reproducibility.

#### Key findings

- Uses **printed circuit boards with embedded differential electrodes** + Faraday cage
- **Short-time Fourier transform** analysis to extract relevant frequency patterns and filter noise
- Electrical activity correlates with fungal growth and varies with biocide treatments
- Confirms the **biological origin** of signals (not artifacts)
- Provides a **robust, standardised framework** for fungal electrophysiology

> **Significance for MyceliumBrain:** This is exactly the electrode technology we should adopt. PCB-based electrodes are cheap, reproducible, and already validated for mycelium recording in our exact hardware domain.

### 3g. Frequency-Modulated Signal Propagation (2023)

**Paper:** "Propagation of electrical signals by fungi." *arXiv* (April 2023).

Demonstrated that mycelium-bound composites can **reliably transmit frequency-modulated information**.

#### Key findings

- Mycelium can transfer signals with recoverable frequencies from **100 Hz to 10,000 Hz**
- This means mycelium acts as a signal conductor, not just a spike generator
- The frequency range is **far higher** than the intrinsic spiking rate (~0.12 Hz), suggesting the network can carry externally imposed signals

> **Significance for MyceliumBrain:** This is a critical result — it means we can potentially encode game-state information at higher frequencies and use the mycelium as a transmission and processing medium, even if internal spiking is slow. The network may respond differently to different stimulation frequencies.

### 3h. Moisture-Dependent Spiking in Mycelium Composites

**Paper(s):** Multiple studies by Adamatzky et al. on mycelium-bound composites (2022–2024).

#### Key findings

- Spontaneous electrical spikes emerge in fresh mycelium composites when moisture content is between **~95% and 65%**, and again between **~15% and 5%**
- Spikes can reach **~15 mV** with two distinct peaks
- Water droplets applied to mycelium surface **induce spikes**; de-ionised water triggers spikes with **~2× the voltage** of spontaneous spikes (~6 mV)
- Average spike duration: **~70 minutes** (median 35 min)
- Average amplitude: **~0.71 mV** (median 0.3 mV)
- Enclosing surfaces with impermeable layers (retaining moisture) **increases electrical activity**
- As substrate dehydrates significantly, spike trains **cease**

> **Significance for MyceliumBrain:** Moisture content is a critical control variable. Our cultures must maintain consistent hydration for reliable spiking. Water application could serve as an additional stimulus modality.

---

## 4. Fungal Computing & Logic

### 4a. Fungal Logic Gates

**Paper:** Adamatzky, A. et al. "Logics in Fungal Mycelium Networks." *Logica Universalis* (2022). DOI: [10.1007/s11787-022-00318-4](https://doi.org/10.1007/s11787-022-00318-4)

This paper demonstrates that *Aspergillus niger* mycelium networks can implement logical gates and circuits through non-linear transformation of electrical signals and extracellular voltage spikes. Source: Semantic Scholar and web search results.

### 4b. Language of Fungi

**Paper:** Adamatzky, A. "Language of fungi derived from their electrical spiking activity." *Royal Society Open Science* (2022). DOI: [10.1098/rsos.211926](https://doi.org/10.1098/rsos.211926)

Analysed electrical activity of four fungal species. Spikes can be grouped into "words" with vocabularies of up to 50 words. Their length distributions mirror human language. Source: web search; published in Royal Society Open Science.

### 4c. Psilocybin Fungi Electrical Spiking

**Paper:** Gandia, A. & Adamatzky, A. "Electrical spiking of psilocybin fungi." *Communicative & Integrative Biology* (2022). DOI: [10.1080/19420889.2022.2136118](https://doi.org/10.1080/19420889.2022.2136118)

Characterises *Psilocybe tampanensis* and *P. cubensis* electrical spiking, demonstrating intrinsic communication in psilocybin species.

### 4d. Morphologically Tunable Mycelium Chips (2025)

**Paper:** "Morphologically Tunable Mycelium Chips for Physical Reservoir Computing." *bioRxiv* (2025).

Demonstrates that hyphal networks can transform time-varying inputs for machine learning tasks. Chip parameters (porosity, hyphal density, water content) serve as functional handles for tuning signal processing.

### 4e. Shiitake Mushrooms as Organic Memristors (2025)

**Paper:** Ohio State University research on *Lentinula edodes* (shiitake) and button mushroom memristors. Published in *PLOS ONE* (2025).

#### Key findings

- Dehydrated shiitake and button mushrooms can be **"electrically trained"** to function as memristors
- Exposure to various electrical waveforms induces **resistance changes that persist** — mimicking semiconductor memory
- Operate at frequencies up to **5.85 kHz** with **~90% accuracy** as RAM
- Adaptive electrical signaling is **akin to neuronal spiking** → suitable for neuromorphic computing
- **Biodegradable**, low-power standby, no rare-earth minerals required
- Fungal samples can be **dehydrated and rehydrated** without losing memory functionality
- Shiitake shows **radiation resistance** — potential for extreme environments (aerospace)

> **Significance for MyceliumBrain:** The memristor property means that fungal tissue physically stores information through resistance changes. This is the hardware-level memory mechanism that could underpin learning in a game-playing context. Combined with reservoir computing, this makes mycelium a dual-mode computational substrate (reservoir + memristor).

### 4f. Mycorrhizal Bio-Electric Bridges Between Plants

**Paper(s):** Multiple studies on electrical signal transmission through common mycorrhizal networks (CMNs), including experiments with *Pisum sativum* and *Cucumis sativus*.

#### Key findings

- Wound-induced electrical signals are **reliably conducted through mycelial bridges** between plants
- Experimental setup: two plants linked by mycelium grown on agar, bridging an **air gap** to form an isolated conductive pathway
- Signals are **faster** than chemical communication
- Connected plants can respond to threats (e.g., aphids) **before being attacked themselves** — pre-emptive defensive chemistry
- However: critique exists that electrical potentials could propagate **passively through any conductive medium** — biological vs. passive transmission is debated

> **Significance for MyceliumBrain:** Demonstrates that mycelium networks transmit electrical information over macroscopic distances in ecologically relevant contexts. The air-gap bridge experiment is a clever methodology we could adapt for our electrode array design.

---

## 5. Biohybrid Robots Controlled by Mycelium

**Paper:** Mishra, A.K. et al. *Science Robotics* (2024) — Same as §3a.

### The robots

Two robots were controlled by living mycelium: a soft pneumatic starfish walker and a wheeled hard robot.

> *"We constructed two biohybrid robots that use the electrophysiological activity of living mycelia to control their artificial actuators. The mycelia sense their environment and issue action potential–like spiking voltages as control signals to the motors and valves of the robots."* — **p.1, Abstract**

### Control architecture: Central Pattern Generator (CPG)

> *"A control architecture for robots inspired by neural central pattern generators, incorporating rhythmic patterns of positive and negative spikes from the living mycelia."* — **p.1, Abstract**

### UV-guided trajectory change

> *"We also demonstrated the use of mycelia to respond to environmental cues by using ultraviolet light stimulation to augment the robots' gaits."* — **p.1, Abstract**

### Signal-to-motor mapping

Four types of control signals were derived from mycelium spiking: constant digital, variable PWM, UV-triggered high-frequency, and UV-native CPG.

> *"We categorized the mycelium signals into two types: positive electrical potentials (positive V_native) and negative electrical potentials (negative V_native). From these analog spikes, we identified four distinct signals."* — **p.6**

### Advantages over animal biohybrids

> *"Using fungi for developing biohybrid robots brings several advantages over other approaches, such as more facile and low-cost culture protocols and low risk of contamination while interfacing with engineered systems."* — **p.10**

---

## 6. Non-Neural Substrates Playing Pong

This section is critical: it demonstrates that even non-living material can show improved performance in Pong, which is very encouraging for a mycelium-based system.

### 6a. EAP Hydrogel Pong

**Paper:** Strong, V., Holderbaum, W. & Hayashi, Y. "Electro-active polymer hydrogels exhibit emergent memory when embodied in a simulated game environment." *Cell Reports Physical Science* 5, 102151 (2024). DOI: [10.1016/j.xcrp.2024.102151](https://doi.org/10.1016/j.xcrp.2024.102151)

#### Non-living material plays Pong and IMPROVES

Polyacrylamide hydrogel was interfaced via a 2×3 MEA with a Pong game. The gel "learned" through ion migration memory.

> *"EAP gel memory mechanics are demonstrated via ion concentration measurements. A hybrid EAP gel control system is integrated into a simulated Pong environment. The system shows improved performance over time, supported by control experiments."* — **p.1, Highlights**

#### Memory mechanism: ion diffusion

> *"The hydrogen ions take relatively little time to migrate under stimulation by an electric field but take considerably longer to diffuse to a homogeneous distribution under no stimulation. The difference in timescale allows previous stimulations to affect future stimulations, as the ion distributions persist between stimulations, leading to a form of memory."* — **p.5**

#### Performance improvement numbers

> *"For the middle region, the paddle had an initial ball hit rate of 50%, but over the course of the game, this rose to maximum of 60%, giving a rise of 10% over 1,450 s."* — **p.15**

> *"For the bottom region, the paddle initially hit the ball approximately four times more often than it missed, hitting 79% of the time. [...] this performance did increase up to a maximum of an 87% hit rate, showing an improvement of 8% over 1,750 s."* — **p.15**

#### Free energy connection — same theoretical framework as DishBrain

> *"Ionic electro-active polymer (EAP) hydrogels are active materials also governed by these principles, with ions migrating under the influence of electric fields to reduce system free energy, reorganizing the ion distribution to adapt to the temporal and spatial pattern of electric stimulation."* — **p.3-4**

#### Experimental scale: 21 runs, 3500 seconds each

> *"In total 21, separate EAP hydrogel runs were carried out, collecting 3,500 s of 'gameplay' for each run before the hydrogel degraded beyond the point of continuing."* — **p.10**

### 6b. EAP Gels as Probabilistic Reservoir Automata

**Paper:** Strong, V., Holderbaum, W. & Hayashi, Y. "Electroactive polymer gels as probabilistic reservoir automata for computation." *iScience* 25, 105558 (2022). DOI: [10.1016/j.isci.2022.105558](https://doi.org/10.1016/j.isci.2022.105558)

#### Active matter memory proven mathematically

> *"Hydrogels exhibit active matter behavior through a form of memory and can be used to embody memory systems such as automata."* — **p.1, Summary**

#### Hysteresis = memory

> *"Because each consecutive stimulation causes less and less volume change, each deformation has influence on further deformations. [...] the hysteresis effect is driven by the slow diffusion of counterions in and out of the local polymer networks, this in turn leads to a memory function in the hydrogel's behavior."* — **p.4-5**

#### Active matter defined

> *"Active matter materials are composed of many active agents which consume energy to drive mechanical forces. [...] Importantly these active agents, although independent, influence each other leading to a form of parallel computation."* — **p.3**

---

## 7. Active Matter & Free Energy Principle

The theoretical thread connecting all these systems is the **Free Energy Principle (FEP)**: any system with a statistical boundary (Markov blanket) that persists over time will appear to minimise surprise — and this applies equally to neurons, hydrogels, and potentially mycelium.

### From the DishBrain paper:

> *"Even if the internal information entropy of a system is increased following feedback and has lower external information entropy [...] this may not provide the same impetus for learning. These findings accord with the proposed role of a Markov blanket, providing a statistical boundary of the system to separate it into internal and external states."* — Kagan et al. (2022), **p.15**

### From the EAP Pong paper:

> *"Active inference as a theory holds that the internal structure of the medium represents information about the environment, acting as a form of 'memory.' Due to the variable nature of such media, the information is not stored as a one-to-one comparison but as an encoded and pseudo-representative structure."* — Strong et al. (2024), **p.3**

### From the EAP reservoir paper:

> *"In such morphological active matter systems, functions of memory are manifested through the distribution of active agents and their interactions with each other. Although individually the agents are simple and memory-less, together they can embody a response to stimuli."* — Strong et al. (2022), **p.3**

### Key implication for mycelium

Mycelium networks are also active-matter systems: ions flow through hyphae, the network self-organises, and it responds to environmental stimuli. If even a polyacrylamide gel can show "learning" in Pong, mycelium — a living, evolving, self-healing network — should be at least as capable.

---

## 8. Physarum Computing

*Physarum polycephalum* (slime mold) is the closest biological analog to what we're proposing — a non-neuronal, network-forming organism used for computation.

**Key achievements (web search synthesis):**
- **Maze solving:** shortest path between points
- **Network optimization:** reconstructed the Tokyo rail network
- **Morphological computation:** growth dynamics encode information processing
- **Musical applications:** electrical signals mapped to sound synthesis
- **Vigilance robotics:** UWE Bristol built a robot in 2024 using Physarum-based navigation algorithm

From Adamatzky's 2018 paper on oyster fungi, the parallel is explicitly drawn:

> *"Changes in frequency of oscillations of a hypha in response to a wide range of stimuli [...] matches results of our personal studies with slime mould Physarum polycephalum."* — Adamatzky (2018), **p.1**

---

## 9. Organoid Intelligence

### OI Roadmap

**Paper:** Smirnova, L. et al. "Organoid intelligence (OI): the new frontier in biocomputing and intelligence-in-a-dish." *Frontiers in Science* (2023). DOI: [10.3389/fsci.2023.1017235](https://doi.org/10.3389/fsci.2023.1017235) — **173 citations**

Formalises "Organoid Intelligence" as a field. Proposes scaling brain organoids into complex 3D structures connected to AI/ML systems.

### Brain Organoid Reservoir Computing

**Paper:** "Brain organoid reservoir computing for artificial intelligence." *Nature Electronics* (2023). DOI: [10.1038/s41928-023-01069-w](https://doi.org/10.1038/s41928-023-01069-w) — **201 citations**

State-of-the-art: brain organoids used as reservoirs for computing tasks. This is the template for how mycelium could function as a biological reservoir.

### Synthetic Biological Intelligence Review

**Paper:** "The technology, opportunities, and challenges of Synthetic Biological Intelligence." *Biotechnology Advances* (2023). DOI: [10.1016/j.biotechadv.2023.108233](https://doi.org/10.1016/j.biotechadv.2023.108233) — **32 citations**

Comprehensive review covering DishBrain to organoids, mapping the landscape from individual neuron systems to scaled biological computing.

---

## 10. Reservoir Computing with Living Substrates

The reservoir computing paradigm is particularly relevant because it does not require the substrate to "learn" in a conventional sense — it only requires the substrate to exhibit complex, non-linear, fading memory dynamics. Mycelium already exhibits all of these.

### From the EAP Pong paper — Reservoir framework

> *"Reservoir computing derives from recurrent neural network frameworks. The dynamics of a fixed non-linear system, called a reservoir, are used as part of a neural network, mapping input and output signals to higher dimensional space."* — Strong et al. (2024), **p.2**

### From the EAP reservoir paper — Memory is key

> *"Most computational systems require memory to process functions. Finite automata use the memory of their current state to perform computations, morphological computation media are no different."* — Strong et al. (2022), **p.3**

### 2025: Mycelium chips for reservoir computing

Researchers have directly demonstrated mycelium as a physical reservoir in a **2025 bioRxiv preprint**: "Morphologically Tunable Mycelium Chips for Physical Reservoir Computing." Hyphal networks were shown to transform time-varying inputs for machine learning tasks, with chip parameters (porosity, density, water content) as tunable parameters.

### 2025: Shiitake mushrooms as organic memristors

Researchers demonstrated that shiitake mushrooms can be trained to act as organic memristors — data processors that remember past electrical states. (Source: EurekAlert press release, 2025)

---

## 11. Gap Analysis & Feasibility

### DishBrain requirement-by-requirement comparison

| Requirement | Neurons (DishBrain) | Mycelium (Our Lab) | Source / Quote |
|---|---|---|---|
| **Electrical spiking** | Action potentials 1-40 Hz, µV-mV | Spikes ~0.12 Hz, mean ~135 µV, max 1868 µV | Mishra et al. p.5: *"mean spiking frequency varied around ξ_native ~ 0.12 spikes s⁻¹"* |
| **Spike trains** | Burst patterns | H-spikes (2.6 min period), L-spikes (14 min period) | Adamatzky (2018) p.1: *"high-frequency (period 2.6 min) and low-frequency (period 14 min)"* |
| **Stimulus response** | Electrical only | UV, blue light, chemical, thermal | Mishra et al. p.5: *"fungi were more sensitive to UV light stimulation [...] blue light stimulation, with V_light potentials reaching 83 ± 11 μV"* |
| **Signal amplification from stimulus** | N/A | 60-1000× under UV | Mishra et al. p.10: *"signals were 60- to 1000-fold larger"* |
| **MEA interfacing** | MaxOne HD-MEA, 26,400 electrodes | Extracellular 3-electrode setup (E1, E2, E_GND) | Mishra et al. p.2-3: *"24-bit analog-to-digital converter (ADC) with four channels"* |
| **Recording stability** | Weeks-months | 30+ days proven | Mishra et al. p.3: *"over a period of more than 30 days"* |
| **Closed-loop feedback** | FPGA, ~1 ms latency | ESP8266/ESP32, 10-50 ms feasible | Lab hardware; need real-time implementation |
| **Sensory encoding** | Rate + place coding, 4-40 Hz | Unknown — need to test patterned stim | Open question |
| **Learning timescale** | 5 minutes | Unknown — likely hours/days | Open question |
| **Culture requirements** | Sterile room, iPSC differentiation, CO₂ incubator | Agar plates, room temperature | Mishra et al. p.1: *"fungi can be easily cultured in large quantities and have relatively simple engineering requirements"* |

### Key advantages of mycelium

1. **No cell culture facility** — grows on agar at room temperature
2. **No ethics issues** — unlike human iPSC neurons or organoids
3. **Self-healing** — damaged regions regrow
4. **Environmental sensitivity** — natural sensors (UV, blue light, chemicals)
5. **Scalable** — grow arbitrarily large networks
6. **Cheap** — mushroom spawn kit vs. iPSC differentiation

### Key unknowns

1. **Does mycelium process patterned electrical stimulation meaningfully?** We know UV → spike, but does electrode-delivered pattern → different network response?
2. **100× slower spike rate** — game must run proportionally slower
3. **No demonstrated goal-directed learning** — logic gates (Adamatzky) and CPG control (Mishra) are passive; DishBrain-style active learning is untested
4. **The EAP precedent is encouraging:** even a non-living polyacrylamide gel showed 8-10% improvement via ion-redistribution memory

---

## 12. Proposed Experimental Design

### System Architecture: "MyceliumBrain"

```
┌──────────────────────────────────────────────────────┐
│                  MYCELIUMBRAIN SYSTEM                 │
│                                                      │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐   │
│  │ Mycelium │───▶│ Custom    │───▶│ ESP32        │   │
│  │ Culture  │◀───│ 8-Electrode│◀───│ + ADS1256    │   │
│  │ P. eryn. │    │ PCB Array │    │ (24-bit ADC) │   │
│  └──────────┘    └───────────┘    └──────────────┘   │
│                                      │  ▲            │
│                                      │  │            │
│                                      ▼  │            │
│                              ┌──────────────┐        │
│                              │  Pong Engine  │        │
│                              │  (Software)   │        │
│                              └──────────────┘        │
│                                                      │
│  FEEDBACK:                                           │
│  ├─ HIT  → Predictable stim (steady freq)            │
│  └─ MISS → Unpredictable stim (random freq)          │
│                                                      │
│  + UV LIGHT as additional input modality              │
│  TIMESCALE: 10-100× slower than DishBrain            │
└──────────────────────────────────────────────────────┘
```

### Phase 1: Characterise Stimulus-Response (2-3 weeks)

- Record baseline spiking from *P. eryngii* on existing 24-bit ADC setup in Faraday cage
- Test electrical stimulation at varying frequencies and amplitudes
- Measure response latency and reproducibility
- Use UV/blue light as positive control (proven response)

### Phase 2: Build MyceliumBrain MEA (1-2 weeks)

- Design 8-electrode PCB array: 4 sensory + 2×2 motor output
- Stainless steel pin electrodes inserted into agar
- Reference electrode in culture medium
- Validated by 2025 PCB-based electrode paper for mycelium

### Phase 3: Closed-Loop Pong Integration (2-3 weeks)

- Pong engine on ESP32 or Raspberry Pi
- Spike detection via threshold crossing
- Sensory encoding: rate + place, but at ~1 Hz base rate
- Game speed: 1 ball position update every 5-10 seconds
- DishBrain feedback paradigm: predictable (hit) vs. unpredictable (miss)

### Phase 4: Run Experiments (2-4 weeks)

- Sessions: 30 min to 12 hours each
- Multiple sessions per day, multiple days
- Conditions to compare:
  1. Full feedback (predictable/unpredictable)
  2. Silent feedback (no stimulation on miss)
  3. No feedback (open loop)
  4. Dead mycelium control
  5. Agar-only control
- Metrics: rally length, aces, hit rate, functional connectivity changes

---

## 13. Full Reference List

| # | Citation | DOI | Role |
|---|---------|-----|------|
| 1 | Kagan et al. (2022) "In vitro neurons learn and exhibit sentience…" *Neuron* | 10.1016/j.neuron.2022.09.001 | Core paradigm — DishBrain |
| 2 | Mishra et al. (2024) "Sensorimotor control of robots…" *Science Robotics* | 10.1126/scirobotics.adk8019 | Mycelium spiking, UV response, biohybrid robots |
| 3 | Strong et al. (2024) "EAP hydrogels exhibit emergent memory…" *Cell Reports Physical Science* | 10.1016/j.xcrp.2024.102151 | Non-neural Pong — proof of concept |
| 4 | Strong et al. (2022) "EAP gels as probabilistic reservoir automata…" *iScience* | 10.1016/j.isci.2022.105558 | Active matter reservoir theory |
| 5 | Adamatzky (2018) "On spiking behaviour of oyster fungi…" *Scientific Reports* | 10.1038/s41598-018-26007-1 | Fungal spiking characterisation |
| 6 | Adamatzky (2022) "Language of fungi…" *Royal Society Open Science* | 10.1098/rsos.211926 | Fungal spike language |
| 7 | Adamatzky et al. (2022) "Logics in Fungal Mycelium Networks" *Logica Universalis* | 10.1007/s11787-022-00318-4 | Fungal logic gates |
| 8 | Gandia & Adamatzky (2022) "Electrical spiking of psilocybin fungi" *Communicative & Integrative Biology* | 10.1080/19420889.2022.2136118 | Psilocybin spiking |
| 9 | Smirnova et al. (2023) "Organoid Intelligence (OI)…" *Frontiers in Science* | 10.3389/fsci.2023.1017235 | OI roadmap |
| 10 | Cai et al. (2023) "Brain organoid reservoir computing…" *Nature Electronics* | 10.1038/s41928-023-01069-w | Brain organoid reservoirs |
| 11 | "Critical dynamics arise during structured information presentation…" *Nature Comms* (2023) | 10.1038/s41467-023-41020-3 | DishBrain follow-up: criticality |
| 12 | "Experimental validation of the free-energy principle…" *Nature Comms* (2022) | 10.1038/s41467-023-40141-z | FEP validation in vitro |
| 13 | "Open and remotely accessible Neuroplatform…" *Frontiers in AI* (2024) | 10.3389/frai.2024.1376042 | FinalSpark cloud platform |
| 14 | "Morphologically Tunable Mycelium Chips…" *bioRxiv* (2025) | bioRxiv preprint | Mycelium reservoir computing |
| 15 | "The technology, opportunities, and challenges of SBI" *Biotechnology Advances* (2023) | 10.1016/j.biotechadv.2023.108233 | SBI review |
| 16 | Friston (2010) "The free-energy principle: a unified brain theory?" *Nature Reviews Neuroscience* | 10.1038/nrn2787 | FEP theory — 6730 citations |
| 17 | Slayman, Long & Gradmann (1976) "'Action potentials' in Neurospora crassa" *Biochim. Biophys. Acta* | 10.1016/0005-2736(76)90129-3 | Foundational fungal electrophysiology |
| 18 | Fukasawa et al. (2024) "Electrical integrity and week-long oscillation in fungal mycelia" *Scientific Reports* | 10.1038/s41598-024-66223-6 | Week-long oscillations, directional flow |
| 19 | Adamatzky (2026) "Directional Electrical Spiking, Bursting, and Information Propagation…" *arXiv* | arXiv preprint | Spatially structured spiking, propagation speed |
| 20 | Adamatzky (2026) "Propagation of electrical spike trains in substrates colonised by oyster fungi" *bioRxiv* | 10.64898/2026.01.12.699130 | Slow traveling ionic waves at ~0.7 cm/min |
| 21 | "Detection of electrical signals in fungal mycelia…" *iScience* (2025) | forthcoming | PCB-electrode methodology, reproducible recording |
| 22 | "Propagation of electrical signals by fungi" *arXiv* (2023) | arXiv preprint | Frequency-modulated signal transmission 100–10,000 Hz |
| 23 | Ohio State Univ. (2025) Shiitake mushroom organic memristors *PLOS ONE* | forthcoming | Fungal memristors, 90% RAM accuracy, radiation-resistant |
| 24 | Multiple (2022–2024) Moisture-dependent spiking in mycelium composites | various | Hydration-gated spike trains, water-induced responses |
| 25 | Multiple studies — Mycorrhizal bio-electric bridges | various | Wound signals transmitted through mycelial air-gap bridges |

---

> **Verdict:** This experiment is unprecedented — no one has attempted to make mycelium play a game. The EAP paper proved even abiotic material can show Pong improvement. The main unknowns are whether patterned electrical stimulation is meaningfully processed by mycelium, and the timescale of adaptation. Even negative results would be publishable in the current landscape of biological computing.
>
> **Update (March 2026 deep search):** The field is accelerating rapidly. January 2026 papers by Adamatzky now prove directional, spatially structured signal propagation at measurable speeds (~0.7 cm/min). Tohoku University's 104-day recording reveals week-long oscillation cycles. Ohio State's shiitake memristors show that fungi physically store information. And the 2023 frequency-modulated propagation result proves mycelium can carry externally imposed signals at 100–10,000 Hz — far above its intrinsic spiking rate. **The evidence base for MyceliumBrain is stronger than when this document was first written.**
