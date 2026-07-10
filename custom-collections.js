(()=>{
  const STORAGE_KEY="abigail-orbit-custom-collections-v1";
  const initialHash=location.hash.slice(1);
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const safeHttps=value=>{try{const url=new URL(value);return url.protocol==="https:"?url.href:""}catch{return""}};
  const metaImage=url=>`https://api.microlink.io/?url=${encodeURIComponent(url)}&embed=image.url`;
  const screenshotImage=url=>`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
  const pagePreview=url=>`https://image.thum.io/get/width/900/crop/900/noanimate/${url}`;

  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      return Array.isArray(parsed)?parsed.filter(category=>category?.id&&category?.name&&Array.isArray(category.items)):[];
    }catch{return[]}
  }
  let collections=load();
  const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(collections));
  const toast=message=>{
    const region=$("#toast");
    if(!region)return;
    region.textContent=message;region.classList.add("show");
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>region.classList.remove("show"),2300);
  };

  function injectDialog(){
    if($("#custom-collection-dialog"))return;
    document.body.insertAdjacentHTML("beforeend",`<dialog class="custom-dialog" id="custom-collection-dialog" aria-labelledby="custom-dialog-title">
      <div class="custom-dialog-head"><div><h2 id="custom-dialog-title">Orbit에 제품 추가하기</h2><p>카테고리가 처음이라면 새 탭이 자동으로 만들어집니다.</p></div><button class="icon-btn" id="custom-dialog-close" type="button" aria-label="닫기">✕</button></div>
      <form class="custom-form" id="custom-product-form">
        <div class="custom-field"><label for="custom-category">Category</label><input id="custom-category" name="category" list="custom-category-list" placeholder="예: Sneakers" required><datalist id="custom-category-list"></datalist><small>같은 이름의 제품은 한 탭에 모입니다.</small></div>
        <div class="custom-field"><label for="custom-name">Product name</label><input id="custom-name" name="name" placeholder="예: New Balance 530" required><small>알아보고 싶은 제품명을 입력하세요.</small></div>
        <div class="custom-field full"><label for="custom-url">Product link</label><input id="custom-url" name="url" inputmode="url" placeholder="https://…"><small>링크가 없으면 제품명으로 쇼핑 검색 페이지를 연결합니다.</small></div>
        <div class="custom-field"><label for="custom-price">Price <span aria-hidden="true">·</span> optional</label><input id="custom-price" name="price" placeholder="예: $120 또는 ₩89,000"></div>
        <div class="custom-field"><label for="custom-note">Note <span aria-hidden="true">·</span> optional</label><input id="custom-note" name="note" placeholder="예: White / size 7"></div>
        <p class="custom-form-error" id="custom-form-error" role="alert"></p>
        <div class="custom-form-actions"><button class="pill-btn secondary" id="custom-form-cancel" type="button">Cancel</button><button class="pill-btn primary" type="submit">제품 추가하고 탭 열기 <span aria-hidden="true">→</span></button></div>
      </form>
    </dialog>`);
    $("#custom-dialog-close").onclick=closeDialog;
    $("#custom-form-cancel").onclick=closeDialog;
    $("#custom-product-form").addEventListener("submit",addProduct);
    $("#custom-collection-dialog").addEventListener("click",event=>{if(event.target===$("#custom-collection-dialog"))closeDialog()});
  }

  function updateCategorySuggestions(){
    const list=$("#custom-category-list");
    if(list)list.innerHTML=collections.map(category=>`<option value="${esc(category.name)}"></option>`).join("");
  }
  function openDialog(){
    updateCategorySuggestions();
    $("#custom-form-error").textContent="";
    $("#custom-collection-dialog").showModal();
    setTimeout(()=>$("#custom-category").focus(),80);
  }
  function closeDialog(){$("#custom-collection-dialog")?.close()}

  function addProduct(event){
    event.preventDefault();
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form));
    const categoryName=String(values.category||"").trim();
    const productName=String(values.name||"").trim();
    const suppliedUrl=String(values.url||"").trim();
    const error=$("#custom-form-error");
    if(!categoryName||!productName){error.textContent="카테고리와 제품명을 모두 입력해 주세요.";return}
    if(suppliedUrl&&!safeHttps(suppliedUrl)){error.textContent="제품 링크는 https:// 로 시작해야 합니다.";return}
    const lookup=`${productName} ${categoryName}`;
    const url=safeHttps(suppliedUrl)||`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(lookup)}`;
    let category=collections.find(item=>item.name.localeCompare(categoryName,undefined,{sensitivity:"accent"})===0);
    const isNew=!category;
    if(!category){category={id:`custom-${uid()}`,name:categoryName,items:[]};collections.push(category)}
    category.items.unshift({id:uid(),name:productName,url,price:String(values.price||"").trim(),note:String(values.note||"").trim(),addedAt:Date.now()});
    save();form.reset();closeDialog();render();openRoute(category.id);
    toast(isNew?`“${categoryName}” 탭을 만들고 제품을 추가했어요.`:`“${categoryName}”에 제품을 추가했어요.`);
  }

  function fallbackIcon(){return'<svg viewBox="0 0 180 180" fill="none" stroke="currentColor" stroke-width="4" aria-hidden="true"><path d="M43 63h94l-8 88H51Z"/><path d="M68 68V50c0-15 9-25 22-25s22 10 22 25v18"/><path d="M73 105h34M90 88v34" stroke-linecap="round"/></svg>'}
  function card(category,item){
    let host="Product research";try{host=new URL(item.url).hostname.replace(/^www\./,"")}catch{}
    return`<li class="card custom-card" data-reveal data-custom-item="${esc(item.id)}">
      <a class="card-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.name)} 자세히 보기"></a>
      <figure class="media"><span class="media-tag">Added to Orbit</span><button class="custom-remove" type="button" data-remove-custom="${esc(item.id)}" data-category-id="${esc(category.id)}" aria-label="${esc(item.name)} 삭제"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14"/></svg></button><img class="product-img" data-custom-image data-page-url="${esc(item.url)}" alt="${esc(item.name)}" loading="lazy" decoding="async"><span class="fallback">${fallbackIcon()}</span></figure>
      <div class="copy"><div class="topline"><div class="badges"><span class="badge">${esc(category.name)}</span></div><span class="price">${esc(item.price||"Research")}</span></div><p class="kind">Personal Orbit</p><h3>${esc(item.name)}</h3><p class="note">${esc(item.note||"제품 페이지에서 사양, 옵션, 최신 정보를 확인해 보세요.")}</p><span class="custom-source">${esc(host)}</span><span class="card-action">자세히 보기 ↗</span></div>
    </li>`;
  }

  function bindImages(root=document){
    $$('[data-custom-image]',root).forEach(image=>{
      if(image.dataset.bound)return;image.dataset.bound="1";
      const media=image.closest(".media"),url=image.dataset.pageUrl;
      image.onload=()=>{image.classList.add("loaded");media?.classList.add("has-image")};
      image.onerror=()=>{
        image.classList.remove("loaded");media?.classList.remove("has-image");
        if(!image.dataset.stage){image.dataset.stage="shot";image.classList.add("screenshot");image.src=screenshotImage(url);return}
        if(image.dataset.stage==="shot"){image.dataset.stage="preview";image.src=pagePreview(url);return}
        media?.classList.add("error");
      };
      image.src=metaImage(url);
    });
  }

  function removeProduct(categoryId,itemId){
    const category=collections.find(item=>item.id===categoryId);if(!category)return;
    category.items=category.items.filter(item=>item.id!==itemId);
    const removedCategory=category.items.length===0;
    if(removedCategory)collections=collections.filter(item=>item.id!==categoryId);
    save();render();
    if(removedCategory)openRoute("home");else openRoute(categoryId);
    toast(removedCategory?"마지막 제품을 삭제해 컬렉션 탭도 정리했어요.":"제품을 컬렉션에서 삭제했어요.");
  }

  function openRoute(route){
    const view=document.querySelector(`[data-view="${CSS.escape(route)}"]`);if(!view)return;
    $$('[data-view]').forEach(section=>section.hidden=section!==view);
    $$('.tab').forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.route===route)));
    history.replaceState(null,"",`#${route}`);view.classList.remove("view-enter");requestAnimationFrame(()=>view.classList.add("view-enter"));
    scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }

  function render(){
    const tabs=$(".tabs"),main=$("#main");if(!tabs||!main||!$(".home-collections"))return;
    $$(".custom-tab",tabs).forEach(node=>node.remove());$$('[data-custom-view]').forEach(node=>node.remove());
    const anchor=tabs.querySelector('[data-route="about"]');
    collections.forEach(category=>{
      const tab=document.createElement("button");tab.className="tab custom-tab";tab.type="button";tab.role="tab";tab.dataset.route=category.id;tab.setAttribute("aria-selected","false");tab.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h6l2 2h8v11H4Z"/><path d="M8 13h8"/></svg><span>${esc(category.name)}</span>`;tab.onclick=()=>openRoute(category.id);tabs.insertBefore(tab,anchor);
      const section=document.createElement("section");section.className="view collection custom-view";section.dataset.view=category.id;section.dataset.customView="";section.hidden=true;section.innerHTML=`<div class="container"><div class="section-head" data-reveal><div><p class="eyebrow">Personal Orbit</p><h1>${esc(category.name)}</h1><p>직접 추가한 제품을 한곳에서 살펴보고, 각 제품 페이지에서 더 자세한 정보를 확인하세요.</p></div><p class="result-count"><strong>${category.items.length}</strong> products</p></div><div class="custom-section-actions"><button class="pill-btn primary" type="button" data-add-to-category="${esc(category.name)}">제품 추가하기 <span aria-hidden="true">＋</span></button><span class="custom-section-note">이 브라우저에 안전하게 저장됨</span></div><ul class="grid">${category.items.length?category.items.map(item=>card(category,item)).join(""):`<li class="custom-empty"><strong>아직 제품이 없어요.</strong><span>첫 제품을 추가하면 이곳에 표시됩니다.</span></li>`}</ul></div>`;main.append(section);
    });
    $$('[data-add-to-category]').forEach(button=>button.onclick=()=>{$("#custom-category").value=button.dataset.addToCategory;openDialog()});
    $$('[data-remove-custom]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();removeProduct(button.dataset.categoryId,button.dataset.removeCustom)});
    bindImages();updateCategorySuggestions();
    const requested=location.hash.slice(1)||initialHash;if(collections.some(category=>category.id===requested))openRoute(requested);
  }

  function mount(){
    injectDialog();
    $("#custom-add-nav").onclick=openDialog;
    const hero=$("#custom-add-hero");if(hero)hero.onclick=openDialog;
    render();
  }
  let attempts=0;
  const waitForSite=setInterval(()=>{attempts++;if($(".home-collections")){clearInterval(waitForSite);mount()}else if(attempts>100)clearInterval(waitForSite)},50);
})();
