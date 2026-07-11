(()=>{
  const STORAGE_KEY="curation-for-abigail-custom-collections-v1";
  const LEGACY_STORAGE_KEY="abigail-orbit-custom-collections-v1";
  const initialHash=location.hash.slice(1);
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const safeHttps=value=>{try{const url=new URL(value);return url.protocol==="https:"?url.href:""}catch{return""}};
  const metaImage=url=>`https://api.microlink.io/?url=${encodeURIComponent(url)}&embed=image.url`;
  const screenshotImage=url=>`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
  const pagePreview=url=>`https://image.thum.io/get/width/900/crop/900/noanimate/${url}`;
  const IMAGE_DB_NAME="curation-for-abigail-media-v1",IMAGE_STORE="product-images",MAX_PHOTO_BYTES=30*1024*1024;
  const memoryImages=new Map();
  let analysisController,analysisTimer,lastAnalysis=null,imageDbPromise,pendingPhoto=null,pendingPhotoUrl="";

  const openImageDb=()=>{
    if(!globalThis.indexedDB)return Promise.resolve(null);
    if(imageDbPromise)return imageDbPromise;
    imageDbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(IMAGE_DB_NAME,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(IMAGE_STORE))request.result.createObjectStore(IMAGE_STORE)};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    }).catch(()=>null);
    return imageDbPromise;
  };
  const imageStoreAction=async(mode,action)=>{
    const db=await openImageDb();if(!db)return null;
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction(IMAGE_STORE,mode),request=action(transaction.objectStore(IMAGE_STORE));
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
  };
  const storeProductPhoto=async(key,file)=>{
    const db=await openImageDb();
    if(!db){memoryImages.set(key,file);return}
    await imageStoreAction("readwrite",store=>store.put(file,key));
  };
  const readProductPhoto=async key=>{
    const db=await openImageDb();
    return db?imageStoreAction("readonly",store=>store.get(key)):memoryImages.get(key)||null;
  };
  const deleteProductPhoto=async key=>{
    if(!key)return;
    const db=await openImageDb();
    if(db)await imageStoreAction("readwrite",store=>store.delete(key));else memoryImages.delete(key);
  };
  const imageExtension=/\.(?:jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?|svg)$/i;
  const isImageFile=file=>Boolean(file&&(String(file.type||"").startsWith("image/")||imageExtension.test(file.name||"")));
  const formatFileSize=bytes=>bytes>=1024*1024?`${(bytes/1024/1024).toFixed(bytes>=10*1024*1024?0:1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
  const nameFromFile=name=>{
    let value=String(name||"").replace(/\.[^.]+$/," ").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
    if(!value||/^(?:img|dsc|image|photo|screenshot)\s*\d*$/i.test(value))return"New product photo";
    return value.replace(/\b[a-z]/g,char=>char.toUpperCase());
  };
  const blobUrl=blob=>{
    if(globalThis.URL?.createObjectURL)return Promise.resolve({url:URL.createObjectURL(blob),objectUrl:true});
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({url:reader.result,objectUrl:false});reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
  };

  const categoryRules=[
    ["My Necklaces",/necklace|pendant|목걸이|chain jewelry|egg.?drop/i],
    ["My Watches",/watch|timepiece|시계|chronograph|quartz watch/i],
    ["My Lenses",/camera lens|렌즈|\b\d{1,3}mm\b|e.?mount|dg dn|f\/[0-9.]+/i],
    ["My Scrubs",/scrub|wearfigs|medical uniform|의료복/i],
    ["Sneakers",/sneaker|shoe|trainer|running footwear|운동화|신발/i],
    ["Bags",/handbag|tote|backpack|crossbody|purse|가방/i],
    ["Outerwear",/jacket|coat|parka|blazer|재킷|코트/i],
    ["Beauty",/skincare|serum|cream|cosmetic|makeup|beauty|스킨케어|화장품/i],
    ["Electronics",/camera|headphone|earbud|laptop|tablet|monitor|전자/i],
    ["Home & Living",/furniture|lamp|chair|table|bedding|home decor|가구/i],
    ["Accessories",/jewelry|earring|bracelet|ring|sunglass|accessor|액세서리/i]
  ];
  const inferCategory=(text,url)=>categoryRules.find(([,pattern])=>pattern.test(`${text} ${url}`))?.[0]||"New Finds";
  const cleanTitle=(title,publisher="")=>{
    let value=String(title||"").replace(/\s+/g," ").trim();
    if(publisher)value=value.replace(new RegExp(`\\s*[|–—-]\\s*${publisher.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*$`,"i"),"");
    const parts=value.split(/\s+[|–—]\s+/);if(parts[0]?.length>5)value=parts[0];
    return value.replace(/^(buy|shop)\s+/i,"").trim();
  };
  const nameFromUrl=url=>{
    try{
      const parsed=new URL(url),segments=parsed.pathname.split("/").filter(Boolean);
      let value=decodeURIComponent(segments.pop()||parsed.hostname.replace(/^www\./,""));
      value=value.replace(/\.(html?|php)$/i,"").replace(/[-_]+/g," ").replace(/\b\d{7,}\b/g,"").replace(/\s+/g," ").trim();
      return value?value.replace(/\b\w/g,char=>char.toUpperCase()):parsed.hostname.replace(/^www\./,"");
    }catch{return"New product"}
  };
  const extractPrice=(data,text)=>{
    const direct=[data?.price,data?.sale_price,data?.offer?.price,data?.product?.price].find(value=>value!==undefined&&value!==null&&value!=="");
    if(direct){
      const value=typeof direct==="object"?(direct.formatted||direct.display||direct.value||direct.amount):direct;
      if(value!==undefined)return String(value);
    }
    const match=String(text||"").match(/(?:US\$|\$|₩|€|£)\s?\d[\d,.]*(?:\.\d{2})?|(?:USD|KRW)\s?\d[\d,.]*/i)?.[0]||"";
    return match.replace(/[.,]$/,"");
  };
  const flattenSchemas=value=>{
    const schemas=[];
    const visit=item=>{
      if(!item)return;
      if(Array.isArray(item)){item.forEach(visit);return}
      if(typeof item==="string"){try{visit(JSON.parse(item))}catch{}return}
      if(typeof item!=="object")return;
      schemas.push(item);visit(item["@graph"]);
    };
    visit(value);return schemas;
  };
  const isProductSchema=item=>{
    const types=Array.isArray(item?.["@type"])?item["@type"]:[item?.["@type"]];
    return types.some(type=>String(type||"").toLowerCase()==="product")||Boolean(item?.offers&&item?.name);
  };
  const firstValue=value=>Array.isArray(value)?value.find(Boolean):value;
  const schemaImage=product=>{
    const image=firstValue(product?.image);
    return typeof image==="string"?image:(image?.url||image?.contentUrl||"");
  };
  const formatSchemaPrice=(value,currency="")=>{
    if(value===undefined||value===null||value==="")return"";
    const raw=typeof value==="object"?(value.price??value.value??value.amount):value;
    const number=Number(String(raw).replace(/[^0-9.-]/g,""));
    if(!Number.isFinite(number))return String(raw||"");
    const code=String(currency||"").toUpperCase(),symbols={USD:"$",KRW:"₩",EUR:"€",GBP:"£",JPY:"¥",CAD:"CA$",AUD:"A$"};
    const digits=Number.isInteger(number)?0:2;
    return`${symbols[code]||`${code}${code?" ":""}`}${new Intl.NumberFormat("en-US",{minimumFractionDigits:0,maximumFractionDigits:digits}).format(number)}`;
  };
  const schemaPrice=product=>{
    const offer=firstValue(product?.offers)||{};
    const nested=firstValue(offer?.offers)||{};
    const specification=firstValue(offer?.priceSpecification)||{};
    const value=offer.price??offer.lowPrice??nested.price??specification.price;
    const currency=offer.priceCurrency??nested.priceCurrency??specification.priceCurrency;
    return formatSchemaPrice(value,currency);
  };
  const cleanDescription=value=>String(value||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();
  const fallbackMetadata=url=>{
    const name=nameFromUrl(url);
    return{name,category:inferCategory(name,url),price:"",note:`${new URL(url).hostname.replace(/^www\./,"")}에서 가져온 제품 링크입니다.`,image:"",url,source:"url"};
  };
  async function fetchProductMetadata(url,signal){
    const fallback=fallbackMetadata(url);
    try{
      const schemaSelector=encodeURIComponent('script[type="application/ld+json"]');
      const response=await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&data.schemas.selectorAll=${schemaSelector}&data.schemas.attr=text&audio=false&video=false&screenshot=false`,{signal});
      if(!response.ok)throw new Error(`Metadata ${response.status}`);
      const payload=await response.json(),data=payload?.data||{};
      const product=flattenSchemas(data.schemas).find(isProductSchema);
      const brand=typeof product?.brand==="string"?product.brand:product?.brand?.name||"";
      const title=cleanTitle(product?.name||data.title,data.publisher||brand)||fallback.name;
      const description=cleanDescription(product?.description||data.description);
      const image=schemaImage(product)||data.image?.url||"";
      const price=schemaPrice(product)||extractPrice(data,`${title} ${description}`);
      return{name:title,category:inferCategory(`${title} ${description} ${brand} ${data.publisher||""}`,url),price,note:description.slice(0,220)||fallback.note,image,url,source:"metadata"};
    }catch(error){if(error.name==="AbortError")throw error;return fallback}
  }

  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_STORAGE_KEY)||"[]");
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
      <div class="custom-dialog-head"><div><h2 id="custom-dialog-title">Pharmer’s pick 추가하기</h2><p>제품 링크 또는 사진으로 시작하세요. 둘 다 넣어도 좋아요.</p></div><button class="icon-btn" id="custom-dialog-close" type="button" aria-label="닫기">✕</button></div>
      <form class="custom-form" id="custom-product-form">
        <div class="custom-field full custom-intake-field">
          <div class="custom-intake-title"><strong>링크 또는 제품 사진</strong><span>둘 중 하나만 있어도 추가할 수 있어요.</span></div>
          <div class="custom-url-field"><label for="custom-url">Paste a product link</label><div class="custom-url-wrap"><input id="custom-url" name="url" inputmode="url" placeholder="https://…"><span class="custom-link-spark" aria-hidden="true">✦</span></div><small>URL을 붙여넣으면 이름, 카테고리, 가격과 메모를 자동으로 정리해요.</small><p class="custom-analysis-status" id="custom-analysis-status" role="status">링크를 기다리는 중</p></div>
          <div class="custom-or"><span>OR</span></div>
          <div class="custom-photo-drop" id="custom-photo-drop">
            <input id="custom-photo" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif,.bmp,.tif,.tiff,.svg" hidden>
            <button class="custom-photo-empty" id="custom-photo-empty" type="button"><span class="custom-photo-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="4"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/><path d="M12 2v5m-2-2 2 2 2-2"/></svg></span><span><strong>사진을 놓거나 눌러서 선택</strong><small>JPG, JPEG, PNG, WEBP, GIF, AVIF, HEIC 등 · 최대 30 MB</small></span></button>
            <div class="custom-photo-preview" id="custom-photo-preview" hidden><img id="custom-photo-preview-image" alt="선택한 제품 사진 미리보기"><span><strong id="custom-photo-name"></strong><small id="custom-photo-size"></small></span><button class="custom-photo-remove" id="custom-photo-remove" type="button" aria-label="선택한 사진 제거">✕</button></div>
          </div>
          <p class="custom-photo-status" id="custom-photo-status" role="status">사진을 드래그하거나 클립보드에서 붙여넣을 수도 있어요.</p>
        </div>
        <div class="custom-field"><label for="custom-category">Category</label><input id="custom-category" name="category" list="custom-category-list" placeholder="예: Sneakers" required><datalist id="custom-category-list"></datalist><small>같은 이름의 제품은 한 탭에 모입니다.</small></div>
        <div class="custom-field"><label for="custom-name">Product name</label><input id="custom-name" name="name" placeholder="예: New Balance 530" required><small>알아보고 싶은 제품명을 입력하세요.</small></div>
        <div class="custom-field"><label for="custom-price">Price <span aria-hidden="true">·</span> optional</label><input id="custom-price" name="price" placeholder="예: $120 또는 ₩89,000"></div>
        <div class="custom-field"><label for="custom-note">Note <span aria-hidden="true">·</span> optional</label><input id="custom-note" name="note" placeholder="예: White / size 7"></div>
        <p class="custom-form-error" id="custom-form-error" role="alert"></p>
        <div class="custom-form-actions"><button class="pill-btn secondary" id="custom-form-cancel" type="button">Cancel</button><button class="pill-btn primary" id="custom-form-submit" type="submit">제품 추가하고 탭 열기 <span aria-hidden="true">→</span></button></div>
      </form>
    </dialog>`);
    $("#custom-dialog-close").onclick=closeDialog;
    $("#custom-form-cancel").onclick=closeDialog;
    $("#custom-product-form").addEventListener("submit",addProduct);
    $("#custom-collection-dialog").addEventListener("click",event=>{if(event.target===$("#custom-collection-dialog"))closeDialog()});
    const urlInput=$("#custom-url");
    urlInput.addEventListener("paste",()=>setTimeout(()=>analyzeAndFill(urlInput.value),0));
    urlInput.addEventListener("input",()=>{clearTimeout(analysisTimer);analysisTimer=setTimeout(()=>analyzeAndFill(urlInput.value),650)});
    urlInput.addEventListener("change",()=>analyzeAndFill(urlInput.value));
    ["#custom-category","#custom-name","#custom-price","#custom-note"].forEach(selector=>$(selector).addEventListener("input",event=>{event.target.dataset.autofilled="false";delete event.target.dataset.autofillSource;event.target.classList.remove("is-autofilled")}));
    const photoInput=$("#custom-photo"),drop=$("#custom-photo-drop"),trigger=$("#custom-photo-empty"),remove=$("#custom-photo-remove");
    photoInput.addEventListener("change",()=>selectPhoto(photoInput.files?.[0]));
    trigger.addEventListener("click",()=>photoInput.click());
    ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add("is-dragging")}));
    ["dragleave","drop"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove("is-dragging")}));
    drop.addEventListener("drop",event=>selectPhoto([...event.dataTransfer.files].find(isImageFile)));
    remove.addEventListener("click",event=>{event.stopPropagation();clearPhotoSelection(true)});
    $("#custom-collection-dialog").addEventListener("paste",event=>{const file=[...(event.clipboardData?.files||[])].find(isImageFile);if(file){event.preventDefault();selectPhoto(file)}});
  }

  function setAnalysisStatus(message,state="idle"){
    const status=$("#custom-analysis-status");if(!status)return;
    status.textContent=message;status.dataset.state=state;
  }
  function setAutofilled(selector,value,source="metadata"){
    const input=$(selector);if(!input||!value)return;
    if(!input.value||(input.dataset.autofilled==="true"&&(source==="metadata"||input.dataset.autofillSource===source))){
      input.value=value;input.dataset.autofilled="true";input.dataset.autofillSource=source;input.classList.add("is-autofilled");
    }
  }
  function setPhotoStatus(message,state="idle"){
    const status=$("#custom-photo-status");if(!status)return;
    status.textContent=message;status.dataset.state=state;
  }
  function clearPhotoAutofill(){
    ["#custom-category","#custom-name","#custom-note"].forEach(selector=>{const input=$(selector);if(input?.dataset.autofillSource==="photo"){input.value="";input.dataset.autofilled="false";delete input.dataset.autofillSource;input.classList.remove("is-autofilled")}});
  }
  function clearPhotoSelection(clearAutofill=false){
    pendingPhoto=null;
    if(pendingPhotoUrl&&globalThis.URL?.revokeObjectURL)URL.revokeObjectURL(pendingPhotoUrl);
    pendingPhotoUrl="";
    const input=$("#custom-photo"),drop=$("#custom-photo-drop");if(input)input.value="";
    if(drop)drop.dataset.hasPhoto="false";
    $("#custom-photo-empty")?.removeAttribute("hidden");$("#custom-photo-preview")?.setAttribute("hidden","");
    const preview=$("#custom-photo-preview-image");if(preview)preview.removeAttribute("src");
    if(clearAutofill)clearPhotoAutofill();
    setPhotoStatus("사진을 드래그하거나 클립보드에서 붙여넣을 수도 있어요.");
  }
  async function selectPhoto(file){
    if(!file){setPhotoStatus("이미지 파일을 찾지 못했어요.","error");return}
    if(!isImageFile(file)){setPhotoStatus("이미지 형식의 파일을 선택해 주세요.","error");return}
    if(file.size>MAX_PHOTO_BYTES){setPhotoStatus("사진은 30 MB 이하로 선택해 주세요.","error");return}
    clearPhotoSelection(false);pendingPhoto=file;
    try{
      const preview=await blobUrl(file);pendingPhotoUrl=preview.objectUrl?preview.url:"";
      const previewImage=$("#custom-photo-preview-image");
      previewImage.onerror=()=>{if(pendingPhoto===file){pendingPhoto=null;setPhotoStatus("이 브라우저에서 표시할 수 없는 이미지예요. JPG, PNG 또는 WEBP로 다시 시도해 주세요.","error")}};
      previewImage.src=preview.url;
      $("#custom-photo-name").textContent=file.name||"Pasted product photo";
      $("#custom-photo-size").textContent=`${String(file.type||file.name.split(".").pop()||"image").replace(/^image\//,"").toUpperCase()} · ${formatFileSize(file.size)}`;
      $("#custom-photo-empty").setAttribute("hidden","");$("#custom-photo-preview").removeAttribute("hidden");$("#custom-photo-drop").dataset.hasPhoto="true";
      const inferredName=nameFromFile(file.name);
      setAutofilled("#custom-name",inferredName,"photo");setAutofilled("#custom-category",inferCategory(inferredName,file.name),"photo");
      setAutofilled("#custom-note",`업로드한 제품 사진 · ${formatFileSize(file.size)}`,"photo");
      setPhotoStatus("사진 준비 완료 · 카드와 컬렉션에 이 사진이 표시됩니다.","success");
    }catch{pendingPhoto=null;setPhotoStatus("이 브라우저에서 사진을 미리 볼 수 없어요. 다른 이미지 형식을 사용해 주세요.","error")}
  }
  async function analyzeAndFill(rawUrl){
    const url=safeHttps(String(rawUrl||"").trim());
    if(!rawUrl){lastAnalysis=null;setAnalysisStatus("링크를 기다리는 중");return null}
    if(!url){setAnalysisStatus("https:// 로 시작하는 제품 링크를 붙여넣어 주세요.","error");return null}
    if(lastAnalysis?.url===url)return lastAnalysis;
    analysisController?.abort();analysisController=new AbortController();
    setAnalysisStatus("제품 페이지를 읽고 정보를 정리하는 중…","loading");
    $("#custom-form-submit").disabled=true;
    try{
      const metadata=await fetchProductMetadata(url,analysisController.signal);
      lastAnalysis=metadata;
      setAutofilled("#custom-category",metadata.category);
      setAutofilled("#custom-name",metadata.name);
      setAutofilled("#custom-price",metadata.price);
      setAutofilled("#custom-note",metadata.note);
      setAnalysisStatus(metadata.source==="metadata"?"정보 정리 완료 · 확인 후 바로 추가할 수 있어요.":"링크에서 기본 정보를 정리했어요. 필요한 부분만 확인해 주세요.","success");
      return metadata;
    }catch(error){
      if(error.name!=="AbortError")setAnalysisStatus("링크 분석을 완료하지 못했어요. 직접 입력해 주세요.","error");
      return null;
    }finally{$("#custom-form-submit").disabled=false}
  }

  function updateCategorySuggestions(){
    const list=$("#custom-category-list");
    if(list)list.innerHTML=collections.map(category=>`<option value="${esc(category.name)}"></option>`).join("");
  }
  function openDialog(){
    updateCategorySuggestions();
    $("#custom-form-error").textContent="";
    $("#custom-collection-dialog").showModal();
    setTimeout(()=>$("#custom-url").focus(),80);
  }
  function resetDialogState(){
    const form=$("#custom-product-form");form?.reset();$$('.is-autofilled',form).forEach(input=>{input.classList.remove("is-autofilled");input.dataset.autofilled="false";delete input.dataset.autofillSource});
    lastAnalysis=null;setAnalysisStatus("링크를 기다리는 중");clearPhotoSelection(false);
  }
  function closeDialog(){analysisController?.abort();resetDialogState();$("#custom-collection-dialog")?.close()}

  async function addProduct(event){
    event.preventDefault();
    const form=event.currentTarget;
    let values=Object.fromEntries(new FormData(form));
    const suppliedUrl=String(values.url||"").trim();
    const error=$("#custom-form-error");
    if(suppliedUrl&&!safeHttps(suppliedUrl)){error.textContent="제품 링크는 https:// 로 시작해야 합니다.";return}
    if(suppliedUrl&&lastAnalysis?.url!==safeHttps(suppliedUrl))await analyzeAndFill(suppliedUrl);
    values=Object.fromEntries(new FormData(form));
    const categoryName=String(values.category||"").trim();
    const productName=String(values.name||"").trim();
    if(!categoryName||!productName){error.textContent="카테고리와 제품명을 모두 입력해 주세요.";return}
    const lookup=`${productName} ${categoryName}`;
    const url=safeHttps(suppliedUrl)||`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(lookup)}`;
    const itemId=uid(),photoFile=pendingPhoto,imageKey=photoFile?`photo-${itemId}`:"";
    if(photoFile){
      try{$("#custom-form-submit").disabled=true;await storeProductPhoto(imageKey,photoFile)}
      catch{error.textContent="사진을 브라우저에 저장하지 못했어요. 다른 사진으로 다시 시도해 주세요.";$("#custom-form-submit").disabled=false;return}
    }
    let category=collections.find(item=>item.name.localeCompare(categoryName,undefined,{sensitivity:"accent"})===0);
    const isNew=!category;
    if(!category){category={id:`custom-${uid()}`,name:categoryName,items:[]};collections.push(category)}
    category.items.unshift({id:itemId,name:productName,url,price:String(values.price||"").trim(),note:String(values.note||"").trim(),image:photoFile?"":lastAnalysis?.url===url?lastAnalysis.image||"":"",imageKey,imageName:photoFile?.name||"",addedAt:Date.now()});
    save();$("#custom-form-submit").disabled=false;closeDialog();render();openRoute(category.id);
    toast(isNew?`“${categoryName}” 탭을 만들고 제품을 추가했어요.`:`“${categoryName}”에 제품을 추가했어요.`);
  }

  function fallbackIcon(){return'<svg viewBox="0 0 180 180" fill="none" stroke="currentColor" stroke-width="4" aria-hidden="true"><path d="M43 63h94l-8 88H51Z"/><path d="M68 68V50c0-15 9-25 22-25s22 10 22 25v18"/><path d="M73 105h34M90 88v34" stroke-linecap="round"/></svg>'}
  function card(category,item){
    let host=item.imageKey?"Uploaded photo":"Product research";if(!item.imageKey)try{host=new URL(item.url).hostname.replace(/^www\./,"")}catch{}
    return`<li class="card custom-card" data-reveal data-custom-item="${esc(item.id)}">
      <a class="card-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.name)} 자세히 보기"></a>
      <figure class="media"><span class="media-tag">${item.imageKey?"Your photo":"Freshly added"}</span><button class="custom-remove" type="button" data-remove-custom="${esc(item.id)}" data-category-id="${esc(category.id)}" aria-label="${esc(item.name)} 삭제"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14"/></svg></button><img class="product-img" data-custom-image data-page-url="${esc(item.url)}" data-product-image="${esc(item.image||"")}" data-image-key="${esc(item.imageKey||"")}" alt="${esc(item.name)}" loading="lazy" decoding="async"><span class="fallback">${fallbackIcon()}</span></figure>
      <div class="copy"><div class="topline"><div class="badges"><span class="badge">${esc(category.name)}</span></div><span class="price">${esc(item.price||"Research")}</span></div><p class="kind">Pharmer’s pick</p><h3>${esc(item.name)}</h3><p class="note">${esc(item.note||"제품 페이지에서 사양, 옵션, 최신 정보를 확인해 보세요.")}</p><span class="custom-source">${esc(host)}</span><span class="card-action">자세히 보기 ↗</span></div>
    </li>`;
  }

  function revokeCardUrls(root=document){
    $$('[data-custom-image][data-object-url]',root).forEach(image=>{if(globalThis.URL?.revokeObjectURL)URL.revokeObjectURL(image.dataset.objectUrl)});
  }
  function bindImages(root=document){
    $$('[data-custom-image]',root).forEach(image=>{
      if(image.dataset.bound)return;image.dataset.bound="1";
      const media=image.closest(".media"),url=image.dataset.pageUrl,direct=image.dataset.productImage,imageKey=image.dataset.imageKey;
      image.onload=()=>{image.classList.add("loaded");media?.classList.add("has-image")};
      image.onerror=()=>{
        image.classList.remove("loaded");media?.classList.remove("has-image");
        if(image.dataset.stage==="uploaded"){if(image.dataset.objectUrl&&globalThis.URL?.revokeObjectURL)URL.revokeObjectURL(image.dataset.objectUrl);delete image.dataset.objectUrl;if(direct){image.dataset.stage="direct";image.src=direct;return}}
        if(image.dataset.stage==="direct"){image.dataset.stage="meta";image.src=metaImage(url);return}
        if(image.dataset.stage==="meta"){image.dataset.stage="shot";image.classList.add("screenshot");image.src=screenshotImage(url);return}
        if(image.dataset.stage==="shot"){image.dataset.stage="preview";image.src=pagePreview(url);return}
        media?.classList.add("error");
      };
      if(imageKey){
        image.dataset.stage="uploaded";
        readProductPhoto(imageKey).then(async blob=>{if(!blob)throw new Error("Missing photo");const preview=await blobUrl(blob);if(preview.objectUrl)image.dataset.objectUrl=preview.url;image.src=preview.url}).catch(()=>{media?.classList.add("error")});
      }else{image.dataset.stage=direct?"direct":"meta";image.src=direct||metaImage(url)}
    });
  }

  async function removeProduct(categoryId,itemId){
    const category=collections.find(item=>item.id===categoryId);if(!category)return;
    const removed=category.items.find(item=>item.id===itemId);if(removed?.imageKey)await deleteProductPhoto(removed.imageKey);
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
    revokeCardUrls(main);
    $$(".custom-tab",tabs).forEach(node=>node.remove());$$('[data-custom-view]').forEach(node=>node.remove());
    const anchor=tabs.querySelector('[data-route="about"]');
    collections.forEach(category=>{
      const tab=document.createElement("button");tab.className="tab custom-tab";tab.type="button";tab.role="tab";tab.dataset.route=category.id;tab.setAttribute("aria-selected","false");tab.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h6l2 2h8v11H4Z"/><path d="M8 13h8"/></svg><span>${esc(category.name)}</span>`;tab.onclick=()=>openRoute(category.id);tabs.insertBefore(tab,anchor);
      const section=document.createElement("section");section.className="view collection custom-view";section.dataset.view=category.id;section.dataset.customView="";section.hidden=true;section.innerHTML=`<div class="container"><div class="section-head" data-reveal><div><p class="eyebrow">Personal harvest</p><h1>${esc(category.name)}</h1><p>직접 추가한 제품을 한곳에서 살펴보고, 각 제품 페이지에서 더 자세한 정보를 확인하세요.</p></div><p class="result-count"><strong>${category.items.length}</strong> products</p></div><div class="custom-section-actions"><button class="pill-btn primary" type="button" data-add-to-category="${esc(category.name)}">새로운 pick 추가하기 <span aria-hidden="true">＋</span></button><span class="custom-section-note">이 브라우저에 안전하게 저장됨</span></div><ul class="grid">${category.items.length?category.items.map(item=>card(category,item)).join(""):`<li class="custom-empty"><strong>아직 제품이 없어요.</strong><span>첫 제품을 추가하면 이곳에 표시됩니다.</span></li>`}</ul></div>`;main.append(section);
    });
    $$('[data-add-to-category]').forEach(button=>button.onclick=()=>{$("#custom-category").value=button.dataset.addToCategory;openDialog()});
    $$('[data-remove-custom]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();void removeProduct(button.dataset.categoryId,button.dataset.removeCustom)});
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
