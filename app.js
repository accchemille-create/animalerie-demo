// Stockage simple en localStorage
const STORE = {
  users: 'petshop_users',
  advice: 'petshop_advice',
  partners: 'petshop_partners',
  events: 'petshop_events',
  session: 'petshop_session'
}

// Simple admin auth for the "Conseils" page (client-side)
const ADMIN_PWD_KEY = 'petshop_admin_password' // stored admin password data (localStorage)
const ADMIN_SESSION = 'petshop_admin_session'
const PBKDF2_ITER = 100000

// Supabase configuration (initialisation minimale)
const SUPABASE_URL = 'https://dsyxwboxqktwtfxigdro.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXh3Ym94cWt0d3RmeGlnZHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3OTYwNDMsImV4cCI6MjA4MTM3MjA0M30.vt3nrmFEs2pCV2T-HhoBHTZCYIjcXd0F6OhmHoW0hZg'
let supabaseClient = null

function initSupabase(){
  try{
    if(window.supabase && typeof window.supabase.createClient === 'function'){
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      console.log('Supabase client initialisé')
      // add a small test button to header for quick checks
      const headerRight = document.querySelector('header div div')
      if(headerRight && !document.getElementById('supabaseTestBtn')){
        const btn = document.createElement('button')
        btn.id = 'supabaseTestBtn'
        btn.textContent = 'Tester Supabase'
        btn.style.padding = '8px 12px'
        btn.style.marginLeft = '6px'
        btn.style.background = '#fff'
        btn.style.border = '1px solid #ccc'
        btn.style.borderRadius = '6px'
        btn.style.cursor = 'pointer'
        headerRight.appendChild(btn)
        btn.addEventListener('click', async ()=>{
          if(!supabaseClient){ alert('Supabase non initialisé.'); return }
          try{
            // try a lightweight select on a recommended table `app_state` if it exists
            const { data, error } = await supabaseClient.from('app_state').select('id').limit(1)
            if(error){
              alert('Connexion Supabase OK, mais table `app_state` inaccessible ou non existante. Message: ' + error.message)
            } else {
              alert('Connexion Supabase OK — table `app_state` accessible.')
            }
          }catch(err){ alert('Erreur test Supabase: ' + err.message) }
        })
      }
    } else {
      console.warn('Librairie Supabase non trouvée. Assurez-vous que le CDN est inclus dans index.html')
    }
  }catch(err){ console.error('Erreur initialisation Supabase', err) }
}

// Supabase sync functions
async function pushStateToSupabase(){
  if(!supabaseClient){ console.error('Supabase non initialisé'); return false }
  try{
    const state = {
      users: load(STORE.users),
      advice: load(STORE.advice),
      partners: load(STORE.partners),
      events: load(STORE.events)
    }
    const { error } = await supabaseClient.from('app_state').update({
      users: state.users,
      advice: state.advice,
      partners: state.partners,
      events: state.events,
      updated_at: new Date().toISOString()
    }).eq('id', 1)
    
    if(error){ 
      console.error('Erreur push Supabase:', error)
      return false
    }
    console.log('État poussé vers Supabase avec succès')
    return true
  }catch(err){ 
    console.error('Erreur push:', err)
    return false
  }
}

async function pullStateFromSupabase(){
  if(!supabaseClient){ console.error('Supabase non initialisé'); return false }
  try{
    const { data, error } = await supabaseClient.from('app_state').select('users, advice, partners, events').eq('id', 1).single()
    
    if(error){ 
      console.error('Erreur pull Supabase:', error)
      return false
    }
    
    if(data){
      // Mise à jour du localStorage avec les données Supabase
      if(data.users) save(STORE.users, data.users)
      if(data.advice) save(STORE.advice, data.advice)
      if(data.partners) save(STORE.partners, data.partners)
      if(data.events) save(STORE.events, data.events)
      console.log('État récupéré depuis Supabase avec succès')
      return true
    }
    return false
  }catch(err){ 
    console.error('Erreur pull:', err)
    return false
  }
}

// Debounce sync to éviter trop d'appels successifs
let syncTimer = null
function queueSync(){
  if(syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(()=>{
    pushStateToSupabase()
  }, 800)
}

function saveData(key, data){
  save(key, data)
  // On ne déclenche la sync que pour les données partagées
  if([STORE.users, STORE.advice, STORE.partners, STORE.events].includes(key)){
    queueSync()
  }
}

// Web Crypto helpers for PBKDF2 hashing (store salt + derived key)
function bufToBase64(buf){
  const bytes = new Uint8Array(buf)
  let binary = ''
  for(let i=0;i<bytes.byteLength;i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
function base64ToBuf(b64){
  const binary = atob(b64)
  const len = binary.length
  const buf = new Uint8Array(len)
  for(let i=0;i<len;i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

async function derivePBKDF2(password, saltB64, iterations=PBKDF2_ITER, dkLen=32){
  const enc = new TextEncoder()
  const passKey = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveBits'])
  const saltBuf = base64ToBuf(saltB64)
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt: saltBuf, iterations, hash: 'SHA-256'}, passKey, dkLen*8)
  return bufToBase64(bits)
}

function genSalt(len=16){
  return bufToBase64(crypto.getRandomValues(new Uint8Array(len)).buffer)
}

function load(key){
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : []
}
function save(key, data){
  localStorage.setItem(key, JSON.stringify(data))
}

function readFileAsDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader()
    r.onload = ()=>res(r.result)
    r.onerror = ()=>rej(new Error('Impossible de lire le fichier'))
    r.readAsDataURL(file)
  })
}

// Helpers for image sizing and compression
function dataURLSize(dataURL){
  const base64 = dataURL.split(',')[1] || ''
  return base64 ? (base64.length * 3) / 4 : 0
}

function compressImage(file, maxWidth=800, quality=0.6){
  return new Promise((res, rej)=>{
    const img = new Image()
    const reader = new FileReader()
    reader.onload = ()=>{
      img.onload = ()=>{
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let ratio = Math.min(1, maxWidth / img.width)
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        ctx.drawImage(img,0,0,canvas.width,canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        res(dataUrl)
      }
      img.onerror = ()=>rej(new Error('Image non chargée'))
      img.src = reader.result
    }
    reader.onerror = ()=>rej(new Error('Lecture impossible'))
    reader.readAsDataURL(file)
  })
}

// Initial sample data
function ensureSampleData(){
  if(load(STORE.advice).length===0){
    saveData(STORE.advice, [
      {id:1,cat:'alimentation',title:'Choisir une alimentation adaptée',content:'Adapter les rations selon l\'âge, le poids et l\'activité.', ownerId: null},
      {id:2,cat:'soins',title:'Toilettage régulier',content:'Brossage hebdomadaire pour la plupart des races.', ownerId: null},
      {id:3,cat:'prevention',title:'Vaccinations',content:'Consulter un vétérinaire pour le calendrier vaccinal.', ownerId: null},
      {id:4,cat:'saisons',title:'Chaleur et hydratation',content:'Assurer de l\'ombre et de l\'eau fraîche en été.', ownerId: null}
    ])
  }
  if(load(STORE.partners).length===0){
    saveData(STORE.partners, [
      {id:1,type:'Association',name:'Ami des Animaux',info:'contact@amisanimaux.org'},
      {id:2,type:'Vétérinaire',name:'Clinique VetCentre',info:'+33 1 23 45 67 89'}
    ])
  }
  if(load(STORE.events).length===0){
    saveData(STORE.events, [
      {id:1,title:'Journée d\'adoption',date:new Date().toISOString().slice(0,10),desc:'Rencontrez des associations locales.'}
    ])
  }
  // seed a default admin account (local only)
  if(load(STORE.users).length===0){
    const admin = {id:Date.now(), pseudo:'admin', email:'admin@local', password:'admin123', animals:[], gallery:[], profilePhoto:null, isAdmin:true}
    saveData(STORE.users, [admin])
  }
}

// Rendering & interactions
function $(s){return document.querySelector(s)}
function $all(s){return Array.from(document.querySelectorAll(s))}

function showAuth(mode){
  $('#loginForm').style.display = mode==='login' ? 'block' : 'none'
  $('#registerForm').style.display = mode==='register' ? 'block' : 'none'
}

// Export / Import / Reset helpers to share app state between testers
function exportState(){
  const state = {
    users: load(STORE.users),
    advice: load(STORE.advice),
    partners: load(STORE.partners),
    events: load(STORE.events)
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'animalerie-state.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function importStateFile(file){
  const r = new FileReader()
  r.onload = ()=>{
    try{
      const obj = JSON.parse(r.result)
      if(obj.users) save(STORE.users, obj.users)
      if(obj.advice) save(STORE.advice, obj.advice)
      if(obj.partners) save(STORE.partners, obj.partners)
      if(obj.events) save(STORE.events, obj.events)
      alert('État importé avec succès. La page va se recharger.')
      location.reload()
    }catch(err){ alert('Fichier JSON invalide.') }
  }
  r.onerror = ()=> alert('Impossible de lire le fichier')
  r.readAsText(file)
}

function resetData(){
  if(!confirm('Confirmez-vous la réinitialisation complète des données locales ?')) return
  localStorage.removeItem(STORE.users)
  localStorage.removeItem(STORE.advice)
  localStorage.removeItem(STORE.partners)
  localStorage.removeItem(STORE.events)
  localStorage.removeItem(STORE.session)
  alert('Données locales supprimées. La page va se recharger.')
  location.reload()
}

function showMainApp(logged=false){
  // Show the main content to all visitors. If `logged` is true, set login button to logout.
  if(logged){
    $('#authContainer').style.display = 'none'
    $('#mainContent').style.display = 'block'
    $('#mainNav').style.display = 'block'
    $('#menuBtn').style.display = 'block'
    $('#loginBtn').textContent = 'Déconnexion'
    $('#loginBtn').onclick = ()=>logout()
  } else {
    // Not logged: show auth container, hide main content
    $('#authContainer').style.display = 'block'
    $('#mainContent').style.display = 'none'
    $('#mainNav').style.display = 'none'
    $('#menuBtn').style.display = 'none'
    $('#loginBtn').textContent = 'Connexion'
    $('#loginBtn').onclick = ()=> showAuth('login')
    showAuth('login') // display login form by default
  }
}

function logout(){
  save(STORE.session, null)
  location.reload()
}

function switchPanel(id){
  $all('.panel').forEach(p=>p.style.display = p.id===id ? 'block' : 'none')
  if(id === 'account'){
    renderAnimalsList()
  }
}

// Account
function renderProfile(){
  const users = load(STORE.users)
  const out = $('#profile')
  if(users.length===0){ out.innerHTML = '<p>Aucun compte enregistré.</p>'; return }
  const u = users[users.length-1]
  let animalsHtml = 'Aucun animal.'
  if(u.animals && u.animals.length > 0){
    animalsHtml = u.animals.map(a=>`${a.name} (${a.type}${a.age ? ', ' + a.age + ' ans' : ''})`).join(', ')
  }
  out.innerHTML = `<h4>Compte</h4><div><strong>${u.pseudo}</strong><p><small class='gray'>${u.email}</small></p><p>Animaux: ${animalsHtml}</p></div>`
}

function renderAnimalsList(){
  const users = load(STORE.users)
  if(users.length === 0) return
  const u = users[users.length-1]
  const list = $('#profileAnimalsList')
  if(!list) return
  list.innerHTML = ''
  if(u.animals && u.animals.length > 0){
    u.animals.forEach(animal=>{
      const html = `<div class="animal-row" style="border:1px solid #e3e6ea;padding:8px;border-radius:4px;margin-bottom:8px;display:flex;gap:8px;align-items:center">
        <input type="text" value="${animal.name}" required style="flex:1">
        <select required style="flex:0.7">
          <option value="">Type</option>
          <option ${animal.type === 'Chien' ? 'selected' : ''}>Chien</option>
          <option ${animal.type === 'Chat' ? 'selected' : ''}>Chat</option>
          <option ${animal.type === 'Oiseau' ? 'selected' : ''}>Oiseau</option>
          <option ${animal.type === 'Rongeur' ? 'selected' : ''}>Rongeur</option>
          <option ${animal.type === 'Poisson' ? 'selected' : ''}>Poisson</option>
          <option ${animal.type === 'Reptile' ? 'selected' : ''}>Reptile</option>
        </select>
        <input type="number" value="${animal.age || 0}" min="0" max="50" required style="flex:0.5">
        <button type="button" onclick="this.parentElement.remove()" style="padding:4px 8px;background:#ffebee;border:1px solid #d32f2f;color:#d32f2f;border-radius:4px;cursor:pointer">✕</button>
      </div>`
      list.insertAdjacentHTML('beforeend', html)
    })
  }
}

function addAnimalFieldProfile(){
  const list = $('#profileAnimalsList')
  const html = `<div class="animal-row" style="border:1px solid #e3e6ea;padding:8px;border-radius:4px;margin-bottom:8px;display:flex;gap:8px;align-items:center">
    <input type="text" placeholder="Nom" required style="flex:1">
    <select required style="flex:0.7">
      <option value="">Type</option>
      <option>Chien</option>
      <option>Chat</option>
      <option>Oiseau</option>
      <option>Rongeur</option>
      <option>Poisson</option>
      <option>Reptile</option>
    </select>
    <input type="number" placeholder="Âge" min="0" max="50" required style="flex:0.5">
    <button type="button" onclick="this.parentElement.remove()" style="padding:4px 8px;background:#ffebee;border:1px solid #d32f2f;color:#d32f2f;border-radius:4px;cursor:pointer">✕</button>
  </div>`
  list.insertAdjacentHTML('beforeend', html)
}

function renderGallery(){
  const users = load(STORE.users)
  if(users.length === 0) return
  const u = users[users.length-1]
  const g = $('#galleryPreview')
  if(!g) return
  g.innerHTML = ''
  if(u.gallery && u.gallery.length){
    u.gallery.forEach((dataUrl, idx)=>{
      const div = document.createElement('div')
      div.className = 'thumb'
      div.innerHTML = `<img src="${dataUrl}" alt="photo"/><button class="thumbSet" data-idx="${idx}">★</button><button class="thumbDel" data-idx="${idx}">✕</button>`
      g.appendChild(div)
    })
    // attach handlers
    $all('.thumbDel').forEach(b=>b.addEventListener('click', e=>{
      const i = parseInt(b.dataset.idx)
      const users2 = load(STORE.users)
      const u2 = users2[users2.length-1]
      u2.gallery.splice(i,1)
      save(STORE.users, users2)
      renderGallery()
    }))
    $all('.thumbSet').forEach(b=>b.addEventListener('click', e=>{
      const i = parseInt(b.dataset.idx)
      const users2 = load(STORE.users)
      const u2 = users2[users2.length-1]
      if(u2 && u2.gallery && u2.gallery[i]){
        u2.profilePhoto = u2.gallery[i]
        save(STORE.users, users2)
        renderGallery()
      }
    }))
  }
  // profile photo preview
  const preview = $('#profilePhotoPreview')
  if(preview){
    if(u.profilePhoto){
      preview.innerHTML = `<img src="${u.profilePhoto}" alt="profile" style="width:100%;height:100%;object-fit:cover">`
    } else {
      preview.innerHTML = 'Aucune photo'
    }
  }
}

// Advice
let currentAdviceCat = 'alimentation'
function renderAdvice(){
  const container = $('#adviceList')
  // Show public fiches to everyone. Show admin's private fiches only when admin is connected.
  const all = load(STORE.advice).filter(a=>a.cat===currentAdviceCat)
  const isAdmin = localStorage.getItem(ADMIN_SESSION) === 'true'
  const users = load(STORE.users)
  const adminUser = users.find(u=>u.isAdmin) || null
  const adminId = adminUser ? adminUser.id : null
  const list = all.filter(a=> {
    // public if ownerId is null
    if(!a.ownerId) return true
    // private: show only to admin who owns them
    return isAdmin && a.ownerId === adminId
  })
  if(list.length===0) container.innerHTML='<p>Aucune fiche pour cette catégorie.</p>'
  else {
    container.innerHTML = list.map(a=>{
      const adminControls = isAdmin ? `<div style="margin-top:8px"><button class="editAdvice" data-id="${a.id}">Éditer</button> <button class="deleteAdvice" data-id="${a.id}">Supprimer</button></div>` : ''
      const privateBadge = a.ownerId ? '<small style="color:#b65;display:block">(Privée)</small>' : ''
      return `<div class='card'><h4>${a.title}</h4>${privateBadge}<p>${a.content}</p>${adminControls}</div>`
    }).join('')
  }
  // Show or hide admin controls depending on user isAdmin flag
  const session = load(STORE.session)
  const currentUser = session ? users.find(u=>u.id===session.id) : null
  const userIsAdmin = currentUser && currentUser.isAdmin === true
  
  const adminControls = $('#adminControls')
  const addForm = $('#addAdviceForm')
  const adminLoginBtn = $('#adminLoginBtn')
  const adminLoginForm = $('#adminLoginForm')
  const adminLogoutBtn = $('#adminLogoutBtn')
  const adminMgmtDiv = $('#adminMgmt')
  
  // Hide entire admin section for non-admin users
  if(adminControls){
    if(!userIsAdmin){
      adminControls.style.display = 'none'
    } else {
      adminControls.style.display = 'block'
      // Show/hide forms based on admin session
      if(addForm){
        if(localStorage.getItem(ADMIN_SESSION) === 'true'){
          addForm.style.display = 'block'
          if(adminLoginForm) adminLoginForm.style.display = 'none'
          if(adminLogoutBtn) adminLogoutBtn.style.display = 'inline-block'
          if(adminLoginBtn) adminLoginBtn.style.display = 'none'
          const adminChange = $('#adminChangePwd')
          if(adminChange) adminChange.style.display = 'block'
          if(adminMgmtDiv) adminMgmtDiv.style.display = 'block'
        } else {
          addForm.style.display = 'none'
          if(adminLoginForm) adminLoginForm.style.display = 'none'
          if(adminLogoutBtn) adminLogoutBtn.style.display = 'none'
          if(adminLoginBtn) adminLoginBtn.style.display = 'inline-block'
          const adminChange = $('#adminChangePwd')
          if(adminChange) adminChange.style.display = 'none'
          if(adminMgmtDiv) adminMgmtDiv.style.display = 'none'
        }
      }
    }
  }
}

// Partners
function renderPartners(){
  const list = load(STORE.partners)
  const container = $('#partnersList')
  if(list.length===0) container.innerHTML='<p>Aucun partenaire ajouté.</p>'
  else {
    const isAdmin = localStorage.getItem(ADMIN_SESSION) === 'true'
    container.innerHTML = list.map(p=>{
      const adminControls = isAdmin ? `<div style="margin-top:8px"><button class="editPartner" data-id="${p.id}">Éditer</button> <button class="deletePartner" data-id="${p.id}">Supprimer</button></div>` : ''
      return `<div class='card'><h4>Contact</h4><strong>${p.name}</strong> <small class='gray'>${p.type}</small><div>${p.info||''}</div>${adminControls}</div>`
    }).join('')
  }

  // Show or hide add partner form: only for admin users with active session
  const session = load(STORE.session)
  const users = load(STORE.users)
  const currentUser = session ? users.find(u=>u.id===session.id) : null
  const userIsAdmin = currentUser && currentUser.isAdmin === true
  
  const addForm = $('#addPartnerForm')
  if(addForm){
    if(userIsAdmin && localStorage.getItem(ADMIN_SESSION) === 'true'){
      addForm.style.display = 'block'
    } else {
      addForm.style.display = 'none'
    }
  }
}

// Events
function renderEvents(){
  const list = load(STORE.events).sort((a,b)=>a.date.localeCompare(b.date))
  const container = $('#eventsList')
  if(list.length===0) container.innerHTML='<p>Aucun événement prévu.</p>'
  else {
    const isAdmin = localStorage.getItem(ADMIN_SESSION) === 'true'
    container.innerHTML = list.map(e=>{
      const adminControls = isAdmin ? `<div style="margin-top:8px"><button class="editEvent" data-id="${e.id}">Éditer</button> <button class="deleteEvent" data-id="${e.id}">Supprimer</button></div>` : ''
      return `<div class='card'><h4>Événement</h4><strong>${e.title}</strong> <small class='gray'>${e.date}</small><div>${e.desc||''}</div>${adminControls}</div>`
    }).join('')
  }

  // Show or hide add event form: only for admin users with active session
  const session = load(STORE.session)
  const users = load(STORE.users)
  const currentUser = session ? users.find(u=>u.id===session.id) : null
  const userIsAdmin = currentUser && currentUser.isAdmin === true
  
  const addForm = $('#addEventForm')
  if(addForm){
    if(userIsAdmin && localStorage.getItem(ADMIN_SESSION) === 'true'){
      addForm.style.display = 'block'
    } else {
      addForm.style.display = 'none'
    }
  }
}

// Handlers
function initAuthHandlers(){
  $('#loginBtn').addEventListener('click', ()=> showAuth('login'))
  $('#toRegister').addEventListener('click', e=>{ e.preventDefault(); showAuth('register') })
  $('#toLogin').addEventListener('click', e=>{ e.preventDefault(); showAuth('login') })

  $('#loginSubmit').addEventListener('submit', e=>{
    e.preventDefault()
    const email = $('#loginEmail').value.trim()
    const password = $('#loginPassword').value.trim()
    const users = load(STORE.users)
    const user = users.find(u=>u.email===email && u.password===password)
    if(user){
      save(STORE.session, {id:user.id, email:user.email, name:user.name})
      // Clear admin session for non-admin users
      if(!user.isAdmin){
        localStorage.removeItem(ADMIN_SESSION)
      }
      showMainApp(true)
      initMainHandlers()
      renderProfile()
      renderAdvice()
      renderPartners()
      renderEvents()
      renderGallery()
      renderAnimalsList()
      switchPanel('account')
    } else {
      alert('Email ou mot de passe incorrect.')
    }
  })

  // Add animal button
  $('#addAnimalBtn').addEventListener('click', e=>{
    e.preventDefault()
    const list = $('#animalsList')
    const count = list.children.length
    if(count >= 10){
      alert('Maximum 10 animaux.')
      return
    }
    addAnimalField(count)
  })

  $('#registerSubmit').addEventListener('submit', e=>{
    e.preventDefault()
    const pseudo = $('#regPseudo').value.trim()
    const email = $('#regEmail').value.trim()
    const password = $('#regPassword').value.trim()
    const password2 = $('#regPassword2').value.trim()
    
    if(password !== password2){
      alert('Les mots de passe ne correspondent pas.')
      return
    }
    if(password.length < 4){
      alert('Le mot de passe doit contenir au moins 4 caractères.')
      return
    }
    
    // Collect animals
    const animals = []
    $all('#animalsList .animal-row').forEach(row=>{
      const name = row.querySelector('input[type="text"]').value.trim()
      const type = row.querySelector('select').value
      const age = row.querySelector('input[type="number"]').value
      if(name && type) animals.push({name, type, age: parseInt(age) || 0})
    })
    
    const users = load(STORE.users)
    if(users.find(u=>u.email===email)){
      alert('Cet email est déjà utilisé.')
      return
    }
    
    const newUser = {id:Date.now(), pseudo, email, password, animals, gallery: [], profilePhoto: null, isAdmin: false}
    users.push(newUser)
    saveData(STORE.users, users)
    save(STORE.session, {id:newUser.id, email:newUser.email, pseudo:newUser.pseudo})
    // Clear admin session for new non-admin user
    localStorage.removeItem(ADMIN_SESSION)
    showMainApp(true)
    initMainHandlers()
    renderProfile()
    renderAdvice()
    renderPartners()
    renderEvents()
    renderGallery()
    switchPanel('account')
  })
}

function addAnimalField(index){
  const html = `<div class="animal-row" style="border:1px solid #e3e6ea;padding:8px;border-radius:4px;margin-bottom:8px;display:flex;gap:8px;align-items:center">
    <input type="text" placeholder="Nom" required style="flex:1">
    <select required style="flex:0.7">
      <option value="">Type</option>
      <option>Chien</option>
      <option>Chat</option>
      <option>Oiseau</option>
      <option>Rongeur</option>
      <option>Poisson</option>
      <option>Reptile</option>
    </select>
    <input type="number" placeholder="Âge" min="0" max="50" required style="flex:0.5">
    <button type="button" onclick="this.parentElement.remove()" style="padding:4px 8px;background:#ffebee;border:1px solid #d32f2f;color:#d32f2f;border-radius:4px;cursor:pointer">✕</button>
  </div>`
  $('#animalsList').insertAdjacentHTML('beforeend', html)
}

function initMainHandlers(){
  $('#menuBtn').addEventListener('click', ()=>{
    const nav = $('#mainNav')
    nav.style.display = nav.style.display === 'none' ? 'block' : 'none'
  })

  // export/import/reset buttons
  const exportBtn = $('#exportBtn')
  const importBtn = $('#importBtn')
  const importFile = $('#importFile')
  const resetDataBtn = $('#resetDataBtn')
  const syncBtn = $('#syncBtn')
  if(exportBtn) exportBtn.addEventListener('click', e=>{ e.preventDefault(); exportState() })
  if(importBtn && importFile){ importBtn.addEventListener('click', e=>{ e.preventDefault(); importFile.click() }) }
  if(importFile){ importFile.addEventListener('change', e=>{ const f = e.target.files[0]; if(f) importStateFile(f); importFile.value = '' }) }
  if(resetDataBtn) resetDataBtn.addEventListener('click', e=>{ e.preventDefault(); resetData() })
  
  // Sync button: pull from Supabase then push back
  if(syncBtn){
    syncBtn.addEventListener('click', async e=>{ 
      e.preventDefault()
      console.log('[SYNC] click détecté')
      alert('Synchronisation en cours...')
      const original = syncBtn.textContent
      syncBtn.textContent = '⟳ Synchronisation...'
      syncBtn.disabled = true
      try{
        // Push local -> Supabase, puis Pull Supabase -> local pour cohérence
        const pushOk = await pushStateToSupabase()
        console.log('[SYNC] pushOk =', pushOk)
        const pullOk = await pullStateFromSupabase()
        console.log('[SYNC] pullOk =', pullOk)
        // Refresh UI
        renderProfile()
        renderAdvice()
        renderPartners()
        renderEvents()
        renderGallery()
        renderAnimalsList()
        if(pullOk) alert('Données synchronisées (push/pull) avec Supabase.')
        else alert('Synchronisation partielle : push OK, pull KO (voir console).')
      }catch(err){
        console.error('Erreur sync:', err)
        alert('Erreur sync: ' + err.message)
      } finally {
        syncBtn.textContent = original
        syncBtn.disabled = false
      }
    })
  }

  $all('nav button, .menuLink').forEach(btn=>btn.addEventListener('click',()=>{ 
    switchPanel(btn.dataset.target)
    $('#mainNav').style.display = 'none'
  }))

  // Profile animal management
  // toggle profile animals section
  $('#toggleAnimalsProfileBtn').addEventListener('click', e=>{
    e.preventDefault()
    const sec = $('#profileAnimalsSection')
    if(sec.style.display === 'none' || !sec.style.display){
      renderAnimalsList()
      sec.style.display = 'block'
      $('#toggleAnimalsProfileBtn').textContent = 'Ajouter / Modifier mes animaux ▴'
    } else {
      sec.style.display = 'none'
      $('#toggleAnimalsProfileBtn').textContent = 'Ajouter / Modifier mes animaux ▾'
    }
  })

  $('#addAnimalBtnProfile').addEventListener('click', e=>{
    e.preventDefault()
    const list = $('#profileAnimalsList')
    const count = list.children.length
    if(count >= 10){
      alert('Maximum 10 animaux.')
      return
    }
    addAnimalFieldProfile()
  })

  // profile photo input
  const profileInput = $('#profilePhotoInput')
  if(profileInput){
    profileInput.addEventListener('change', async e=>{
      const f = e.target.files[0]
      if(!f) return
      try{
        const data = await readFileAsDataURL(f)
        const users = load(STORE.users)
        const last = users[users.length-1]
        if(last){ last.profilePhoto = data; saveData(STORE.users, users); renderGallery() }
      }catch(err){ console.error(err) }
    })
  }

  // gallery input
  const galleryInput = $('#galleryInput')
  if(galleryInput){
    galleryInput.addEventListener('change', async e=>{
      const files = Array.from(e.target.files || [])
      if(files.length===0) return
      const users = load(STORE.users)
      const last = users[users.length-1]
      if(!last) return
      last.gallery = last.gallery || []
      const MAX_IMAGES = 20
      const MAX_TOTAL_BYTES = 10 * 1024 * 1024 // 10 MB total
      // compute current total
      let total = (last.gallery || []).reduce((s,d)=>s + dataURLSize(d), 0)
      for(const f of files){
        if(last.gallery.length >= MAX_IMAGES) break
        try{
          // compress image
          const data = await compressImage(f, 1024, 0.8)
          const size = dataURLSize(data)
          if(total + size > MAX_TOTAL_BYTES){
            alert('Limite totale de la galerie atteinte (10 MB). Certaines images n\'ont pas été ajoutées.')
            break
          }
          last.gallery.push(data)
          total += size
        }catch(err){ console.error(err) }
      }
      saveData(STORE.users, users)
      renderGallery()
      galleryInput.value = ''
    })
  }

  $('#saveAnimalsBtnProfile').addEventListener('click', e=>{
    e.preventDefault()
    const animals = []
    $all('#profileAnimalsList .animal-row').forEach(row=>{
      const name = row.querySelector('input[type="text"]').value.trim()
      const type = row.querySelector('select').value
      const age = row.querySelector('input[type="number"]').value
      if(name && type) animals.push({name, type, age: parseInt(age) || 0})
    })

    const users = load(STORE.users)
    const lastUser = users[users.length-1]
    if(lastUser){
      lastUser.animals = animals
      saveData(STORE.users, users)
      renderProfile()
      // hide section after saving
      $('#profileAnimalsSection').style.display = 'none'
      $('#toggleAnimalsProfileBtn').textContent = 'Ajouter / Modifier mes animaux ▾'
      alert('Animaux enregistrés !')
    }
  })

  $all('.advice-cats button').forEach(b=>b.addEventListener('click', ()=>{ currentAdviceCat=b.dataset.cat; renderAdvice()}))
  // Admin controls: login form and add advice submission
  const adminLoginBtn = $('#adminLoginBtn')
  const adminLoginForm = $('#adminLoginForm')
  const adminPassword = $('#adminPassword')
  const adminLoginSubmit = $('#adminLoginSubmit')
  const adminLogoutBtn = $('#adminLogoutBtn')

  if(adminLoginBtn){
    adminLoginBtn.addEventListener('click', ()=>{
      if(adminLoginForm) adminLoginForm.style.display = adminLoginForm.style.display === 'none' ? 'flex' : 'none'
    })
  }
  if(adminLoginSubmit){
    adminLoginSubmit.addEventListener('click', async ()=>{
      const p = (adminPassword && adminPassword.value) ? adminPassword.value : ''
      const storedRaw = localStorage.getItem(ADMIN_PWD_KEY)
      // If no stored password exists, accept the first non-empty entry and persist its derived hash+salt
      if(storedRaw === null){
        if(!p){ alert('Entrez un mot de passe pour initialiser l\'administration.'); return }
        const salt = genSalt()
        const hash = await derivePBKDF2(p, salt, PBKDF2_ITER)
        const payload = {salt, hash, iterations: PBKDF2_ITER}
        localStorage.setItem(ADMIN_PWD_KEY, JSON.stringify(payload))
        localStorage.setItem(ADMIN_SESSION, 'true')
        if(adminLoginForm) adminLoginForm.style.display = 'none'
        if(adminLogoutBtn) adminLogoutBtn.style.display = 'inline-block'
        if(adminLoginBtn) adminLoginBtn.style.display = 'none'
        renderAdvice()
        if(adminPassword) adminPassword.value = ''
        alert('Mot de passe administratrice enregistré et connectée.')
        return
      }
      // Otherwise verify against stored derived hash
      try{
        const stored = JSON.parse(storedRaw)
        const derived = await derivePBKDF2(p, stored.salt, stored.iterations || PBKDF2_ITER)
        if(derived === stored.hash){
          localStorage.setItem(ADMIN_SESSION, 'true')
          if(adminLoginForm) adminLoginForm.style.display = 'none'
          if(adminLogoutBtn) adminLogoutBtn.style.display = 'inline-block'
          if(adminLoginBtn) adminLoginBtn.style.display = 'none'
          renderAdvice()
          if(adminPassword) adminPassword.value = ''
          alert('Connectée en tant qu\'administratrice.')
        } else {
          alert('Mot de passe administratrice incorrect.')
          if(adminLoginForm) adminLoginForm.style.display = 'none'
        }
      } catch(err){
        console.error('Erreur vérification admin pwd', err)
        alert('Erreur interne.')
      }
    })
  }
  if(adminLogoutBtn){
    adminLogoutBtn.addEventListener('click', ()=>{
      localStorage.removeItem(ADMIN_SESSION)
      if(adminLogoutBtn) adminLogoutBtn.style.display = 'none'
      if(adminLoginBtn) adminLoginBtn.style.display = 'inline-block'
      renderAdvice()
    })
  }

  // Change password UI handlers
  const showChangePwdBtn = $('#showChangePwdBtn')
  const changePwdForm = $('#changePwdForm')
  const saveNewAdminPwd = $('#saveNewAdminPwd')
  const cancelChangePwd = $('#cancelChangePwd')
  if(showChangePwdBtn){
    showChangePwdBtn.addEventListener('click', ()=>{
      if(changePwdForm) changePwdForm.style.display = changePwdForm.style.display === 'none' ? 'flex' : 'none'
    })
  }
  if(cancelChangePwd){
    cancelChangePwd.addEventListener('click', ()=>{
      if(changePwdForm) changePwdForm.style.display = 'none'
      const cur = $('#curAdminPwd'); const n1 = $('#newAdminPwd'); const n2 = $('#newAdminPwd2')
      if(cur) cur.value = ''
      if(n1) n1.value = ''
      if(n2) n2.value = ''
    })
  }
  if(saveNewAdminPwd){
    saveNewAdminPwd.addEventListener('click', async ()=>{
      const cur = $('#curAdminPwd') && $('#curAdminPwd').value ? $('#curAdminPwd').value : ''
      const n1 = $('#newAdminPwd') && $('#newAdminPwd').value ? $('#newAdminPwd').value : ''
      const n2 = $('#newAdminPwd2') && $('#newAdminPwd2').value ? $('#newAdminPwd2').value : ''
      const storedRaw = localStorage.getItem(ADMIN_PWD_KEY)
      if(storedRaw === null){ alert('Aucun mot de passe administrateur initialisé.'); return }
      try{
        const stored = JSON.parse(storedRaw)
        const derivedCur = await derivePBKDF2(cur, stored.salt, stored.iterations || PBKDF2_ITER)
        if(derivedCur !== stored.hash){ alert('Mot de passe actuel incorrect.'); return }
        if(n1.length < 3){ alert('Le nouveau mot de passe doit contenir au moins 3 caractères.'); return }
        if(n1 !== n2){ alert('Les nouveaux mots de passe ne correspondent pas.'); return }
        const newSalt = genSalt()
        const newHash = await derivePBKDF2(n1, newSalt, PBKDF2_ITER)
        localStorage.setItem(ADMIN_PWD_KEY, JSON.stringify({salt:newSalt, hash:newHash, iterations: PBKDF2_ITER}))
        if(changePwdForm) changePwdForm.style.display = 'none'
        if($('#curAdminPwd')) $('#curAdminPwd').value = ''
        if($('#newAdminPwd')) $('#newAdminPwd').value = ''
        if($('#newAdminPwd2')) $('#newAdminPwd2').value = ''
        alert('Mot de passe administratrice mis à jour.')
      }catch(err){ console.error(err); alert('Erreur lors de la mise à jour du mot de passe.') }
    })
  }

  // Admin management toggle and handlers
  const showAdminMgmtBtn = $('#showAdminMgmtBtn')
  const adminList = $('#adminList')
  if(showAdminMgmtBtn){
    showAdminMgmtBtn.addEventListener('click', ()=>{
      if(adminList) adminList.style.display = adminList.style.display === 'none' ? 'block' : 'none'
      // render list when toggled open
      if(adminList && adminList.style.display === 'block') renderAdminList()
    })
  }

  function renderAdminList(){
    if(!adminList) return
    const users = load(STORE.users)
    if(users.length===0){ adminList.innerHTML = '<p>Aucun utilisateur.</p>'; return }
    adminList.innerHTML = users.map(u=>{
      const role = u.isAdmin ? 'Administratrice' : 'Utilisateur'
      const adminControls = (localStorage.getItem(ADMIN_SESSION) === 'true') ? ` <button class="promoteUser" data-id="${u.id}">${u.isAdmin ? 'Démouvoir' : 'Promouvoir'}</button>` : ''
      return `<div style="border:1px solid #e3e6ea;padding:8px;border-radius:6px;margin-bottom:8px"><strong>${u.pseudo||u.email}</strong> <small class="gray">${role}</small> ${adminControls}</div>`
    }).join('')
  }

  // Delegate clicks in adminList for promote/demote
  if(adminList){
    adminList.addEventListener('click', e=>{
      const t = e.target
      if(t.matches('.promoteUser')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        const users = load(STORE.users)
        const target = users.find(u=>u.id===id)
        if(!target) return
        if(target.isAdmin){
          // demote: ensure at least one admin remains
          const adminCount = users.filter(u=>u.isAdmin).length
          if(adminCount <= 1){ alert('Impossible de démouvoir : au moins une administratrice doit rester.'); return }
          if(!confirm(`Démouvoir ${target.pseudo||target.email} ?`)) return
          target.isAdmin = false
        } else {
          if(!confirm(`Promouvoir ${target.pseudo||target.email} en administratrice ?`)) return
          target.isAdmin = true
        }
        saveData(STORE.users, users)
        renderAdminList()
        // refresh advice/partners/events UI
        renderAdvice(); renderPartners(); renderEvents()
      }
    })
  }

  const addAdviceFormEl = $('#addAdviceForm')
  if(addAdviceFormEl){
    addAdviceFormEl.addEventListener('submit', e=>{
      e.preventDefault()
      if(localStorage.getItem(ADMIN_SESSION) !== 'true'){
        alert('Seule l\'administratrice peut ajouter une fiche conseils.')
        return
      }
      const title = $('#adviceTitle').value.trim(); const cat = $('#adviceCat').value; const content = $('#adviceContent').value.trim()
      // Attach this fiche to the admin owner so it is private to the admin
      const users = load(STORE.users)
      const adminUser = users.find(u=>u.isAdmin) || null
      const ownerId = adminUser ? adminUser.id : null
      const list = load(STORE.advice)
      list.push({id:Date.now(), title, cat, content, ownerId})
      saveData(STORE.advice, list)
      $('#adviceTitle').value=''; $('#adviceContent').value=''
      renderAdvice()
    })
  }

  const addPartnerFormEl = $('#addPartnerForm')
  if(addPartnerFormEl){
    addPartnerFormEl.addEventListener('submit', e=>{
      e.preventDefault()
      if(localStorage.getItem(ADMIN_SESSION) !== 'true'){
        alert('Seule l\'administratrice peut ajouter un partenaire.')
        return
      }
      const name = $('#partnerName').value.trim(); const type = $('#partnerType').value; const info = $('#partnerInfo').value.trim()
      const list = load(STORE.partners); list.push({id:Date.now(), name, type, info}); saveData(STORE.partners, list); renderPartners();
      $('#partnerName').value=''; $('#partnerInfo').value=''
    })
  }

  const addEventFormEl = $('#addEventForm')
  if(addEventFormEl){
    addEventFormEl.addEventListener('submit', e=>{
      e.preventDefault()
      if(localStorage.getItem(ADMIN_SESSION) !== 'true'){
        alert('Seule l\'administratrice peut ajouter un événement.')
        return
      }
      const title = $('#eventTitle').value.trim(); const date = $('#eventDate').value; const desc = $('#eventDesc').value.trim()
      if(!date){ alert('Sélectionnez une date'); return }
      const list = load(STORE.events); list.push({id:Date.now(), title, date, desc}); saveData(STORE.events, list); renderEvents();
      $('#eventTitle').value=''; $('#eventDesc').value=''; $('#eventDate').value=''
    })
  }

  // Admin edit/delete handlers using event delegation
  const adviceListContainer = $('#adviceList')
  if(adviceListContainer){
    adviceListContainer.addEventListener('click', e=>{
      const t = e.target
      if(t.matches('.deleteAdvice')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        if(!confirm('Confirmer la suppression de cette fiche ?')) return
        const list = load(STORE.advice).filter(a=>a.id !== id)
        saveData(STORE.advice, list)
        renderAdvice()
      }
      if(t.matches('.editAdvice')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        const list = load(STORE.advice)
        const item = list.find(a=>a.id===id)
        if(!item) return
        const newTitle = prompt('Titre', item.title)
        if(newTitle === null) return
        const newContent = prompt('Contenu', item.content)
        if(newContent === null) return
        item.title = newTitle.trim()
        item.content = newContent.trim()
        saveData(STORE.advice, list)
        renderAdvice()
      }
    })
  }

  const partnersListContainer = $('#partnersList')
  if(partnersListContainer){
    partnersListContainer.addEventListener('click', e=>{
      const t = e.target
      if(t.matches('.deletePartner')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        if(!confirm('Confirmer la suppression de ce partenaire ?')) return
        const list = load(STORE.partners).filter(p=>p.id !== id)
        saveData(STORE.partners, list)
        renderPartners()
      }
      if(t.matches('.editPartner')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        const list = load(STORE.partners)
        const item = list.find(p=>p.id===id)
        if(!item) return
        const newName = prompt('Nom', item.name)
        if(newName === null) return
        const newType = prompt('Type', item.type)
        if(newType === null) return
        const newInfo = prompt('Contact / Infos', item.info||'')
        if(newInfo === null) return
        item.name = newName.trim()
        item.type = newType.trim()
        item.info = newInfo.trim()
        saveData(STORE.partners, list)
        renderPartners()
      }
    })
  }

  const eventsListContainer = $('#eventsList')
  if(eventsListContainer){
    eventsListContainer.addEventListener('click', e=>{
      const t = e.target
      if(t.matches('.deleteEvent')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        if(!confirm('Confirmer la suppression de cet événement ?')) return
        const list = load(STORE.events).filter(ev=>ev.id !== id)
        saveData(STORE.events, list)
        renderEvents()
      }
      if(t.matches('.editEvent')){
        if(localStorage.getItem(ADMIN_SESSION) !== 'true'){ alert('Action réservée à l\'administratrice.'); return }
        const id = parseInt(t.dataset.id)
        const list = load(STORE.events)
        const item = list.find(ev=>ev.id===id)
        if(!item) return
        const newTitle = prompt('Titre', item.title)
        if(newTitle === null) return
        const newDate = prompt('Date (YYYY-MM-DD)', item.date)
        if(newDate === null) return
        const newDesc = prompt('Description', item.desc||'')
        if(newDesc === null) return
        item.title = newTitle.trim()
        item.date = newDate.trim()
        item.desc = newDesc.trim()
        saveData(STORE.events, list)
        renderEvents()
      }
    })
  }
}

// Init
(async function(){
  const session = load(STORE.session)
  // initialize Supabase client if the CDN is available
  initSupabase()

  // Tenter de récupérer l'état Supabase en premier
  let pulled = false
  if(supabaseClient){
    pulled = await pullStateFromSupabase()
  }
  // Si rien récupéré, on seed et on pousse vers Supabase
  if(!pulled){
    ensureSampleData()
    if(supabaseClient){
      await pushStateToSupabase()
    }
  }

  initAuthHandlers();
  
  // Show main app to visitors; if a session exists consider user logged in
  if(!session){
    showMainApp(false)
  } else {
    showMainApp(true)
  }
  initMainHandlers();
  renderProfile();
  renderAdvice();
  renderPartners();
  renderEvents();
  renderAnimalsList();
  switchPanel('account')
})();