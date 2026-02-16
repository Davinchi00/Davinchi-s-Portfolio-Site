(function(){
  // ===== SUPABASE CONFIGURATION =====
  // TODO: Replace with your Supabase credentials from https://app.supabase.com/
  const SUPABASE_URL = 'https://lerzzeivtqjemzalqshp.supabase.co'; // e.g., https://xxxxx.supabase.co
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlcnp6ZWl2dHFqZW16YWxxc2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMzI3NjQsImV4cCI6MjA4NjcwODc2NH0._8tVwc8e0-X9BJ67vTblwicn5X8-Fjr5PvH2rPp38QQ'; // Found in Settings → API
  
  // Initialize Supabase client
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Track initialization state
  let initPromise = null;
  const imageCache = {}; // Cache to reduce database queries
  
  // ===== SUPABASE HELPER FUNCTIONS =====
  
  // Upload image to Supabase Storage and save metadata to database
  async function uploadImageToSupabase(file, category, imageIndex) {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${category}-${imageIndex}-${timestamp}.jpg`;
      const storagePath = `${category}/${filename}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(storagePath, file, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(storagePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Save metadata to database
      const { error: dbError } = await supabase
        .from('portfolio_images')
        .upsert(
          {
            category: category,
            image_index: imageIndex,
            image_url: publicUrl,
            storage_path: storagePath
          },
          { onConflict: 'category,image_index' }
        );
      
      if (dbError) throw dbError;
      
      // Update cache
      imageCache[`${category}_${imageIndex}`] = publicUrl;
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
  
  // Load all images from Supabase database
  async function loadImagesFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*');
      
      if (error) throw error;
      
      const loadedImages = {};
      (data || []).forEach(row => {
        const key = `${row.category}_${row.image_index}`;
        loadedImages[key] = row.image_url;
        imageCache[key] = row.image_url;
      });
      
      return loadedImages;
    } catch (error) {
      console.error('Load error:', error);
      return {};
    }
  }
  
  // Get image URL from cache or database
  async function getImageUrl(category, imageIndex) {
    const key = `${category}_${imageIndex}`;
    if (imageCache[key]) return imageCache[key];
    
    try {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('image_url')
        .eq('category', category)
        .eq('image_index', imageIndex)
        .single();
      
      if (data) {
        imageCache[key] = data.image_url;
        return data.image_url;
      }
      return null;
    } catch (error) {
      console.log('No image found:', error);
      return null;
    }
  }
  
  // Delete image from Supabase
  async function deleteImageFromSupabase(category, imageIndex) {
    try {
      const key = `${category}_${imageIndex}`;
      
      // Get storage path
      const { data, error: queryError } = await supabase
        .from('portfolio_images')
        .select('storage_path')
        .eq('category', category)
        .eq('image_index', imageIndex)
        .single();
      
      if (queryError) throw queryError;
      
      if (data?.storage_path) {
        // Delete from storage
        await supabase.storage
          .from('portfolio-images')
          .remove([data.storage_path]);
      }
      
      // Delete from database
      await supabase
        .from('portfolio_images')
        .delete()
        .eq('category', category)
        .eq('image_index', imageIndex);
      
      delete imageCache[key];
    } catch (error) {
      console.error('Delete error:', error);
    }
  }
  
  // ===== CUSTOM CURSOR TRACKING =====
  var cur=document.getElementById('cursor'),ring=document.getElementById('cursorRing');
  document.addEventListener('mousemove',function(e){
    cur.style.left=e.clientX+'px';cur.style.top=e.clientY+'px';
    setTimeout(function(){ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';},60);
  });

  // ===== LOADER MANAGEMENT =====
  window.addEventListener('load',function(){
    setTimeout(function(){document.getElementById('loader').classList.add('hidden');},1100);
  });

  // ===== SCROLL REVEAL OBSERVER =====
  var revealObs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});
  },{threshold:0.1});
  document.querySelectorAll('.reveal').forEach(function(el){revealObs.observe(el);});

  // ===== TOAST NOTIFICATION FUNCTION =====
  function showToast(msg){
    var t=document.getElementById('toast');
    t.textContent=msg||'Done!';
    t.classList.add('show');
    setTimeout(function(){t.classList.remove('show');},2800);
  }

  // ===== THEME TOGGLE FUNCTIONALITY =====
  var html=document.documentElement;
  document.getElementById('themeToggle').addEventListener('click',function(){
    var isDark=html.getAttribute('data-theme')==='dark';
    html.setAttribute('data-theme',isDark?'light':'dark');
    try{localStorage.setItem('david_theme',isDark?'light':'dark');}catch(e){}
    showToast(isDark?'Light mode on':'Dark mode on');
  });
  try{var st=localStorage.getItem('david_theme');if(st)html.setAttribute('data-theme',st);}catch(e){}

  // ===== PASSWORD PROTECTION SYSTEM =====
  var PASS='davinchi';
  var unlocked=false;
  var pending=null;
  var pwModal=document.getElementById('pwModal');
  var pwInput=document.getElementById('pwInput');
  var pwSubmit=document.getElementById('pwSubmit');
  var pwClose=document.getElementById('pwClose');

  function requestUnlock(action){
    if(unlocked){action();return;}
    pending=action;
    pwInput.value='';
    pwInput.classList.remove('error');
    pwModal.classList.add('show');
    setTimeout(function(){pwInput.focus();},200);
  }

  function tryUnlock(){
    if(pwInput.value===PASS){
      unlocked=true;
      pwModal.classList.remove('show');
      showToast('Unlocked! Ready to upload.');
      if(pending){pending();pending=null;}
    }else{
      pwInput.classList.add('error');
      setTimeout(function(){pwInput.classList.remove('error');},500);
      pwInput.value='';
      pwInput.placeholder='Wrong password';
      setTimeout(function(){pwInput.placeholder='••••••••';},1600);
    }
  }

  pwSubmit.addEventListener('click',tryUnlock);
  pwInput.addEventListener('keydown',function(e){if(e.key==='Enter')tryUnlock();});
  pwClose.addEventListener('click',function(){pwModal.classList.remove('show');pending=null;});
  pwModal.addEventListener('click',function(e){if(e.target===pwModal){pwModal.classList.remove('show');pending=null;}});

  // ===== IMAGE VIEW MODAL =====
  var imageViewModal=document.getElementById('imageViewModal');
  var imageViewImg=document.getElementById('imageViewImg');
  var imageViewClose=document.getElementById('imageViewClose');

  function showImageView(src){
    if(!src){showToast('No image to view');return;}
    imageViewImg.src=src;
    imageViewModal.classList.add('show');
  }

  imageViewClose.addEventListener('click',function(){
    imageViewModal.classList.remove('show');
  });

  imageViewModal.addEventListener('click',function(e){
    if(e.target===imageViewModal){imageViewModal.classList.remove('show');}
  });

  // ===== INITIALIZE IMAGES FROM SUPABASE =====
  // Load all images on startup
  initPromise = loadImagesFromSupabase();

  // ===== PROFILE PHOTO UPLOAD =====
  var aboutPhoto=document.getElementById('aboutPhoto');
  var photoPlaceholder=document.getElementById('photoPlaceholder');
  var photoOverlay=document.getElementById('photoOverlay');

  // Load profile photo on init
  initPromise.then(function(loadedImages) {
    const profilePhotoUrl = loadedImages['profile_photo_profile'];
    if(profilePhotoUrl) {
      photoPlaceholder.style.display='none';
      var pImg=document.createElement('img');
      pImg.src=profilePhotoUrl;
      pImg.alt='David Nwoko';
      aboutPhoto.insertBefore(pImg,photoOverlay);
    }
  });

  photoOverlay.addEventListener('click',function(){
    requestUnlock(function(){
      var inp=document.createElement('input');
      inp.type='file';inp.accept='image/*';
      inp.onchange=function(e){
        var file=e.target.files[0];if(!file)return;
        showToast('Uploading...');
        uploadImageToSupabase(file, 'profile_photo', 'profile')
          .then(function(url) {
            photoPlaceholder.style.display='none';
            var existing=aboutPhoto.querySelector('img');
            if(!existing){
              existing=document.createElement('img');
              aboutPhoto.insertBefore(existing,photoOverlay);
            }
            existing.src=url;
            existing.alt='David Nwoko';
            showToast('Profile photo updated!');
          })
          .catch(function(error) {
            console.error(error);
            showToast('Upload failed');
          });
      };
      inp.click();
    });
  });

  // ===== HERO BACKGROUND IMAGE =====
  var heroBgImage=document.getElementById('heroBgImage');
  
  initPromise.then(function(loadedImages) {
    const heroBgUrl = loadedImages['hero_bg_hero'];
    if(heroBgUrl) {
      heroBgImage.style.backgroundImage='url('+heroBgUrl+')';
    }
  });

  // ===== PORTFOLIO CATEGORIES CONFIGURATION =====
  var cats=[
    {id:'cat-stationery',count:4,cardClass:'project-card'},
    {id:'cat-flyer',count:10,cardClass:'flyer-card'}
  ];

  // ===== SOCIAL MEDIA GRID GENERATION =====
  var socialGrid=document.getElementById('cat-social');
  initPromise.then(function(loadedImages) {
    for(var si=1;si<=10;si++){
      (function(idx){
        var key='social_'+idx;
        var card=document.createElement('div');
        var imageUrl=loadedImages[key];
        card.className='social-card'+(imageUrl?'':' empty-card');
        
        if(imageUrl){
          var img=document.createElement('img');
          img.src=imageUrl;img.alt='Social media content';
          card.appendChild(img);
        }else{
          var ph=document.createElement('div');
          ph.className='placeholder-content';
          var num=idx<10?'0'+idx:idx;
          ph.innerHTML='<div class="pnum" style="font-size:2rem;opacity:.15;">'+num+'</div><div class="ptext">Upload</div>';
          card.appendChild(ph);
        }
        
        var actions=document.createElement('div');
        actions.className='card-actions';
        actions.innerHTML='<button class="card-btn card-upload">Upload</button><button class="card-btn card-view">View</button>';
        card.appendChild(actions);
        
        actions.querySelector('.card-upload').addEventListener('click',function(e){
          e.stopPropagation();
          requestUnlock(function(){
            var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
            inp.onchange=function(e){
              var file=e.target.files[0];if(!file)return;
              showToast('Uploading...');
              uploadImageToSupabase(file, 'social', idx)
                .then(function(url) {
                  card.classList.remove('empty-card');
                  var ph=card.querySelector('.placeholder-content');if(ph)ph.remove();
                  var im=card.querySelector('img');
                  if(!im){im=document.createElement('img');im.alt='Social media content';card.insertBefore(im,actions);}
                  im.src=url;
                  showToast('Image uploaded!');
                })
                .catch(function(error) {
                  console.error(error);
                  showToast('Upload failed');
                });
            };inp.click();
          });
        });
        
        actions.querySelector('.card-view').addEventListener('click',function(e){
          e.stopPropagation();
          showImageView(imageUrl);
        });
        
        socialGrid.appendChild(card);
      })(si);
    }
  });

  // ===== BRANDING PROJECTS GRID GENERATION =====
  [{gridId:'brand1-grid',prefix:'brand1'},{gridId:'brand2-grid',prefix:'brand2'},{gridId:'brand3-grid',prefix:'brand3'}].forEach(function(bp){
    var grid=document.getElementById(bp.gridId);
    if(!grid)return;
    
    initPromise.then(function(loadedImages) {
      for(var bi=1;bi<=5;bi++){
        (function(idx,pfx){
          var key=pfx+'_'+idx;
          var cell=document.createElement('div');
          var imageUrl=loadedImages[key];
          cell.className='bm-card'+(imageUrl?'':' empty-card');
          
          if(imageUrl){
            var img=document.createElement('img');img.src=imageUrl;img.alt='Brand image';
            cell.appendChild(img);
          }else{
            var ph=document.createElement('div');ph.className='placeholder-content';
            ph.innerHTML='<div class="pnum" style="font-size:1.8rem;opacity:.15;">0'+idx+'</div><div class="ptext">Upload</div>';
            cell.appendChild(ph);
          }
          
          var actions=document.createElement('div');
          actions.className='card-actions';
          actions.innerHTML='<button class="card-btn card-upload">Upload</button><button class="card-btn card-view">View</button>';
          cell.appendChild(actions);
          
          actions.querySelector('.card-upload').addEventListener('click',function(e){
            e.stopPropagation();
            requestUnlock(function(){
              var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
              inp.onchange=function(e){
                var file=e.target.files[0];if(!file)return;
                showToast('Uploading...');
                uploadImageToSupabase(file, pfx, idx)
                  .then(function(url) {
                    cell.classList.remove('empty-card');
                    var oldPh=cell.querySelector('.placeholder-content');if(oldPh)oldPh.remove();
                    var existing=cell.querySelector('img');
                    if(!existing){existing=document.createElement('img');existing.alt='Brand image';cell.insertBefore(existing,actions);}
                    existing.src=url;
                    showToast('Brand image uploaded!');
                  })
                  .catch(function(error) {
                    console.error(error);
                    showToast('Upload failed');
                  });
              };inp.click();
            });
          });
          
          actions.querySelector('.card-view').addEventListener('click',function(e){
            e.stopPropagation();
            showImageView(imageUrl);
          });
          
          grid.appendChild(cell);
        })(bi,bp.prefix);
      }
    });
  });

  // ===== LOGO CELLS GENERATION =====
  var logoGrid=document.getElementById('cat-logo');
  initPromise.then(function(loadedImages) {
    for(var li=1;li<=10;li++){
      (function(idx){
        var key='logo_'+idx;
        var cell=document.createElement('div');
        var imageUrl=loadedImages[key];
        cell.className='logo-cell'+(imageUrl?'':' empty-cell');
        
        if(imageUrl){
          var img=document.createElement('img');img.src=imageUrl;img.alt='Logo';cell.appendChild(img);
        }else{
          var ph=document.createElement('div');ph.className='placeholder-content';
          var num=idx<10?'0'+idx:idx;
          ph.innerHTML='<div class="pnum" style="font-size:1.8rem;opacity:.12;">'+num+'</div><div class="ptext">Logo</div>';
          cell.appendChild(ph);
        }
        
        var actions=document.createElement('div');
        actions.className='card-actions';
        actions.innerHTML='<button class="card-btn card-upload">Upload</button><button class="card-btn card-view">View</button>';
        cell.appendChild(actions);
        
        actions.querySelector('.card-upload').addEventListener('click',function(e){
          e.stopPropagation();
          requestUnlock(function(){
            var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
            inp.onchange=function(e){
              var file=e.target.files[0];if(!file)return;
              showToast('Uploading...');
              uploadImageToSupabase(file, 'logo', idx)
                .then(function(url) {
                  cell.classList.remove('empty-cell');
                  var oldPh=cell.querySelector('.placeholder-content');if(oldPh)oldPh.remove();
                  var existing=cell.querySelector('img');
                  if(!existing){existing=document.createElement('img');existing.alt='Logo';cell.insertBefore(existing,actions);}
                  existing.src=url;
                  showToast('Logo uploaded!');
                })
                .catch(function(error) {
                  console.error(error);
                  showToast('Upload failed');
                });
            };inp.click();
          });
        });
        
        actions.querySelector('.card-view').addEventListener('click',function(e){
          e.stopPropagation();
          showImageView(imageUrl);
        });
        
        logoGrid.appendChild(cell);
      })(li);
    }
  });

  // ===== GENERIC CATEGORIES GENERATION =====
  cats.forEach(function(cat){
    var grid=document.getElementById(cat.id);
    
    initPromise.then(function(loadedImages) {
      for(var i=1;i<=cat.count;i++){
        (function(idx,catId,cardClass){
          var key=catId+'_'+idx;
          var imageUrl=loadedImages[key];
          var card=document.createElement('div');
          card.className=cardClass+(imageUrl?'':' empty-card');
          
          if(imageUrl){
            var img=document.createElement('img');
            img.src=imageUrl;img.alt='Portfolio item';
            card.appendChild(img);
          }else{
            var ph=document.createElement('div');
            ph.className='placeholder-content';
            ph.innerHTML='<div class="pnum">0'+idx+'</div><div class="ptext">Upload</div>';
            card.appendChild(ph);
          }
          
          var actions=document.createElement('div');
          actions.className='card-actions';
          actions.innerHTML='<button class="card-btn card-upload">Upload</button><button class="card-btn card-view">View</button>';
          card.appendChild(actions);
          
          actions.querySelector('.card-upload').addEventListener('click',function(e){
            e.stopPropagation();
            requestUnlock(function(){
              var inp=document.createElement('input');
              inp.type='file';inp.accept='image/*';
              inp.onchange=function(e){
                var file=e.target.files[0];if(!file)return;
                showToast('Uploading...');
                uploadImageToSupabase(file, catId, idx)
                  .then(function(url) {
                    card.classList.remove('empty-card');
                    var oldPh=card.querySelector('.placeholder-content');
                    if(oldPh)oldPh.remove();
                    var existImg=card.querySelector('img');
                    if(!existImg){existImg=document.createElement('img');existImg.alt='Portfolio item';card.insertBefore(existImg,actions);}
                    existImg.src=url;
                    showToast('Image uploaded!');
                  })
                  .catch(function(error) {
                    console.error(error);
                    showToast('Upload failed');
                  });
              };
              inp.click();
            });
          });
          
          actions.querySelector('.card-view').addEventListener('click',function(e){
            e.stopPropagation();
            showImageView(imageUrl);
          });
          
          grid.appendChild(card);
        })(i,cat.id,cat.cardClass);
      }
    });
  });

  // ===== PACKAGING PROJECTS GENERATION =====
  [{gridId:'package1-grid',prefix:'package1'},{gridId:'package2-grid',prefix:'package2'}].forEach(function(pp){
    var grid=document.getElementById(pp.gridId);
    if(!grid)return;
    
    initPromise.then(function(loadedImages) {
      for(var pi=1;pi<=5;pi++){
        (function(idx,pfx){
          var key=pfx+'_'+idx;
          var cell=document.createElement('div');
          var imageUrl=loadedImages[key];
          cell.className='pm-card'+(imageUrl?'':' empty-card');
          
          if(imageUrl){
            var img=document.createElement('img');img.src=imageUrl;img.alt='Packaging image';
            cell.appendChild(img);
          }else{
            var ph=document.createElement('div');ph.className='placeholder-content';
            ph.innerHTML='<div class="pnum" style="font-size:1.8rem;opacity:.15;">0'+idx+'</div><div class="ptext">Upload</div>';
            cell.appendChild(ph);
          }
          
          var actions=document.createElement('div');
          actions.className='card-actions';
          actions.innerHTML='<button class="card-btn card-upload">Upload</button><button class="card-btn card-view">View</button>';
          cell.appendChild(actions);
          
          actions.querySelector('.card-upload').addEventListener('click',function(e){
            e.stopPropagation();
            requestUnlock(function(){
              var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
              inp.onchange=function(e){
                var file=e.target.files[0];if(!file)return;
                showToast('Uploading...');
                uploadImageToSupabase(file, pfx, idx)
                  .then(function(url) {
                    cell.classList.remove('empty-card');
                    var oldPh=cell.querySelector('.placeholder-content');if(oldPh)oldPh.remove();
                    var existing=cell.querySelector('img');
                    if(!existing){existing=document.createElement('img');existing.alt='Packaging image';cell.insertBefore(existing,actions);}
                    existing.src=url;
                    showToast('Packaging image uploaded!');
                  })
                  .catch(function(error) {
                    console.error(error);
                    showToast('Upload failed');
                  });
              };inp.click();
            });
          });
          
          actions.querySelector('.card-view').addEventListener('click',function(e){
            e.stopPropagation();
            showImageView(imageUrl);
          });
          
          grid.appendChild(cell);
        })(pi,pp.prefix);
      }
    });
  });

  // ===== ROW NAVIGATION FOR SOCIAL MEDIA GRID =====
  var socialGrid=document.getElementById('cat-social');
  var socialPrevBtn=document.getElementById('socialPrevBtn');
  var socialNextBtn=document.getElementById('socialNextBtn');
  var socialExpanded=false;

  function updateSocialNav(){
    if(socialExpanded){
      socialPrevBtn.classList.remove('disabled');
      socialNextBtn.classList.add('disabled');
    }else{
      socialPrevBtn.classList.add('disabled');
      socialNextBtn.classList.remove('disabled');
    }
  }

  socialNextBtn.addEventListener('click',function(){
    if(!socialExpanded){
      socialGrid.classList.add('show-all');
      socialExpanded=true;
      updateSocialNav();
    }
  });

  socialPrevBtn.addEventListener('click',function(){
    if(socialExpanded){
      socialGrid.classList.remove('show-all');
      socialExpanded=false;
      updateSocialNav();
    }
  });

  updateSocialNav();

  // ===== ROW NAVIGATION FOR FLYER GRID =====
  var flyerGrid=document.getElementById('cat-flyer');
  var flyerPrevBtn=document.getElementById('flyerPrevBtn');
  var flyerNextBtn=document.getElementById('flyerNextBtn');
  var flyerExpanded=false;

  function updateFlyerNav(){
    if(flyerExpanded){
      flyerPrevBtn.classList.remove('disabled');
      flyerNextBtn.classList.add('disabled');
    }else{
      flyerPrevBtn.classList.add('disabled');
      flyerNextBtn.classList.remove('disabled');
    }
  }

  flyerNextBtn.addEventListener('click',function(){
    if(!flyerExpanded){
      flyerGrid.classList.add('show-all');
      flyerExpanded=true;
      updateFlyerNav();
    }
  });

  flyerPrevBtn.addEventListener('click',function(){
    if(flyerExpanded){
      flyerGrid.classList.remove('show-all');
      flyerExpanded=false;
      updateFlyerNav();
    }
  });

  updateFlyerNav();

})();
