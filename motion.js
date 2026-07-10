(()=>{
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  if(reduced.matches)return;
  document.documentElement.classList.add("motion-ready");

  const motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    entry.target.classList.add("motion-visible");
    motionObserver.unobserve(entry.target);
  }),{threshold:.09,rootMargin:"0px 0px -36px"});

  let depthTargets=[];
  const selectors={
    text:".hero-copy,.home-heading,.section-head,.info-hero,.footer-inner",
    panel:".hero-stage,.category-card,.toolbar,.card,.info-card,.set-feature",
    icon:".info-icon"
  };

  function addSeal(){
    const heading=document.querySelector(".home-heading");
    if(!heading||heading.querySelector(".motion-seal"))return;
    const seal=document.createElement("div");
    seal.className="motion-seal";
    seal.setAttribute("aria-hidden","true");
    seal.innerHTML='<svg viewBox="0 0 112 112"><defs><path id="motion-seal-path" d="M56 56m-42 0a42 42 0 1 1 84 0a42 42 0 1 1-84 0"/></defs><circle cx="56" cy="56" r="52"/><text><textPath href="#motion-seal-path">CURATED • COMPARE • DISCOVER • SAVE • </textPath></text><circle class="seal-core" cx="56" cy="56" r="17"/><path class="seal-check" d="m48 56 5 5 11-12"/></svg>';
    heading.append(seal);
  }

  function prepare(root=document){
    addSeal();
    Object.entries(selectors).forEach(([type,selector])=>{
      const nodes=root.matches?.(selector)?[root]:[...root.querySelectorAll?.(selector)||[]];
      nodes.forEach((node,index)=>{
        if(node.dataset.scrollMotion)return;
        node.dataset.scrollMotion=type;
        node.style.setProperty("--motion-delay",`${Math.min(index%4,3)*70}ms`);
        motionObserver.observe(node);
      });
    });
    depthTargets=[...document.querySelectorAll(".product-img,.category-art svg,.info-icon,.float-chip,.set-media img")];
    requestAnimationFrame(updateScrollMotion);
  }

  function updateScrollMotion(){
    if(reduced.matches)return;
    const seal=document.querySelector(".motion-seal");
    if(seal){
      const rect=seal.getBoundingClientRect();
      seal.style.transform=`rotate(${((innerHeight*.5-rect.top)*.14).toFixed(2)}deg)`;
    }
    depthTargets.forEach((node,index)=>{
      const rect=node.getBoundingClientRect();
      if(rect.bottom<-100||rect.top>innerHeight+100)return;
      const progress=(innerHeight*.5-(rect.top+rect.height*.5))/innerHeight;
      const range=node.classList.contains("product-img")?9:16;
      const depth=Math.max(-range,Math.min(range,progress*range*1.8));
      node.style.setProperty("--motion-depth",`${depth.toFixed(2)}px`);
      if(node.matches(".info-icon,.float-chip"))node.style.setProperty("--motion-rotate",`${(progress*(index%2?5:-5)).toFixed(2)}deg`);
    });
  }

  let scrollQueued=false;
  addEventListener("scroll",()=>{
    if(scrollQueued)return;
    scrollQueued=true;
    requestAnimationFrame(()=>{updateScrollMotion();scrollQueued=false});
  },{passive:true});

  let mutationQueued=false;
  new MutationObserver(()=>{
    if(mutationQueued)return;
    mutationQueued=true;
    requestAnimationFrame(()=>{prepare();mutationQueued=false});
  }).observe(document.querySelector("main"),{childList:true,subtree:true});

  prepare();
})();
