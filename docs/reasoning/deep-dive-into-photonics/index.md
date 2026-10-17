---
layout: post
title: "deep dive into photonics, a notebook"
date: 2026-10-16
description: Learning photonics from zero, starting with what a waveguide is
scripts:
  - viz.js
modules:
  - em-wave-3d.js
---

## Why photonics?

I've always enjoyed physics more than most subjects. Physics felt grounded to me since it was describing something real. Learning physics felt like learning about the rules that govern how the world actually works. What I especially liked was that I could usually build an intuition for something, no matter how complicated it seemed, by relating it to things I'd observed in everyday life. It was also a subject that came pretty naturally to me. Photonics has brought back a lot of that curiosity, and I wanted to learn about inference problems from the hardware side.

This will be a rough latent draft blog, to be later formatted into a proper blog post. The goal will be to learn the technical side to be able to do my capstone successfully. This would get too lengthy if I covered every fundamental of EE in between, so I'm keeping this blog limited to documenting chain of thought sequences of concepts for building mental models, and my coolest findings/unlocks. But don't worry, I'm starting from basically zero in terms of optics knowledge!

Style of explanation will be focused on intuition, building mental models, and relating to everyday life.

## Section 1 - zero to the waveguide

The first goal is one object used in photonics, the **waveguide**, a strip of material that traps light and steers it around a chip, the same way a copper trace carries current around a circuit.

To get there, this part covers some prerequisites.

### What is light?

Light from a lamp travels across the room. When you look at the lamp, it looks bright. Energy must have travelled from the lamp, through space, eventually into your eyes. Your eyes must be receiving something from the lamp.

But what exactly is travelling? Light is a propagating **disturbance** of energy in space. But it doesn't need a medium. Something like sound travels using air as a medium. So how does this work?

A disturbance needs something to disturb. For something like sound, it would be the air. For light, it's the **electric and magnetic fields**.

### From a charge to a disturbance to a wave

Imagine a charge, creating an unchanging electric field around it. If I physically move the charge back and forth, what happens? What I do know is that a positive charge produces an electric field throughout space

$$
\vec{E} = \frac{q}{4\pi\varepsilon_0 r^2}\,\hat{r}
$$

But this is not enough to describe how an electric field changes when I move a charge. We need Maxwell's equations, another set of fundamental laws, which describe how EM fields change with time. Without doing any theory at all, I might intuitively assume that the electric field farther away would take some time to change, longer than the field closer. Now, moving the charge back and forth creates a "disturbance" in the electric field. Not necessarily a wave of any kind yet.

A changing magnetic field creates an electric field that curls around it, which is **Faraday's law**. A changing electric field creates a magnetic field that curls around it, which is the **Maxwell-Ampère law**.

So a changing $$\vec{E}$$ creates a $$\vec{B}$$, the changing $$\vec{B}$$ creates an $$\vec{E}$$, and so on. Each one keeps regenerating the other, and the pair moves forward together. No material has to be there, e.g. no air.

### Maxwell's equations

A bit of theory. In empty space, with no charges or currents around, those rules are

$$
\begin{aligned}
\nabla \cdot \vec{E} &= 0 \\
\nabla \times \vec{E} &= -\frac{\partial \vec{B}}{\partial t} \\
\nabla \cdot \vec{B} &= 0 \\
\nabla \times \vec{B} &= \mu_0 \varepsilon_0 \frac{\partial \vec{E}}{\partial t}
\end{aligned}
$$

Intuitively,

- $$\nabla \cdot \vec{E} = 0$$ means with no charges around, electric field lines don't start or end anywhere.
- $$\nabla \cdot \vec{B} = 0$$ means magnetic field lines never start or end, anywhere. There are no magnetic charges.
- $$\nabla \times \vec{E} = -\partial \vec{B} / \partial t$$ means a changing $$\vec{B}$$ makes an $$\vec{E}$$ that curls around it.
- $$\nabla \times \vec{B} = \mu_0 \varepsilon_0 \, \partial \vec{E} / \partial t$$ means a changing $$\vec{E}$$ makes a $$\vec{B}$$ that curls around it.

From these equations, I can get something interesting

$$
\nabla^2 \vec{E} = \mu_0 \varepsilon_0 \frac{\partial^2 \vec{E}}{\partial t^2}
$$

This is the **wave equation**. It ties the field's curvature in space to how the field accelerates in time. Back to what I meant by "not necessarily a wave of any kind yet". Any shape of disturbance satisfies this equation, as long as it moves at the speed $$c = 1/\sqrt{\mu_0 \varepsilon_0} \approx 3 \times 10^8 \text{ m/s}$$. So I don't have to move the charge back and forth periodically. A single sharp jerk sends out a single sharp pulse, while moving the charge back and forth in a sinusoidal fashion sends out a sinusoidal wave, oscillating in space and in time. Both travel outward at $$c$$. The sinusoid is the special one, because any other shape can be built by adding sinusoids together.

What if I move the charge very slowly, or very fast? The equation still holds either way, and the disturbance always travels at $$c$$. What changes is the frequency. Wiggle the charge slowly and the wave has a long wavelength, like the radio waves from an antenna. Wiggle it about $$5 \times 10^{14}$$ times a second and the wave is visible light. So "no light" only means no light our eyes can see. Slow wiggles also carry very little energy, since the strength of the disturbance depends on how hard the charge accelerates. And a charge moving at a steady speed sends out nothing at all. Its field just slides along with it, so only speeding up or slowing down makes a disturbance.

<figure class="viz" data-viz="charge-disturbance" data-label="A charge moved once, or wiggled, and the disturbance it sends out">
  <div class="viz-stage"></div>
  <figcaption>One sharp jerk sends out one pulse and steady wiggling sends out a wave, both moving away at \(c\).</figcaption>
</figure>

Let's look at the simplest solution to the wave equation, a **plane wave** travelling along $$z$$. The electric field points along $$x$$, the magnetic field along $$y$$, and both oscillate in step, at right angles to each other and to the direction of travel

$$
\vec{E} = E_0 \cos(kz - \omega t) \, \hat{x}, \qquad \vec{B} = \frac{E_0}{c} \cos(kz - \omega t) \, \hat{y}
$$

<figure class="viz" data-viz="em-wave-3d" data-label="3D view of an electromagnetic plane wave">
  <div class="viz-stage"></div>
  <figcaption>Drag to rotate. The arrows show \(\vec{E}\) (red) and \(\vec{B}\) (blue) at points along the beam, each flapping back and forth in its own plane. Switch to <b>plane wave</b> to see the same wave on many parallel lines at once.</figcaption>
</figure>

The arrows only show the field direction and magnitude along one line. To get a plane wave, extend this single line to a whole plane, the same way a plane is made up of many parallel lines.

### What does a moving wave look like?

Back to the wave from above, with just the electric field

$$
\vec{E}(z, t) = E_0 \cos(kz - \omega t)\, \hat{x}
$$

- $$E_0$$ is the **amplitude**.
- $$k$$ is the **wavenumber**.
- $$\omega$$ is the **angular frequency**.
- $$\hat{x}$$ is the direction the field points.

The expression inside the cosine, $$\phi = kz - \omega t$$, is the **phase**. Wherever $$\phi = 0$$ there's a crest, and wherever $$\phi = \pi$$ there's a trough. There are a few ways to look at this equation.

- **Hold $$t$$ fixed.** The phase changes across $$z$$, and you get a snapshot of the wave across space. It repeats every wavelength, $$\lambda = 2\pi / k$$.
- **Hold $$z$$ fixed.** Stand at one spot. The phase changes as time passes, and the field magnitude changes. It repeats every period, $$T = 2\pi / \omega$$.
- **Let both vary.** The wave travels.

A real wave can't go on forever. Switch a laser on and then off again, and what comes out is a **short pulse**, a burst of the same wave with a start and an end. Inside the burst the field oscillates exactly like the endless wave, and before and after it the field is zero. Watching a pulse makes it easier to see that something is actually moving.

<figure class="viz" data-viz="wave-anatomy" data-label="A travelling wave, viewed four ways">
  <div class="viz-stage"></div>
  <figcaption>The same wave, \(E_0 \cos(kz - \omega t)\), viewed four ways. Switch between them with the buttons, and switch to a short pulse to see a wave that starts and stops.</figcaption>
</figure>

### Phase velocity

To follow one crest, follow one value of the phase

$$
kz - \omega t = \text{constant}
$$

**Why a constant?** The height of the wave at any point depends only on the phase. Two places, or two moments, with the same phase have the same height and the same slope, so they're the same feature of the wave (look at the short pulse in the figure above with **phase fixed**, where the red dot stays on the same crest).

Suppose we track the crest with phase $$0$$

$$
\underbrace{kz - \omega t}_{\text{phase}} = 0
$$

At $$t = 0$$

$$
kz = 0 \implies z = 0
$$

At a later time

$$
kz - \omega t = 0 \implies \boxed{z = \frac{\omega}{k}\, t}
$$

The crest moves to the right with speed

$$
\boxed{v_p = \frac{dz}{dt} = \frac{\omega}{k}}
$$

Any other crest, $$kz - \omega t = C$$, gives $$z = (\omega t + C)/k$$ and the same speed.

That's the **phase velocity**, the speed of the crests. In vacuum $$\omega / k = c$$. Since $$\omega = 2\pi f$$ and $$k = 2\pi / \lambda$$, this gives the familiar equation

$$
v_p = f \lambda
$$

The minus sign in $$kz - \omega t$$ is what makes the wave travel toward $$+z$$. As $$t$$ grows, $$z$$ has to grow to keep the phase the same. With $$kz + \omega t$$, the wave travels toward $$-z$$.

### Why light slows down in glass, the refractive index

Here's the chain of thought, starting off with an oscillating EM field.

**1. Bound electrons move like masses on springs.** The electrons in glass are bound to their atoms, and because they carry charge, the light's electric field pushes them back and forth. A good way to picture it is a mass on a spring.

$$
m \frac{d^2 x}{dt^2} = \underbrace{-\kappa x}_{\text{spring pulls back}} + \underbrace{q E_0 \cos\omega t}_{\text{light pushes}}
$$

**2. Dipoles add up to a polarization $$\vec{P}$$.** A displaced electron and its nucleus form a tiny **dipole**, a plus and a minus charge pulled slightly apart. Add up all the dipoles in each cubic metre and you get the **polarization** $$\vec{P}$$.

**3. Susceptibility and permittivity.** The **susceptibility** $$\chi$$, a plain number, says how easily the material polarizes, $$\vec{P} = \varepsilon_0 \chi \vec{E}$$, and the **permittivity** $$\varepsilon = \varepsilon_0 (1 + \chi)$$ says how strongly the vacuum and the material's electrons together respond to an electric field. The constants $$\varepsilon_0$$ and $$\mu_0$$ are measured in the lab, and $$\chi$$ is measured for each material (for glass, $$\chi \approx 1.3$$).

**4. Relative permittivity.** It's defined as

$$
\varepsilon_r = \frac{\varepsilon}{\varepsilon_0} = 1 + \chi
$$

It represents how many times more strongly the material responds to an electric field than empty space does. For vacuum $$\varepsilon_r = 1$$, and for glass it's about $$2.3$$.

**5. Refractive index.** The refractive index $$n$$ is defined as how many times slower the crests move in a material than in vacuum

$$
n = \frac{c}{v_p}
$$

We can get it from the wave equation. Inside a non-magnetic material, Maxwell's equations look the same as in vacuum, except $$\varepsilon_0$$ becomes $$\varepsilon = \varepsilon_0 \varepsilon_r$$. So the wave equation becomes

$$
\nabla^2 \vec{E} = \mu_0 \varepsilon_0 \varepsilon_r \frac{\partial^2 \vec{E}}{\partial t^2}
$$

Compared with vacuum, the right side is $$\varepsilon_r$$ times bigger, and the wave now moves at $$v_p = 1/\sqrt{\mu_0 \varepsilon_0 \varepsilon_r} = c/\sqrt{\varepsilon_r}$$. So the wave is slower by a factor of $$\sqrt{\varepsilon_r}$$, and that factor is exactly what we defined as the refractive index

$$
n = \frac{c}{v_p} = \sqrt{\varepsilon_r} = \sqrt{1 + \chi}
$$

Connecting everything together. When light enters glass, its electric field pushes and pulls on electrons bound to atoms, causing them to oscillate. These oscillating charges produce electromagnetic waves of their own, which interfere with the original wave. The result is a wave whose crests are progressively shifted backward compared with light travelling through a vacuum. We'd notice this if we measured it ourselves, and it takes (quite a lot of) theory to explain why. We describe this behaviour using the refractive index, $$n$$, which tells us how much slower the phase of light propagates through a material compared with a vacuum.

### Snell's law

When light hits a boundary at an angle, it bends. Snell's law says by how much, and it also comes from Maxwell's equations.

First, the **wave vector**. $$k$$ is really a vector, $$\vec{k}$$, pointing in the direction the wave travels, with length $$\lvert \vec{k} \rvert = 2\pi / \lambda$$. Frequency doesn't change when light enters a material, but the crests bunch up by a factor of $$n$$, so $$\lambda = \lambda_0 / n$$ and $$\lvert \vec{k} \rvert = n k_0$$, where $$k_0 = 2\pi / \lambda_0$$ is the vacuum value.

Second, Maxwell's equations say something important at a boundary. The part of $$\vec{E}$$ running along the surface has to be the same on both sides.

From there, light hitting the surface makes three waves (incident, reflected and transmitted). The matching has to hold at every point along the surface, at every moment. That only works if all three waves have the same frequency and the same spacing of crests along the surface, which means the same component of $$\vec{k}$$ along the surface

$$
k_1 \sin\theta_1 = k_1 \sin\theta_r = k_2 \sin\theta_2
$$

The first equality says the angle of reflection equals the angle of incidence. With $$k = n k_0$$, the second is Snell's law

$$
n_1 \sin\theta_1 = n_2 \sin\theta_2
$$

<figure class="viz" data-viz="snell-wavefronts" data-label="Crests matching along the boundary">
  <div class="viz-stage"></div>
  <figcaption>The red lines are wave crests. Solid lines are the incoming wave (in air, above) and the transmitted wave (in glass, below), and dashed lines are the reflected wave. In glass the crests are packed closer together, but where each set meets the surface, the crests land on the same points (the black dots).</figcaption>
</figure>

### The critical angle

Going from a high index to a low one (glass into air, silicon into silica), light bends away from the normal, so tilting the incoming ray eventually makes the outgoing ray skim along the surface at $$90^\circ$$. That incoming angle is the **critical angle**

$$
\sin\theta_c = \frac{n_2}{n_1}
$$

Past that angle, Snell's law would need $$\sin\theta_2 > 1$$, and no angle satisfies that. No light gets through, and all of it reflects. This is **total internal reflection**.

- Glass into air, $$\theta_c = \arcsin(1/1.5) \approx 41.8^\circ$$
- Silicon into silica, $$\theta_c = \arcsin(1.44/3.48) \approx 24.4^\circ$$

<figure class="viz" data-viz="snell" data-label="Snell's law and total internal reflection">
  <div class="viz-stage"></div>
  <figcaption>Change the angle of the incoming ray and the pair of materials. Going from high to low index, push the angle past \(\theta_c\) and the transmitted ray disappears.</figcaption>
</figure>

This is the whole trick behind a waveguide, a strip of high-index material (the **core**) surrounded by low-index material (the **cladding**). Light inside that strikes the walls at a shallow enough angle reflects totally, every time, and stays trapped.

And Snell's law shows how dispersion will come in. The amount of bending depends on $$n$$. If $$n$$ is different for different colours, each colour of light bends by a different amount.

### Chromatic dispersion - a cool unlock

Have you seen this before? Shine white light into a glass prism, and a rainbow fans out of the other side. That happens because the refractive index depends on wavelength, $$n = n(\lambda)$$, so waves with different wavelengths (crest spacings) bend by different amounts. Dispersion has two visible consequences.

- **Colours bend by different amounts.** That's the prism.
- **Colours travel at different speeds.** That spreads out pulses of light.

White light contains every visible colour. At each face of the prism, Snell's law applies with that colour's own $$n(\lambda)$$.

<figure class="viz" data-viz="prism" data-label="White light and a laser through a glass prism">
  <div class="viz-stage"></div>
  <figcaption>Light traced through a glass prism. Real glass spreads the colours only slightly, so the slider can exaggerate the effect. Switch to the laser and the beam just bends without splitting.</figcaption>
</figure>

Shine a laser pointer through a prism and you won't get a rainbow. A laser emits essentially one wavelength, so the beam bends and comes out as a single dot of the same colour. A rainbow needs light that already contains many wavelengths, such as sunlight, a white LED, or a special broadband laser called a supercontinuum source. This will matter later. Photonic links use lasers because their light sits in a very narrow range of wavelengths, and they pick that wavelength where dispersion is close to zero, so the light carrying the data barely spreads.

### How does light transfer data?

Information travels as pulses of light. A short burst is built from a band of frequencies added together, and each of them has its own phase velocity. Here's how, step by step.

A laser left on is a single, pure frequency $$f_c$$, called the **carrier**. At $$1310 \text{ nm}$$ that's about $$229 \text{ THz}$$. At one point in space, its field is

$$
E(t) = \cos(2\pi f_c t)
$$

To send data, we multiply it by a **data signal** $$m(t)$$, which is $$1$$ while the bit is a one and $$0$$ while it's a zero

$$
E(t) = m(t) \cos(2\pi f_c t)
$$

The data is much slower than the light. At $$50 \text{ Gb/s}$$ each bit lasts $$20 \text{ ps}$$.

One bit, a square pulse lasting $$T$$, contains a whole band of frequencies around $$f_c$$. Its spectrum (the Fourier transform of a square pulse) is a sinc shape centred on the carrier

$$
S_1(f) \propto \frac{\sin\big(\pi (f - f_c) T\big)}{\pi (f - f_c) T}
$$

<figure class="viz" data-viz="spectrum" data-label="A laser line, and the spectrum of a square pulse">
  <div class="viz-stage"></div>
  <figcaption>The top shows the light's field over time, and the bottom shows its spectrum (how much of each frequency it contains). A laser left on is one line at \(f_c\). Chop it into a square pulse and the line spreads into a sinc, and the shorter the pulse, the wider the sinc.</figcaption>
</figure>

A stream of bits is a sum of these pulses, each switched on at a different time $$t_k$$. Shifting a pulse in time doesn't change the size of its sinc, only its phase. So the spectrum of the whole stream is one sinc multiplied by a sum of phases, one for each bit that's a one

$$
S(f) = S_1(f) \sum_{k \,:\, \text{bit } k = 1} e^{-i 2\pi (f - f_c) t_k}
$$

Each one-bit adds another copy of the same sinc, and the phases make the copies add up at some frequencies and cancel at others. Together they fill a continuous band around the laser line.

<figure class="viz" data-viz="modulation" data-label="A data signal on a laser, and its spectrum">
  <div class="viz-stage"></div>
  <figcaption>Click the bits to change the data. From the top, the data signal \(m(t)\), the laser \(\cos(2\pi f_c t)\), what's actually sent, \(m(t)\cos(2\pi f_c t)\), and its spectrum. The dashed curve is one bit's sinc times the number of ones, and the solid curve is the real sum. The laser is drawn only \(6\) times faster than the data. Really it's about \(4600\) times faster.</figcaption>
</figure>

### How fast does the data itself travel?

The data doesn't travel at the speed of the crests, but at the speed of the pulse as a whole, called the **group velocity**. To see why the two can differ, build a pulse the other way around. Start with one frequency and keep adding frequencies close to it. Two make beats. Many cancel each other almost everywhere, except in short bursts where they all line up in step.

<figure class="viz" data-viz="add-frequencies" data-label="Adding more and more nearby frequencies">
  <div class="viz-stage"></div>
  <figcaption>Waves at evenly spaced frequencies, all in step at the centre, added together. One frequency is a pure wave, two give beats, and many give sharp, isolated pulses. The more frequencies (the wider the band), the shorter each pulse.</figcaption>
</figure>

The pulse sits wherever those components line up and add in step. That location moves at the **group velocity**.

The simplest case is two waves with slightly different frequencies. Added together, they make **beats**, a fast wave inside a slowly varying envelope

$$
\cos(k_1 z - \omega_1 t) + \cos(k_2 z - \omega_2 t) = 2 \cos\!\left(\frac{\Delta k}{2} z - \frac{\Delta \omega}{2} t\right) \cos(\bar{k} z - \bar{\omega} t)
$$

The fast wave inside moves at $$\bar{\omega} / \bar{k}$$, the phase velocity. The envelope moves at $$\Delta\omega / \Delta k$$. For a smooth band of frequencies, that becomes a derivative

$$
v_g = \frac{d\omega}{dk}
$$

Inside a material, $$k = n(\omega) \, \omega / c$$. Differentiating gives

$$
v_g = \frac{c}{n_g}, \qquad n_g = n + \omega \frac{dn}{d\omega} = n - \lambda \frac{dn}{d\lambda}
$$

$$n_g$$ is the **group index**. With normal dispersion, $$n$$ falls as $$\lambda$$ grows, so $$n_g > n$$ and the pulse moves slower than the crests inside it. For silica at $$1550 \text{ nm}$$, $$n \approx 1.444$$ and $$n_g \approx 1.462$$. As it travels, the pulse's peak also flattens out and spreads, because the frequencies inside it don't all move at exactly the same group velocity.

<figure class="viz" data-viz="pulse" data-label="Phase velocity and group velocity of a pulse">
  <div class="viz-stage"></div>
  <figcaption>A pulse built from many frequencies. The red dot rides one crest (phase velocity), and the dark triangle rides the envelope (group velocity). In vacuum they move together. In glass the crests outrun the envelope.</figcaption>
</figure>

### Pulse spreading - why 1310 nm?

The group velocity itself changes with wavelength. A pulse holds a small band of wavelengths, so its parts arrive at slightly different times and the pulse spreads out. Fibre makers measure this with the dispersion parameter $$D$$, in $$\text{ps}/(\text{nm} \cdot \text{km})$$. For standard single-mode fibre, $$D$$ crosses zero near $$1310 \text{ nm}$$.

<figure class="viz" data-viz="dispersion-curve" data-label="Dispersion of standard single-mode fibre against wavelength">
  <div class="viz-stage"></div>
  <figcaption>Dispersion of standard single-mode fibre against wavelength, using Corning's SMF-28 spec (zero dispersion between \(1304\) and \(1324\) nm). The O-band around \(1310\) nm sits at the zero dispersion crossing, and the C-band used for long-haul telecom sits near \(17\) ps/(nm·km).</figcaption>
</figure>

**Why dispersion matters.** At $$50 \text{ Gb/s}$$ on one wavelength, each bit gets a $$20 \text{ ps}$$ time slot. Switching the laser on and off that fast widens its spectrum (the sinc from earlier) to cover about $$0.4 \text{ nm}$$ of wavelengths. At $$1550 \text{ nm}$$, $$D \approx 17 \text{ ps}/(\text{nm} \cdot \text{km})$$, so after $$2 \text{ km}$$ each pulse smears by about

$$
\Delta\tau = D \, L \, \Delta\lambda \approx 17 \times 2 \times 0.4 \approx 14 \text{ ps}
$$

That's most of a bit slot, so neighbouring bits blur into each other, and a few kilometres further the receiver starts misreading them.

<figure class="viz" data-viz="bit-spreading" data-label="Bits blurring together as they travel down fibre">
  <div class="viz-stage"></div>
  <figcaption>A row of bits sent down standard fibre at \(50\) Gb/s. Slide the distance and switch the wavelength. At \(1550\) nm the pulses spread into each other's slots, and past a few kilometres some bits are read wrong. At \(1310\) nm they stay sharp. The dashed line is the threshold between reading a \(0\) and a \(1\).</figcaption>
</figure>

The smearing is predictable, so it can be undone, but only by adding something to every link. Either a spool of special fibre with the opposite dispersion, which adds loss and has to be matched to each link's length, or a signal-processing chip at the receiver that computes the blur back out, which burns power and adds delay. A datacenter has hundreds of thousands of links, so that cost multiplies. At $$1310 \text{ nm}$$, $$D \approx 0$$ and you skip it.

Datacenter optics, including Lightmatter's photonic interconnects, work in the **O-band** around $$1310 \text{ nm}$$. (O stands for "original", since it was the first band used in fibre.) Lightmatter's $$16$$-wavelength source, for example, is centred at $$1310 \text{ nm}$$ on standard single-mode fibre.

- **Zero dispersion.** In the dispersion graph above, $$D$$ for standard single-mode fibre crosses zero at about $$1310 \text{ nm}$$. At that point pulses barely spread, and short links don't need dispersion compensation. When many wavelengths share one fibre, keeping all of them near zero dispersion matters even more.
- **Silicon is transparent there.** Silicon absorbs light with photon energy above its bandgap of $$1.12 \text{ eV}$$, equivalent to wavelengths shorter than about $$1.1\ \mu\text{m}$$. At $$1310 \text{ nm}$$ the photons don't carry enough energy to be absorbed, so the light passes straight through silicon, the same way visible light passes through a window. That's what lets silicon itself be the waveguide.
- **Loss doesn't matter much over short distances.** Fibre loses the least light around $$1550 \text{ nm}$$ (about $$0.2 \text{ dB/km}$$, against about $$0.33 \text{ dB/km}$$ at $$1310 \text{ nm}$$), which is why long-haul telecom uses $$1550 \text{ nm}$$. Datacenter links are at most a few kilometres, so the extra loss barely matters, and low dispersion matters more.
