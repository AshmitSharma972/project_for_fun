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

      // Fluid inertial scrolling configuration
      const lenis = new Lenis({
        duration: MOTION.duration,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.02,
        touchMultiplier: 1.8,
        infinite: false,
      });

      // Expose to window for smooth navigation
      (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;

      const ticker = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", () => ScrollTrigger.update());
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);

      // Global smooth anchor scroll handling (including PageIndex and buttons)
      const handleAnchorClick = (event: MouseEvent) => {
        const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;
        try {
          const target = document.querySelector(href);
          if (target) {
            event.preventDefault();
            lenis.scrollTo(target as HTMLElement, {
              offset: -76,
              duration: MOTION.duration,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          }
        } catch {
          // ignore malformed selector
        }
      };
      document.addEventListener("click", handleAnchorClick, { capture: true });

      // Fluid reveals for sections and cards
      const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      reveals.forEach((element) => gsap.fromTo(element,
        { y: 28, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: MOTION.reveal,
          ease: MOTION.ease,
          scrollTrigger: {
            trigger: element,
            start: `top ${MOTION.threshold * 100}%`,
            once: true,
          },
        },
      ));

      gsap.fromTo(".hero-line__inner", { yPercent: 110 }, { yPercent: 0, duration: MOTION.heading, stagger: MOTION.stagger, ease: MOTION.ease, delay: .15 });
      gsap.fromTo(".hero__copy, .hero__actions", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .1, ease: "power3.out", delay: .45 });
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
        delete (window as unknown as { __lenis?: unknown }).__lenis;
        document.removeEventListener("click", handleAnchorClick, { capture: true });
        lenis.destroy();
        gsap.ticker.remove(ticker);
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
