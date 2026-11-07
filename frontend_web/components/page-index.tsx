"use client";

import { useEffect, useState } from "react";

const index = [["01","Product","product"],["02","Project facts",""],["03","How it works","journey"],["04","Memory map","memory"],["05","Capabilities",""],["06","Human control",""],["07","Outcome ledger","outcomes"],["08","Developers","developers"],["09","Honest limits",""],["10","Next step",""]];

export function PageIndex() {
  const [active, setActive] = useState("01");
  useEffect(() => {
    const observe = new IntersectionObserver((entries) => {
      const entry = entries.filter((item) => item.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      const section = entry?.target.closest("section");
      const indexLabel = section?.querySelector<HTMLElement>(".section-index strong")?.textContent?.replace("S.","");
      if (indexLabel) setActive(indexLabel);
    }, { threshold:[.2,.5], rootMargin:"-25% 0px -55% 0px" });
    document.querySelectorAll(".section-content, .hero").forEach((node)=>observe.observe(node));
    return ()=>observe.disconnect();
  }, []);
  return <nav className="page-index" aria-label="On this page"><span>On this page</span>{index.map(([n,label,id])=><a key={n} href={id ? `#${id}` : `#section-${n}`} aria-current={active===n?"location":undefined}><i>S.{n}</i><b>{label}</b></a>)}</nav>;
}
