"use client";

import { useEffect } from "react";
import { MOTION } from "@/lib/animation";

export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let clean: (() => void) | undefined;
    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger"), import("lenis"),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: MOTION.lerp, smoothWheel: true });
      const ticker = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", () => ScrollTrigger.update());
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
      const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      reveals.forEach((element) => gsap.fromTo(element,
        { y: 24, opacity: 0, filter: "blur(8px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: MOTION.reveal, ease: MOTION.ease,
          scrollTrigger: { trigger: element, start: `top ${MOTION.threshold * 100}%`, once: true } },
      ));
      gsap.fromTo(".hero-line__inner", { yPercent: 110 }, { yPercent: 0, duration: MOTION.heading, stagger: MOTION.stagger, ease: MOTION.ease, delay: .18 });
      gsap.fromTo(".hero__copy, .hero__actions", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .1, ease: "power3.out", delay: .52 });
      gsap.to(".cosmos__image", { yPercent: 8, scale: 1.04, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });
      const magnetic = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
      const moveMagnet = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLElement;
        const bounds = element.getBoundingClientRect();
        gsap.to(element, { x: (event.clientX - bounds.left - bounds.width / 2) * .1, y: (event.clientY - bounds.top - bounds.height / 2) * .1, duration: .28, ease: "power2.out" });
      };
      const resetMagnet = (event: PointerEvent) => gsap.to(event.currentTarget as HTMLElement, { x: 0, y: 0, duration: .38, ease: "elastic.out(1,.5)" });
      magnetic.forEach((element) => { element.addEventListener("pointermove", moveMagnet); element.addEventListener("pointerleave", resetMagnet); });
      const glass = gsap.utils.toArray<HTMLElement>(".demo-window");
      const glow = (event: PointerEvent) => {
        const element = event.currentTarget as HTMLElement;
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        element.style.setProperty("--my", `${event.clientY - rect.top}px`);
      };
      glass.forEach((element) => element.addEventListener("pointermove", glow));
      clean = () => {
        lenis.destroy(); gsap.ticker.remove(ticker);
        magnetic.forEach((element) => { element.removeEventListener("pointermove", moveMagnet); element.removeEventListener("pointerleave", resetMagnet); });
        glass.forEach((element) => element.removeEventListener("pointermove", glow));
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        gsap.killTweensOf(".hero-line__inner, .hero__copy, .hero__actions, .cosmos__image");
      };
    })();
    return () => { disposed = true; clean?.(); };
  }, []);
  return null;
}
