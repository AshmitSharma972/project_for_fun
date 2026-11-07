"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const links = [["Product", "#product"], ["How it works", "#journey"], ["Docs", "#developers"], ["GitHub", "#developers"]];

export function SiteNav() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const previous = useRef(0);
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      if (y < 90) setHidden(false);
      else if (y > previous.current + 5) setHidden(true);
      else if (y < previous.current - 5) setHidden(false);
      previous.current = y;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <header className={`site-nav${hidden && !open ? " site-nav--hidden" : ""}`}>
    <Link href="/" aria-label="IncidentMind AI home"><BrandMark /></Link>
    <nav className="nav-links" aria-label="Main navigation">{links.map(([label, href]) => <a key={label} href={href}>{label}{label === "Docs" && <ArrowUpRight size={12} aria-hidden="true" />}</a>)}</nav>
    <span className="nav-spacer" />
    <div className="nav-actions"><Link className="pill" href="/console">Open console <ArrowUpRight size={15} aria-hidden="true" /></Link>
      <a className="nav-icon nav-icon--github" href="#developers" aria-label="Developer setup"><ArrowUpRight size={20} /></a>
      <button className="nav-icon menu-toggle" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={22} />}</button>
    </div>
    {open && <nav className="nav-mobile" aria-label="Mobile navigation">{links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link href="/console" onClick={() => setOpen(false)}>Open console ↗</Link></nav>}
  </header>;
}
