/* ==========================================================================
   FIREBASE REALTIME DATABASE — ข้อมูล sync กันทุกคนแบบ Real-time
   ========================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBgZfHlZ1zE2Rq0yldCHtWz7kw3UTDOeGg",
  authDomain: "teamflow-beston.firebaseapp.com",
  databaseURL: "https://teamflow-beston-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "teamflow-beston",
  storageBucket: "teamflow-beston.firebasestorage.app",
  messagingSenderId: "892299926911",
  appId: "1:892299926911:web:3d9a25ae493ea603370e4a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const teamflowRef = db.ref('teamflow');
let _fbReady = false;
let _fbSyncing = false;

// ==========================================================================
// LOGIN ENGINE — PIN 4 หลัก แยก Role อัตโนมัติ
// ==========================================================================
let _loginPin = '';

function loginPinPress(digit) {
  if (_loginPin.length >= 4) return;
  _loginPin += digit;
  _updateLoginDots();
  if (_loginPin.length === 4) setTimeout(_loginVerify, 150);
}
function loginPinDelete() { _loginPin = _loginPin.slice(0,-1); _updateLoginDots(); _hideLoginErr(); }
function loginPinClear()  { _loginPin = ''; _updateLoginDots(); _hideLoginErr(); }
function _updateLoginDots() {
  for (let i=0;i<4;i++){const d=document.getElementById('ldot-'+i);if(d)d.className='pin-dot'+(i<_loginPin.length?' filled':'');}
}
function _setDotState(cls){for(let i=0;i<4;i++){const d=document.getElementById('ldot-'+i);if(d)d.className='pin-dot '+cls;}}
function _hideLoginErr(){const e=document.getElementById('login-error');if(e)e.style.display='none';}
function _loginVerify() {
  let s=state;
  try{const sv=localStorage.getItem('teamflow_state');if(sv)s=JSON.parse(sv);}catch(e){}
  const pin=_loginPin;
  if(pin===(s.supervisorPasscode||'0000')){_loginSuccess('supervisor','หัวหน้างาน');return;}
  const members=s.teamMembers||state.teamMembers;
  for(const k of Object.keys(members)){if(pin===members[k].passcode){_loginSuccess(k,members[k].name);return;}}
  _setDotState('error');
  const err=document.getElementById('login-error');
  if(err){err.style.display='block';err.style.animation='none';setTimeout(()=>{err.style.animation='loginShake 0.4s ease';},10);}
  addSecurityLog('login-fail','กรอก PIN ผิดพลาดจากหน้า Login');
  setTimeout(()=>{_loginPin='';_updateLoginDots();_hideLoginErr();},1200);
}
function _loginSuccess(roleKey,roleName){
  _setDotState('success');
  const badge=document.getElementById('login-role-badge');
  if(badge){badge.textContent='✓ ยืนยันตัวตนสำเร็จ: '+roleName.split(' ')[0];badge.style.display='block';}
  if(!sessionAuthenticated.includes(roleKey))sessionAuthenticated.push(roleKey);
  addSecurityLog('login-success','เข้าสู่ระบบสำเร็จ: '+roleName.split(' ')[0]);
  setTimeout(()=>{
    const scr=document.getElementById('login-screen');
    if(scr){scr.style.transition='opacity 0.5s ease,transform 0.5s ease';scr.style.opacity='0';scr.style.transform='scale(1.04)';
      setTimeout(()=>{scr.style.display='none';initApp(roleKey);},500);}
  },700);
}
document.addEventListener('keydown',e=>{
  const scr=document.getElementById('login-screen');
  if(!scr||scr.style.display==='none')return;
  if(e.key>='0'&&e.key<='9')loginPinPress(e.key);
  else if(e.key==='Backspace')loginPinDelete();
  else if(e.key==='Escape')loginPinClear();
});

/* ==========================================================================
   TEAMFLOW SYSTEM ENGINE - STATES, RENDERERS & EVENT HANDLERS (app.js)
   ========================================================================== */

// 1. Initial State & Configuration
let state = {
  tasks: [],
  teamMembers: {
    alice: { name: 'Alice (นักพัฒนา)', email: 'alice@teamflow.com', passcode: '1111', avatar: 'AL', color: 'bg-alice' },
    bob: { name: 'Bob (ดีไซเนอร์)', email: 'bob@teamflow.com', passcode: '2222', avatar: 'BO', color: 'bg-bob' },
    charlie: { name: 'Charlie (ฝ่ายการตลาด)', email: 'charlie@teamflow.com', passcode: '3333', avatar: 'CH', color: 'bg-charlie' }
  },
  supervisorPasscode: '0000',
  currentRole: 'supervisor', // 'supervisor', or key of any team member
  securityLogs: [],
  theme: 'dark'
};

// Default Mock Data to populate the application instantly
const mockTasks = [
  {
    id: "task-101",
    title: "ออกแบบ Database & API Endpoints",
    description: "วางแผนโครงสร้างตารางข้อมูลผู้ใช้ งาน และสถานะต่างๆ รวมถึงกำหนด API contract สำหรับเชื่อมต่อหน้าบ้าน",
    createdDate: "2026-05-25",
    deadline: "2026-05-30",
    assignee: "alice",
    status: "done"
  },
  {
    id: "task-102",
    title: "ทำหน้าจอ Login และ Dashboard หลัก",
    description: "พัฒนาหน้าจอสำหรับกรอกรหัสผ่านและหน้าจอภาพรวมสำหรับการสลับโปรไฟล์ พร้อมการเชื่อมต่อ UI ของระบบ",
    createdDate: "2026-05-28",
    deadline: "2026-06-04",
    assignee: "alice",
    status: "in-progress"
  },
  {
    id: "task-103",
    title: "แก้ไขบั๊กระบบ WebSocket ขาดการเชื่อมต่อบ่อย",
    description: "พบบั๊กที่ทำให้ฝั่งหน้าบ้านหลุดจากโฮสต์บ่อยครั้งตอนสัญญาณเน็ตตก ต้องเขียนกลไก auto-reconnect เพิ่ม",
    createdDate: "2026-06-01",
    deadline: "2026-06-02", // Close deadline (today)
    assignee: "alice",
    status: "blocked"
  },
  {
    id: "task-104",
    title: "ออกแบบ UI/UX คอนเซปต์ Glassmorphism",
    description: "ทำแบบร่างเว็บบอร์ดดีไซน์กึ่งโปร่งใส สะท้อนแสงและเงา มีสเปซปุ่มสลับบทบาทที่สวยงามพรีเมียมใน Figma",
    createdDate: "2026-05-20",
    deadline: "2026-05-28",
    assignee: "bob",
    status: "done"
  },
  {
    id: "task-105",
    title: "จัดทำ Assets โลโก้และภาพกราฟิกแบรนด์",
    description: "ออกแบบโลโก้ TeamFlow หลากหลายขนาดและภาพประกอบหน้า Landing Page ทั้งหมด ส่งตรวจความพรีเมียม",
    createdDate: "2026-05-30",
    deadline: "2026-06-03", // Near deadline (tomorrow)
    assignee: "bob",
    status: "review"
  },
  {
    id: "task-106",
    title: "ออกแบบโบรชัวร์ออนไลน์สำหรับงานสัมมนา",
    description: "จัดทำภาพอินโฟกราฟิกรายละเอียดงานสัมมนาเปิดตัวฟังก์ชันคัมบัง เพื่อนำไปโปรโมตบนช่องทางโซเชียลมีเดีย",
    createdDate: "2026-06-02",
    deadline: "2026-06-09",
    assignee: "bob",
    status: "todo"
  },
  {
    id: "task-107",
    title: "จัดเตรียมงานสัมมนาออนไลน์เปิดตัว TeamFlow UAT",
    description: "ประสานงานกับทีมซัพพอร์ต เช็กระบบห้องประชุมสตรีมมิ่งสด และทำโพยการพูดนำเสนอ 30 นาที",
    createdDate: "2026-05-20",
    deadline: "2026-05-31", // OVERDUE
    assignee: "charlie",
    status: "in-progress"
  },
  {
    id: "task-108",
    title: "เขียนบล็อกแชร์ทริคการเพิ่ม Productivity ด้วย Kanban",
    description: "เนื้อหาอธิบายวิธีย้ายการ์ด 5 คอลัมน์ (To Do -> In Progress -> Blocked -> Review -> Done) เพื่อเพิ่มพลังทำงานในทีม",
    createdDate: "2026-06-01",
    deadline: "2026-06-07",
    assignee: "charlie",
    status: "todo"
  }
];

const premiumGradients = [
  'linear-gradient(135deg, #ec4899, #f43f5e)', // Pink-rose (Alice default)
  'linear-gradient(135deg, #0ea5e9, #2563eb)', // Sky-blue (Bob default)
  'linear-gradient(135deg, #10b981, #059669)', // Emerald-green (Charlie default)
  'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Purple-violet
  'linear-gradient(135deg, #f59e0b, #d97706)', // Amber-orange
  'linear-gradient(135deg, #14b8a6, #0f766e)', // Teal
  'linear-gradient(135deg, #6366f1, #4f46e5)'  // Indigo
];

// Session-based authentication record (resets on page refresh for security!)
let sessionAuthenticated = ['supervisor'];

// 2. Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
  _showFbLoading('กำลังเชื่อมต่อ Firebase...');
  teamflowRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (data) {
      if (data.tasks)              state.tasks              = Object.values(data.tasks);
      if (data.teamMembers)        state.teamMembers        = data.teamMembers;
      if (data.supervisorPasscode) state.supervisorPasscode = data.supervisorPasscode;
      if (data.securityLogs)       state.securityLogs       = Array.isArray(data.securityLogs) ? data.securityLogs : Object.values(data.securityLogs);
      if (data.theme)              state.theme              = data.theme;
    } else {
      loadMockData();
    }
    _fbReady = true;
    _hideFbLoading();
    _setupFirebaseListeners();
  }).catch(err => {
    console.error('Firebase error:', err);
    _hideFbLoading();
    try { const s=localStorage.getItem('teamflow_state'); if(s) Object.assign(state,JSON.parse(s)); else loadMockData(); } catch(e){ loadMockData(); }
    showToast('ไม่สามารถเชื่อมต่อ Firebase — ใช้ข้อมูล Local แทน', 'error');
  });
});

function _showFbLoading(msg) {
  let el = document.getElementById('fb-loading');
  if (!el) {
    el = document.createElement('div'); el.id = 'fb-loading';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg-primary,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:Outfit,sans-serif;';
    el.innerHTML = `<div style="font-size:42px;color:#f97316;"><i class="fa-solid fa-layer-group"></i></div><div style="font-size:20px;font-weight:700;color:#f8fafc;">TeamFlow</div><div id="fb-loading-msg" style="font-size:13px;color:#64748b;"></div><div style="width:180px;height:3px;background:#1e293b;border-radius:99px;overflow:hidden;"><div style="height:100%;width:40%;background:linear-gradient(90deg,#f97316,#f59e0b);border-radius:99px;animation:fbBar 1.4s ease-in-out infinite;"></div></div><style>@keyframes fbBar{0%{transform:translateX(-100%)}100%{transform:translateX(600%)}}</style>`;
    document.body.appendChild(el);
  }
  const m = document.getElementById('fb-loading-msg');
  if (m) m.textContent = msg;
}
function _hideFbLoading() {
  const el = document.getElementById('fb-loading');
  if (el) { el.style.opacity='0'; el.style.transition='opacity 0.4s'; setTimeout(()=>el.remove(), 400); }
}

function _setupFirebaseListeners() {
  teamflowRef.child('tasks').on('value', snap => {
    if (_fbSyncing) return;
    const d = snap.val();
    if (d) { state.tasks = Object.values(d); renderCurrentView(); }
  });
  teamflowRef.child('teamMembers').on('value', snap => {
    if (_fbSyncing) return;
    const d = snap.val();
    if (d) { state.teamMembers = d; renderSidebarRoles(); populateAssigneeDropdowns(); renderCurrentView(); }
  });
  teamflowRef.child('securityLogs').on('value', snap => {
    if (_fbSyncing) return;
    const d = snap.val();
    if (d) { state.securityLogs = Array.isArray(d) ? d : Object.values(d); renderSecurityLogs(); }
  });
  teamflowRef.child('theme').on('value', snap => {
    if (_fbSyncing) return;
    const t = snap.val();
    if (t && t !== state.theme) { state.theme=t; document.documentElement.setAttribute('data-theme',t); updateThemeButtonUI(); }
  });
}

function initApp(loginRole) {
  // Load state from local storage or set defaults
  if (localStorage.getItem('teamflow_state')) {
    try {
      state = JSON.parse(localStorage.getItem('teamflow_state'));
      
      // Safeguard for legacy states without teamMembers in storage
      if (!state.teamMembers) {
        state.teamMembers = {
          alice: { name: 'Alice (นักพัฒนา)', email: 'alice@teamflow.com', passcode: '1111', avatar: 'AL', color: 'bg-alice' },
          bob: { name: 'Bob (ดีไซเนอร์)', email: 'bob@teamflow.com', passcode: '2222', avatar: 'BO', color: 'bg-bob' },
          charlie: { name: 'Charlie (ฝ่ายการตลาด)', email: 'charlie@teamflow.com', passcode: '3333', avatar: 'CH', color: 'bg-charlie' }
        };
      }
      
      if (!state.supervisorPasscode) {
        state.supervisorPasscode = '0000';
      }

      if (!state.securityLogs) {
        state.securityLogs = [
          { timestamp: new Date().toLocaleTimeString(), type: 'system', message: 'เริ่มต้นระบบความปลอดภัย TeamFlow สำเร็จ' }
        ];
      }
    } catch (e) {
      console.error("Error parsing local storage state, using defaults", e);
      loadMockData();
    }
  } else {
    loadMockData();
  }

  // Set system theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeButtonUI();

  // Apply default date to modal inputs
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('task-created-date').value = today;
  document.getElementById('task-deadline').value = today;

  // Render sidebar roles list & populate assignees dropdowns
  renderSidebarRoles();
  populateAssigneeDropdowns();

  // Render the current view
  renderCurrentView();
  
  // Set up event listeners for dragging within the Kanban Board
  setupDragAndDrop();
  if(loginRole)switchRoleDirectly(loginRole);
  setTimeout(()=>autoCheckDeadlineAlerts(),900);
}

function loadMockData() {
  state.tasks = [...mockTasks];
  state.teamMembers = {
    alice: { name: 'Alice (นักพัฒนา)', email: 'alice@teamflow.com', passcode: '1111', avatar: 'AL', color: 'bg-alice' },
    bob: { name: 'Bob (ดีไซเนอร์)', email: 'bob@teamflow.com', passcode: '2222', avatar: 'BO', color: 'bg-bob' },
    charlie: { name: 'Charlie (ฝ่ายการตลาด)', email: 'charlie@teamflow.com', passcode: '3333', avatar: 'CH', color: 'bg-charlie' }
  };
  state.supervisorPasscode = '0000';
  state.securityLogs = [
    { timestamp: new Date().toLocaleTimeString(), type: 'system', message: 'ระบบตรวจสอบการกู้คืนข้อมูลและเริ่มระบบรักษาความปลอดภัยเสร็จสมบูรณ์' }
  ];
  saveState();
}

function resetToMockData() {
  if (confirm("คุณต้องการรีเซ็ตข้อมูลทั้งหมดและดาวน์โหลดข้อมูลตัวอย่างใหม่ใช่หรือไม่? (ข้อมูลที่บันทึกไว้รวมถึงรหัสผ่านผู้ใช้งานจะถูกเขียนทับ)")) {
    loadMockData();
    sessionAuthenticated = ['supervisor']; // Lock everything again except supervisor
    renderSidebarRoles();
    populateAssigneeDropdowns();
    renderCurrentView();
    showToast("ดาวน์โหลดข้อมูลตัวอย่างสำเร็จ!");
  }
}

function saveState() {
  localStorage.setItem('teamflow_state', JSON.stringify(state));
  if (!_fbReady) return;
  _fbSyncing = true;
  const tasksObj = {};
  state.tasks.forEach(t => { tasksObj[t.id] = t; });
  teamflowRef.set({
    tasks: tasksObj,
    teamMembers: state.teamMembers,
    supervisorPasscode: state.supervisorPasscode,
    securityLogs: state.securityLogs,
    theme: state.theme
  }).then(() => { _fbSyncing = false; })
    .catch(err => { _fbSyncing = false; console.error('Firebase save error:', err); });
}

// 3. Security Logging Engine
function addSecurityLog(type, message, actor) {
  if (!state.securityLogs) state.securityLogs = [];
  const now = new Date();
  const timestamp = now.toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'});
  const actorName = actor || (state.currentRole==='supervisor' ? 'หัวหน้างาน' : (state.teamMembers[state.currentRole]||{name:state.currentRole}).name.split(' ')[0]);
  state.securityLogs.unshift({ timestamp, type, message, actor: actorName });
  if (state.securityLogs.length > 100) state.securityLogs.pop();
  saveState();
  renderSecurityLogs();
}

function renderSecurityLogs() {
  const container = document.getElementById('security-email-logs');
  if (!container) return;
  container.innerHTML = '';
  if (!state.securityLogs||!state.securityLogs.length) {
    container.innerHTML='<div style="text-align:center;color:var(--text-muted);font-style:italic;padding:10px;">ยังไม่มีประวัติ</div>';
    return;
  }
  state.securityLogs.forEach(log => {
    let icon='fa-info-circle', color='#64748b';
    if(log.type==='system')          {icon='fa-solid fa-gears';         color='#64748b';}
    else if(log.type==='login-success'){icon='fa-solid fa-circle-check'; color='#10b981';}
    else if(log.type==='login-fail')  {icon='fa-solid fa-circle-xmark'; color='#f43f5e';}
    else if(log.type==='email-alert') {icon='fa-solid fa-paper-plane';  color='#0ea5e9';}
    else if(log.type==='task-create') {icon='fa-solid fa-plus-circle';  color='#10b981';}
    else if(log.type==='task-edit')   {icon='fa-solid fa-pen-to-square';color='#f59e0b';}
    else if(log.type==='task-delete') {icon='fa-solid fa-trash-can';    color='#f43f5e';}
    else if(log.type==='task-move')   {icon='fa-solid fa-arrows-left-right';color='#8b5cf6';}
    else if(log.type==='line-alert')  {icon='fa-brands fa-line';        color='#06b6d4';}
    const actorTag = log.actor
      ? `<span style="font-size:9px;background:rgba(255,255,255,0.07);padding:1px 6px;border-radius:99px;color:#94a3b8;">${log.actor}</span>`
      : '';
    container.insertAdjacentHTML('beforeend',`
      <div style="padding:7px 10px;background:rgba(255,255,255,0.02);border-radius:6px;display:flex;align-items:flex-start;gap:8px;border-left:2px solid ${color};margin-bottom:4px;">
        <i class="${icon}" style="margin-top:2px;color:${color};flex-shrink:0;font-size:12px;"></i>
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
          <span style="font-weight:500;font-size:12px;color:var(--text-primary);line-height:1.3;">${log.message}</span>
          <div style="display:flex;align-items:center;gap:4px;">${actorTag}<span style="font-size:10px;color:var(--text-muted);">${log.timestamp}</span></div>
        </div>
      </div>`);
  });
}

// 4. View Management & Security Interceptor
function switchRole(roleName) {
  // Security validation: If this role is NOT yet authenticated in this session, trigger password prompt!
  if (!sessionAuthenticated.includes(roleName)) {
    openPasscodeModal(roleName);
    return;
  }
  
  // If already authenticated, proceed to switch view directly
  switchRoleDirectly(roleName);
}

function switchRoleDirectly(roleName) {
  state.currentRole = roleName;
  saveState();

  // Update Active Button in Sidebar
  document.querySelectorAll('.btn-role').forEach(btn => btn.classList.remove('active'));
  
  const activeBtnId = `btn-role-${roleName}`;
  const activeBtn = document.getElementById(activeBtnId);
  if (activeBtn) activeBtn.classList.add('active');

  // Manage Active View Wrapper
  const supervisorView = document.getElementById('supervisor-view');
  const kanbanView = document.getElementById('kanban-view');
  
  if (roleName === 'supervisor') {
    supervisorView.classList.add('active');
    kanbanView.classList.remove('active');
    
    // Update Header Content
    document.getElementById('view-title').textContent = "แดชบอร์ดภาพรวมของทีม";
    document.getElementById('view-subtitle').textContent = "รายงานสถานะและความคืบหน้าของงานทีมงานทั้งหมด";
    document.getElementById('btn-create-task').style.display = "inline-flex"; // Head can assign tasks
  } else {
    supervisorView.classList.remove('active');
    kanbanView.classList.add('active');
    
    const member = state.teamMembers[roleName] || { name: 'ไม่ระบุตัวตน', avatar: '?', color: 'bg-muted' };
    // Update Header Content
    document.getElementById('view-title').textContent = `บอร์ดจัดการงาน: ${member.name}`;
    document.getElementById('view-subtitle').textContent = "วางแผนงาน ลากวางเปลี่ยนสถานะงาน เพื่อประสิทธิภาพความคืบหน้าของทีม";
    document.getElementById('btn-create-task').style.display = "inline-flex"; // Members can also create tasks!
    
    // Update Kanban profile header
    const avatar = document.getElementById('kanban-member-avatar');
    avatar.textContent = member.avatar;
    
    let avatarStyle = '';
    let avatarClass = `member-avatarBig ${member.color || ''}`;
    if (member.gradient) {
      avatarStyle = `style="background: ${member.gradient};"`;
      avatarClass = 'member-avatarBig';
    }
    
    avatar.className = avatarClass;
    avatar.setAttribute('style', member.gradient ? `background: ${member.gradient};` : '');
    document.getElementById('kanban-member-title').textContent = `บอร์ดงานของ ${member.name}`;
  }

  // Close mobile sidebar if open
  document.getElementById('app-sidebar').classList.remove('mobile-active');

  // Render content
  renderCurrentView();
}

// Passcode Modal Controls
function openPasscodeModal(targetRole) {
  const modal = document.getElementById('passcode-modal');
  const promptText = document.getElementById('passcode-prompt-text');
  const targetInput = document.getElementById('passcode-target-role');
  const passwordInput = document.getElementById('passcode-input');
  const errorMsg = document.getElementById('passcode-error-msg');

  errorMsg.style.display = 'none';
  passwordInput.value = '';
  targetInput.value = targetRole;

  let displayName = "หัวหน้างาน";
  if (targetRole !== 'supervisor') {
    const member = state.teamMembers[targetRole];
    displayName = member ? member.name : "ทีมงาน";
  }

  promptText.innerHTML = `กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานในบทบาท: <strong>${displayName}</strong>`;
  modal.classList.add('active');
  passwordInput.focus();
}

function closePasscodeModal() {
  document.getElementById('passcode-modal').classList.remove('active');
}

function verifyPasscode(event) {
  event.preventDefault();
  const targetRole = document.getElementById('passcode-target-role').value;
  const enteredCode = document.getElementById('passcode-input').value.trim();
  const errorMsg = document.getElementById('passcode-error-msg');

  let correctCode = state.supervisorPasscode;
  let displayName = "หัวหน้างาน";

  if (targetRole !== 'supervisor') {
    const member = state.teamMembers[targetRole];
    correctCode = member ? member.passcode : '';
    displayName = member ? member.name : "ทีมงาน";
  }

  if (enteredCode === correctCode) {
    // Auth Success!
    sessionAuthenticated.push(targetRole);
    closePasscodeModal();
    switchRoleDirectly(targetRole);
    addSecurityLog('login-success', `เข้าสู่ระบบสำเร็จในบทบาท: ${displayName.split(' ')[0]}`);
    showToast(`ยินดีต้อนรับเข้าสู่ระบบ: ${displayName.split(' ')[0]}`);
  } else {
    // Auth Fail
    errorMsg.style.display = 'block';
    addSecurityLog('login-fail', `พยายามล็อคอินที่ผิดพลาดในบทบาท: ${displayName.split(' ')[0]}`);
    showToast("รหัสผ่านไม่ถูกต้อง!", "error");
    
    // UI Shake Animation Effect
    const container = document.querySelector('#passcode-modal .modal-container');
    container.style.animation = 'none';
    setTimeout(() => {
      container.style.animation = 'shakeEffect 0.4s ease';
    }, 10);
  }
}

// Add Shake effect dynamically inside CSS via custom animation if not declared
if (!document.getElementById('custom-shake-animation')) {
  const style = document.createElement('style');
  style.id = 'custom-shake-animation';
  style.innerHTML = `
    @keyframes shakeEffect {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
  `;
  document.head.appendChild(style);
}

function renderCurrentView() {
  if (state.currentRole === 'supervisor') {
    renderSupervisorDashboard();
  } else {
    renderKanbanBoard();
  }
}

// Mobile sidebar drawer controller
function toggleMobileSidebar() {
  document.getElementById('app-sidebar').classList.toggle('mobile-active');
}

// Theme management
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  saveState();
  updateThemeButtonUI();
}

function updateThemeButtonUI() {
  const btn = document.getElementById('btn-theme-toggle');
  const icon = btn.querySelector('.theme-icon');
  const text = btn.querySelector('.theme-text');
  
  if (state.theme === 'dark') {
    icon.className = "fa-solid fa-sun theme-icon";
    text.textContent = "โหมดกลางวัน";
  } else {
    icon.className = "fa-solid fa-moon theme-icon";
    text.textContent = "โหมดกลางคืน";
  }
}

// Dynamic Sidebar Roles List Renderer
function renderSidebarRoles() {
  const container = document.getElementById('dynamic-member-roles');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(state.teamMembers).forEach(key => {
    const member = state.teamMembers[key];
    const isActive = state.currentRole === key ? 'active' : '';
    
    let avatarStyle = '';
    let avatarClass = `role-avatar ${member.color || ''}`;
    if (member.gradient) {
      avatarStyle = `style="background: ${member.gradient};"`;
      avatarClass = 'role-avatar';
    }

    // Lock status icon
    const isLocked = !sessionAuthenticated.includes(key);
    const lockIcon = isLocked ? '<i class="fa-solid fa-lock" style="position: absolute; bottom: 4px; right: 4px; font-size: 8px; background: rgba(0,0,0,0.6); padding: 2px; border-radius: 50%; color: #94a3b8;"></i>' : '';

    const btnHTML = `
      <button id="btn-role-${key}" class="btn-role ${isActive}" onclick="switchRole('${key}')" style="position: relative;">
        <span class="${avatarClass}" ${avatarStyle}>${member.avatar}${lockIcon}</span>
        <div class="role-info">
          <span class="role-name">${member.name.split(' ')[0]}</span>
          <span class="role-desc">${member.name.includes('(') ? member.name.substring(member.name.indexOf('(')+1, member.name.indexOf(')')) : 'ทีมงาน'}</span>
        </div>
      </button>
    `;
    container.insertAdjacentHTML('beforeend', btnHTML);
  });
}

// Dynamic Dropdown Lists Populator
function populateAssigneeDropdowns() {
  const filterSelect = document.getElementById('filter-assignee');
  const taskSelect = document.getElementById('task-assignee');

  if (filterSelect) {
    const currentFilterVal = filterSelect.value || 'all';
    filterSelect.innerHTML = '<option value="all">ทุกคน</option>';
    Object.keys(state.teamMembers).forEach(key => {
      const member = state.teamMembers[key];
      filterSelect.insertAdjacentHTML('beforeend', `<option value="${key}">${member.name.split(' ')[0]}</option>`);
    });
    
    // Add "Unassigned" fallback option in filters
    filterSelect.insertAdjacentHTML('beforeend', `<option value="unassigned">ไม่ระบุตัวตน</option>`);

    filterSelect.value = currentFilterVal;
    // Safeguard if previous selected value was deleted
    if (filterSelect.selectedIndex === -1) {
      filterSelect.value = 'all';
    }
  }

  if (taskSelect) {
    const currentTaskVal = taskSelect.value || '';
    taskSelect.innerHTML = '';
    Object.keys(state.teamMembers).forEach(key => {
      const member = state.teamMembers[key];
      taskSelect.insertAdjacentHTML('beforeend', `<option value="${key}">${member.name}</option>`);
    });
    
    if (currentTaskVal && state.teamMembers[currentTaskVal]) {
      taskSelect.value = currentTaskVal;
    }
  }
}

// 4. Helper Function: Calculate Deadlines & Urgency
function getDeadlineUrgency(deadlineStr, status) {
  if (status === 'done') {
    return { label: 'เสร็จสิ้น', class: 'urgency-normal', severity: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `เลยกำหนด ${Math.abs(diffDays)} วัน`, class: 'urgency-overdue', severity: 3 };
  } else if (diffDays === 0) {
    return { label: 'กำหนดส่งวันนี้!', class: 'urgency-warning', severity: 2 };
  } else if (diffDays === 1) {
    return { label: 'กำหนดส่งพรุ่งนี้', class: 'urgency-warning', severity: 2 };
  } else if (diffDays <= 3) {
    return { label: `เหลืออีก ${diffDays} วัน`, class: 'urgency-warning', severity: 1 };
  } else {
    return { label: `ครบกำหนด ${deadlineStr}`, class: 'urgency-normal', severity: 0 };
  }
}

// 5. Supervisor View Render Engine
function renderSupervisorDashboard() {
  const tasks = state.tasks;
  
  // Calculate general statistics
  const total = tasks.length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const progress = tasks.filter(t => t.status === 'in-progress').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const review = tasks.filter(t => t.status === 'review').length;
  const done = tasks.filter(t => t.status === 'done').length;

  // Set general statistics HTML
  const _set = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  _set('stat-total-tasks', total);
  _set('stat-todo-tasks', todo);
  _set('stat-progress-tasks', progress);
  _set('stat-blocked-tasks', blocked);
  _set('stat-review-tasks', review);
  _set('stat-done-tasks', done);


  // Render urgent tasks panel
  renderUrgentTasks(tasks);

  // Render security logs inside the left panel
  renderSecurityLogs();

  // Render global tasks table with filtering
  applyFilters();
}

function renderTeamProgress(tasks) {
  const progressListContainer = document.getElementById('team-progress-list');
  progressListContainer.innerHTML = '';

  Object.keys(state.teamMembers).forEach(memberKey => {
    const member = state.teamMembers[memberKey];
    const memberTasks = tasks.filter(t => t.assignee === memberKey);
    const totalMemberTasks = memberTasks.length;
    const completedTasks = memberTasks.filter(t => t.status === 'done').length;

    const percentage = totalMemberTasks > 0 ? Math.round((completedTasks / totalMemberTasks) * 100) : 0;

    let avatarStyle = '';
    let avatarClass = `progress-member-avatar ${member.color || ''}`;
    if (member.gradient) {
      avatarStyle = `style="background: ${member.gradient};"`;
      avatarClass = 'progress-member-avatar';
    }

    const progressHTML = `
      <div class="progress-item">
        <div class="progress-item-header">
          <div class="progress-member-info">
            <div class="${avatarClass}" ${avatarStyle}>${member.avatar}</div>
            <span class="progress-member-name">${member.name}</span>
          </div>
          <span class="progress-percentage">${percentage}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-stats-numbers">
          เสร็จสิ้น ${completedTasks}/${totalMemberTasks} งาน
        </div>
      </div>
    `;
    progressListContainer.insertAdjacentHTML('beforeend', progressHTML);
  });
}

function renderUrgentTasks(tasks) {
  const tbody = document.getElementById('urgent-tasks-tbody');
  tbody.innerHTML = '';

  // Get active tasks (non-done) that are overdue or close to deadline (severity >= 1)
  const urgentTasks = tasks
    .filter(t => t.status !== 'done')
    .map(t => {
      return { ...t, urgency: getDeadlineUrgency(t.deadline, t.status) };
    })
    .filter(t => t.urgency.severity >= 1)
    .sort((a, b) => b.urgency.severity - a.urgency.severity); // Show most severe first

  if (urgentTasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="text-align: center; color: var(--text-muted); padding: 30px;">
          <i class="fa-solid fa-circle-check" style="font-size: 24px; color: var(--status-done); margin-bottom: 10px; display: block;"></i>
          ไม่มีงานเร่งด่วนหรือเลยกำหนดในขณะนี้ สมาชิกทุกคนกำลังทำได้ดี!
        </td>
      </tr>
    `;
    return;
  }

  urgentTasks.forEach(task => {
    const member = state.teamMembers[task.assignee] || { name: 'ไม่ระบุตัวตน', avatar: '?', color: 'bg-muted' };
    const statusText = getStatusThai(task.status);
    const statusClass = getStatusClass(task.status);

    let avatarStyle = '';
    let avatarClass = `badge-avatar ${member.color || ''}`;
    if (member.gradient) {
      avatarStyle = `style="background: ${member.gradient};"`;
      avatarClass = 'badge-avatar';
    }

    // Trigger Mail icon if email exists and task is urgent
    const isUrgentForMail = task.status !== 'done' && (task.urgency.severity >= 2 || task.urgency.label.includes('เหลืออีก 1 วัน'));
    const mailIconHTML = isUrgentForMail && member.email
      ? `<button class="action-icon-btn btn-edit" title="ส่งอีเมลเตือนกำหนดส่งสะกิดลูกทีม" onclick="sendEmailAlert('${task.id}')" style="margin-left: 8px; color: #f59e0b; border-color: rgba(245, 158, 11, 0.2);">
          <i class="fa-solid fa-paper-plane"></i>
         </button>`
      : '';

    const rowHTML = `
      <tr>
        <td class="font-semibold">${task.title}</td>
        <td>
          <div class="user-badge">
            <span class="${avatarClass}" ${avatarStyle}>${member.avatar}</span>
            <span class="badge-name">${member.name.split(' ')[0]}</span>
          </div>
        </td>
        <td>${task.deadline}</td>
        <td>
          <span class="status-pill ${statusClass}">${statusText}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center;">
            <span class="urgency-badge ${task.urgency.class}">
              <i class="fa-solid fa-triangle-exclamation"></i>
              ${task.urgency.label}
            </span>
            ${mailIconHTML}
          </div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', rowHTML);
  });
}

function applyFilters() {
  const searchVal = document.getElementById('filter-search').value.toLowerCase();
  const assigneeVal = document.getElementById('filter-assignee').value;
  const statusVal = document.getElementById('filter-status').value;

  const filteredTasks = state.tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchVal) || task.description.toLowerCase().includes(searchVal);
    const matchesAssignee = assigneeVal === 'all' || task.assignee === assigneeVal;
    const matchesStatus = statusVal === 'all' || task.status === statusVal;
    return matchesSearch && matchesAssignee && matchesStatus;
  });

  renderGlobalTasksTable(filteredTasks);
}

function filterByDashboardStatus(status) {
  const filterSelect = document.getElementById('filter-status');
  if (filterSelect) {
    filterSelect.value = status;
    applyFilters();
    
    // Smooth scroll and highlight focus on the Global Tasks panel
    const panel = document.querySelector('.global-tasks-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Visual feedback: soft glow pulse highlight
      panel.classList.add('glowing-highlight');
      setTimeout(() => {
        panel.classList.remove('glowing-highlight');
      }, 1800);
      
      const statusText = status === 'all' ? 'งานทั้งหมด' : getStatusThai(status);
      showToast(`กรองตารางงานตามสถานะ "${statusText}" สำเร็จ!`);
    }
  }
}

function renderGlobalTasksTable(filteredTasks) {
  const tbody = document.getElementById('global-tasks-tbody');
  tbody.innerHTML = '';

  if (filteredTasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-folder-open" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
          ไม่พบรายการงานตามเงื่อนไขที่กำหนด
        </td>
      </tr>
    `;
    return;
  }

  filteredTasks.forEach(task => {
    const member = state.teamMembers[task.assignee] || { name: 'ไม่ระบุตัวตน', avatar: '?', color: 'bg-muted' };
    const statusText = getStatusThai(task.status);
    const statusClass = getStatusClass(task.status);
    const urgency = getDeadlineUrgency(task.deadline, task.status);
    
    let urgencyBadgeHTML = '';
    if (task.status !== 'done' && urgency.severity > 0) {
      urgencyBadgeHTML = `
        <span class="urgency-badge ${urgency.class}" style="margin-top: 4px; display: inline-flex;">
          ${urgency.label}
        </span>
      `;
    }

    let avatarStyle = '';
    let avatarClass = `badge-avatar ${member.color || ''}`;
    if (member.gradient) {
      avatarStyle = `style="background: ${member.gradient};"`;
      avatarClass = 'badge-avatar';
    }

    // Trigger Mail icon for warnings
    const isUrgentForMail = task.status !== 'done' && (urgency.severity >= 2 || urgency.label.includes('เหลืออีก 1 วัน'));
    const mailIconHTML = isUrgentForMail && member.email
      ? `<button class="action-icon-btn btn-edit" title="ส่งอีเมลเตือนงานสะกิดทางเมล" onclick="sendEmailAlert('${task.id}')" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.2);">
          <i class="fa-solid fa-paper-plane"></i>
         </button>`
      : '';

    const rowHTML = `
      <tr>
        <td>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600;">${task.title}</span>
            <span style="font-size: 12px; color: var(--text-secondary); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${task.description || 'ไม่มีรายละเอียด'}
            </span>
          </div>
        </td>
        <td>
          <div class="user-badge">
            <span class="${avatarClass}" ${avatarStyle}>${member.avatar}</span>
            <span class="badge-name">${member.name}</span>
          </div>
        </td>
        <td>${task.createdDate}</td>
        <td>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <span>${task.deadline}</span>
            ${urgencyBadgeHTML}
          </div>
        </td>
        <td>
          <span class="status-pill ${statusClass}">${statusText}</span>
        </td>
        <td class="text-right">
          ${mailIconHTML}
          <button class="action-icon-btn btn-edit" title="แก้ไขงาน" onclick="openTaskModal('${task.id}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="action-icon-btn btn-delete" title="ลบงาน" onclick="deleteTask('${task.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', rowHTML);
  });
}

// Status converters to Thai & CSS style classes
function getStatusThai(status) {
  switch (status) {
    case 'todo': return 'รอดำเนินการ';
    case 'blocked': return 'มีปัญหา';
    case 'done': return 'เสร็จสิ้น';
    default: return status;
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'todo': return 'p-todo';
    case 'blocked': return 'p-blocked';
    case 'done': return 'p-done';
    default: return '';
  }
}

// 6. Kanban Board Rendering Engine
function renderKanbanBoard() {
  const currentRole = state.currentRole;
  const tasks = state.tasks.filter(t => t.assignee === currentRole);

  // Set Mini statistics bar
  document.getElementById('mini-stat-my-tasks').textContent = `งานของฉัน: ${tasks.length}`;
  document.getElementById('mini-stat-my-done').textContent = `เสร็จสิ้น: ${tasks.filter(t => t.status === 'done').length}`;

  // Clear columns
  const columnIds = ['column-todo', 'column-in-progress', 'column-blocked', 'column-review', 'column-done'];
  const columnsData = { 'todo': [], 'in-progress': [], 'blocked': [], 'review': [], 'done': [] };

  columnIds.forEach(id => {
    document.getElementById(id).innerHTML = '';
  });

  // Group tasks by status
  tasks.forEach(task => {
    if (columnsData[task.status]) {
      columnsData[task.status].push(task);
    }
  });

  // Update counts and render cards in columns
  Object.keys(columnsData).forEach(status => {
    // Set Header count pill
    document.getElementById(`count-${status}`).textContent = columnsData[status].length;

    const columnCardsContainer = document.getElementById(`column-${status}`);
    const columnTasks = columnsData[status];

    if (columnTasks.length === 0) {
      columnCardsContainer.innerHTML = `
        <div class="column-empty-state" style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 30px 10px; border: 1px dashed var(--border-color); border-radius: var(--border-radius-md); background: rgba(0,0,0,0.05);">
          ลากงานมาวางที่นี่
        </div>
      `;
      return;
    }

    columnTasks.forEach(task => {
      const urgency = getDeadlineUrgency(task.deadline, task.status);
      
      let urgencyBadgeHTML = '';
      let cardAlertBorderClass = '';
      if (task.status !== 'done' && urgency.severity > 0) {
        urgencyBadgeHTML = `
          <span class="urgency-badge ${urgency.class}" style="font-size: 10px;">
            <i class="fa-solid fa-clock"></i> ${urgency.label}
          </span>
        `;
        if (urgency.severity === 3) {
          cardAlertBorderClass = 'style="border-left: 4px solid var(--status-blocked);"';
        } else if (urgency.severity === 2 || urgency.severity === 1) {
          cardAlertBorderClass = 'style="border-left: 4px solid var(--status-in-progress);"';
        }
      }

      // Email warning icon inside card for quick mail dispatches
      const member = state.teamMembers[task.assignee];
      const showCardMailBtn = task.status !== 'done' && urgency.severity >= 1 && member && member.email;
      const cardMailBtnHTML = showCardMailBtn
        ? `<button class="action-icon-btn btn-edit" title="ส่งอีเมลเตือนงานด่วนสะกิดตัวเอง/เพื่อน" onclick="sendEmailAlert('${task.id}')" style="width: 24px; height: 24px; font-size: 10px; color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); margin-left: 4px;">
            <i class="fa-solid fa-paper-plane"></i>
           </button>`
        : '';

      const cardHTML = `
        <div class="task-card" 
             id="${task.id}" 
             draggable="true" 
             ondragstart="dragStart(event)" 
             ondragend="dragEnd(event)"
             ${cardAlertBorderClass}>
          
          <div class="card-tag-wrapper">
            <span class="status-pill ${getStatusClass(task.status)}" style="font-size: 10px; padding: 2px 8px;">
              ${getStatusThai(task.status)}
            </span>
            ${urgencyBadgeHTML}
          </div>
          
          <h4 class="card-title">${task.title}</h4>
          <p class="card-desc">${task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
          
          <div class="card-footer">
            <div class="card-date-info">
              <i class="fa-regular fa-calendar-days"></i>
              <span>เดดไลน์: ${task.deadline}</span>
            </div>
            
            <div class="card-actions-wrapper">
              ${cardMailBtnHTML}
              <button class="action-icon-btn btn-edit" title="แก้ไขงาน" onclick="openTaskModal('${task.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="action-icon-btn btn-delete" title="ลบงาน" onclick="deleteTask('${task.id}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          
        </div>
      `;
      columnCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
  });
}

// 7. Drag & Drop Event Engine
function setupDragAndDrop() {
  // Global drag listeners can also be configured here, but standard attributes on elements handle most of it.
}

function dragStart(event) {
  event.dataTransfer.setData("text/plain", event.target.id);
  event.target.classList.add("dragging");
}

function dragEnd(event) {
  event.target.classList.remove("dragging");
}

function allowDrop(event) {
  event.preventDefault();
}

function dragEnter(event) {
  event.preventDefault();
  const column = event.currentTarget;
  column.classList.add("drag-over");
}

function dragLeave(event) {
  const column = event.currentTarget;
  column.classList.remove("drag-over");
}

function drop(event) {
  event.preventDefault();
  const column = event.currentTarget;
  column.classList.remove("drag-over");

  const taskId = event.dataTransfer.getData("text/plain");
  const newStatus = column.getAttribute("data-status");

  // Find task and update its status
  const taskIndex = state.tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    const task = state.tasks[taskIndex];
    
    // Ensure team members can only edit tasks assigned to themselves
    if (state.currentRole !== 'supervisor' && task.assignee !== state.currentRole) {
      showToast("คุณไม่สามารถย้ายงานของคนอื่นได้!", "error");
      return;
    }

    if (task.status !== newStatus) {
      const _os=task.status;
      task.status = newStatus;
      addSecurityLog("task-move",`ย้าย "${task.title.substring(0,22)}" (${getStatusThai(_os)}→${getStatusThai(newStatus)})`);
      saveState();
      renderCurrentView();
      showToast(`อัปเดตสถานะเป็น "${getStatusThai(newStatus)}" แล้ว!`);
    }
  }
}

// 8. Add/Edit Task Modal Dialog Operations
function openTaskModal(taskId = null) {
  const modal = document.getElementById('task-modal');
  const modalTitle = document.getElementById('modal-title');
  const taskForm = document.getElementById('task-form');

  // Reset form
  taskForm.reset();
  document.getElementById('task-id').value = '';

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('task-created-date').value = today;

  const assigneeSelect = document.getElementById('task-assignee');
  const statusSelect = document.getElementById('task-status');

  // Populate first to make sure options are fresh
  populateAssigneeDropdowns();

  if (state.currentRole !== 'supervisor') {
    // If a normal member opens it, auto-lock/auto-select assignee to themselves
    assigneeSelect.value = state.currentRole;
    assigneeSelect.disabled = true;
  } else {
    assigneeSelect.disabled = false;
    // Default to the first available member in the team
    const firstMemberKey = Object.keys(state.teamMembers)[0] || '';
    assigneeSelect.value = firstMemberKey;
  }

  if (taskId) {
    // EDIT MODE
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    modalTitle.textContent = "แก้ไขรายละเอียดงาน";
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description;
    document.getElementById('task-created-date').value = task.createdDate;
    document.getElementById('task-deadline').value = task.deadline;
    
    assigneeSelect.value = task.assignee;
    statusSelect.value = task.status;
    document.getElementById('task-repeat').value = task.repeat || 'none';
  } else {
    // NEW MODE
    modalTitle.textContent = "สร้างงานใหม่";
    statusSelect.value = 'todo';
    document.getElementById('task-deadline').value = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]; // Default: 3 days in the future
    document.getElementById('task-repeat').value = 'none';
  }

  modal.classList.add('active');
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('active');
}

function saveTask(event) {
  event.preventDefault();

  const taskId = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const createdDate = document.getElementById('task-created-date').value;
  const deadline = document.getElementById('task-deadline').value;
  
  // Make sure we enable assignee temporarily to read its value if it was disabled
  const assigneeSelect = document.getElementById('task-assignee');
  const assignee = assigneeSelect.value;
  const status = document.getElementById('task-status').value;
  const repeat = document.getElementById('task-repeat').value || 'none';

  if (!title) {
    showToast("กรุณากรอกชื่องาน", "error");
    return;
  }

  if (new Date(deadline) < new Date(createdDate)) {
    if (!confirm("วันที่กำหนดส่ง (Deadline) ย้อนหลังก่อนวันที่เริ่มงาน มั่นใจว่าต้องการบันทึกข้อมูลใช่หรือไม่?")) {
      return;
    }
  }

  if (taskId) {
    // Update existing task
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const oldStatus = state.tasks[taskIndex].status;
      
      state.tasks[taskIndex] = {
        ...state.tasks[taskIndex],
        title,
        description,
        createdDate,
        deadline,
        assignee,
        status,
        repeat
      };
      
      addSecurityLog("task-edit",`แก้ไขงาน "${title}" (${getStatusThai(oldStatus)}→${getStatusThai(status)})`);
      showToast("แก้ไขข้อมูลงานเรียบร้อยแล้ว!");
      
      if (status === 'done' && oldStatus !== 'done') {
        handleRepeatingTask(state.tasks[taskIndex]);
      }
    }
  } else {
    // Create new task
    const newTask = {
      id: "task-" + Date.now(),
      title,
      description,
      createdDate,
      deadline,
      assignee,
      status,
      repeat
    };
    state.tasks.push(newTask);
    const _an=(state.teamMembers[assignee]||{name:"ไม่ระบุ"}).name.split(" ")[0];
    addSecurityLog("task-create",`สร้างงาน "${title}" → มอบหมายให้ ${_an}`);
    showToast("สร้างงานใหม่และมอบหมายสำเร็จ!");
    
    if (status === 'done') {
      handleRepeatingTask(newTask);
    }
  }

  saveState();
  closeTaskModal();
  renderCurrentView();
}

function deleteTask(taskId) {
  // Check authorization
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (state.currentRole !== 'supervisor' && task.assignee !== state.currentRole) {
    showToast("คุณไม่สามารถลบงานของเพื่อนร่วมทีมคนอื่นได้!", "error");
    return;
  }

  if (confirm(`คุณต้องการลบงาน "${task.title}" ใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)`)) {
    const _dt=task.title;
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    addSecurityLog("task-delete",`ลบงาน "${_dt}"`);
    saveState();
    renderCurrentView();
    showToast("ลบงานสำเร็จ!");
  }
}

// ==========================================================================
// 8.5 NEW FEATURE: TEAM MEMBERS DYNAMIC MANAGEMENT
// ==========================================================================
function openTeamModal() {
  const modal = document.getElementById('team-modal');
  renderExistingMembersList();
  modal.classList.add('active');
}

function closeTeamModal() {
  document.getElementById('team-modal').classList.remove('active');
}

function renderExistingMembersList() {
  const container = document.getElementById('existing-members-list');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(state.teamMembers).forEach(key => {
    const member = state.teamMembers[key];
    
    let avatarStyle = '';
    let avatarClass = `progress-member-avatar ${member.color || ''}`;
    if (member.gradient) {
      avatarStyle = `style="background: ${member.gradient}; margin-right: 0;"`;
      avatarClass = 'progress-member-avatar';
    }

    const rowHTML = `
      <div class="member-manage-row" style="display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: var(--border-radius-md);">
        <span class="${avatarClass}" ${avatarStyle}>${member.avatar}</span>
        
        <div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1;">
          <input type="text" value="${member.name}" onchange="editTeamMemberField('${key}', 'name', this.value)" class="form-input" style="padding: 4px 8px; font-size: 13px;" placeholder="ชื่อ...">
          <div style="display: flex; gap: 4px;">
            <input type="email" value="${member.email || ''}" onchange="editTeamMemberField('${key}', 'email', this.value)" class="form-input" style="padding: 4px 8px; font-size: 11px; flex: 2;" placeholder="อีเมล...">
            <input type="text" value="${member.passcode || ''}" onchange="editTeamMemberField('${key}', 'passcode', this.value)" class="form-input" style="padding: 4px 8px; font-size: 11px; flex: 1; text-align: center;" placeholder="รหัส...">
          </div>
        </div>
        
        <button type="button" class="action-icon-btn btn-delete" title="ลบทีมงาน" onclick="deleteTeamMember('${key}')" style="flex-shrink: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
  });
}

function addTeamMember(event) {
  event.preventDefault();
  const nameInput = document.getElementById('new-member-name');
  const passcodeInput = document.getElementById('new-member-passcode');
  const emailInput = document.getElementById('new-member-email');

  const name = nameInput.value.trim();
  const passcode = passcodeInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || !passcode || !email) return;

  // Check if name already exists
  const exists = Object.values(state.teamMembers).some(m => m.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    showToast("ชื่อสมาชิกนี้มีอยู่ในระบบแล้ว!", "error");
    return;
  }

  // Create unique key
  const key = "member-" + Date.now();
  
  // Calculate initials (avatar)
  let avatar = name.slice(0, 2).toUpperCase();
  const words = name.split(/[ \(\)]+/).filter(Boolean);
  if (words.length > 1) {
    avatar = (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase();
  } else {
    avatar = name.slice(0, 2).toUpperCase();
  }

  // Pick a random gradient
  const randomGradient = premiumGradients[Math.floor(Math.random() * premiumGradients.length)];

  state.teamMembers[key] = {
    name: name,
    avatar: avatar.substring(0, 2),
    email: email,
    passcode: passcode,
    gradient: randomGradient
  };

  // Clear inputs
  nameInput.value = '';
  passcodeInput.value = '';
  emailInput.value = '';

  saveState();
  renderSidebarRoles();
  populateAssigneeDropdowns();
  renderExistingMembersList();
  
  addSecurityLog('system', `เพิ่มสมาชิกใหม่ "${name.split(' ')[0]}" พร้อมรหัสผ่านสำเร็จ`);

  if (state.currentRole === 'supervisor') {
    renderSupervisorDashboard();
  } else {
    renderKanbanBoard();
  }
  
  showToast(`เพิ่มสมาชิก "${name}" สำเร็จ!`);
}

function editTeamMemberField(key, field, value) {
  value = value.trim();
  if (!value) {
    showToast("ค่าข้อมูลห้ามเป็นค่าว่าง!", "error");
    renderExistingMembersList();
    return;
  }

  const oldVal = state.teamMembers[key][field];
  state.teamMembers[key][field] = value;
  
  // If editing name, recalculate initials
  if (field === 'name') {
    let avatar = value.slice(0, 2).toUpperCase();
    const words = value.split(/[ \(\)]+/).filter(Boolean);
    if (words.length > 1) {
      avatar = (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase();
    }
    state.teamMembers[key].avatar = avatar.substring(0, 2);
  }

  saveState();
  renderSidebarRoles();
  populateAssigneeDropdowns();
  
  addSecurityLog('system', `แก้ไขข้อมูลฟิลด์ [${field}] ของ "${state.teamMembers[key].name.split(' ')[0]}"`);

  if (state.currentRole === key) {
    // If we edited the active role, reload view headers
    switchRoleDirectly(key);
  } else {
    renderCurrentView();
  }

  showToast(`แก้ไขข้อมูลสำเร็จ`);
}

function deleteTeamMember(key) {
  const member = state.teamMembers[key];
  if (!member) return;

  if (Object.keys(state.teamMembers).length <= 1) {
    showToast("ต้องมีสมาชิกในทีมอย่างน้อย 1 คนเพื่อบริหารงาน!", "error");
    return;
  }

  if (confirm(`คุณแน่ใจว่าต้องการลบสมาชิก "${member.name}" หรือไม่?\n\n* การทำแบบนี้จะส่งผลให้งานทั้งหมดที่เขารับผิดชอบอยู่ ถูกเปลี่ยนเป็นสถานะ 'ไม่ระบุตัวตน' เพื่อป้องกันไม่ให้ข้อมูลสูญหาย`)) {
    // Update tasks assignee to unassigned fallback
    state.tasks.forEach(task => {
      if (task.assignee === key) {
        task.assignee = 'unassigned';
      }
    });

    // If the active role was this deleted member, switch to supervisor view
    const wasActiveRole = state.currentRole === key;

    delete state.teamMembers[key];
    
    // Also remove from session Authenticated lists
    sessionAuthenticated = sessionAuthenticated.filter(r => r !== key);

    saveState();
    renderSidebarRoles();
    populateAssigneeDropdowns();
    renderExistingMembersList();

    addSecurityLog('system', `ลบสมาชิก "${member.name.split(' ')[0]}" ออกจากกลุ่มปฏิบัติงาน`);

    if (wasActiveRole) {
      switchRoleDirectly('supervisor');
    } else {
      renderCurrentView();
    }
    
    showToast("ลบสมาชิกและย้ายงานไปเป็น 'ไม่ระบุตัวตน' สำเร็จ");
  }
}

// ==========================================================================
// 8.8 NEW FEATURE: DYNAMIC EMAIL ALERTS (mailto:)
// ==========================================================================
function sendEmailAlert(taskId) {
  const task = state.tasks.find(t => t.id === taskId); if(!task) return;
  const member = state.teamMembers[task.assignee];
  if(!member||!member.email){showToast("ไม่พบอีเมล — ตั้งค่าได้ที่ 'จัดการทีมงาน'","error");return;}
  const urg = getDeadlineUrgency(task.deadline,task.status);
  const subject=`[TeamFlow] แจ้งเตือน: "${task.title}" — ${urg.label}`;
  const body=`สวัสดีครับ/ค่ะ คุณ ${member.name.split(' ')[0]},

หัวหน้างานส่งการแจ้งเตือนด้วยตนเอง

📋 รายละเอียดงาน:
━━━━━━━━━━━━━━━━━━━━━━━━━
• ชื่องาน    : ${task.title}
• รายละเอียด : ${task.description||'ไม่มีรายละเอียด'}
• กำหนดส่ง   : ${task.deadline}
• สถานะ      : ${getStatusThai(task.status)}
• ความเร่งด่วน: ${urg.label}
━━━━━━━━━━━━━━━━━━━━━━━━━

กรุณาเข้าสู่ระบบ TeamFlow และอัพเดทสถานะงานด้วยนะครับ/ค่ะ

ขอบคุณครับ/ค่ะ,
TeamFlow`;
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(member.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,'_blank');
  addSecurityLog('email-alert',`ส่ง Gmail แจ้งเตือน "${task.title.substring(0,20)}..." → ${member.email}`);
  showToast(`เปิด Gmail แจ้งเตือน ${member.name.split(' ')[0]} แล้ว!`);
}

// --------------------------------------------------------------------------
// LINE SHARING
// --------------------------------------------------------------------------




function autoCheckDeadlineAlerts() {
  if(state.currentRole!=='supervisor')return;
  const today=new Date();today.setHours(0,0,0,0);
  const todayStr=today.toISOString().split('T')[0];
  if(localStorage.getItem('teamflow_last_auto_alert')===todayStr)return;
  const urgent=state.tasks.filter(t=>{
    if(t.status==='done')return false;
    const d=new Date(t.deadline);d.setHours(0,0,0,0);
    return Math.ceil((d-today)/86400000)<=3;
  });
  if(!urgent.length)return;
  // แสดง toast แจ้งเตือน
  localStorage.setItem('teamflow_last_auto_alert',todayStr);
  showToast(`⚠️ มี ${urgent.length} งานใกล้ถึง Deadline! กดปุ่ม Line เพื่อแจ้งเตือนทีม`);
  addSecurityLog('system',`ระบบตรวจพบ ${urgent.length} งานใกล้ Deadline`);
}

// ==========================================================================
// 8.9 NEW FEATURE: TASK RECURRENCE ENGINE
// ==========================================================================
function getNextRecurrenceDates(deadlineStr, repeatType) {
  const oldDeadline = new Date(deadlineStr);
  const newCreated = new Date(oldDeadline);
  
  const newDeadline = new Date(oldDeadline);
  if (repeatType === 'daily') {
    newDeadline.setDate(newDeadline.getDate() + 1);
  } else if (repeatType === 'weekly') {
    newDeadline.setDate(newDeadline.getDate() + 7);
  } else if (repeatType === 'monthly') {
    newDeadline.setMonth(newDeadline.getMonth() + 1);
  } else if (repeatType === 'yearly') {
    newDeadline.setFullYear(newDeadline.getFullYear() + 1);
  }
  
  // Format Date to YYYY-MM-DD
  const createdStr = newCreated.toISOString().split('T')[0];
  const deadlineStrResult = newDeadline.toISOString().split('T')[0];
  
  return { createdStr, deadlineStr: deadlineStrResult };
}

function handleRepeatingTask(task) {
  if (!task.repeat || task.repeat === 'none') return;
  if (task.nextOccurrenceSpawned) return; // Prevent spawning multiple times
  
  const dates = getNextRecurrenceDates(task.deadline, task.repeat);
  
  const nextTask = {
    id: "task-" + Date.now() + "-rep",
    title: task.title,
    description: task.description,
    createdDate: dates.createdStr,
    deadline: dates.deadlineStr,
    assignee: task.assignee,
    status: 'todo', // Next occurrence starts as To Do
    repeat: task.repeat // Keep recurrence setting for next cycle
  };
  
  state.tasks.push(nextTask);
  task.nextOccurrenceSpawned = true; // Flag current as spawned
  saveState();
  
  addSecurityLog('system', `[ทำซ้ำแบบ ${task.repeat}] สร้างงานรอบถัดไปของ '${task.title.split(' ')[0]}' กำหนดส่ง ${dates.deadlineStr}`);
  
  setTimeout(() => {
    showToast(`[ทำซ้ำอัตโนมัติ] สร้างงานรอบถัดไปส่ง ${dates.deadlineStr} ลงช่อง To Do สำเร็จ!`);
  }, 500);
}

// 9. Toast Notifications System
function showToast(message, type = "success") {
  // Check if there is an existing toast container, if not make one
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 2000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === "success" 
    ? '<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 16px;"></i>' 
    : '<i class="fa-solid fa-circle-xmark" style="color: #f43f5e; font-size: 16px;"></i>';
  
  const bg = state.theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const color = state.theme === 'dark' ? '#f8fafc' : '#0f172a';
  const border = type === "success" ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';

  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: ${bg};
    color: ${color};
    border-radius: var(--border-radius-md);
    border: 1px solid ${border};
    box-shadow: var(--shadow-md);
    font-size: 13px;
    font-weight: 600;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
  `;

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);

  // Remove toast
  setTimeout(() => {
    toast.style.transform = 'translateY(-20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 3500);
}
