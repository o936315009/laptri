/**
 * CLB CẦU LÔNG SMASH - QUẢN LÝ SÂN, VÍ & ĐIỂM DANH
 * File: app.js
 * Comprehensive client-side state management, automated court fee tiers,
 * wallet deduction, financial transactions, matchmaking, and data backup.
 */

// Bảo đảm ứng dụng không bao giờ bị crash nếu thiếu thư viện icon hoặc storage bị chặn
if (typeof window !== 'undefined' && typeof window.lucide === 'undefined') {
  window.lucide = { createIcons: function() {} };
}

function safeGetStorage(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSetStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function safeRemoveStorage(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Kênh đồng bộ tức thì giữa các tab/cửa sổ trên cùng trình duyệt
let appBroadcastChannel = null;
try {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
    appBroadcastChannel = new BroadcastChannel('CLB_REALTIME_SYNC_CHANNEL');
    appBroadcastChannel.onmessage = (event) => {
      if (!event.data) return;
      if (event.data.type === 'SESSION_UPDATED' && event.data.session) {
        applyLiveSessionFromCloud(event.data.session);
        if (typeof currentTab !== 'undefined') {
          if (currentTab === 'attendance') renderAttendanceTab();
          else if (currentTab === 'dashboard') renderDashboard();
        }
      } else if (event.data.type === 'DATA_UPDATED') {
        loadData();
        renderDashboard();
        if (typeof currentTab !== 'undefined') {
          if (currentTab === 'attendance') renderAttendanceTab();
          else if (currentTab === 'finance') renderFinanceTab();
          else if (currentTab === 'members') renderMemberManagementList();
          else if (currentTab === 'tournament') renderTournamentModule();
        }
      }
    };
  }
} catch (e) {}

// ==========================================
// HỆ THỐNG ĐA CÂU LẠC BỘ (MULTI-CLUB REGISTRY & STATE RESOLUTION)
// ==========================================
const CLUBS_REGISTRY_KEY = 'CLB_CAU_LONG_REGISTRY_V1';
const ACTIVE_CLUB_ID_KEY = 'CLB_ACTIVE_CLUB_ID_V1';

const DEFAULT_DEFAULT_CLUB = {
  id: 'club_laptri',
  accessSlug: 'lap-tri',
  name: 'CLB CẦU LÔNG LẬP TRÍ',
  shortName: 'LẬP TRÍ',
  logoIcon: '🏸',
  themeColor: 'emerald',
  bankInfo: 'MBBANK - 0987654321 - CLB CAU LONG LAP TRI',
  createdAt: '01/01/2026',
  storageKey: 'CLB_CAU_LONG_SMASH_DATA_V1',
  adminName: 'TNTOAN',
  adminUsername: 'TNTOAN',
  phone: '0942927368',
  isDeveloperSample: false
};

const DEFAULT_SECOND_CLUB = {
  id: 'club_lightning',
  accessSlug: 'tiachop',
  name: 'CLB CẦU LÔNG TIA CHỚP',
  shortName: 'TIA CHỚP',
  logoIcon: '⚡',
  themeColor: 'cyan',
  bankInfo: 'TECHCOMBANK - 190333333333 - NGUYEN HOANG LONG',
  createdAt: '15/02/2026',
  storageKey: 'CLB_CAU_LONG_DATA_club_lightning',
  adminName: 'Nguyễn Hoàng Long',
  adminUsername: 'long_admin',
  phone: '0988123456',
  isDeveloperSample: true
};

function generateAccessSlug(name) {
  if (!name) return 'clb';
  let str = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
  // Strip common prefix words
  str = str.replace(/\b(cau\s*long|câu\s*lạc\s*bộ|clb|cau|long)\b/gi, ' ');
  str = str.trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!str) str = 'clb-' + Math.floor(Math.random() * 1000);
  return str;
}

function initSecondClubDataIfMissing() {
  try {
    if (!localStorage.getItem(DEFAULT_SECOND_CLUB.storageKey)) {
      const secondClubData = {
        config: {
          clubName: 'CLB CẦU LÔNG TIA CHỚP',
          accessSlug: 'tiachop',
          themeColor: 'cyan',
          bankInfo: 'TECHCOMBANK - 190333333333 - NGUYEN HOANG LONG',
          leadership: {
            president: 'M001',
            vicePresident1: 'M002',
            vicePresident2: 'M003',
            secretary: 'M005',
            treasurer: 'M004',
            media: 'M007',
            advisor1: '',
            advisor2: ''
          },
          dailyBoxPrice: 350000,
          shuttlecocksPerBox: 12,
          dailyRateTitle: 'ĐƠN GIÁ THEO NGÀY 12',
          shuttleBillingMode: 'BY_SHUTTLE',
          shuttleUnitPrice: 29167,
          defaultShuttlesPerSession: 6,
          viceLeaderId: 'M002',
          permissions: {
            allowViceLeaderAttendance: true,
            allowViceLeaderTournamentSync: true
          },
          guestPrices: { GUEST_A: 90000, GUEST_B: 70000, GUEST_C: 50000 },
          feeTiers: [
            { id: 1, name: 'Bậc 1 (0–4 buổi)', minSessions: 0, maxSessions: 4, price: 50000 },
            { id: 2, name: 'Bậc 2 (5–9 buổi)', minSessions: 5, maxSessions: 9, price: 100000 },
            { id: 3, name: 'Bậc 3 (10–15 buổi)', minSessions: 10, maxSessions: 15, price: 150000 },
            { id: 4, name: 'Bậc 4 (16–30+ buổi)', minSessions: 16, maxSessions: 999, price: 200000 }
          ],
          allowNegativeWallet: true,
          settlementMode: 'MONTHLY',
          defaultSettlementDay: 'END_OF_MONTH',
          monthlyClubFund: 50000
        },
        funds: {
          clubFund: 3500000,
          advanceFund: 1200000,
          shuttleAdvanceFund: 600000,
          courtAdvanceFund: 450000,
          guestAdvanceIncome: 150000,
          shuttlePaidTotal: 580000,
          courtPaidTotal: 1200000
        },
        members: [
          { id: 'M001', name: 'Nguyễn Hoàng Long', chipName: 'LONG', phone: '0988123456', type: 'OFFICIAL', username: 'long_admin', password: '123', balance: 500000, monthlySessions: 4, role: 'ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('ADMIN') },
          { id: 'M002', name: 'Trần Bảo Ngọc', chipName: 'NGỌC', phone: '0988111002', type: 'OFFICIAL', username: 'ngoc', password: '123', balance: 400000, monthlySessions: 3, role: 'VICE_ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('VICE_ADMIN') },
          { id: 'M003', name: 'Lê Quốc Huy', chipName: 'HUY', phone: '0988111003', type: 'OFFICIAL', username: 'huy', password: '123', balance: 450000, monthlySessions: 4, role: 'VICE_ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('VICE_ADMIN') },
          { id: 'M004', name: 'Phạm Thu Thảo', chipName: 'THẢO', phone: '0988111004', type: 'OFFICIAL', username: 'thao', password: '123', balance: 600000, monthlySessions: 5, role: 'TREASURER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('TREASURER') },
          { id: 'M005', name: 'Vũ Minh Đức', chipName: 'ĐỨC', phone: '0988111005', type: 'OFFICIAL', username: 'duc', password: '123', balance: 350000, monthlySessions: 2, role: 'REFEREE', status: 'ACTIVE', permissions: getRoleDefaultPermissions('REFEREE') },
          { id: 'M006', name: 'Đỗ Văn Nam', chipName: 'NAM', phone: '0988111006', type: 'OFFICIAL', username: 'nam', password: '123', balance: 300000, monthlySessions: 2, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
          { id: 'M007', name: 'Hoàng Yến Nhi', chipName: 'NHI', phone: '0988111007', type: 'OFFICIAL', username: 'nhi', password: '123', balance: 500000, monthlySessions: 4, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
          { id: 'M008', name: 'Bùi Anh Tuấn', chipName: 'TUẤN', phone: '0988111008', type: 'HONORARY', username: 'tuan', password: '123', balance: 250000, monthlySessions: 2, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
          { id: 'G001', name: 'Khách Giao Lưu 1', chipName: 'K1', phone: '', type: 'GUEST_A', level: 'A', fee: 90000, username: 'guest1', password: '123', balance: 0, monthlySessions: 1, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
          { id: 'G002', name: 'Khách Giao Lưu 2', chipName: 'K2', phone: '', type: 'GUEST_B', level: 'B', fee: 70000, username: 'guest2', password: '123', balance: 0, monthlySessions: 1, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') }
        ],
        attendanceRecords: [
          { id: 'ATT_L101', date: '2026-09-15', memberId: 'M001', memberName: 'Nguyễn Hoàng Long', fee: 100000, sessionIndex: 4, timestamp: '15/09/2026 18:30' }
        ],
        transactions: [
          { id: 'TX_L1', date: '01/09/2026 08:00', categoryGroup: 'INCOME_A', subType: 'MEM_FUND', categoryName: 'Quỹ thành viên', amount: 3500000, targetName: 'Quỹ thành lập CLB', walletImpact: 0, fundImpact: 3500000, description: 'Thu quỹ ban đầu khi thành lập CLB Cầu Lông Tia Chớp', operator: 'long_admin' }
        ],
        auth: {
          isLoggedIn: true,
          user: {
            id: 'M001',
            username: 'long_admin',
            role: 'ADMIN',
            name: 'Nguyễn Hoàng Long (Quản lý)',
            permissions: getRoleDefaultPermissions('ADMIN')
          }
        }
      };
      localStorage.setItem(DEFAULT_SECOND_CLUB.storageKey, JSON.stringify(secondClubData));
    }
  } catch (e) {
    console.error('Error init second club:', e);
  }
}

function getClubsRegistry() {
  try {
    const raw = localStorage.getItem(CLUBS_REGISTRY_KEY);
    if (!raw) {
      const initial = [DEFAULT_DEFAULT_CLUB];
      localStorage.setItem(CLUBS_REGISTRY_KEY, JSON.stringify(initial));
      return initial;
    }
    let list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      const initial = [DEFAULT_DEFAULT_CLUB];
      localStorage.setItem(CLUBS_REGISTRY_KEY, JSON.stringify(initial));
      return initial;
    }
    // Lọc bỏ CLB mẫu demo cũ để duy trì 1 Câu Lạc Bộ hoạt động thực tế duy nhất
    list = list.filter(c => c.id !== 'club_lightning' && !c.isDeveloperSample);
    let changed = false;
    let hasMainClub = false;
    list.forEach(c => {
      // Nhận diện CLB chính (Lập Trí)
      if (c.id === 'club_smash' || c.id === 'club_laptri' || c.accessSlug === 'lap-tri' || c.accessSlug === 'laptri' || c.accessSlug === 'smash') {
        c.id = 'club_laptri';
        c.accessSlug = 'lap-tri';
        c.name = 'CLB CẦU LÔNG LẬP TRÍ';
        c.shortName = 'LẬP TRÍ';
        c.logoIcon = '🏸';
        c.themeColor = 'emerald';
        c.isDeveloperSample = false;
        c.storageKey = 'CLB_CAU_LONG_SMASH_DATA_V1';
        hasMainClub = true;
        changed = true;
      }
    });
    if (!hasMainClub) {
      list.unshift(DEFAULT_DEFAULT_CLUB);
      changed = true;
    }
    if (changed || list.length === 1) {
      localStorage.setItem(CLUBS_REGISTRY_KEY, JSON.stringify(list));
    }
    return list;
  } catch (e) {
    console.error('Error reading clubs registry:', e);
    return [DEFAULT_DEFAULT_CLUB];
  }
}

function saveClubsRegistry(clubs) {
  try {
    localStorage.setItem(CLUBS_REGISTRY_KEY, JSON.stringify(clubs));
  } catch (e) {
    console.error('Error saving clubs registry:', e);
  }
}

function getClubIdFromUrl() {
  try {
    // 1. Kiểm tra URL query string: ?club=slug hoặc ?clb=slug hoặc ?c=slug
    const urlParams = new URLSearchParams(window.location.search);
    const param = urlParams.get('club') || urlParams.get('clb') || urlParams.get('c');
    if (param) return param.trim();

    // 2. Kiểm tra đường dẫn pathname: /g/slug hoặc /clb/slug hoặc /club/slug
    if (window.location.pathname) {
      const pathMatch = window.location.pathname.match(/\/(?:clb|g|club)\/([^/?#]+)/i);
      if (pathMatch && pathMatch[1]) return decodeURIComponent(pathMatch[1]).trim();
    }

    // 3. Kiểm tra URL hash: #/g/slug, #/clb/slug, #club=slug, #clb=slug
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const hashPathMatch = hash.match(/^(?:\/)?(?:clb|g|club)\/([^/?#]+)/i);
      if (hashPathMatch && hashPathMatch[1]) return decodeURIComponent(hashPathMatch[1]).trim();

      const hashParams = new URLSearchParams(hash);
      const hashClub = hashParams.get('club') || hashParams.get('clb');
      if (hashClub) return hashClub.trim();
      if (hash.startsWith('club=')) return hash.replace('club=', '').trim();
      if (hash.startsWith('clb=')) return hash.replace('clb=', '').trim();
    }
  } catch (e) {}
  return null;
}

function formatSlugToClubName(slug) {
  if (!slug) return 'CLB CẦU LÔNG';
  const clean = slug.replace(/^club[-_]?/i, '').replace(/[-_]+/g, ' ').trim();
  const words = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return 'CLB CẦU LÔNG ' + words.join(' ').toUpperCase();
}

function getSuggestedClubShortName(name) {
  if (!name) return 'CLB';
  const clean = name.replace(/^CLB\s*(?:CẦU\s*LÔNG)?\s*/i, '').trim();
  return clean || 'CLB';
}

function getFormattedCurrentDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getActiveClubId() {
  const registry = getClubsRegistry();
  const urlClub = getClubIdFromUrl();
  if (urlClub) {
    const urlClubLower = urlClub.toLowerCase();
    
    // Khớp bí danh CLB Lập Trí: 'lap-tri', 'laptri', 'lap_tri', 'smash'
    if (urlClubLower === 'lap-tri' || urlClubLower === 'laptri' || urlClubLower === 'lap_tri' || urlClubLower === 'smash') {
      const mainClub = registry.find(c => c.id === 'club_laptri' || c.accessSlug === 'lap-tri') || registry[0] || DEFAULT_DEFAULT_CLUB;
      safeSetStorage(ACTIVE_CLUB_ID_KEY, mainClub.id);
      return mainClub.id;
    }

    const matched = registry.find(c =>
      c.id.toLowerCase() === urlClubLower ||
      (c.accessSlug && c.accessSlug.toLowerCase() === urlClubLower) ||
      (c.shortName && c.shortName.toLowerCase() === urlClubLower)
    );
    if (matched) {
      safeSetStorage(ACTIVE_CLUB_ID_KEY, matched.id);
      return matched.id;
    }

    // CLB chưa có trong danh bạ: Tự động khởi tạo ngay theo slug trên URL
    const cleanSlug = urlClubLower.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'clb';
    const newClubId = 'club_' + cleanSlug;
    const storageKey = 'CLB_CAU_LONG_DATA_' + cleanSlug;
    const clubName = formatSlugToClubName(cleanSlug);
    const shortName = getSuggestedClubShortName(clubName) || cleanSlug.toUpperCase();

    // Kiểm tra xem đã có dữ liệu lưu trước đó ở storageKey này chưa
    let existingData = null;
    try {
      const raw = safeGetStorage(storageKey);
      if (raw) existingData = JSON.parse(raw);
    } catch (e) {}

    const newClubRecord = {
      id: newClubId,
      accessSlug: cleanSlug,
      name: existingData?.config?.clubName || clubName,
      shortName: shortName,
      logoIcon: '🏸',
      themeColor: existingData?.config?.themeColor || 'emerald',
      bankInfo: existingData?.config?.bankInfo || '',
      createdAt: getFormattedCurrentDate(),
      storageKey: storageKey,
      adminName: existingData?.auth?.user?.name?.replace(/\s*\((?:Chủ nhiệm|Quản lý)\)/i, '') || 'Quản lý CLB',
      adminUsername: existingData?.auth?.user?.username || 'admin',
      phone: '',
      isDeveloperSample: false
    };

    registry.push(newClubRecord);
    saveClubsRegistry(registry);

    if (!existingData) {
      const freshData = getBlankClubInitialData(newClubRecord);
      safeSetStorage(storageKey, JSON.stringify(freshData));
    }

    safeSetStorage('CLB_HIDE_DEV_DEMO', 'true');
    safeSetStorage(ACTIVE_CLUB_ID_KEY, newClubId);
    return newClubId;
  }

  let activeId = safeGetStorage(ACTIVE_CLUB_ID_KEY);
  if (!activeId || !registry.some(c => c.id === activeId)) {
    const mainClub = registry.find(c => c.id === 'club_laptri' || c.accessSlug === 'lap-tri');
    if (mainClub) {
      activeId = mainClub.id;
      safeSetStorage(ACTIVE_CLUB_ID_KEY, activeId);
      return activeId;
    }
    const isHideDemo = safeGetStorage('CLB_HIDE_DEV_DEMO') === 'true';
    if (isHideDemo) {
      const userClub = registry.find(c => !c.isDeveloperSample && c.id !== 'club_lightning');
      if (userClub) {
        activeId = userClub.id;
        safeSetStorage(ACTIVE_CLUB_ID_KEY, activeId);
        return activeId;
      }
    }
    activeId = registry[0]?.id || 'club_laptri';
    safeSetStorage(ACTIVE_CLUB_ID_KEY, activeId);
  }
  return activeId;
}

function setActiveClubId(clubId) {
  safeSetStorage(ACTIVE_CLUB_ID_KEY, clubId);
}

function getClubDirectUrl(clubOrId) {
  const registry = getClubsRegistry();
  const club = typeof clubOrId === 'string' ? registry.find(c => c.id === clubOrId || c.accessSlug === clubOrId) : clubOrId;
  let slug = club ? (club.accessSlug || club.shortName?.toLowerCase() || club.id) : (typeof clubOrId === 'string' ? clubOrId : 'lap-tri');
  if (slug === 'smash' || slug === 'club_smash') slug = 'lap-tri';

  const baseUrl = window.location.href.split('#')[0].split('?')[0];
  return `${baseUrl}?club=${encodeURIComponent(slug)}`;
}

function updateClubUrlParam(clubOrId) {
  try {
    const registry = getClubsRegistry();
    const club = typeof clubOrId === 'string' ? registry.find(c => c.id === clubOrId || c.accessSlug === clubOrId) : clubOrId;
    const slug = club?.accessSlug || club?.shortName?.toLowerCase() || (typeof clubOrId === 'string' ? clubOrId : club?.id);
    const url = new URL(window.location.href);
    url.searchParams.set('club', slug);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
}

function getActiveClub() {
  const activeId = getActiveClubId();
  const registry = getClubsRegistry();
  return registry.find(c => c.id === activeId) || registry[0] || DEFAULT_DEFAULT_CLUB;
}

function getCurrentClubStorageKey() {
  const club = getActiveClub();
  return club?.storageKey || 'CLB_CAU_LONG_SMASH_DATA_V1';
}

let STORAGE_KEY = 'CLB_CAU_LONG_SMASH_DATA_V1';
try {
  STORAGE_KEY = getCurrentClubStorageKey();
} catch (e) {
  console.warn('Lỗi xác định storage key ban đầu:', e);
}

// ==========================================
// 0B. TÙY BIẾN TÊN GỌI & NHÃN THƯ MỤC GIAO DIỆN TOÀN HỆ THỐNG
// ==========================================
const DEFAULT_CUSTOM_LABELS = {
  tabDashboard: 'Trang chủ',
  tabMembers: 'Hội viên',
  tabFinance: 'Thanh toán và ví',
  tabAttendance: 'Điểm danh',
  tabTournament: 'Giải đấu',
  tabSettings: 'Cài đặt',
  clubFund: 'Tổng Quỹ CLB',
  advanceFund: 'Quỹ Tạm Ứng',
  userWallet: 'Ví của bạn',
  settlementTotalPaid: 'Tổng Nộp'
};

const CUSTOM_LABELS_PRESETS = {
  default: {
    tabDashboard: 'Trang chủ',
    tabMembers: 'Hội viên',
    tabFinance: 'Thanh toán và ví',
    tabAttendance: 'Điểm danh',
    tabTournament: 'Giải đấu',
    tabSettings: 'Cài đặt',
    clubFund: 'Tổng Quỹ CLB',
    advanceFund: 'Quỹ Tạm Ứng',
    userWallet: 'Ví của bạn',
    settlementTotalPaid: 'Tổng Nộp'
  },
  athlete: {
    tabDashboard: 'Tổng quan',
    tabMembers: 'Danh sách tay vợt',
    tabFinance: 'Thu chi & Quỹ',
    tabAttendance: 'Buổi cầu',
    tabTournament: 'Giải nội bộ',
    tabSettings: 'Quản trị',
    clubFund: 'Quỹ CLB',
    advanceFund: 'Quỹ hoạt động',
    userWallet: 'Số dư ví',
    settlementTotalPaid: 'Tổng đóng'
  },
  finance: {
    tabDashboard: 'Bàn làm việc',
    tabMembers: 'Vận động viên',
    tabFinance: 'Sổ quỹ & Ví',
    tabAttendance: 'Sinh hoạt ngày',
    tabTournament: 'Thi đấu CLB',
    tabSettings: 'Thiết lập CLB',
    clubFund: 'Quỹ chung CLB',
    advanceFund: 'Tiền cọc & ứng',
    userWallet: 'Ví cá nhân',
    settlementTotalPaid: 'Quyết toán kỳ'
  }
};

function getCustomLabel(key, fallback = '') {
  if (AppState && AppState.config && AppState.config.customLabels && AppState.config.customLabels[key]) {
    return AppState.config.customLabels[key];
  }
  if (DEFAULT_CUSTOM_LABELS[key]) {
    return DEFAULT_CUSTOM_LABELS[key];
  }
  return fallback;
}

function applyCustomLabels() {
  const lblDashboard = getCustomLabel('tabDashboard', 'Trang chủ');
  const lblMembers = getCustomLabel('tabMembers', 'Hội viên');
  const lblFinance = getCustomLabel('tabFinance', 'Thanh toán và ví');
  const lblAttendance = getCustomLabel('tabAttendance', 'Điểm danh');
  const lblTournament = getCustomLabel('tabTournament', 'Giải đấu');
  const lblSettings = getCustomLabel('tabSettings', 'Cài đặt');

  const lblClubFund = getCustomLabel('clubFund', 'Tổng Quỹ CLB');
  const lblAdvanceFund = getCustomLabel('advanceFund', 'Quỹ Tạm Ứng');
  const lblUserWallet = getCustomLabel('userWallet', 'Ví của bạn');
  const lblSettlementTotalPaid = getCustomLabel('settlementTotalPaid', 'Tổng Nộp');

  // 1. Desktop Sidebar Navigation
  const dDash = document.getElementById('navLabelDashboard');
  if (dDash) dDash.textContent = lblDashboard;
  const dAtt = document.getElementById('navLabelAttendance');
  if (dAtt) dAtt.textContent = lblAttendance;
  const dFin = document.getElementById('navLabelFinance');
  if (dFin) dFin.textContent = lblFinance;
  const dMem = document.getElementById('navLabelMembers');
  if (dMem) dMem.textContent = lblMembers;
  const dTour = document.getElementById('navLabelTournament');
  if (dTour) dTour.textContent = lblTournament;
  const dSet = document.getElementById('navLabelSettings');
  if (dSet) dSet.textContent = lblSettings;

  // 2. Mobile Bottom Navigation
  const mDash = document.getElementById('mNavLabelDashboard');
  if (mDash) mDash.textContent = lblDashboard;
  const mAtt = document.getElementById('mNavLabelAttendance');
  if (mAtt) mAtt.textContent = lblAttendance;
  const mFin = document.getElementById('mNavLabelFinance');
  if (mFin) mFin.textContent = lblFinance;
  const mMem = document.getElementById('mNavLabelMembers');
  if (mMem) mMem.textContent = lblMembers;
  const mTour = document.getElementById('mNavLabelTournament');
  if (mTour) mTour.textContent = lblTournament;
  const mSet = document.getElementById('mNavLabelSettings');
  if (mSet) mSet.textContent = lblSettings;

  // 3. Dashboard KPI Cards
  const kpiClubFundLbl = document.getElementById('kpiClubFundLabel');
  if (kpiClubFundLbl) kpiClubFundLbl.textContent = lblClubFund;
  const kpiAdvFundLbl = document.getElementById('kpiAdvanceFundLabel');
  if (kpiAdvFundLbl) kpiAdvFundLbl.textContent = lblAdvanceFund;
  const kpiWalletLbl = document.getElementById('kpiWalletLabel');
  if (kpiWalletLbl && AppState.auth?.user) {
    kpiWalletLbl.textContent = lblUserWallet;
  }

  // 4. Tab Tài chính
  const finAdvCardTitle = document.getElementById('financeAdvanceFundCardTitle');
  if (finAdvCardTitle) finAdvCardTitle.textContent = lblAdvanceFund;
  const kpiCardAdvTotalLbl = document.getElementById('kpiCardAdvanceFundTotalLabel');
  if (kpiCardAdvTotalLbl) kpiCardAdvTotalLbl.textContent = lblAdvanceFund;

  // 5. Tab Quản lý thành viên: Tiêu đề danh sách hội viên
  const tabMemHeader = document.getElementById('tabMembersHeaderTitle');
  if (tabMemHeader) tabMemHeader.textContent = `Danh Sách ${lblMembers}`;

  // 6. Bảng Tất Toán Tháng: Các cột "Tổng Nộp"
  document.querySelectorAll('.repLabelTotalPaid').forEach(el => {
    el.textContent = lblSettlementTotalPaid;
  });
}

function populateCustomLabelsInputs() {
  const cfg = AppState.config?.customLabels || {};
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('cfgLabelTabDashboard', cfg.tabDashboard || DEFAULT_CUSTOM_LABELS.tabDashboard);
  setVal('cfgLabelTabMembers', cfg.tabMembers || DEFAULT_CUSTOM_LABELS.tabMembers);
  setVal('cfgLabelTabFinance', cfg.tabFinance || DEFAULT_CUSTOM_LABELS.tabFinance);
  setVal('cfgLabelTabAttendance', cfg.tabAttendance || DEFAULT_CUSTOM_LABELS.tabAttendance);
  setVal('cfgLabelTabTournament', cfg.tabTournament || DEFAULT_CUSTOM_LABELS.tabTournament);
  setVal('cfgLabelTabSettings', cfg.tabSettings || DEFAULT_CUSTOM_LABELS.tabSettings);

  setVal('cfgLabelClubFund', cfg.clubFund || DEFAULT_CUSTOM_LABELS.clubFund);
  setVal('cfgLabelAdvanceFund', cfg.advanceFund || DEFAULT_CUSTOM_LABELS.advanceFund);
  setVal('cfgLabelUserWallet', cfg.userWallet || DEFAULT_CUSTOM_LABELS.userWallet);
  setVal('cfgLabelSettlementTotalPaid', cfg.settlementTotalPaid || DEFAULT_CUSTOM_LABELS.settlementTotalPaid);
}

function applyCustomLabelsPreset(presetName) {
  const preset = CUSTOM_LABELS_PRESETS[presetName] || CUSTOM_LABELS_PRESETS.default;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('cfgLabelTabDashboard', preset.tabDashboard);
  setVal('cfgLabelTabMembers', preset.tabMembers);
  setVal('cfgLabelTabFinance', preset.tabFinance);
  setVal('cfgLabelTabAttendance', preset.tabAttendance);
  setVal('cfgLabelTabTournament', preset.tabTournament);
  setVal('cfgLabelTabSettings', preset.tabSettings);

  setVal('cfgLabelClubFund', preset.clubFund);
  setVal('cfgLabelAdvanceFund', preset.advanceFund);
  setVal('cfgLabelUserWallet', preset.userWallet);
  setVal('cfgLabelSettlementTotalPaid', preset.settlementTotalPaid);

  const presetTitle = presetName === 'athlete' ? 'Thể Thao' : (presetName === 'finance' ? 'Tài Chính' : 'Chuẩn CLB');
  showToast(`💡 Đã điền nhanh mẫu phong cách "${presetTitle}". Bấm [Lưu tùy biến tên gọi] để kích hoạt!`, 'info');
}

function saveCustomLabelsConfig() {
  const currentRole = getCurrentUserRole();
  if (currentRole !== 'ADMIN' && currentRole !== 'DEV_ADMIN') {
    showToast('⚠️ Chỉ Quản lý mới có toàn quyền sửa tùy biến tên gọi giao diện CLB!', 'error');
    return;
  }

  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return (el && el.value.trim()) ? el.value.trim() : fallback;
  };

  if (!AppState.config) AppState.config = {};
  AppState.config.customLabels = {
    tabDashboard: getVal('cfgLabelTabDashboard', DEFAULT_CUSTOM_LABELS.tabDashboard),
    tabMembers: getVal('cfgLabelTabMembers', DEFAULT_CUSTOM_LABELS.tabMembers),
    tabFinance: getVal('cfgLabelTabFinance', DEFAULT_CUSTOM_LABELS.tabFinance),
    tabAttendance: getVal('cfgLabelTabAttendance', DEFAULT_CUSTOM_LABELS.tabAttendance),
    tabTournament: getVal('cfgLabelTabTournament', DEFAULT_CUSTOM_LABELS.tabTournament),
    tabSettings: getVal('cfgLabelTabSettings', DEFAULT_CUSTOM_LABELS.tabSettings),

    clubFund: getVal('cfgLabelClubFund', DEFAULT_CUSTOM_LABELS.clubFund),
    advanceFund: getVal('cfgLabelAdvanceFund', DEFAULT_CUSTOM_LABELS.advanceFund),
    userWallet: getVal('cfgLabelUserWallet', DEFAULT_CUSTOM_LABELS.userWallet),
    settlementTotalPaid: getVal('cfgLabelSettlementTotalPaid', DEFAULT_CUSTOM_LABELS.settlementTotalPaid)
  };

  saveData();
  applyCustomLabels();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderFinanceTab === 'function') renderFinanceTab();
  if (typeof renderSettlementReport === 'function') renderSettlementReport();

  showToast('✓ Đã lưu tùy biến tên gọi giao diện CLB thành công! Toàn bộ tên thư mục & thuật ngữ đã cập nhật tức thì.', 'success');
}

function resetCustomLabelsToDefault() {
  const currentRole = getCurrentUserRole();
  if (currentRole !== 'ADMIN' && currentRole !== 'DEV_ADMIN') {
    showToast('⚠️ Chỉ Quản lý mới có toàn quyền khôi phục tên gọi mặc định!', 'error');
    return;
  }

  if (!confirm('Bạn có chắc chắn muốn khôi phục toàn bộ tên gọi và thư mục giao diện về mặc định chuẩn CLB không?')) {
    return;
  }

  if (!AppState.config) AppState.config = {};
  AppState.config.customLabels = Object.assign({}, DEFAULT_CUSTOM_LABELS);

  populateCustomLabelsInputs();
  saveData();
  applyCustomLabels();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderFinanceTab === 'function') renderFinanceTab();
  if (typeof renderSettlementReport === 'function') renderSettlementReport();

  showToast('↺ Đã khôi phục toàn bộ tên gọi và thư mục về mặc định!', 'info');
}

if (typeof window !== 'undefined') {
  window.DEFAULT_CUSTOM_LABELS = DEFAULT_CUSTOM_LABELS;
  window.CUSTOM_LABELS_PRESETS = CUSTOM_LABELS_PRESETS;
  window.getCustomLabel = getCustomLabel;
  window.applyCustomLabels = applyCustomLabels;
  window.populateCustomLabelsInputs = populateCustomLabelsInputs;
  window.applyCustomLabelsPreset = applyCustomLabelsPreset;
  window.saveCustomLabelsConfig = saveCustomLabelsConfig;
  window.resetCustomLabelsToDefault = resetCustomLabelsToDefault;
  window.openCancelTransactionModal = openCancelTransactionModal;
  window.setCancelReasonQuick = setCancelReasonQuick;
  window.handleConfirmCancelTransaction = handleConfirmCancelTransaction;
  window.showCancelAuditDetails = showCancelAuditDetails;
  window.restoreCancelledTransaction = restoreCancelledTransaction;
  window.getMemberMonthlyFundPaymentTx = getMemberMonthlyFundPaymentTx;
  window.isMemberMonthlyFundPaid = isMemberMonthlyFundPaid;
}

// ==========================================
// 0. ĐỊNH NGHĨA VAI TRÒ & PHÂN QUYỀN HỆ THỐNG (USER ACCESS & PERMISSIONS)
// ==========================================
const ROLE_DEFINITIONS = {
  DEV_ADMIN: { label: 'Admin Nhà Phát Triển', icon: '🚀', color: 'purple', badgeClass: 'bg-purple-100 text-purple-900 border-purple-300' },
  ADMIN: { label: 'Quản lý', icon: '👑', color: 'amber', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  VICE_ADMIN: { label: 'Phó nhóm', icon: '🛡️', color: 'blue', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
  TREASURER: { label: 'Thủ quỹ', icon: '💰', color: 'emerald', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  REFEREE: { label: 'Trọng tài', icon: '⚖️', color: 'purple', badgeClass: 'bg-purple-100 text-purple-900 border-purple-300' },
  MEMBER: { label: 'Thành viên', icon: '👤', color: 'slate', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  CUSTOM: { label: 'Tùy biến', icon: '⚙️', color: 'indigo', badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300' }
};

const DEV_ADMIN_SESSION_KEY = 'CLB_DEV_ADMIN_LOGGED_IN_V1';

const PERMISSION_KEYS = ['attendance', 'finance', 'member', 'tournament', 'referee', 'config'];

const PERMISSION_DEFINITIONS = {
  attendance: { label: 'Điểm danh', icon: '📅', desc: 'Điểm danh, chốt tiền sân buổi chơi' },
  finance: { label: 'Quỹ & Ví', icon: '💰', desc: 'Quản lý Quỹ CLB, nạp tiền ví, tất toán nợ' },
  member: { label: 'Thành viên', icon: '👥', desc: 'Quản lý hội viên & cấp mật khẩu' },
  tournament: { label: 'Giải đấu', icon: '🏆', desc: 'Tạo giải đấu, xếp lịch, bốc thăm hạt giống' },
  referee: { label: 'Trọng tài', icon: '⚖️', desc: 'Nhập điểm & tỉ số trực tiếp các sân' },
  config: { label: 'Cấu hình', icon: '⚙️', desc: 'Cấu hình hệ thống & Ban lãnh đạo CLB' }
};

function getRoleDefaultPermissions(role) {
  switch (role) {
    case 'DEV_ADMIN':
      return { attendance: true, finance: true, member: true, tournament: true, referee: true, config: true, createClub: true, deleteClub: true };
    case 'ADMIN':
      return { attendance: true, finance: true, member: true, tournament: true, referee: true, config: true, createClub: false, deleteClub: false };
    case 'VICE_ADMIN':
      return { attendance: true, finance: false, member: true, tournament: true, referee: true, config: false, createClub: false, deleteClub: false };
    case 'TREASURER':
      return { attendance: true, finance: true, member: false, tournament: false, referee: false, config: false, createClub: false, deleteClub: false };
    case 'REFEREE':
      return { attendance: false, finance: false, member: false, tournament: true, referee: true, config: false, createClub: false, deleteClub: false };
    case 'MEMBER':
    default:
      return { attendance: false, finance: false, member: false, tournament: false, referee: false, config: false, createClub: false, deleteClub: false };
  }
}

function generateAutoUsername(name) {
  if (!name) return 'user_' + Math.floor(Math.random() * 1000);
  const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  const parts = clean.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  return lastName;
}

function getBlankClubInitialData(club) {
  const c = club || {};
  const adminName = c.adminName || 'Quản lý CLB';
  const adminUsername = c.adminUsername || generateAutoUsername(adminName) || 'admin';
  const adminPhone = c.phone || '';
  const adminChipName = adminName.trim().split(/\s+/).pop().toUpperCase();
  const initFund = typeof c.initialFund === 'number' ? c.initialFund : 0;
  const slug = c.accessSlug || generateAccessSlug(c.name || 'clb');

  const adminMember = {
    id: 'M001',
    name: adminName,
    chipName: adminChipName,
    phone: adminPhone,
    type: 'OFFICIAL',
    username: adminUsername,
    password: c.adminPassword || '123456',
    balance: 0,
    monthlySessions: 0,
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: getRoleDefaultPermissions('ADMIN')
  };

  const initialTx = initFund > 0 ? [{
    id: 'TX_INIT_' + Date.now(),
    date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    categoryGroup: 'INCOME_A',
    subType: 'MEM_FUND',
    categoryName: 'Quỹ thành lập CLB',
    amount: initFund,
    targetName: 'Quỹ chung CLB',
    walletImpact: 0,
    fundImpact: initFund,
    description: `Khởi tạo số dư ban đầu cho ${c.name || 'CLB'}`,
    operator: adminUsername
  }] : [];

  return {
    config: {
      clubName: c.name || 'CLB CẦU LÔNG',
      accessSlug: slug,
      themeColor: c.themeColor || 'emerald',
      bankInfo: c.bankInfo || '',
      leadership: {
        president: 'M001',
        vicePresident1: '',
        vicePresident2: '',
        secretary: '',
        treasurer: '',
        media: '',
        advisor1: '',
        advisor2: ''
      },
      dailyBoxPrice: 340000,
      shuttlecocksPerBox: 12,
      dailyRateTitle: 'ĐƠN GIÁ THEO NGÀY 12',
      shuttleBillingMode: 'BY_SHUTTLE',
      shuttleUnitPrice: 28333,
      defaultShuttlesPerSession: 6,
      viceLeaderId: '',
      permissions: {
        allowViceLeaderAttendance: true,
        allowViceLeaderTournamentSync: true
      },
      guestPrices: { GUEST_A: 90000, GUEST_B: 70000, GUEST_C: 50000 },
      feeTiers: [
        { id: 1, name: 'Bậc 1 (0–4 buổi)', minSessions: 0, maxSessions: 4, price: 50000 },
        { id: 2, name: 'Bậc 2 (5–9 buổi)', minSessions: 5, maxSessions: 9, price: 100000 },
        { id: 3, name: 'Bậc 3 (10–15 buổi)', minSessions: 10, maxSessions: 15, price: 150000 },
        { id: 4, name: 'Bậc 4 (16–30+ buổi)', minSessions: 16, maxSessions: 999, price: 200000 }
      ],
      allowNegativeWallet: true,
      settlementMode: 'MONTHLY',
      defaultSettlementDay: 'END_OF_MONTH',
      monthlyClubFund: 50000,
      customLabels: Object.assign({}, DEFAULT_CUSTOM_LABELS)
    },
    funds: {
      clubFund: initFund,
      carriedForwardFund: 0,
      carriedForwardFromMonth: null,
      advanceFund: 0,
      shuttleAdvanceFund: 0,
      courtAdvanceFund: 0,
      guestAdvanceIncome: 0,
      shuttlePaidTotal: 0,
      courtPaidTotal: 0
    },
    members: [adminMember],
    attendanceRecords: [],
    transactions: initialTx,
    topUpRequests: [],
    auth: {
      isLoggedIn: true,
      user: {
        id: 'M001',
        username: adminUsername,
        role: 'ADMIN',
        name: `${adminName} (Quản lý)`,
        permissions: getRoleDefaultPermissions('ADMIN')
      }
    }
  };
}

// --- DỮ LIỆU CÁC BUỔI HOẠT ĐỘNG MẪU (CHUẨN THEO GIAO DIỆN HOẠT ĐỘNG & THÁNG NÀY CỦA BẠN) ---
const DEFAULT_ACTIVITY_SESSIONS = [
  {
    id: 'SES_20260925',
    date: '2026-09-25',
    title: 'Buổi cầu',
    attendeeCount: 8,
    memberCount: 8,
    guestCount: 0,
    shuttleTotal: 311663,
    shuttleFeePerMember: 38958,
    courtFee: 0,
    guestPaid: 0,
    members: [
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 38958 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 38958 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 38958 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 38958 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 38958 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 38958 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 38958 },
      { id: 'M009', name: 'Bùi Trung Hiếu', fee: 38958 }
    ],
    timestamp: '25/09/2026 18:30'
  },
  {
    id: 'SES_20260924',
    date: '2026-09-24',
    title: 'Buổi cầu',
    attendeeCount: 6,
    memberCount: 6,
    guestCount: 0,
    shuttleTotal: 283330,
    shuttleFeePerMember: 47222,
    courtFee: 0,
    guestPaid: 0,
    members: [
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 47222 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 47222 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 47222 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 47222 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 47222 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 47222 }
    ],
    timestamp: '24/09/2026 18:30'
  },
  {
    id: 'SES_20260923',
    date: '2026-09-23',
    title: 'Buổi cầu',
    attendeeCount: 9,
    memberCount: 9,
    guestCount: 0,
    shuttleTotal: 340000,
    shuttleFeePerMember: 37778,
    courtFee: 0,
    guestPaid: 0,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 37778 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 37778 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 37778 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 37778 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 37778 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 37778 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 37778 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 37778 },
      { id: 'M009', name: 'Bùi Trung Hiếu', fee: 37778 }
    ],
    timestamp: '23/09/2026 18:30'
  },
  {
    id: 'SES_20260921',
    date: '2026-09-21',
    title: 'Buổi cầu',
    attendeeCount: 9,
    memberCount: 9,
    guestCount: 0,
    shuttleTotal: 340000,
    shuttleFeePerMember: 37778,
    courtFee: 0,
    guestPaid: 0,
    members: [
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 37778 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 37778 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 37778 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 37778 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 37778 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 37778 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 37778 },
      { id: 'M009', name: 'Bùi Trung Hiếu', fee: 37778 },
      { id: 'M010', name: 'Vũ Mạnh Hùng', fee: 37778 }
    ],
    timestamp: '21/09/2026 18:30'
  },
  {
    id: 'SES_20260918',
    date: '2026-09-18',
    title: 'Buổi cầu',
    attendeeCount: 8,
    memberCount: 8,
    shuttleTotal: 384000,
    shuttleFeePerMember: 48000,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 48000 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 48000 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 48000 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 48000 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 48000 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 48000 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 48000 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 48000 }
    ],
    timestamp: '18/09/2026 18:30'
  },
  {
    id: 'SES_20260916',
    date: '2026-09-16',
    title: 'Buổi cầu',
    attendeeCount: 10,
    memberCount: 10,
    shuttleTotal: 450000,
    shuttleFeePerMember: 45000,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 45000 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 45000 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 45000 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 45000 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 45000 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 45000 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 45000 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 48000 },
      { id: 'M009', name: 'Bùi Trung Hiếu', fee: 45000 },
      { id: 'M010', name: 'Vũ Mạnh Hùng', fee: 45000 }
    ],
    timestamp: '16/09/2026 18:30'
  },
  {
    id: 'SES_20260914',
    date: '2026-09-14',
    title: 'Buổi cầu',
    attendeeCount: 7,
    memberCount: 7,
    shuttleTotal: 364000,
    shuttleFeePerMember: 52000,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 52000 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 52000 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 52000 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 52000 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 52000 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 52000 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 52000 }
    ],
    timestamp: '14/09/2026 18:30'
  },
  {
    id: 'SES_20260911',
    date: '2026-09-11',
    title: 'Buổi cầu',
    attendeeCount: 8,
    memberCount: 8,
    shuttleTotal: 372000,
    shuttleFeePerMember: 46500,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 46500 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 46500 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 46500 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 46500 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 46500 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 46500 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 46500 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 46500 }
    ],
    timestamp: '11/09/2026 18:30'
  },
  {
    id: 'SES_20260909',
    date: '2026-09-09',
    title: 'Buổi cầu',
    attendeeCount: 8,
    memberCount: 8,
    shuttleTotal: 392000,
    shuttleFeePerMember: 49000,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 49000 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 49000 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 49000 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 49000 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 49000 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 49000 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 49000 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 49000 }
    ],
    timestamp: '09/09/2026 18:30'
  },
  {
    id: 'SES_20260907',
    date: '2026-09-07',
    title: 'Buổi cầu',
    attendeeCount: 8,
    memberCount: 8,
    shuttleTotal: 400000,
    shuttleFeePerMember: 50000,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 50000 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 50000 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 50000 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 50000 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 50000 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 50000 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 50000 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 50000 }
    ],
    timestamp: '07/09/2026 18:30'
  },
  {
    id: 'SES_20260904',
    date: '2026-09-04',
    title: 'Buổi cầu',
    attendeeCount: 7,
    memberCount: 7,
    shuttleTotal: 417130,
    shuttleFeePerMember: 59590,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 59590 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 59590 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 59590 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 59590 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 59590 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 59590 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 59590 }
    ],
    timestamp: '04/09/2026 18:30'
  },
  {
    id: 'SES_20260902',
    date: '2026-09-02',
    title: 'Buổi cầu',
    attendeeCount: 9,
    memberCount: 9,
    shuttleTotal: 360000,
    shuttleFeePerMember: 40000,
    members: [
      { id: 'M001', name: 'Trần Đức Chính (Quản lý)', fee: 40000 },
      { id: 'M002', name: 'Nguyễn Thành Công', fee: 40000 },
      { id: 'M003', name: 'Lê Anh Dũng', fee: 40000 },
      { id: 'M004', name: 'Vũ Văn Duy', fee: 40000 },
      { id: 'M005', name: 'Đặng Thành Đạt', fee: 40000 },
      { id: 'M006', name: 'Phạm Văn Đê', fee: 40000 },
      { id: 'M007', name: 'Hoàng Thanh Hải', fee: 40000 },
      { id: 'M008', name: 'Ngô Hồng Hạnh', fee: 40000 },
      { id: 'M009', name: 'Bùi Trung Hiếu', fee: 40000 }
    ],
    timestamp: '02/09/2026 18:30'
  }
];

// ==========================================
// 1. DỮ LIỆU MẪU BAN ĐẦU (DEFAULT DATA)
// ==========================================
const DEFAULT_INITIAL_DATA = {
  config: {
    clubName: 'CLB CẦU LÔNG LẬP TRÍ',
    themeColor: 'emerald',
    bankInfo: 'MBBANK - 0987654321 - CLB CAU LONG LAP TRI',
    leadership: {
      president: 'M001',       // Chủ tịch
      vicePresident1: 'M002',  // Phó chủ tịch 1
      vicePresident2: 'M003',  // Phó chủ tịch 2
      secretary: 'M004',       // Thư ký
      treasurer: 'M005',       // Thủ quỹ
      media: 'M008',           // Truyền thông
      advisor1: 'M006',        // Cố vấn 1
      advisor2: 'M007'         // Cố vấn 2
    },
    dailyBoxPrice: 340000,
    shuttlecocksPerBox: 12,
    dailyRateTitle: 'ĐƠN GIÁ THEO NGÀY 12',
    shuttleBillingMode: 'BY_SHUTTLE',
    shuttleUnitPrice: 28333,
    defaultShuttlesPerSession: 6,
    viceLeaderId: 'M002',
    permissions: {
      allowViceLeaderAttendance: true,
      allowViceLeaderTournamentSync: true
    },
    guestPrices: {
      GUEST_A: 90000,
      GUEST_B: 70000,
      GUEST_C: 50000
    },
    feeTiers: [
      { id: 1, name: 'Bậc 1 (0–4 buổi)', minSessions: 0, maxSessions: 4, price: 50000 },
      { id: 2, name: 'Bậc 2 (5–9 buổi)', minSessions: 5, maxSessions: 9, price: 100000 },
      { id: 3, name: 'Bậc 3 (10–15 buổi)', minSessions: 10, maxSessions: 15, price: 150000 },
      { id: 4, name: 'Bậc 4 (16–30+ buổi)', minSessions: 16, maxSessions: 999, price: 200000 }
    ],
    allowNegativeWallet: true,          // Cho phép ví thành viên dư nợ / âm số dư (không chặn giao dịch)
    settlementMode: 'MONTHLY',          // 'DAILY' (Cuối ngày) hoặc 'MONTHLY' (Cuối tháng)
    defaultSettlementDay: 'END_OF_MONTH', // Ngày tất toán mặc định: cuối tháng
    monthlyClubFund: 50000,             // Mức Quỹ CLB hàng tháng mặc định: 50.000 VNĐ / TV
    attendanceCutoffTime: '17:00',      // Giờ chốt tự điểm danh thành viên (mặc định 17:00)
    customLabels: Object.assign({}, DEFAULT_CUSTOM_LABELS)
  },
  funds: {
    clubFund: 0,                  // 0 đ - Quỹ CLB sạch bắt đầu từ đầu
    carriedForwardFund: 0,        // Quỹ tồn từ chu kỳ trước chuyển sang
    carriedForwardFromMonth: null,// Tháng được chuyển tiếp (ví dụ '09/2026')
    advanceFund: 0,               // 0 đ - Quỹ tạm ứng sạch
    shuttleAdvanceFund: 0,        // 0 đ
    courtAdvanceFund: 0,          // 0 đ
    guestAdvanceIncome: 0,        // 0 đ
    shuttlePaidTotal: 0,          // 0 đ
    courtPaidTotal: 0             // 0 đ
  },
  members: [
    // --- DANH SÁCH 22 THÀNH VIÊN CHÍNH THỨC CỦA CLB CẦU LÔNG LẬP TRÍ ---
    { id: 'M001', name: 'TNTOAN', chipName: 'TNTOAN', phone: '0942927368', type: 'OFFICIAL', username: 'TNTOAN', password: 'admin', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('ADMIN') },
    { id: 'M002', name: 'CHÍNH', chipName: 'CHÍNH', phone: '0901000001', type: 'OFFICIAL', username: 'chinh', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'VICE_ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('VICE_ADMIN') },
    { id: 'M003', name: 'MẠNH', chipName: 'MẠNH', phone: '0901000002', type: 'OFFICIAL', username: 'manh', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M004', name: 'KIÊN', chipName: 'KIÊN', phone: '0901000003', type: 'OFFICIAL', username: 'kien', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M005', name: 'TƯƠI', chipName: 'TƯƠI', phone: '0901000004', type: 'OFFICIAL', username: 'tuoi', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M006', name: 'THẮNG', chipName: 'THẮNG', phone: '0901000005', type: 'OFFICIAL', username: 'thang', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M007', name: 'QUẢNG', chipName: 'QUẢNG', phone: '0901000006', type: 'OFFICIAL', username: 'quang', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M008', name: 'HẢI', chipName: 'HẢI', phone: '0901000007', type: 'OFFICIAL', username: 'hai', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M009', name: 'PHÁP', chipName: 'PHÁP', phone: '0901000008', type: 'OFFICIAL', username: 'phap', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M010', name: 'HỒNG', chipName: 'HỒNG', phone: '0901000009', type: 'OFFICIAL', username: 'hong', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M011', name: 'HẠNH', chipName: 'HẠNH', phone: '0901000010', type: 'OFFICIAL', username: 'hanh', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M012', name: 'CÔNG', chipName: 'CÔNG', phone: '0901000011', type: 'OFFICIAL', username: 'cong', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M013', name: 'THUỘC', chipName: 'THUỘC', phone: '0901000012', type: 'OFFICIAL', username: 'thuoc', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M014', name: 'THÀNH', chipName: 'THÀNH', phone: '0901000013', type: 'OFFICIAL', username: 'thanh', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M015', name: 'TÂN', chipName: 'TÂN', phone: '0901000014', type: 'OFFICIAL', username: 'tan', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M016', name: 'LƯỢNG', chipName: 'LƯỢNG', phone: '0901000015', type: 'OFFICIAL', username: 'luong', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M017', name: 'T.ANH', chipName: 'T.ANH', phone: '0901000016', type: 'OFFICIAL', username: 'tanh', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M018', name: 'TRƯỜNG', chipName: 'TRƯỜNG', phone: '0901000017', type: 'OFFICIAL', username: 'truong', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M019', name: 'ĐÊ', chipName: 'ĐÊ', phone: '0901000018', type: 'OFFICIAL', username: 'de', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M020', name: 'DUY', chipName: 'DUY', phone: '0901000019', type: 'OFFICIAL', username: 'duy', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M021', name: 'KHƯƠNG', chipName: 'KHƯƠNG', phone: '0901000020', type: 'OFFICIAL', username: 'khuong', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'M022', name: 'MINH', chipName: 'MINH', phone: '0901000021', type: 'OFFICIAL', username: 'minh', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },

    // --- DANH SÁCH 4 THÀNH VIÊN DANH DỰ CỦA CLB CẦU LÔNG LẬP TRÍ ---
    { id: 'H001', name: 'HIẾU', chipName: 'HIẾU', phone: '0902000001', type: 'HONORARY', username: 'hieu', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'H002', name: 'NGUYÊN', chipName: 'NGUYÊN', phone: '0902000002', type: 'HONORARY', username: 'nguyen', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'H003', name: 'ĐẠT', chipName: 'ĐẠT', phone: '0902000003', type: 'HONORARY', username: 'dat', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
    { id: 'H004', name: 'DŨNG', chipName: 'DŨNG', phone: '0902000004', type: 'HONORARY', username: 'dung', password: '123', hasChangedPassword: false, mustChangePassword: true, balance: 0, monthlySessions: 0, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') }
  ],
  attendanceRecords: [],
  activitySessions: [],
  transactions: [],
  topUpRequests: [],
  auth: {
    isLoggedIn: false,
    user: null
  }
};

// ==========================================
// 2. STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
let AppState = {};

function loadData() {
  try {
    STORAGE_KEY = getCurrentClubStorageKey();
    const activeClub = getActiveClub();
    const isMainClub = activeClub.id === 'club_laptri' || activeClub.id === 'club_smash' || activeClub.accessSlug === 'lap-tri' || activeClub.accessSlug === 'smash';
    
    // Đảm bảo không bị mất dữ liệu giữa storageKey cũ và mới
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved && isMainClub) {
      saved = localStorage.getItem('CLB_CAU_LONG_SMASH_DATA_V1') || localStorage.getItem('CLB_CAU_LONG_DATA_lap-tri');
    }

    if (saved) {
      AppState = JSON.parse(saved);
      const blankData = getBlankClubInitialData(activeClub);

      // Đảm bảo cấu trúc chuẩn sạch cho CLB hoạt động thực tế
      if (!AppState.config) AppState.config = DEFAULT_INITIAL_DATA.config;
      if (!AppState.funds) AppState.funds = DEFAULT_INITIAL_DATA.funds;
      if (!AppState.members || AppState.members.length === 0) {
        AppState.members = JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA.members));
      }
      if (!AppState.transactions) AppState.transactions = [];
      if (!AppState.topUpRequests) AppState.topUpRequests = [];
      if (!AppState.attendanceRecords) AppState.attendanceRecords = [];
      if (!AppState.auth) AppState.auth = DEFAULT_INITIAL_DATA.auth;

      // Luôn đảm bảo tài khoản Quản trị viên TNTOAN và toàn bộ 26 thành viên thực tế (22 chính thức + 4 danh dự) CLB Lập Trí tồn tại hợp lệ
      if (isMainClub && AppState.members) {
        const requiredMembers = DEFAULT_INITIAL_DATA.members;

        requiredMembers.forEach(req => {
          let found = AppState.members.find(m => 
            (m.id && m.id === req.id) ||
            (m.username && m.username.toLowerCase() === req.username.toLowerCase()) ||
            (m.chipName && m.chipName.toUpperCase() === req.chipName.toUpperCase()) ||
            (m.name && m.name.toUpperCase() === req.name.toUpperCase())
          );
          if (found) {
            found.name = req.name;
            found.chipName = req.chipName;
            found.username = req.username;
            found.type = req.type;
            if (!found.password) {
              found.password = req.password;
              found.mustChangePassword = true;
              found.hasChangedPassword = false;
            }
            found.role = req.role;
            found.permissions = getRoleDefaultPermissions(req.role);
            if (!found.status) found.status = 'ACTIVE';
            if (found.balance === undefined) found.balance = 0;
            if (found.monthlySessions === undefined) found.monthlySessions = 0;
          } else {
            AppState.members.push(JSON.parse(JSON.stringify(req)));
          }
        });

        if (AppState.auth && AppState.auth.isLoggedIn && (!AppState.auth.user || AppState.auth.user.username === 'chinh')) {
          AppState.auth.user = {
            id: 'M001',
            username: 'TNTOAN',
            role: 'ADMIN',
            name: 'TNTOAN (Chủ nhiệm / Admin)',
            permissions: getRoleDefaultPermissions('ADMIN')
          };
        }
      }
      if (AppState.members && AppState.members.length > 0) {
        const leadership = AppState.config?.leadership || {};
        const presId = leadership.president || (isMainClub ? 'M001' : AppState.members[0].id);
        const vice1Id = leadership.vicePresident1 || (isMainClub ? 'M002' : '');
        const vice2Id = leadership.vicePresident2 || '';
        const secId = leadership.secretary || '';
        const treasId = leadership.treasurer || '';
        const viceLeadId = AppState.config?.viceLeaderId || (isMainClub ? 'M002' : '');

        AppState.members.forEach(m => {
          if (!m.role) {
            if (m.id === presId || (isMainClub && (m.id === 'M001' || m.username?.toLowerCase() === 'tntoan'))) {
              m.role = 'ADMIN';
            } else if ((vice1Id && m.id === vice1Id) || (vice2Id && m.id === vice2Id) || (viceLeadId && m.id === viceLeadId)) {
              m.role = 'VICE_ADMIN';
            } else if (treasId && m.id === treasId) {
              m.role = 'TREASURER';
            } else if (secId && m.id === secId) {
              m.role = 'REFEREE';
            } else {
              m.role = 'MEMBER';
            }
          }
          if (!m.permissions || typeof m.permissions !== 'object' || (m.role !== 'MEMBER' && Object.values(m.permissions).every(v => v === false))) {
            m.permissions = getRoleDefaultPermissions(m.role);
          }
          if (!m.status) {
            m.status = 'ACTIVE';
          }
          if (!m.username) {
            m.username = generateAutoUsername(m.name || m.id);
          }
          if (!m.password) {
            m.password = (m.username?.toLowerCase() === 'tntoan' || m.id === 'M001') ? 'admin' : '123';
            m.mustChangePassword = true;
            m.hasChangedPassword = false;
          }
        });
      }

      if (AppState.auth && AppState.auth.user) {
        if (!AppState.auth.user.permissions) {
          AppState.auth.user.permissions = getRoleDefaultPermissions(AppState.auth.user.role || 'ADMIN');
        }
      }

      // Bảo toàn phiên làm việc của Nhà phát triển (Super Admin) qua các lần tải lại trang hoặc chuyển đổi CLB
      if (localStorage.getItem(DEV_ADMIN_SESSION_KEY) === 'true') {
        if (!AppState.auth) AppState.auth = {};
        AppState.auth.isLoggedIn = true;
        AppState.auth.user = {
          id: 'DEV_001',
          username: 'developer',
          role: 'DEV_ADMIN',
          name: 'Nhà Phát Triển (Super Admin)',
          permissions: getRoleDefaultPermissions('DEV_ADMIN')
        };
      }

      if (AppState.config) {
        if (!AppState.config.clubName || (isMainClub && AppState.config.clubName.includes('SMASH'))) {
          AppState.config.clubName = 'CLB CẦU LÔNG LẬP TRÍ';
        }
        if (!AppState.config.guestPrices) AppState.config.guestPrices = DEFAULT_INITIAL_DATA.config.guestPrices;
        if (AppState.config.dailyBoxPrice === undefined) AppState.config.dailyBoxPrice = 340000;
        if (AppState.config.shuttlecocksPerBox === undefined) AppState.config.shuttlecocksPerBox = 12;
        if (!AppState.config.dailyRateTitle) AppState.config.dailyRateTitle = 'ĐƠN GIÁ THEO NGÀY 12';
        if (!AppState.config.shuttleBillingMode) AppState.config.shuttleBillingMode = 'BY_SHUTTLE';
        if (!AppState.config.shuttleUnitPrice) {
          const bp = AppState.config.dailyBoxPrice || 340000;
          const sc = AppState.config.shuttlecocksPerBox || 12;
          AppState.config.shuttleUnitPrice = Math.round(bp / sc) || 28333;
        }
        if (AppState.config.defaultShuttlesPerSession === undefined || AppState.config.defaultShuttlesPerSession === null) AppState.config.defaultShuttlesPerSession = 6;
        if (AppState.config.monthlyClubFund === undefined || AppState.config.monthlyClubFund === null) AppState.config.monthlyClubFund = 50000;
        if (!AppState.config.viceLeaderId) AppState.config.viceLeaderId = isMainClub ? 'M002' : '';
        if (!AppState.config.permissions) {
          AppState.config.permissions = {
            allowViceLeaderAttendance: true,
            allowViceLeaderTournamentSync: true
          };
        }
        if (AppState.config.allowNegativeWallet === undefined) AppState.config.allowNegativeWallet = true;
        if (!AppState.config.settlementMode) AppState.config.settlementMode = 'MONTHLY';
        if (!AppState.config.defaultSettlementDay) AppState.config.defaultSettlementDay = 'END_OF_MONTH';
        if (!AppState.config.leadership) {
          AppState.config.leadership = isMainClub ? {
            president: 'M001',
            vicePresident1: 'M002',
            vicePresident2: 'M003',
            secretary: 'M004',
            treasurer: 'M005',
            media: 'M008',
            advisor1: 'M006',
            advisor2: 'M007'
          } : {
            president: AppState.members?.[0]?.id || '',
            vicePresident1: '',
            vicePresident2: '',
            secretary: '',
            treasurer: '',
            media: '',
            advisor1: '',
            advisor2: ''
          };
        } else if (!isMainClub) {
          // Loại bỏ ID mẫu của dev nếu không tồn tại trong danh sách thành viên CLB này
          const memberIds = new Set((AppState.members || []).map(m => m.id));
          ['president', 'vicePresident1', 'vicePresident2', 'secretary', 'treasurer', 'media', 'advisor1', 'advisor2'].forEach(k => {
            if (AppState.config.leadership[k] && !memberIds.has(AppState.config.leadership[k])) {
              AppState.config.leadership[k] = (k === 'president') ? (AppState.members?.[0]?.id || '') : '';
            }
          });
        }
        if (!AppState.config.customLabels) {
          AppState.config.customLabels = Object.assign({}, DEFAULT_CUSTOM_LABELS);
        } else {
          AppState.config.customLabels = Object.assign({}, DEFAULT_CUSTOM_LABELS, AppState.config.customLabels);
        }
      }

      if (!AppState.funds) AppState.funds = {};
      // Luôn đảm bảo chu kỳ tháng 9/2026 đã được chốt sổ tất toán theo đúng thực tế
      if (!AppState.closedMonths) AppState.closedMonths = [];
      if (!AppState.closedMonths.includes('2026-09')) {
        AppState.closedMonths.push('2026-09');
      }

      // Chuẩn hóa Quỹ tồn từ tháng trước chuyển sang (loại bỏ giá trị 1.099.986 đ do nhầm lẫn)
      if (AppState.funds.carriedForwardFund === 1099986 || AppState.funds.carriedForwardFund === '1099986' || !AppState.funds.carriedForwardFund) {
        AppState.funds.carriedForwardFund = 4400000;
        AppState.funds.carriedForwardFromMonth = '09/2026';
      }

      // Quỹ tạm ứng chu kỳ mới luôn reset về 0 đ
      AppState.funds.advanceFund = 0;
      AppState.funds.shuttleAdvanceFund = 0;
      AppState.funds.courtAdvanceFund = 0;
      AppState.funds.guestAdvanceIncome = 0;
      AppState.funds.shuttlePaidTotal = 0;
      AppState.funds.courtPaidTotal = 0;

      // Khởi tạo số dư Quỹ CLB nếu chưa có
      if (AppState.funds.clubFund === undefined || AppState.funds.clubFund === null) {
        AppState.funds.clubFund = 6700000;
      }

      if (!AppState.settlementSnapshots) AppState.settlementSnapshots = {};

      if (!AppState.personalExpenses) {
        AppState.personalExpenses = [];
      }

      if (!AppState.config) AppState.config = {};
      if (AppState.config.autoBackupIdleSeconds === undefined) {
        AppState.config.autoBackupIdleSeconds = 15;
      }
      AppState.config.autoBackupIdleMinutes = Math.round(AppState.config.autoBackupIdleSeconds / 60);
      refreshAllMembersWalletBreakdown();
      saveLocalDataOnly();
    } else {
      AppState = isMainClub ? JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA)) : getBlankClubInitialData(activeClub);
      refreshAllMembersWalletBreakdown();
      saveLocalDataOnly();
    }
  } catch (err) {
    console.error('Error loading data, using defaults:', err);
    const activeClub = getActiveClub();
    const isMainClub = activeClub.id === 'club_laptri' || activeClub.id === 'club_smash' || activeClub.accessSlug === 'lap-tri' || activeClub.accessSlug === 'smash';
    AppState = isMainClub ? JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA)) : getBlankClubInitialData(activeClub);
    refreshAllMembersWalletBreakdown();
    saveLocalDataOnly();
  }
}

function saveLocalDataOnly() {
  try {
    STORAGE_KEY = getCurrentClubStorageKey();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
  } catch (e) {}
}

function saveData() {
  try {
    AppState._lastModified = Date.now();
    STORAGE_KEY = getCurrentClubStorageKey();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));

    // Đồng bộ thông tin cơ bản sang danh bạ CLB (Clubs Registry)
    const activeId = getActiveClubId();
    const registry = getClubsRegistry();
    const currentClub = registry.find(c => c.id === activeId);
    if (currentClub && AppState.config) {
      let changed = false;
      if (AppState.config.clubName && currentClub.name !== AppState.config.clubName) {
        currentClub.name = AppState.config.clubName;
        changed = true;
      }
      if (AppState.config.themeColor && currentClub.themeColor !== AppState.config.themeColor) {
        currentClub.themeColor = AppState.config.themeColor;
        changed = true;
      }
      if (AppState.config.bankInfo && currentClub.bankInfo !== AppState.config.bankInfo) {
        currentClub.bankInfo = AppState.config.bankInfo;
        changed = true;
      }
      if (changed) {
        saveClubsRegistry(registry);
        const nameEl = document.getElementById('headerClubName');
        if (nameEl) nameEl.textContent = currentClub.name;
      }
    }

    // Phát tín hiệu tức thì đến các tab/cửa sổ khác trên máy
    if (appBroadcastChannel) {
      try {
        appBroadcastChannel.postMessage({ type: 'DATA_UPDATED' });
      } catch (err) {}
    }

    // Tự động đẩy lên Google Firebase Cloud Sync (nếu có kết nối)
    if (typeof pushDataToCloud === 'function') {
      pushDataToCloud();
    }
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
    showToast('Lỗi lưu trữ dữ liệu cục bộ!', 'error');
  }
}

// ==========================================
// 3. TIỆN ÍCH ĐỊNH DẠNG & THỜI GIAN
// ==========================================
function formatMoney(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  const num = Number(amount);
  return num.toLocaleString('vi-VN') + ' đ';
}

function getFormattedCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

function getTodayInputFormat() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNowTimestampString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

// ==========================================
// 4. BẢNG MÀU GIAO DIỆN (THEMES)
// ==========================================
const THEMES = {
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0',
    500: '#10b981', 600: '#059669', 700: '#047857'
  },
  cyan: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc',
    500: '#06b6d4', 600: '#0891b2', 700: '#0e7490'
  },
  ocean: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd',
    500: '#0284c7', 600: '#0369a1', 700: '#075985'
  },
  orange: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa',
    500: '#f97316', 600: '#ea580c', 700: '#c2410c'
  },
  red: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca',
    500: '#ef4444', 600: '#dc2626', 700: '#b91c1c'
  },
  purple: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff',
    500: '#a855f7', 600: '#9333ea', 700: '#7e22ce'
  }
};

function applyThemeColor(themeName) {
  const palette = THEMES[themeName] || THEMES.emerald;
  const root = document.documentElement;
  root.style.setProperty('--brand-50', palette[50]);
  root.style.setProperty('--brand-100', palette[100]);
  root.style.setProperty('--brand-200', palette[200]);
  root.style.setProperty('--brand-500', palette[500]);
  root.style.setProperty('--brand-600', palette[600]);
  root.style.setProperty('--brand-700', palette[700]);
  if (AppState.config) {
    AppState.config.themeColor = themeName;
  }
}

// ==========================================
// 5. TOAST THÔNG BÁO (DYNAMIC CONTAINER)
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Chống spam toast lặp lại nội dung giống nhau
  const existingToasts = Array.from(container.children);
  const isDuplicate = existingToasts.some(t => t.textContent.trim().includes(message.trim()));
  if (isDuplicate) return;

  // Giới hạn hiển thị tối đa 3 toast cùng lúc
  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = 'flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto';

  let iconName = 'check-circle-2';
  if (type === 'error') {
    toast.className += ' bg-rose-900/90 text-white border-rose-700 shadow-rose-950/20';
    iconName = 'alert-circle';
  } else if (type === 'warning') {
    toast.className += ' bg-amber-900/90 text-white border-amber-700 shadow-amber-950/20';
    iconName = 'alert-triangle';
  } else if (type === 'info') {
    toast.className += ' bg-slate-900/90 text-white border-slate-700 shadow-slate-950/20';
    iconName = 'info';
  } else {
    toast.className += ' bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/20';
    iconName = 'check-circle-2';
  }

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0 ${type === 'error' ? 'text-rose-400' : (type === 'warning' ? 'text-amber-400' : 'text-emerald-400')}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Animation show
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Auto hide & remove
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3000);
}

// ==========================================
// 6. ĐIỀU HƯỚNG TABS
// ==========================================
function memberPasswordIsDefault(mem) {
  if (!mem) return false;
  return mem.password === '123' || mem.password === '123456' || (mem.password === 'admin' && !mem.passwordChangedAt);
}

let currentTab = 'dashboard';

function switchTab(tabId) {
  if (tabId === 'matchmaker') tabId = 'tournament';

  // Nếu người dùng chưa hoàn thành đổi mật khẩu lần đầu, giữ ở trang chủ và nhắc nhở
  if (AppState.auth?.isLoggedIn && AppState.auth?.user?.id) {
    const mem = (AppState.members || []).find(m => m.id === AppState.auth.user.id);
    const isDefaultPass = mem && (mem.password === '123' || memberPasswordIsDefault(mem));
    if (mem && (mem.mustChangePassword === true || !mem.hasChangedPassword || isDefaultPass)) {
      tabId = 'dashboard';
      setTimeout(() => openFirstLoginPasswordModal(mem), 100);
    }
  }

  currentTab = tabId;
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Cập nhật desktop sidebar navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('text-brand-700', 'bg-brand-50');
    btn.classList.add('text-slate-600', 'hover:bg-slate-100');
  });
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.classList.remove('text-slate-600', 'hover:bg-slate-100');
    activeNav.classList.add('text-brand-700', 'bg-brand-50');
  }

  // Cập nhật ẩn/hiện điều hướng (ẩn Cấu hình & Sao lưu trên thanh menu đối với tài khoản thành viên)
  updateNavigationUI();

  // Cập nhật mobile navigation bar
  const curRole = getCurrentUserRole();
  const isMem = curRole === 'MEMBER';
  const canCfg = canConfigSystem() && !isMem;

  ['dashboard', 'attendance', 'finance', 'members', 'tournament', 'settings'].forEach(id => {
    const mBtn = document.getElementById(`m-nav-${id}`);
    if (mBtn) {
      const isHidden = (id === 'settings' && !canCfg);
      if (id === tabId) {
        mBtn.className = `flex flex-col items-center justify-center py-1 px-1 text-brand-700 transition active:scale-95 text-center flex-1 cursor-pointer ${isHidden ? 'hidden' : ''}`;
      } else {
        mBtn.className = `flex flex-col items-center justify-center py-1 px-1 text-slate-500 hover:text-brand-700 transition active:scale-95 text-center flex-1 cursor-pointer ${isHidden ? 'hidden' : ''}`;
      }
    }
  });

  // Re-render tab tương ứng
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'attendance') {
    renderAttendanceTab();
  } else if (tabId === 'finance') {
    renderFinanceTab();
  } else if (tabId === 'members') {
    renderMemberManagementList();
  } else if (tabId === 'tournament') {
    renderTournamentModule();
  } else if (tabId === 'settings') {
    renderSettingsTab();
  }

  lucide.createIcons();
}

/**
 * Cập nhật hiển thị các mục điều hướng (Ẩn Cấu hình & Sao lưu trên thanh menu với tài khoản thành viên)
 */
function updateNavigationUI() {
  const role = getCurrentUserRole();
  const isMember = role === 'MEMBER';
  const canConfig = canConfigSystem() && !isMember;

  // 1. Nút Cấu hình & Sao lưu trên Desktop Sidebar
  const navSettings = document.getElementById('nav-settings');
  if (navSettings) {
    if (canConfig) {
      navSettings.classList.remove('hidden');
    } else {
      navSettings.classList.add('hidden');
    }
  }

  // 2. Nút Cấu hình trên Mobile Bottom Navigation
  const mNavSettings = document.getElementById('m-nav-settings');
  if (mNavSettings) {
    if (canConfig) {
      mNavSettings.classList.remove('hidden');
    } else {
      mNavSettings.classList.add('hidden');
    }
  }

  // 3. Quản lý hiển thị Đăng xuất:
  // Nút đăng xuất dưới "Cấu hình & Sao lưu" và trên thanh menu dưới đã được gỡ bỏ hoàn toàn theo yêu cầu.
  // Đăng xuất chỉ hiển thị trên Header (userAuthBadge) khi tài khoản đã đăng nhập.
}

// ==========================================
// 7. CƠ CHẾ TÍNH BẬC TIỀN SÂN CẦU LÔNG
// ==========================================
/**
 * Tính đơn giá tiền sân cho người chơi:
 * - Khách giao lưu A/B/C: Lấy theo cấu hình riêng (VD: 70k, 100k, 150k)
 * - Thành viên chính thức & thành viên danh dự: Tính lũy kế theo số buổi trong tháng
 *   Mặc định: 0–4: 50k, 5–9: 100k, 10–15: 150k, 16–30+: 200k
 */
function calculateMemberCourtFee(member, isSimulatingNext = true) {
  if (!member) return 50000;

  if (member.type === 'GUEST_A') return AppState.config.guestPrices.GUEST_A || 90000;
  if (member.type === 'GUEST_B') return AppState.config.guestPrices.GUEST_B || 70000;
  if (member.type === 'GUEST_C') return AppState.config.guestPrices.GUEST_C || 50000;

  const sessionCount = (member.monthlySessions || 0) + (isSimulatingNext ? 1 : 0);
  const tiers = AppState.config.feeTiers || [];

  for (const tier of tiers) {
    if (sessionCount >= tier.minSessions && sessionCount <= tier.maxSessions) {
      return tier.price;
    }
  }

  // Nếu vượt quá các bậc đã định nghĩa, lấy bậc cao nhất
  if (tiers.length > 0) {
    return tiers[tiers.length - 1].price;
  }
  return 200000;
}

function getTierNameForSession(sessionCount) {
  const tiers = AppState.config.feeTiers || [];
  for (const tier of tiers) {
    if (sessionCount >= tier.minSessions && sessionCount <= tier.maxSessions) {
      return tier.name;
    }
  }
  return 'Bậc cao nhất';
}

function getMemberRoleBadge(type) {
  switch (type) {
    case 'OFFICIAL':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Chính thức</span>`;
    case 'HONORARY':
    case 'UNOFFICIAL':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Danh dự</span>`;
    case 'GUEST_A':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Level A · 90k</span>`;
    case 'GUEST_B':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Level B · 70k</span>`;
    case 'GUEST_C':
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Level C · 50k</span>`;
    default:
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">Khác</span>`;
  }
}

function getMemberRoleTypeText(type) {
  if (type === 'OFFICIAL') return 'Chính thức';
  if (type === 'HONORARY' || type === 'UNOFFICIAL') return 'Danh dự';
  const pA = AppState.config?.guestPrices?.GUEST_A ? `${Math.round(AppState.config.guestPrices.GUEST_A / 1000)}k` : '90k';
  const pB = AppState.config?.guestPrices?.GUEST_B ? `${Math.round(AppState.config.guestPrices.GUEST_B / 1000)}k` : '70k';
  const pC = AppState.config?.guestPrices?.GUEST_C ? `${Math.round(AppState.config.guestPrices.GUEST_C / 1000)}k` : '50k';
  if (type === 'GUEST_A') return `Khách Loại A (Level A - ${pA})`;
  if (type === 'GUEST_B') return `Khách Loại B (Level B - ${pB})`;
  if (type === 'GUEST_C') return `Khách Loại C (Level C - ${pC})`;
  return 'Hội viên';
}

/**
 * Tính tổng tiền sân của thành viên dựa trên loại hội viên và số buổi tham gia
 */
/**
 * Tính tổng tiền sân của thành viên dựa trên loại hội viên và số buổi tham gia
 * Áp dụng chuẩn theo Bậc tiền sân đã cấu hình (Thành viên chính thức và danh dự):
 * 0–4 buổi: Bậc 1 (50.000đ, 0 buổi tính theo mức 0-4 buổi là 50.000đ)
 * 5–9 buổi: Bậc 2 (100.000đ)
 * 10–15 buổi: Bậc 3 (150.000đ)
 * ≥16 buổi: Bậc 4 (200.000đ)
 */
function getMemberTotalCourtFee(member, sessionsCount) {
  if (!member) return 50000;
  const count = Math.max(0, Number(sessionsCount !== undefined ? sessionsCount : (member.monthlySessions || 0)) || 0);
  
  if (member.type === 'GUEST_A') {
    const pA = (AppState.config && AppState.config.guestPrices && AppState.config.guestPrices.GUEST_A) || 90000;
    return count * pA;
  }
  if (member.type === 'GUEST_B') {
    const pB = (AppState.config && AppState.config.guestPrices && AppState.config.guestPrices.GUEST_B) || 70000;
    return count * pB;
  }
  if (member.type === 'GUEST_C') {
    const pC = (AppState.config && AppState.config.guestPrices && AppState.config.guestPrices.GUEST_C) || 50000;
    return count * pC;
  }

  // Đối với thành viên chính thức & danh dự: áp dụng bậc tiền sân theo số buổi (0 buổi theo mức 0-4 buổi là 50.000đ)
  const tiers = (AppState.config && AppState.config.feeTiers) || [
    { id: 1, name: 'Bậc 1 (0–4 buổi)', minSessions: 0, maxSessions: 4, price: 50000 },
    { id: 2, name: 'Bậc 2 (5–9 buổi)', minSessions: 5, maxSessions: 9, price: 100000 },
    { id: 3, name: 'Bậc 3 (10–15 buổi)', minSessions: 10, maxSessions: 15, price: 150000 },
    { id: 4, name: 'Bậc 4 (16–30+ buổi)', minSessions: 16, maxSessions: 999, price: 200000 }
  ];
  for (const tier of tiers) {
    if (count >= tier.minSessions && count <= tier.maxSessions) {
      return tier.price;
    }
  }
  if (tiers.length > 0) return tiers[tiers.length - 1].price;
  return 50000;
}

/**
 * CÔNG THỨC CHUẨN THEO YÊU CẦU:
 * Số dư ví thành viên = Tiền nạp vào ví - chi phí cầu hàng ngày - tiền phạt - quỹ thành viên - tiền sân
 * Tiền sân được tính theo bậc được quy định và trừ vào ví thành viên.
 * @param {string|object} memberOrId
 * @returns {object} { member, topUp, dailyShuttleCost, fine, clubFund, courtFee, balance, sessionsCount, tierName }
 */
function calculateMemberWalletBreakdown(memberOrId) {
  const member = typeof memberOrId === 'string'
    ? (AppState.members || []).find(m => m.id === memberOrId)
    : memberOrId;

  if (!member) {
    return {
      member: null,
      topUp: 0,
      dailyShuttleCost: 0,
      fine: 0,
      clubFund: 0,
      courtFee: 0,
      balance: 0,
      sessionsCount: 0,
      tierName: 'Chưa xác định'
    };
  }

  const memberId = member.id;
  const memberName = (member.name || '').trim().toLowerCase();

  // 1. Số buổi tham gia & Chi phí cầu hàng ngày (dailyShuttleCost) trong chu kỳ hiện tại
  let sessionsCount = 0;
  let dailyShuttleCost = 0;

  (AppState.activitySessions || []).forEach(ses => {
    // Bỏ qua các buổi thuộc chu kỳ tháng đã chốt sổ / tất toán
    if (isDateOrMonthInClosedCycle(ses.date)) return;

    const attended = (ses.members || []).find(m => m.id === memberId || (m.name && (m.name.toLowerCase().includes(memberName) || memberName.includes(m.name.toLowerCase()))));
    if (attended) {
      sessionsCount++;
      const fee = attended.fee !== undefined ? attended.fee : (ses.shuttleFeePerMember || 0);
      dailyShuttleCost += fee;
    }
  });

  if (sessionsCount === 0 && (member.monthlySessions || 0) > 0 && (!AppState.closedMonths || AppState.closedMonths.length === 0)) {
    sessionsCount = member.monthlySessions;
  }

  // 2. Tiền phạt vi phạm (fine) trong chu kỳ hiện tại
  let fine = 0;
  (AppState.transactions || []).forEach(tx => {
    if (isDateOrMonthInClosedCycle(tx.date)) return;
    if (tx.isCancelled || tx.status === 'CANCELLED') return;
    if (tx.subType === 'FINE' || tx.type === 'FINE') {
      if (tx.memberId === memberId || (tx.targetName && (tx.targetName.toLowerCase().includes(memberName) || memberName.includes(tx.targetName.toLowerCase()))) || (tx.description && tx.description.toLowerCase().includes(memberName))) {
        fine += Math.abs(tx.amount || tx.walletImpact || 0);
      }
    }
  });

  // 3. Quỹ thành viên (clubFund) trong chu kỳ hiện tại
  let clubFund = 0;
  (AppState.transactions || []).forEach(tx => {
    if (isDateOrMonthInClosedCycle(tx.date)) return;
    if (tx.isCancelled || tx.status === 'CANCELLED') return;
    if (tx.subType === 'MEM_FUND') {
      if (tx.memberId === memberId || (tx.targetName && (tx.targetName.toLowerCase().includes(memberName) || memberName.includes(tx.targetName.toLowerCase())))) {
        clubFund += Math.abs(tx.walletImpact || tx.amount || 0);
      }
    }
  });

  // 4. Tiền sân theo bậc quy định (courtFee) trong chu kỳ hiện tại - Tự động trừ vào ví thành viên
  let courtFee = 0;
  (AppState.transactions || []).forEach(tx => {
    if (isDateOrMonthInClosedCycle(tx.date)) return;
    if (tx.isCancelled || tx.status === 'CANCELLED') return;
    if ((tx.type === 'COURT_FEE' || tx.subType === 'COURT_ADV_IN') && (tx.memberId === memberId || (tx.targetName && (tx.targetName.toLowerCase().includes(memberName) || memberName.includes(tx.targetName.toLowerCase()))))) {
      if (tx.walletImpact && tx.walletImpact < 0) {
        courtFee += Math.abs(tx.walletImpact);
      } else if (tx.amount && tx.amount < 0) {
        courtFee += Math.abs(tx.amount);
      }
    }
  });
  // CHỈ tính bậc tiền sân khi có buổi tham gia (sessionsCount > 0)
  if (courtFee === 0 && sessionsCount > 0) {
    courtFee = getMemberTotalCourtFee(member, sessionsCount);
  }

  // 5. Tiền nạp vào ví (topUp) trong chu kỳ hiện tại
  let topUpTransactions = 0;
  (AppState.transactions || []).forEach(tx => {
    if (isDateOrMonthInClosedCycle(tx.date)) return;
    if (tx.isCancelled || tx.status === 'CANCELLED') return;
    if (tx.type === 'TOPUP' || tx.subType === 'TOPUP' || tx.categoryGroup === 'WALLET_TOPUP' || tx.type === 'SETTLEMENT') {
      if (tx.memberId === memberId || (tx.targetName && (tx.targetName.toLowerCase().includes(memberName) || memberName.includes(tx.targetName.toLowerCase())))) {
        topUpTransactions += Math.abs(tx.amount || tx.walletImpact || 0);
      }
    }
  });

  // Đồng bộ số tiền nạp ví đã được Kế toán duyệt từ danh sách yêu cầu nạp tiền (không phụ thuộc vào sổ quỹ CLB)
  (AppState.topUpRequests || []).forEach(req => {
    if (isDateOrMonthInClosedCycle(req.createdAt || req.date)) return;
    if (req.status === 'APPROVED' && (req.memberId === memberId || (req.memberName && (req.memberName.toLowerCase().includes(memberName) || memberName.includes(req.memberName.toLowerCase()))))) {
      const alreadyInTx = (AppState.transactions || []).some(tx => (tx.requestId === req.id || tx.id === req.id) && !tx.isCancelled && tx.status !== 'CANCELLED');
      if (!alreadyInTx) {
        topUpTransactions += Math.abs(req.amount || 0);
      }
    }
  });

  if (member.initialBalance === undefined) {
    member.initialBalance = 0;
  }

  const topUp = (Number(member.initialBalance) || 0) + topUpTransactions;

  // CÔNG THỨC CHUẨN:
  // Số dư ví thành viên = Tiền nạp vào ví - chi phí cầu hàng ngày - tiền phạt - tiền sân
  // Khi sang chu kỳ mới mà chưa có buổi hoạt động hay nạp ví mới, số dư ví mặc định là 0 đ theo đúng nguyên tắc tất toán chốt sổ
  let balance = 0;
  if (topUp > 0 || dailyShuttleCost > 0 || fine > 0 || courtFee > 0) {
    balance = topUp - dailyShuttleCost - fine - courtFee - (topUp >= clubFund ? clubFund : 0);
  } else {
    balance = 0;
  }

  member.balance = balance;
  member.monthlySessions = sessionsCount;

  const tierName = getTierNameForSession(sessionsCount);

  return {
    member,
    topUp,
    dailyShuttleCost,
    fine,
    clubFund,
    courtFee,
    balance,
    sessionsCount,
    tierName
  };
}

/**
 * Tự động đồng bộ và tính lại số dư ví cho toàn bộ thành viên theo bậc tiền sân
 */
function refreshAllMembersWalletBreakdown() {
  if (!AppState.members || !Array.isArray(AppState.members)) return;
  AppState.members.forEach(member => {
    calculateMemberWalletBreakdown(member);
  });
}

// ==========================================
// 8. TRANG CHỦ & KPI DASHBOARD
// ==========================================
function renderDashboard() {
  refreshAllMembersWalletBreakdown();

  // 1. Tên CLB
  const clubNameEl = document.getElementById('headerClubName');
  if (clubNameEl) clubNameEl.textContent = AppState.config.clubName;

  // 2. Ngày hiện tại
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) dateEl.textContent = getFormattedCurrentDate();

  // 3. KPI 1: Quỹ CLB
  const clubFundEl = document.getElementById('kpiClubFund');
  if (clubFundEl) clubFundEl.textContent = formatMoney(AppState.funds?.clubFund || 0);

  const clubFundDescEl = document.getElementById('kpiClubFundDesc');
  const carried = Number(AppState.funds?.carriedForwardFund) || 0;
  const carriedFrom = AppState.funds?.carriedForwardFromMonth;
  if (clubFundDescEl) {
    if (carried > 0) {
      const fromText = carriedFrom ? `Tồn T${carriedFrom}` : 'Tồn tháng trước';
      clubFundDescEl.textContent = `${fromText}: ${formatMoney(carried)}`;
      clubFundDescEl.className = 'text-[9px] sm:text-[11px] text-emerald-600 font-bold mt-0.5 truncate block';
    } else {
      clubFundDescEl.textContent = 'Tổng số quỹ thực có cuối tháng của CLB';
      clubFundDescEl.className = 'text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate block';
    }
  }

  // 4. KPI 2: Quỹ tạm ứng
  const advFundEl = document.getElementById('kpiAdvanceFund');
  if (advFundEl) advFundEl.textContent = formatMoney(AppState.funds?.advanceFund || 0);

  const advFundDescEl = document.getElementById('kpiAdvanceFundDesc');
  if (advFundDescEl) {
    advFundDescEl.className = 'text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate block';
  }

  // 5. KPI 3: Số dư ví cá nhân (Đối với tất cả tài khoản đăng nhập: Quản lý, Phó nhóm, Thủ quỹ hay Hội viên đều hiển thị ví cá nhân của chính mình)
  const currentUser = AppState.auth?.user;
  const totalWalletEl = document.getElementById('kpiTotalWallet');
  const kpiWalletLabelEl = document.getElementById('kpiWalletLabel');
  const kpiWalletDescEl = document.getElementById('kpiWalletDesc');
  const totalClubWallet = (AppState.members || []).reduce((sum, m) => sum + (m.balance || 0), 0);

  if (currentUser) {
    const mem = (AppState.members || []).find(m => 
      m.id === currentUser.id || 
      (m.username && m.username.toLowerCase() === (currentUser.username || '').toLowerCase()) ||
      (m.name && m.name.toLowerCase() === (currentUser.name || '').toLowerCase())
    ) || (AppState.members ? AppState.members[0] : null);

    const b = mem ? calculateMemberWalletBreakdown(mem) : null;
    const myBalance = (mem && mem.balance !== undefined) ? mem.balance : (b ? b.balance : 0);

    if (totalWalletEl) {
      totalWalletEl.textContent = formatMoney(myBalance);
      totalWalletEl.className = myBalance < 0 
        ? 'text-xs sm:text-lg md:text-2xl font-black text-rose-600 block truncate' 
        : 'text-xs sm:text-lg md:text-2xl font-black text-emerald-700 block truncate';
    }
    if (kpiWalletLabelEl) {
      kpiWalletLabelEl.textContent = getCustomLabel('userWallet', 'Ví Của Bạn');
    }
    if (kpiWalletDescEl) {
      const displayName = mem ? (mem.chipName || mem.name) : (currentUser.name || currentUser.username);
      if (currentUser.role === 'MEMBER') {
        kpiWalletDescEl.textContent = `Tài khoản: ${displayName}`;
      } else {
        kpiWalletDescEl.innerHTML = `Ví cá nhân: <b>${escapeHtml(displayName)}</b> <span class="text-slate-400 font-normal">| Tổng ví CLB: ${formatMoney(totalClubWallet)}</span>`;
      }
    }
  } else {
    // Khi chưa đăng nhập: Hiển thị tổng số dư ví toàn CLB
    if (totalWalletEl) {
      totalWalletEl.textContent = formatMoney(totalClubWallet);
      totalWalletEl.className = 'text-xs sm:text-lg md:text-2xl font-black text-slate-900 block truncate';
    }
    if (kpiWalletLabelEl) kpiWalletLabelEl.textContent = getCustomLabel('userWallet', 'Ví Thành Viên');
    if (kpiWalletDescEl) kpiWalletDescEl.textContent = 'Tổng tiền ví toàn CLB';
  }

  // 6. Render thống kê hoạt động theo buổi & chi phí kỳ này
  renderDashboardActivityStats();
  renderDashboardWalletList();

  // 8. Render giao dịch gần đây
  renderRecentTransactions();

  // 9. Auth badge
  renderAuthBadge();

  // 10. Multi-Club Switcher in Header
  renderClubSwitcher();

  // 11. Cập nhật thông báo yêu cầu nạp tiền chờ xác thực
  renderTopUpBadges();

  // 12. Áp dụng nhãn tên gọi thư mục tùy biến
  applyCustomLabels();
}

function renderDashboardWalletList() {
  const tbody = document.getElementById('dashboardWalletTableBody');
  const searchInput = document.getElementById('searchMemberWallet');
  const memberCountBadge = document.getElementById('memberCountBadge');
  if (!tbody) return;

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let list = AppState.members;
  if (query) {
    list = list.filter(m => m.name.toLowerCase().includes(query) || (m.phone && m.phone.includes(query)));
  }

  if (memberCountBadge) memberCountBadge.textContent = `${list.length} TV`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Không tìm thấy thành viên phù hợp</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => {
    const isNegative = (m.balance || 0) < 0;
    const balanceClass = isNegative ? 'text-rose-600 font-bold' : ((m.balance || 0) < 100000 ? 'text-amber-600 font-bold' : 'text-slate-800 font-bold');
    
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-900">${m.name}</span>
            <button onclick="openQuickRenameModal('${m.id}')" class="text-slate-400 hover:text-brand-600 p-0.5 rounded transition" title="Đổi tên / SĐT thành viên">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div class="text-[11px] text-slate-400 font-normal">${m.phone || 'Chưa có SĐT'}</div>
        </td>
        <td class="py-2.5 px-2">
          ${getMemberRoleBadge(m.type)}
        </td>
        <td class="py-2.5 px-2 text-center font-bold text-slate-700">
          ${m.monthlySessions || 0} buổi
        </td>
        <td class="py-2.5 px-3 text-right ${balanceClass}">
          ${formatMoney(m.balance || 0)}
        </td>
        <td class="py-2.5 px-2 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="quickCheckInSingleMember('${m.id}')" class="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-bold rounded-lg text-[11px] transition" title="⚡ Điểm danh 1-chạm (trừ ví ngay)">
              ⚡
            </button>
            <button onclick="openTopUpModalForMember('${m.id}')" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-[11px] transition" title="Nạp ví nhanh">
              + Nạp
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRecentTransactions() {
  const container = document.getElementById('recentTransactionsList');
  if (!container) return;

  const currentUser = AppState.auth?.user;
  const isMemberRole = currentUser && currentUser.role === 'MEMBER';
  const currentMemberId = currentUser ? currentUser.id : null;
  const currentMemberName = currentUser ? (currentUser.name || '').trim().toLowerCase() : '';

  let list = (AppState.transactions || []).slice();

  // Nếu là tài khoản thành viên: CHỈ hiển thị giao dịch liên quan đến chính thành viên này
  if (isMemberRole) {
    list = list.filter(tx => {
      if (currentMemberId && tx.memberId === currentMemberId) return true;
      if (currentMemberName && tx.targetName && (tx.targetName.toLowerCase().includes(currentMemberName) || currentMemberName.includes(tx.targetName.toLowerCase()))) return true;
      if (currentMemberName && tx.description && tx.description.toLowerCase().includes(currentMemberName)) return true;
      return false;
    });
  }

  const recent = list.reverse().slice(0, 8);

  if (recent.length === 0) {
    container.innerHTML = `<div class="py-8 text-center text-slate-400 text-xs">${isMemberRole ? 'Chưa có giao dịch nào được ghi nhận cho tài khoản của bạn' : 'Chưa có giao dịch nào được ghi nhận'}</div>`;
    return;
  }

  container.innerHTML = recent.map(tx => {
    let icon = 'arrow-right-left';
    let iconBg = 'bg-slate-100 text-slate-600';
    let amountColor = 'text-slate-900';
    let prefix = '';

    if (tx.type === 'TOPUP') {
      icon = 'plus-circle';
      iconBg = 'bg-emerald-50 text-emerald-600';
      amountColor = 'text-emerald-600';
      prefix = '+';
    } else if (tx.type === 'COURT_FEE') {
      icon = 'check-circle';
      iconBg = 'bg-blue-50 text-blue-600';
      amountColor = 'text-slate-800';
      prefix = '-';
    } else if (tx.type === 'FUND_IN') {
      icon = 'trending-up';
      iconBg = 'bg-emerald-50 text-emerald-600';
      amountColor = 'text-emerald-600';
      prefix = '+';
    } else if (tx.type === 'FUND_OUT') {
      icon = 'trending-down';
      iconBg = 'bg-rose-50 text-rose-600';
      amountColor = 'text-rose-600';
      prefix = '-';
    } else if (tx.type === 'FINE') {
      icon = 'alert-triangle';
      iconBg = 'bg-amber-50 text-amber-600';
      amountColor = 'text-amber-600';
      prefix = '+';
    } else if (tx.type === 'ADVANCE') {
      icon = 'hand-coins';
      iconBg = 'bg-purple-50 text-purple-600';
      amountColor = 'text-purple-600';
    }

    const cleanAmount = Math.abs(tx.amount);

    return `
      <div class="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition flex items-start justify-between gap-2">
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5">
            <i data-lucide="${icon}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="font-bold text-xs text-slate-800">${tx.targetName || 'Giao dịch'}</div>
            <div class="text-[11px] text-slate-500 line-clamp-1">${tx.description}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">${tx.date}</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-black text-xs ${amountColor}">${prefix}${formatMoney(cleanAmount)}</div>
          <div class="text-[10px] text-slate-400">${tx.operator || 'admin'}</div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// ==========================================
// 8B. THỐNG KÊ HOẠT ĐỘNG THEO BUỔI & CHI PHÍ KỲ NÀY (THEO MẪU ẢNH THỰC TẾ)
// ==========================================
let currentStatMemberFilter = 'CURRENT';

function onStatMemberFilterChange(val) {
  currentStatMemberFilter = val;
  renderDashboardActivityStats();
}

function renderDashboardActivityStats() {
  const listContainer = document.getElementById('dashboardRecentActivitiesList');
  if (!listContainer) return;

  if (!AppState.activitySessions) {
    AppState.activitySessions = [];
  }

  // 1. Cập nhật dropdown chọn thành viên
  const filterSelect = document.getElementById('statMemberFilterSelect');
  const currentUser = AppState.auth?.user;
  const isMemberRole = currentUser && currentUser.role === 'MEMBER';
  const loggedInUserId = (currentUser && currentUser.id) ? currentUser.id : 'M001';
  const loggedInUser = (AppState.members || []).find(m => m.id === loggedInUserId) || (AppState.members ? AppState.members[0] : null);

  if (filterSelect) {
    if (isMemberRole) {
      // Thành viên thông thường CHỈ được xem thông tin ví tài khoản của chính mình
      const displayName = loggedInUser ? (loggedInUser.chipName || loggedInUser.name) : 'Bạn';
      filterSelect.innerHTML = `<option value="${loggedInUser ? loggedInUser.id : 'CURRENT'}" selected>Cá nhân (${displayName})</option>`;
      filterSelect.disabled = true;
      filterSelect.title = 'Tài khoản thành viên chỉ xem thông tin ví cá nhân của mình';
    } else {
      filterSelect.disabled = false;
      filterSelect.title = 'Chọn thành viên hoặc xem toàn CLB';
      const currentVal = currentStatMemberFilter;
      const memberOptions = (AppState.members || []).map(m => {
        const isSelected = m.id === currentVal ? 'selected' : '';
        return `<option value="${m.id}" ${isSelected}>${m.chipName || m.name}</option>`;
      }).join('');

      filterSelect.innerHTML = `
        <option value="CURRENT" ${currentVal === 'CURRENT' ? 'selected' : ''}>Cá nhân (${loggedInUser ? (loggedInUser.chipName || loggedInUser.name) : 'Bạn'})</option>
        <option value="ALL" ${currentVal === 'ALL' ? 'selected' : ''}>Toàn CLB (Tổng hợp)</option>
        ${memberOptions}
      `;
    }
  }

  // Xác định thành viên cần tính thống kê
  let targetMemberId = currentStatMemberFilter;
  if (isMemberRole || targetMemberId === 'CURRENT') {
    targetMemberId = loggedInUserId;
  }
  const isAllClub = !isMemberRole && targetMemberId === 'ALL';
  const targetMember = isAllClub ? null : ((AppState.members || []).find(m => m.id === targetMemberId) || loggedInUser);

  // Cập nhật tiêu đề thẻ
  const titleEl = document.getElementById('statCardHeaderTitle');
  if (titleEl) {
    if (isAllClub) {
      titleEl.textContent = 'Tháng này của CLB';
    } else if (targetMember && targetMember.id === loggedInUserId) {
      titleEl.textContent = 'Tháng này của bạn';
    } else if (targetMember) {
      titleEl.textContent = `Tháng này của ${targetMember.chipName || targetMember.name}`;
    }
  }

  // 2. Render danh sách Hoạt động gần đây (lấy 4 buổi mới nhất theo đúng ảnh)
  const recentSessions = (AppState.activitySessions || []).slice(0, 4);

  if (recentSessions.length === 0) {
    listContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">Chưa có buổi hoạt động nào được ghi nhận</div>`;
  } else {
    listContainer.innerHTML = recentSessions.map(ses => {
      // Định dạng ngày: "2026-09-25" -> "25/09"
      let dateDisplay = ses.date || '';
      if (dateDisplay.includes('-')) {
        const parts = dateDisplay.split('-');
        if (parts.length === 3) dateDisplay = `${parts[2]}/${parts[1]}`;
      } else if (dateDisplay.includes('/')) {
        const parts = dateDisplay.split('/');
        if (parts.length >= 2) dateDisplay = `${parts[0]}/${parts[1]}`;
      }

      const count = ses.attendeeCount || (ses.members ? ses.members.length : 0);

      // Hiển thị số tiền hoặc gạch ngang (—)
      let feeDisplay = '—';
      if (isAllClub) {
        feeDisplay = formatMoney(ses.shuttleTotal || 0);
      } else if (targetMember) {
        const attended = (ses.members || []).find(m => m.id === targetMember.id);
        if (attended) {
          feeDisplay = formatMoney(attended.fee !== undefined ? attended.fee : (ses.shuttleFeePerMember || 0));
        } else {
          feeDisplay = '—';
        }
      }

      return `
        <div class="flex items-center justify-between p-3 sm:p-3.5 hover:bg-emerald-50/50 transition cursor-pointer" onclick="openSessionAttendanceView('${ses.id}')" title="Bấm vào để mở giao diện hoạt động đã điểm danh ngày ${dateDisplay}">
          <div class="flex items-center min-w-0">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="clock" class="w-4 h-4 sm:w-5 sm:h-5"></i>
            </div>
            <div class="ml-3 min-w-0">
              <div class="font-bold text-slate-900 text-xs sm:text-sm truncate">Buổi cầu</div>
              <div class="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-medium">${dateDisplay} · ${count} người</div>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="font-bold text-slate-900 text-xs sm:text-sm">${feeDisplay}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Tính toán Bảng Thống Kê Kỳ Này Theo Công Thức Ví Thành Viên:
  // Số dư ví thành viên = Tiền nạp vào ví - chi phí cầu hàng ngày - tiền phạt - quỹ thành viên - tiền sân
  const countEl = document.getElementById('statSummarySessionsCount');
  const topUpEl = document.getElementById('statSummaryTopUp');
  const shuttleEl = document.getElementById('statSummaryShuttleCost');
  const fineEl = document.getElementById('statSummaryFine');
  const clubFundEl = document.getElementById('statSummaryClubFund');
  const courtEl = document.getElementById('statSummaryCourtFee');
  const balanceEl = document.getElementById('statSummaryWalletBalance');

  if (isAllClub) {
    let grandSessions = (AppState.activitySessions || []).length;
    let grandTopUp = 0;
    let grandShuttle = 0;
    let grandFine = 0;
    let grandClubFund = 0;
    let grandCourt = 0;
    let grandBalance = 0;

    (AppState.members || []).forEach(m => {
      const b = calculateMemberWalletBreakdown(m);
      grandTopUp += b.topUp;
      grandShuttle += b.dailyShuttleCost;
      grandFine += b.fine;
      grandClubFund += b.clubFund;
      grandCourt += b.courtFee;
      grandBalance += b.balance;
    });

    if (countEl) countEl.textContent = `${grandSessions} buổi`;
    if (topUpEl) topUpEl.textContent = `+${formatMoney(grandTopUp)}`;
    if (shuttleEl) shuttleEl.textContent = `-${formatMoney(grandShuttle)}`;
    if (fineEl) fineEl.textContent = grandFine > 0 ? `-${formatMoney(grandFine)}` : '0 đ';
    if (clubFundEl) clubFundEl.textContent = grandClubFund > 0 ? `-${formatMoney(grandClubFund)}` : '0 đ';
    if (courtEl) courtEl.textContent = grandCourt > 0 ? `-${formatMoney(grandCourt)}` : '0 đ';
    if (balanceEl) {
      balanceEl.textContent = `=${formatMoney(grandBalance)}`;
      balanceEl.className = grandBalance < 0 ? 'text-sm sm:text-base font-black text-rose-600' : 'text-sm sm:text-base font-black text-emerald-700';
    }
  } else {
    const activeTarget = targetMember || loggedInUser;
    const b = calculateMemberWalletBreakdown(activeTarget);

    if (countEl) countEl.textContent = `${b.sessionsCount} buổi`;
    if (topUpEl) topUpEl.textContent = `+${formatMoney(b.topUp)}`;
    if (shuttleEl) shuttleEl.textContent = `-${formatMoney(b.dailyShuttleCost)}`;
    if (fineEl) fineEl.textContent = b.fine > 0 ? `-${formatMoney(b.fine)}` : '0 đ';
    if (clubFundEl) clubFundEl.textContent = b.clubFund > 0 ? `-${formatMoney(b.clubFund)}` : '0 đ';
    if (courtEl) courtEl.textContent = b.courtFee > 0 ? `-${formatMoney(b.courtFee)}` : '0 đ';
    if (balanceEl) {
      balanceEl.textContent = `=${formatMoney(b.balance)}`;
      balanceEl.className = b.balance < 0 ? 'text-sm sm:text-base font-black text-rose-600' : 'text-sm sm:text-base font-black text-emerald-700';
    }
  }

  // Cập nhật Sổ chi phí cá nhân & Tổng chi trong tháng trên Dashboard
  if (typeof renderHomePersonalExpenseWidget === 'function') {
    renderHomePersonalExpenseWidget(targetMember ? targetMember.id : loggedInUserId);
  }

  lucide.createIcons();
}

function openActivityHistoryModal() {
  if (!AppState.activitySessions) {
    AppState.activitySessions = [];
  }
  const badge = document.getElementById('activityHistoryTotalBadge');
  if (badge) badge.textContent = `${AppState.activitySessions.length} buổi`;

  const container = document.getElementById('activityHistoryListContainer');
  if (container) {
    if (AppState.activitySessions.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">Chưa có buổi hoạt động nào</div>`;
    } else {
      container.innerHTML = AppState.activitySessions.map(ses => {
        let dateFormatted = ses.date || '';
        if (dateFormatted.includes('-')) {
          dateFormatted = dateFormatted.split('-').reverse().join('/');
        }
        const memberCount = (ses.members || []).length;
        const guestCount = (ses.guests || []).length;
        const exClubs = Array.isArray(ses.exchangeClubs) && ses.exchangeClubs.length > 0 
          ? ses.exchangeClubs 
          : (ses.exchangeClub ? [ses.exchangeClub] : []);
        const exCount = exClubs.reduce((sum, c) => sum + ((c.members || []).length || c.count || 0), 0);
        const exNames = exClubs.map(c => c.name).filter(Boolean).join(', ');
        const totalPeople = ses.attendeeCount || (memberCount + guestCount + exCount);
        const exBadge = exClubs.length > 0 ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black">🤝 ${escapeHtml(exNames || 'CLB Giao lưu')} (${exCount} TV)</span>` : '';

        return `
          <div class="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200 transition flex items-center justify-between gap-3 cursor-pointer" onclick="openSessionAttendanceView('${ses.id}')" title="Bấm vào để mở giao diện hoạt động đã điểm danh ngày ${dateFormatted}">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                🏸
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <b class="text-slate-900 text-xs sm:text-sm">Buổi cầu: ${dateFormatted}</b>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">${totalPeople} người</span>
                  ${exBadge}
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Tiền cầu: <b class="text-emerald-700 font-bold">${formatMoney(ses.shuttleTotal || 0)}</b></span>
                  <span>•</span>
                  <span>Mỗi TV: <b class="text-indigo-700 font-bold">${formatMoney(ses.shuttleFeePerMember || 0)}</b></span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0" onclick="event.stopPropagation()">
              <button type="button" onclick="openSessionAttendanceView('${ses.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1">
                <span>🏸</span> <span>Xem hoạt động</span>
              </button>
              ${(isAttendanceManager() && !isMonthClosed(ses.date)) ? `
                <button type="button" onclick="loadSessionIntoEditMode('${ses.id}')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                  <span>✏️</span> <span>Sửa</span>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  openModal('activityHistoryModal');
}

function openActivitySessionDetailModal(sessionId) {
  const ses = (AppState.activitySessions || []).find(s => s.id === sessionId);
  if (!ses) return;

  const titleEl = document.getElementById('sessionDetailModalTitle');
  const subEl = document.getElementById('sessionDetailModalSub');
  const bodyEl = document.getElementById('sessionDetailModalBody');

  let dateFormatted = ses.date || '';
  if (dateFormatted.includes('-')) {
    dateFormatted = dateFormatted.split('-').reverse().join('/');
  }

  const exClubs = Array.isArray(ses.exchangeClubs) && ses.exchangeClubs.length > 0 
    ? ses.exchangeClubs 
    : (ses.exchangeClub ? [ses.exchangeClub] : []);
  const exCount = exClubs.reduce((sum, c) => sum + ((c.members || []).length || c.count || 0), 0);
  const exNames = exClubs.map(c => c.name).filter(Boolean).join(', ');
  const totalParticipants = ses.attendeeCount || ((ses.members ? ses.members.length : 0) + (ses.guests ? ses.guests.length : 0) + exCount);

  if (titleEl) titleEl.textContent = `Buổi Cầu Ngày ${dateFormatted}${exClubs.length > 0 ? ` • Giao lưu ${exNames}` : ''}`;
  if (subEl) subEl.textContent = `Tổng cộng: ${totalParticipants} người tham gia${exClubs.length > 0 ? ` (${(ses.members || []).length} TV chủ nhà + ${exCount} TV bạn)` : ''}`;

  if (bodyEl) {
    const memberChips = (ses.members || []).map(m => `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
        <span>👤 ${m.name}</span>
        <span class="text-emerald-600 font-bold">(${formatMoney(m.fee !== undefined ? m.fee : ses.shuttleFeePerMember)})</span>
      </span>
    `).join('');

    const guestChips = (ses.guests || []).map(g => `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200 text-xs font-bold text-amber-900 shadow-2xs">
        <span>🎟️ ${g.name}</span>
        <span class="text-amber-700 font-bold">(${formatMoney(g.fee || 50000)})</span>
      </span>
    `).join('');

    const exTotalPay = ses.exchangePaid !== undefined ? ses.exchangePaid : exClubs.reduce((sum, c) => sum + (c.totalPay || ((c.count || (c.members || []).length) * (c.feePerPerson || ses.shuttleFeePerMember || 0))), 0);

    bodyEl.innerHTML = `
      <div class="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <div>
          <span class="text-[10px] text-slate-500 block font-bold">🏸 Tiền cầu</span>
          <b class="text-emerald-800 font-black text-xs sm:text-sm">${formatMoney(ses.shuttleTotal || 0)}</b>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 block font-bold">🎟️ ${exClubs.length > 0 ? `CLB bạn & Khách` : 'Thu khách'}</span>
          <b class="text-amber-800 font-black text-xs sm:text-sm">${formatMoney((ses.guestPaid || 0) + exTotalPay)}</b>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 block font-bold">⚡ Mỗi TV đóng</span>
          <b class="text-indigo-800 font-black text-xs sm:text-sm">${formatMoney(ses.shuttleFeePerMember || 0)}</b>
        </div>
      </div>

      ${exClubs.length > 0 ? `
      <div class="space-y-2">
        ${exClubs.map(c => {
          const cMems = Array.isArray(c.members) ? c.members : [];
          const cCount = c.count || cMems.length;
          const cPay = c.totalPay || (cCount * (c.feePerPerson || ses.shuttleFeePerMember || 0));
          return `
          <div class="p-3 bg-amber-50/70 rounded-2xl border border-amber-300/80 space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <span>🤝</span>
                <span>CLB Giao Lưu: <b>${escapeHtml(c.name || 'CLB Giao lưu')}</b></span>
              </div>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                ${cCount} người • Đóng ${formatMoney(cPay)}
              </span>
            </div>
            <div class="text-[11px] text-amber-800 font-semibold">
              Chi phí chia đều: <b>${formatMoney(c.feePerPerson || ses.shuttleFeePerMember || 0)}/người</b>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${cMems.length > 0 ? cMems.map(name => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-300 text-xs font-black text-amber-950 shadow-2xs">
                  <span>🤝 ${escapeHtml(name)}</span>
                  <span class="text-amber-700 font-bold">(${formatMoney(c.feePerPerson || ses.shuttleFeePerMember || 0)})</span>
                </span>
              `).join('') : '<span class="text-xs text-amber-700 italic">Chưa có tên thành viên</span>'}
            </div>
          </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      <div>
        <h5 class="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
          <span>Danh sách Thành viên Lập Trí (${(ses.members || []).length} TV):</span>
        </h5>
        <div class="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-40 overflow-y-auto">
          ${memberChips || '<span class="text-slate-400 italic">Không có thành viên chính thức</span>'}
        </div>
      </div>

      ${guestChips ? `
      <div>
        <h5 class="font-bold text-slate-800 mb-1.5">Khách tham gia (${(ses.guests || []).length} khách):</h5>
        <div class="flex flex-wrap gap-1.5 p-2 bg-amber-50/50 rounded-xl border border-amber-100 max-h-28 overflow-y-auto">
          ${guestChips}
        </div>
      </div>
      ` : ''}

      <div class="pt-2 flex flex-col gap-2">
        <button type="button" onclick="openSessionAttendanceView('${ses.id}')" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer">
          <span>🏸</span>
          <span>Xem Giao Diện Hoạt Động Đã Điểm Danh</span>
        </button>
        ${(isAttendanceManager() && !isMonthClosed(ses.date)) ? `
          <button type="button" onclick="loadSessionIntoEditMode('${ses.id}')" class="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer">
            <span>✏️</span>
            <span>Chỉnh sửa buổi hoạt động này (Quản trị viên)</span>
          </button>
        ` : (isMonthClosed(ses.date) ? `
          <div class="p-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <span>🔒</span>
            <span>Buổi hoạt động này đã thuộc tháng chốt sổ cuối tháng (Đã khóa chỉnh sửa)</span>
          </div>
        ` : '')}
      </div>

      <div class="text-[11px] text-slate-400 text-center pt-2">
        Thời gian chốt sổ: ${ses.timestamp || dateFormatted}
      </div>
    `;
  }

  openModal('activitySessionDetailModal');
}

// ==========================================
// 9. BUỔI HOẠT ĐỘNG, ĐIỂM DANH & CHIA TIỀN (THEO MẪU ẢNH MOBILE)
// ==========================================
let activityState = {
  initialized: false,
  date: '',
  type: 'Buổi cầu',
  lang: 'VI',
  exchangeClubName: '',
  exchangeMembers: [],
  exchangeClubs: [],
  selectedMemberIds: new Set(),
  selectedGuestIds: new Set(),
  saveGuestDebt: false,
  shuttleBillingMode: 'BY_SHUTTLE',
  shuttleCount: 6,
  dailyBoxPrice: 340000,
  expenses: [
    { id: 1, title: 'Tiền cầu', qty: 12, unitPrice: 28333, amount: 340000, isCombo: false, isShuttleRow: true }
  ],
  frontPersonId: 'NONE',
  frontAmount: 0,
  isFrontAll: false,
  tipAmount: 0,
  matches: [],
  isEditingFinalizedSession: false,
  editingSessionId: null
};

function saveActivitySessionState() {
  try {
    const clubId = getActiveClubId();
    const sessionKey = 'CLB_SESSION_' + clubId;
    const serializable = {
      date: activityState.date,
      type: activityState.type,
      lang: activityState.lang || 'VI',
      exchangeClubName: activityState.exchangeClubName || '',
      exchangeMembers: Array.isArray(activityState.exchangeMembers) ? activityState.exchangeMembers : [],
      exchangeClubs: Array.isArray(activityState.exchangeClubs) ? activityState.exchangeClubs : [],
      selectedMemberIds: Array.from(activityState.selectedMemberIds || []),
      selectedGuestIds: Array.from(activityState.selectedGuestIds || []),
      saveGuestDebt: activityState.saveGuestDebt,
      shuttleBillingMode: activityState.shuttleBillingMode,
      shuttleCount: activityState.shuttleCount,
      dailyBoxPrice: activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000,
      expenses: activityState.expenses,
      frontPersonId: activityState.frontPersonId,
      frontAmount: activityState.frontAmount,
      isFrontAll: activityState.isFrontAll,
      tipAmount: activityState.tipAmount,
      matches: activityState.matches,
      temporaryAttendanceSaved: activityState.temporaryAttendanceSaved,
      savedAttendanceTime: activityState.savedAttendanceTime,
      isEditingAttendance: activityState.isEditingAttendance,
      isEditingFinalizedSession: !!activityState.isEditingFinalizedSession,
      editingSessionId: activityState.editingSessionId || null,
      updatedAt: Date.now()
    };
    localStorage.setItem(sessionKey, JSON.stringify(serializable));

    // Phát tín hiệu tức thì đến các tab/cửa sổ khác trên máy
    if (appBroadcastChannel) {
      try {
        appBroadcastChannel.postMessage({ type: 'SESSION_UPDATED', session: serializable });
      } catch (err) {}
    }

    // Đồng bộ phiên hoạt động đang diễn ra lên đám mây thời gian thực
    if (AppState) {
      AppState.currentSession = serializable;
      saveData();
      if (firebaseDb && !isReceivingFromCloud) {
        const club = getActiveClub();
        const cleanSlug = getCanonicalClubSlug(club?.accessSlug || club?.id || 'lap-tri');
        try {
          firebaseDb.ref(`clubs/${cleanSlug}/attendance/currentSession`).set(serializable).catch(() => {});
        } catch (e) {}
      }
    }
  } catch (e) {}
}

function applyLiveSessionFromCloud(data) {
  if (!data) return false;
  try {
    const validMemberIds = new Set((AppState.members || []).map(m => m.id));
    const restoredMembers = new Set((data.selectedMemberIds || []).filter(id => validMemberIds.has(id)));
    const restoredGuests = new Set((data.selectedGuestIds || []).filter(id => validMemberIds.has(id)));

    activityState.date = data.date || getTodayInputFormat();
    activityState.type = data.type || 'Buổi cầu';
    activityState.lang = data.lang || 'VI';
    activityState.exchangeClubName = data.exchangeClubName || '';
    activityState.exchangeMembers = Array.isArray(data.exchangeMembers) ? data.exchangeMembers : [];
    if (Array.isArray(data.exchangeClubs) && data.exchangeClubs.length > 0) {
      activityState.exchangeClubs = data.exchangeClubs;
      activityState.exchangeClubName = activityState.exchangeClubs.map(c => c.name).filter(Boolean).join(', ');
      activityState.exchangeMembers = activityState.exchangeClubs.flatMap(c => c.members || []);
    } else if (activityState.exchangeClubName || activityState.exchangeMembers.length > 0) {
      activityState.exchangeClubs = [{
        id: 'EXC_1',
        name: activityState.exchangeClubName || 'CLB Giao lưu',
        members: [...activityState.exchangeMembers]
      }];
    } else {
      activityState.exchangeClubs = [];
    }
    activityState.selectedMemberIds = restoredMembers;
    activityState.selectedGuestIds = restoredGuests;
    activityState.saveGuestDebt = !!data.saveGuestDebt;
    activityState.shuttleBillingMode = data.shuttleBillingMode || 'BY_SHUTTLE';
    activityState.shuttleCount = data.shuttleCount || 6;
    activityState.dailyBoxPrice = data.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
    if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
      activityState.expenses = data.expenses;
    }
    activityState.frontPersonId = data.frontPersonId || 'NONE';
    activityState.frontAmount = data.frontAmount || 0;
    activityState.isFrontAll = !!data.isFrontAll;
    activityState.tipAmount = data.tipAmount || 0;
    activityState.matches = data.matches || [];
    activityState.temporaryAttendanceSaved = !!data.temporaryAttendanceSaved;
    activityState.savedAttendanceTime = data.savedAttendanceTime || null;
    activityState.isEditingAttendance = !!data.isEditingAttendance;
    activityState.isEditingFinalizedSession = !!data.isEditingFinalizedSession;
    activityState.editingSessionId = data.editingSessionId || null;
    activityState.initialized = true;

    const clubId = getActiveClubId();
    localStorage.setItem('CLB_SESSION_' + clubId, JSON.stringify(data));

    // Cập nhật tức thì các chip điểm danh và thanh tính tiền trên màn hình nếu đang mở
    if (document.getElementById('actOfficialMemberGrid')) {
      renderActivityMemberChips();
      renderActivityGuestChips();
      if (typeof renderExchangeClubUI === 'function') renderExchangeClubUI();
      recalculateActivitySplit();
      updateAttendanceSaveBarUI();
    }
    return true;
  } catch (e) {
    return false;
  }
}

function loadActivitySessionState() {
  try {
    if (AppState && AppState.currentSession) {
      return applyLiveSessionFromCloud(AppState.currentSession);
    }
    const clubId = getActiveClubId();
    const sessionKey = 'CLB_SESSION_' + clubId;
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return applyLiveSessionFromCloud(data);
  } catch (e) {
    return false;
  }
}

function clearActivitySessionState() {
  try {
    const clubId = getActiveClubId();
    localStorage.removeItem('CLB_SESSION_' + clubId);
    if (AppState && AppState.currentSession) {
      delete AppState.currentSession;
      saveData();
    }
  } catch (e) {}
}

function initActivitySessionData(forceReset = false) {
  if (!forceReset && loadActivitySessionState()) {
    return;
  }

  activityState.date = getTodayInputFormat();
  activityState.type = 'Buổi cầu';
  activityState.lang = 'VI';
  activityState.exchangeClubName = '';
  activityState.exchangeMembers = [];
  activityState.exchangeClubs = [];
  activityState.selectedMemberIds = new Set();
  activityState.selectedGuestIds = new Set();
  activityState.saveGuestDebt = false;

  const boxPrice = activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
  const count = AppState.config?.shuttlecocksPerBox || 12;
  const unitPrice = count > 0 ? Math.round(boxPrice / count) : 28333;
  const mode = AppState.config?.shuttleBillingMode || 'BY_SHUTTLE';
  const defaultShuttleCount = (AppState.config?.defaultShuttlesPerSession !== undefined && AppState.config?.defaultShuttlesPerSession !== null && !isNaN(Number(AppState.config.defaultShuttlesPerSession))) 
    ? Number(AppState.config.defaultShuttlesPerSession) 
    : 6;

  activityState.dailyBoxPrice = boxPrice;
  activityState.shuttleBillingMode = mode;
  activityState.shuttleCount = defaultShuttleCount;

  if (mode === 'BY_SHUTTLE') {
    const qty = defaultShuttleCount;
    const amount = (qty === count) ? boxPrice : (qty * unitPrice);
    activityState.expenses = [
      { id: 1, title: 'Tiền cầu', qty: qty, unitPrice: unitPrice, amount: amount, isCombo: false, isShuttleRow: true }
    ];
  } else {
    const title = AppState.config?.dailyRateTitle || `ĐƠN GIÁ THEO NGÀY ${count}`;
    activityState.expenses = [
      { id: 1, title: title, qty: 1, unitPrice: boxPrice, amount: boxPrice, isCombo: false, isShuttleRow: true }
    ];
  }
  activityState.frontPersonId = 'NONE';
  activityState.frontAmount = 0;
  activityState.isFrontAll = false;
  activityState.tipAmount = 0;

  // Thống kê các trận cầu chỉ hiển thị khi người dùng bấm nút "+ Thêm trận", mặc định để rỗng
  activityState.matches = [];

  // Mặc định CHƯA ĐIỂM DANH thành viên nào theo yêu cầu người dùng (luôn hiển thị chưa điểm danh: 0/27)
  activityState.selectedMemberIds = new Set();
  activityState.selectedGuestIds = new Set();
  activityState.temporaryAttendanceSaved = false;
  activityState.savedAttendanceTime = null;
  activityState.isEditingAttendance = false;
  activityState.isEditingFinalizedSession = false;
  activityState.editingSessionId = null;

  activityState.initialized = true;
}

// ==========================================
// 2.3B KHÓA CHỐT SỔ CUỐI THÁNG & QUYỀN SỬA ĐỔI HOẠT ĐỘNG
// ==========================================
function extractMonthKeyFromDateString(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  // 1. Dạng YYYY-MM hoặc YYYY-MM-DD (e.g. 2026-09-25 hoặc 2026-09)
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}`;
  }
  // 2. Dạng DD/MM/YYYY hoặc D/M/YYYY (e.g. 25/09/2026 18:30 hoặc 25/09/2026)
  const dmyMatch = s.match(/^\d{1,2}[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[2]}-${String(dmyMatch[1]).padStart(2, '0')}`;
  }
  // 3. Dạng MM/YYYY hoặc M/YYYY (e.g. 09/2026)
  const myMatch = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (myMatch) {
    return `${myMatch[2]}-${String(myMatch[1]).padStart(2, '0')}`;
  }
  // 4. Thử qua Date.parse
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  } catch (e) {}
  return null;
}

function isMonthClosed(dateOrMonth) {
  if (!dateOrMonth) return false;
  if (!AppState.closedMonths || !Array.isArray(AppState.closedMonths)) {
    return false;
  }
  const monthKey = extractMonthKeyFromDateString(dateOrMonth);
  if (!monthKey) return false;
  return AppState.closedMonths.includes(monthKey);
}

function isDateOrMonthInClosedCycle(dateOrMonth) {
  return isMonthClosed(dateOrMonth);
}

function executeMonthSettlement(monthKey, isAuto = false) {
  if (!monthKey) {
    const d = new Date();
    monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (!AppState.settlementSnapshots) AppState.settlementSnapshots = {};
  if (!AppState.closedMonths) AppState.closedMonths = [];

  const parts = monthKey.split('-');
  const monthStr = parts.length === 2 ? `${parts[1]}/${parts[0]}` : monthKey;

  // 1. Sinh dữ liệu báo cáo đối soát thực tế trước khi reset
  const reportData = (typeof generateLiveSettlementReportData === 'function')
    ? generateLiveSettlementReportData(monthStr, true)
    : null;

  // 2. Tính số dư Quỹ CLB thực có cuối chu kỳ để kết chuyển sang chu kỳ mới
  const closingStats = calculateClubFundStats();
  const closingClubFund = (reportData && reportData.kpi && reportData.kpi.closingClubFund !== undefined)
    ? reportData.kpi.closingClubFund
    : (closingStats.clubFund !== undefined ? closingStats.clubFund : (AppState.funds?.clubFund || 0));

  // 3. Đánh dấu chốt sổ tháng này
  if (!AppState.closedMonths.includes(monthKey)) {
    AppState.closedMonths.push(monthKey);
  }

  // 4. Lưu snapshot báo cáo tất toán vào lịch sử
  AppState.settlementSnapshots[monthKey] = {
    monthKey,
    monthStr,
    reportData,
    settledAt: getNowTimestampString(),
    isAuto: !!isAuto,
    clubFundCarriedForward: closingClubFund
  };

  // 5. KẾT CHUYỂN SANG CHU KỲ MỚI:
  // - Số dư Quỹ CLB được chuyển sang chu kỳ tiếp theo làm "Quỹ tồn từ tháng trước chuyển sang"
  // - Quỹ tạm ứng được reset mặc định về 0 đ
  // - Số dư ví của toàn bộ thành viên reset mặc định về 0 đ
  // - Số buổi của toàn bộ thành viên reset về 0 buổi
  if (!AppState.funds) AppState.funds = {};
  AppState.funds.carriedForwardFund = closingClubFund;
  AppState.funds.carriedForwardFromMonth = monthStr;
  AppState.funds.clubFund = closingClubFund;
  AppState.funds.advanceFund = 0;
  AppState.funds.shuttleAdvanceFund = 0;
  AppState.funds.courtAdvanceFund = 0;
  AppState.funds.guestAdvanceIncome = 0;
  AppState.funds.shuttlePaidTotal = 0;
  AppState.funds.courtPaidTotal = 0;

  (AppState.members || []).forEach(m => {
    m.balance = 0;
    m.initialBalance = 0;
    m.monthlySessions = 0;
  });

  saveData();
  updateMonthLockBtnUI();
  renderSessionFinalizedBanner();
  renderDashboard();
  renderMemberManagementList();
  renderFinanceTab();
  if (typeof renderSettlementReport === 'function') {
    renderSettlementReport();
  }

  const currentClubFundText = formatMoney(closingClubFund);
  const msg = isAuto
    ? `⏰ TỰ ĐỘNG TẤT TOÁN 22H: Đã chốt sổ tháng ${monthStr}! Quỹ tồn (${currentClubFundText}) từ tháng trước đã chuyển sang chu kỳ mới, ví và quỹ ứng tiền đã reset về 0đ.`
    : `🔒 ĐÃ TẤT TOÁN & CHỐT SỔ THÁNG ${monthStr}! Quỹ tồn (${currentClubFundText}) từ tháng trước đã chuyển sang chu kỳ mới, ví và quỹ ứng tiền đã reset về 0đ.`;
  showToast(msg, 'success');
}

function isLastDayOfMonth(d = new Date()) {
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return tomorrow.getDate() === 1;
}

function checkAndRunMonthEndAutoSettlement() {
  try {
    const now = new Date();
    if (isLastDayOfMonth(now) && now.getHours() >= 22) {
      const mKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (!isMonthClosed(mKey)) {
        console.log(`[AutoSettlement] Tự động tất toán chu kỳ tháng ${mKey} lúc 22h ngày cuối tháng.`);
        executeMonthSettlement(mKey, true);
      }
    }
  } catch (e) {
    console.error('Lỗi kiểm tra tự động tất toán 22h cuối tháng:', e);
  }
}

function toggleMonthCloseStatus(monthKey) {
  if (!monthKey) return;
  if (!AppState.closedMonths) AppState.closedMonths = [];
  const idx = AppState.closedMonths.indexOf(monthKey);
  const isClosed = idx !== -1;
  const monthFormatted = monthKey.split('-').reverse().join('/');

  if (isClosed) {
    if (!confirm(`Bạn có chắc chắn muốn MỞ KHÓA lại sổ hoạt động tháng ${monthFormatted}?\n\nSau khi mở khóa, Quản trị viên có thể tiếp tục chỉnh sửa các buổi hoạt động trong tháng này.`)) {
      return;
    }
    AppState.closedMonths.splice(idx, 1);
    if (AppState.closedMonths.length === 0) {
      AppState.funds.carriedForwardFund = 0;
      AppState.funds.carriedForwardFromMonth = null;
    }
    saveData();
    updateMonthLockBtnUI();
    renderSessionFinalizedBanner();
    renderDashboard();
    renderMemberManagementList();
    renderFinanceTab();
    showToast(`✓ Đã MỞ KHÓA sổ hoạt động tháng ${monthFormatted}! Quản trị viên có thể chỉnh sửa lại.`, 'info');
  } else {
    const clubFundStr = formatMoney(AppState.funds?.clubFund || 0);
    const confirmMsg = `XÁC NHẬN TẤT TOÁN & CHỐT SỔ THÁNG ${monthFormatted}?\n\n` +
      `Theo quy tắc tất toán của CLB:\n` +
      `• Quỹ CLB (${clubFundStr}) sẽ được CỘNG DỒN tích lũy cho tháng tiếp theo.\n` +
      `• Tài khoản ví của các thành viên sẽ bắt đầu chu kỳ mới với số dư bằng 0đ.\n` +
      `• Toàn bộ các buổi hoạt động trong tháng ${monthFormatted} sẽ ĐƯỢC KHÓA an toàn.\n\n` +
      `Bạn có chắc chắn muốn thực hiện tất toán?`;
    if (!confirm(confirmMsg)) {
      return;
    }
    executeMonthSettlement(monthKey, false);
  }
}

function toggleCurrentMonthSettlementLock() {
  const monthInput = document.getElementById('settlementReportMonth');
  let monthKey = '';
  if (monthInput && monthInput.value) {
    monthKey = monthInput.value;
  } else {
    const d = new Date();
    monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  toggleMonthCloseStatus(monthKey);
}

function updateMonthLockBtnUI() {
  const monthInput = document.getElementById('settlementReportMonth');
  let monthKey = '';
  if (monthInput && monthInput.value) {
    monthKey = monthInput.value;
  } else {
    const d = new Date();
    monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const btn = document.getElementById('btnToggleMonthLock');
  const icon = document.getElementById('btnMonthLockIcon');
  const text = document.getElementById('btnMonthLockText');
  if (!btn) return;

  const isClosed = isMonthClosed(monthKey);
  const monthFormatted = monthKey.split('-').reverse().join('/');

  if (isClosed) {
    if (icon) icon.textContent = '🔓';
    if (text) text.textContent = `Mở khóa tháng ${monthFormatted}`;
    btn.className = 'px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 transition cursor-pointer flex items-center gap-1 shadow-2xs';
    btn.title = `Tháng ${monthFormatted} đang bị KHÓA. Nhấn để mở khóa nếu cần sửa.`;
  } else {
    if (icon) icon.textContent = '🔒';
    if (text) text.textContent = `Chốt sổ tháng ${monthFormatted}`;
    btn.className = 'px-2.5 py-1.5 text-xs font-bold rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 transition cursor-pointer flex items-center gap-1 shadow-2xs';
    btn.title = `Chốt sổ cuối tháng để khóa quyền sửa các buổi hoạt động trong tháng ${monthFormatted}`;
  }
}

function openSessionAttendanceView(sessionId) {
  const ses = (AppState.activitySessions || []).find(s => s.id === sessionId);
  if (!ses) {
    showToast('⚠️ Không tìm thấy thông tin buổi hoạt động này!', 'error');
    return;
  }
  closeModal('activityHistoryModal');
  closeModal('activitySessionDetailModal');
  closeModal('createActivityModal');

  loadSessionIntoAttendance(ses, false);

  const dateFormatted = ses.date ? ses.date.split('-').reverse().join('/') : '';
  showToast(`🏸 Đã mở giao diện hoạt động đã điểm danh ngày ${dateFormatted}!`, 'info');
}

function loadSessionIntoAttendance(ses, startInEditMode = false) {
  if (!ses) return;
  activityState.date = ses.date;
  activityState.type = ses.title || 'Buổi cầu';
  activityState.dailyBoxPrice = ses.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
  activityState.selectedMemberIds = new Set((ses.members || []).map(m => m.id));
  activityState.selectedGuestIds = new Set((ses.guests || []).map(g => g.id));
  if (Array.isArray(ses.exchangeClubs) && ses.exchangeClubs.length > 0) {
    activityState.exchangeClubs = JSON.parse(JSON.stringify(ses.exchangeClubs));
    activityState.exchangeClubName = activityState.exchangeClubs.map(c => c.name).filter(Boolean).join(', ');
    activityState.exchangeMembers = activityState.exchangeClubs.flatMap(c => c.members || []);
  } else if (ses.exchangeClub) {
    activityState.exchangeClubName = ses.exchangeClub.name || '';
    activityState.exchangeMembers = Array.isArray(ses.exchangeClub.members) ? [...ses.exchangeClub.members] : [];
    activityState.exchangeClubs = [{
      id: 'EXC_1',
      name: activityState.exchangeClubName || 'CLB Giao lưu',
      members: [...activityState.exchangeMembers]
    }];
  } else {
    activityState.exchangeClubName = '';
    activityState.exchangeMembers = [];
    activityState.exchangeClubs = [];
  }
  if (ses.expenses && ses.expenses.length > 0) {
    activityState.expenses = JSON.parse(JSON.stringify(ses.expenses));
  } else {
    const boxPrice = activityState.dailyBoxPrice;
    const count = AppState.config?.shuttlecocksPerBox || 12;
    const unitPrice = count > 0 ? Math.round(boxPrice / count) : 28333;
    const shuttleTotal = ses.shuttleTotal || 0;
    const qty = unitPrice > 0 ? Math.round(shuttleTotal / unitPrice) : 12;
    activityState.expenses = [
      { id: 1, title: 'Tiền cầu', qty: qty || 12, unitPrice: unitPrice, amount: shuttleTotal, isCombo: false, isShuttleRow: true }
    ];
  }
  if (ses.matches) {
    activityState.matches = JSON.parse(JSON.stringify(ses.matches));
  } else {
    activityState.matches = [];
  }
  activityState.temporaryAttendanceSaved = false;
  activityState.savedAttendanceTime = null;
  activityState.isEditingAttendance = false;

  if (startInEditMode) {
    activityState.isEditingFinalizedSession = true;
    activityState.editingSessionId = ses.id;
  } else {
    activityState.isEditingFinalizedSession = false;
    activityState.editingSessionId = null;
  }

  saveActivitySessionState();
  switchTab('attendance');
  renderAttendanceTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadSessionIntoEditMode(sessionId) {
  const ses = (AppState.activitySessions || []).find(s => s.id === sessionId);
  if (!ses) {
    showToast('⚠️ Không tìm thấy buổi hoạt động này!', 'error');
    return;
  }
  if (isMonthClosed(ses.date)) {
    showToast(`🔒 Tháng ${ses.date.slice(0, 7)} đã chốt sổ cuối tháng! Không thể chỉnh sửa buổi hoạt động này.`, 'error');
    return;
  }
  if (!isAttendanceManager()) {
    showToast('⚠️ Chỉ Ban Quản lý mới có quyền chỉnh sửa buổi hoạt động đã chốt!', 'warning');
    return;
  }

  closeModal('activitySessionDetailModal');
  closeModal('activityHistoryModal');
  closeModal('createActivityModal');

  loadSessionIntoAttendance(ses, true);
  const formattedDate = ses.date.split('-').reverse().join('/');
  showToast(`✏️ Đã mở chế độ Chỉnh Sửa buổi hoạt động ngày ${formattedDate}! Sau khi cập nhật, nhấn "Cập nhật & Chốt lại".`, 'info');
}

function cancelSessionEditMode() {
  activityState.isEditingFinalizedSession = false;
  activityState.editingSessionId = null;
  saveActivitySessionState();
  renderAttendanceTab();
  showToast('Đã thoát chế độ chỉnh sửa buổi hoạt động.', 'info');
}

function renderSessionFinalizedBanner() {
  const banner = document.getElementById('actSessionFinalizedBanner');
  const btnSaveText = document.getElementById('actBtnSaveText');
  const btnSave = document.getElementById('actBtnSaveAndSplit');
  if (!banner) return;

  const currentDate = activityState.date || getTodayInputFormat();
  const dateFormatted = currentDate.split('-').reverse().join('/');
  const existingSes = (AppState.activitySessions || []).find(s => s.date === currentDate);
  const isClosed = isMonthClosed(currentDate);

  if (isClosed) {
    banner.innerHTML = `
      <div class="mb-3 p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🔒</span>
          <div>
            <div class="text-xs font-black text-rose-800">THÁNG NÀY ĐÃ CHỐT SỔ CUỐI THÁNG</div>
            <div class="text-[11px] text-rose-600">Buổi ngày ${dateFormatted} đã khóa an toàn. Không thể chỉnh sửa hoặc chia lại tiền.</div>
          </div>
        </div>
        ${isAttendanceManager() ? `
          <button type="button" onclick="openSettlementReportModal()" class="px-2.5 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer">
            Xem báo cáo tháng
          </button>
        ` : ''}
      </div>
    `;
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (btnSaveText) {
      btnSaveText.textContent = '🔒 Tháng đã chốt sổ (Đã khóa)';
    }
    return;
  }

  if (btnSave) {
    btnSave.disabled = false;
    btnSave.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  if (activityState.isEditingFinalizedSession && existingSes) {
    if (btnSaveText) {
      btnSaveText.textContent = '💾 Cập Nhật & Chốt Lại Hoạt Động';
    }
    banner.innerHTML = `
      <div class="mb-3 p-3 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">✏️</span>
          <div>
            <div class="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <span>ĐANG CHỈNH SỬA BUỔI HOẠT ĐỘNG NGÀY ${dateFormatted}</span>
              <span class="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px] font-bold">Chế độ Quản trị</span>
            </div>
            <div class="text-[11px] text-amber-800 mt-0.5">
              Bạn có thể sửa danh sách có mặt, tiền cầu hoặc thu khách. Khi bấm <b>"Cập nhật & Chốt lại"</b>, các khoản trừ ví và nhật ký cũ sẽ được hoàn tác sạch sẽ và thay thế theo dữ liệu mới.
            </div>
          </div>
        </div>
        <button type="button" onclick="cancelSessionEditMode()" class="px-2.5 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs">
          ✕ Hủy sửa
        </button>
      </div>
    `;
  } else if (existingSes) {
    if (btnSaveText) {
      btnSaveText.textContent = isAttendanceManager() ? '✏️ Mở Chỉnh Sửa Buổi Này' : '✓ Buổi Này Đã Chốt Sổ';
    }
    banner.innerHTML = `
      <div class="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">✅</span>
          <div>
            <div class="text-xs font-black text-emerald-900">
              BUỔI HOẠT ĐỘNG NGÀY ${dateFormatted} ĐÃ ĐƯỢC CHỐT SỔ
            </div>
            <div class="text-[11px] text-emerald-700 mt-0.5">
              Đã chốt: <b>${existingSes.attendeeCount || (existingSes.members ? existingSes.members.length : 0)} người</b> • Tiền cầu: <b>${formatMoney(existingSes.shuttleTotal || 0)}</b> • Mỗi TV: <b>${formatMoney(existingSes.shuttleFeePerMember || 0)}</b>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="openActivitySessionDetailModal('${existingSes.id}')" class="px-2.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs">
            Chi tiết
          </button>
          ${isAttendanceManager() ? `
            <button type="button" onclick="loadSessionIntoEditMode('${existingSes.id}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1">
              <span>✏️</span> <span>Sửa</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  } else {
    banner.innerHTML = '';
    if (btnSaveText) {
      btnSaveText.textContent = '💾 Lưu & Chia Tiền Buổi Cầu';
    }
  }
}

// ==========================================
// 2.5 HỆ THỐNG PHÂN QUYỀN & QUẢN LÝ TRUY CẬP (ACCESS CONTROL & ROLES)
// ==========================================
function getCurrentUserRole() {
  if (AppState.auth && AppState.auth.isLoggedIn && AppState.auth.user && AppState.auth.user.role) {
    return AppState.auth.user.role;
  }
  return 'GUEST';
}

function isAttendanceManager() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    return false;
  }
  const role = AppState.auth.user.role;
  if (role === 'DEV_ADMIN' || role === 'ADMIN') return true;
  return hasUserPermission('attendance');
}

function getAttendanceCutoffTime() {
  return AppState.config?.attendanceCutoffTime || '17:00';
}

function isPastAttendanceCutoff(activityDateStr) {
  const targetDateStr = activityDateStr || activityState.date || getTodayInputFormat();
  const todayStr = getTodayInputFormat();
  if (targetDateStr < todayStr) return true; // Buổi trong quá khứ -> coi như đã quá giờ chốt
  if (targetDateStr > todayStr) return false; // Buổi trong tương lai -> chưa đến giờ chốt

  const cutoff = getAttendanceCutoffTime();
  const parts = cutoff.split(':');
  const cutoffH = parseInt(parts[0], 10) || 17;
  const cutoffM = parseInt(parts[1], 10) || 0;

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = cutoffH * 60 + cutoffM;
  return curMinutes >= cutoffMinutes;
}

function onAttendanceCutoffTimeChanged(val) {
  if (!val) val = '17:00';
  if (!AppState.config) AppState.config = {};
  AppState.config.attendanceCutoffTime = val;
  saveData();
  renderSelfAttendanceBanner();
}

function saveAttendanceCutoffTimeConfig() {
  const input = document.getElementById('configAttendanceCutoffTime');
  const val = input?.value || '17:00';
  if (!AppState.config) AppState.config = {};
  AppState.config.attendanceCutoffTime = val;
  saveData();
  renderSelfAttendanceBanner();
  showToast(`✓ Đã lưu giờ chốt điểm danh hoạt động hôm nay: ${val}!`, 'success');
}

// ==========================================
// 2.4 ĐIỂM DANH HÔM NAY & TẠO BUỔI HOẠT ĐỘNG MỚI (BẤT KỲ NGÀY NÀO TRONG CHU KỲ)
// ==========================================

// 1. Nút mặc định điểm danh hôm nay ➕
function openTodayActivitySession(askResetIfToday = false) {
  switchTab('attendance');
  const today = getTodayInputFormat();
  const existingTodaySes = (AppState.activitySessions || []).find(s => s.date === today);

  if (existingTodaySes) {
    loadSessionIntoAttendance(existingTodaySes, false);
    if (isAttendanceManager()) {
      showToast(`🏸 Buổi hôm nay (${getFormattedCurrentDate()}) đã chốt sổ. Bạn có thể xem hoặc bấm Sửa để cập nhật.`, 'info');
    } else {
      showToast(`🏸 Buổi hôm nay (${getFormattedCurrentDate()}) đã được chốt sổ!`, 'info');
    }
    return;
  }

  // Nếu trên đám mây đã có phiên hoạt động hôm nay (đang điểm danh trực tiếp giữa các máy)
  if (AppState && AppState.currentSession && AppState.currentSession.date === today) {
    applyLiveSessionFromCloud(AppState.currentSession);
    renderAttendanceTab();
    return;
  }

  const isAlreadyToday = (activityState.date === today);

  if (!isAlreadyToday) {
    activityState.date = today;
    activityState.isEditingFinalizedSession = false;
    activityState.editingSessionId = null;
    const dateInput = document.getElementById('actDateInput');
    if (dateInput) dateInput.value = today;

    // Kiểm tra xem trong localStorage hoặc AppState có session không trước khi lưu đè
    const clubId = getActiveClubId();
    const raw = localStorage.getItem('CLB_SESSION_' + clubId);
    let loaded = false;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === today) {
          applyLiveSessionFromCloud(parsed);
          loaded = true;
        }
      } catch (e) {}
    }
    if (!loaded) {
      saveActivitySessionState();
    }
    renderAttendanceTab();
    showToast(`🏸 Đã chuyển sang hoạt động hôm nay (${getFormattedCurrentDate()})!`, 'success');
  } else if (askResetIfToday && isAttendanceManager()) {
    const confirmMsg = `Bạn đang ở buổi hoạt động hôm nay (${getFormattedCurrentDate()}).\n\nBạn có muốn LÀM MỚI danh sách điểm danh về 0 người để bắt đầu buổi mới không?`;
    if (confirm(confirmMsg)) {
      initActivitySessionData(true);
      activityState.date = today;
      activityState.isEditingFinalizedSession = false;
      activityState.editingSessionId = null;
      activityState.selectedMemberIds = new Set();
      activityState.selectedGuestIds = new Set();
      activityState.matches = [];
      activityState.temporaryAttendanceSaved = false;
      activityState.savedAttendanceTime = null;
      activityState.isEditingAttendance = false;
      saveActivitySessionState();
      renderAttendanceTab();
      showToast('✓ Đã làm mới danh sách điểm danh hoạt động hôm nay thành công!', 'success');
    }
  } else {
    // Nếu là thành viên, tự động cuộn đến nút điểm danh của họ
    const user = AppState.auth?.user;
    if (user && user.id) {
      const chipEl = document.getElementById(`memChip_${user.id}`);
      if (chipEl) {
        chipEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    showToast(`🏸 Buổi hoạt động hôm nay (${getFormattedCurrentDate()}) đã sẵn sàng để điểm danh!`, 'info');
  }
}

// 2. Nút Tạo HĐ mới (cho phép chọn bất kỳ ngày nào trong chu kỳ)
function toggleNewActExchangeClubSection(type) {
  const fields = document.getElementById('newActExchangeClubFields');
  if (!fields) return;
  if (type === 'Giao lưu') {
    fields.classList.remove('hidden');
  } else {
    fields.classList.add('hidden');
  }
}

function enableNewActExchangeMode() {
  const typeSelect = document.getElementById('newActSessionType');
  if (typeSelect) {
    typeSelect.value = 'Giao lưu';
    toggleNewActExchangeClubSection('Giao lưu');
  }
  const clubNameInp = document.getElementById('newActExchangeClubName');
  if (clubNameInp) {
    clubNameInp.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      clubNameInp.focus();
    }, 120);
  }
}

function openCreateActivityModal() {
  if (!isAttendanceManager()) {
    showToast('⚠️ Chỉ Ban Quản lý mới có quyền tạo buổi hoạt động mới!', 'warning');
    return;
  }
  const dateInput = document.getElementById('newActSessionDate');
  if (dateInput) {
    dateInput.value = activityState.date || getTodayInputFormat();
  }
  const typeSelect = document.getElementById('newActSessionType');
  if (typeSelect) {
    typeSelect.value = activityState.type || 'Buổi cầu';
  }
  const clubNameInp = document.getElementById('newActExchangeClubName');
  if (clubNameInp) {
    const clubs = (typeof getNormalizedExchangeClubs === 'function') ? getNormalizedExchangeClubs() : [];
    clubNameInp.value = clubs.length > 0 ? clubs.map(c => c.name).filter(Boolean).join(', ') : (activityState.exchangeClubName || '');
  }
  const clubMemsInp = document.getElementById('newActExchangeMembers');
  if (clubMemsInp) {
    clubMemsInp.value = Array.isArray(activityState.exchangeMembers) ? activityState.exchangeMembers.join(', ') : '';
  }
  toggleNewActExchangeClubSection(typeSelect ? typeSelect.value : 'Buổi cầu');

  const resetCheck = document.getElementById('newActResetCheck');
  if (resetCheck) {
    resetCheck.checked = true;
  }
  const boxInp = document.getElementById('newActDailyBoxPrice');
  if (boxInp) {
    boxInp.value = activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
    updateNewActBoxPricePreview(boxInp.value);
  }
  openModal('createActivityModal');
  if (window.lucide) lucide.createIcons();
}

function updateNewActBoxPricePreview(val) {
  const boxPrice = Number(val) || 340000;
  const count = AppState.config?.shuttlecocksPerBox || 12;
  const unitPrice = count > 0 ? Math.round(boxPrice / count) : 28333;
  const previewEl = document.getElementById('newActUnitPricePreview');
  if (previewEl) {
    previewEl.textContent = `${formatMoney(unitPrice)} / quả`;
  }
}

function setNewActDateQuick(type) {
  const dateInput = document.getElementById('newActSessionDate');
  if (!dateInput) return;
  const now = new Date();
  if (type === 'TODAY') {
    // Ngày hiện tại
  } else if (type === 'YESTERDAY') {
    now.setDate(now.getDate() - 1);
  } else if (type === 'TOMORROW') {
    now.setDate(now.getDate() + 1);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  dateInput.value = `${y}-${m}-${d}`;
}

function submitCreateActivitySession(e) {
  if (e) e.preventDefault();
  if (!isAttendanceManager()) {
    showToast('⚠️ Chỉ Ban Quản lý mới có quyền tạo buổi hoạt động mới!', 'warning');
    return;
  }
  const dateInput = document.getElementById('newActSessionDate');
  const typeSelect = document.getElementById('newActSessionType');
  const resetCheck = document.getElementById('newActResetCheck');
  const boxInp = document.getElementById('newActDailyBoxPrice');

  const chosenDate = dateInput?.value || getTodayInputFormat();
  const formattedDate = chosenDate.split('-').reverse().join('/');

  // 1. Kiểm tra tháng đã chốt sổ cuối tháng chưa
  if (isMonthClosed(chosenDate)) {
    alert(`⚠️ Tháng ${chosenDate.slice(0, 7)} đã CHỐT SỔ CUỐI THÁNG!\nKhông thể tạo buổi hoạt động mới trong tháng đã chốt.`);
    return;
  }

  // 2. Kiểm tra quy tắc: Mỗi ngày chỉ được tạo 1 hoạt động
  const existingSes = (AppState.activitySessions || []).find(s => s.date === chosenDate);
  if (existingSes) {
    const confirmEdit = confirm(
      `⚠️ QUY TẮC: MỖI NGÀY CHỈ ĐƯỢC TẠO 1 BUỔI HOẠT ĐỘNG!\n\n` +
      `Ngày ${formattedDate} đã có một buổi hoạt động được chốt (${existingSes.title || 'Buổi cầu'}, ${existingSes.attendeeCount || 0} người).\n\n` +
      `Bạn có muốn MỞ CHỈNH SỬA buổi hoạt động ngày ${formattedDate} để cập nhật lại không?`
    );
    if (confirmEdit) {
      closeModal('createActivityModal');
      loadSessionIntoEditMode(existingSes.id);
    }
    return;
  }

  const chosenType = typeSelect?.value || 'Buổi cầu';
  const shouldReset = resetCheck ? resetCheck.checked : true;
  const chosenBoxPrice = boxInp ? (Number(boxInp.value) || 340000) : (AppState.config?.dailyBoxPrice || 340000);
  const count = AppState.config?.shuttlecocksPerBox || 12;
  const unitPrice = count > 0 ? Math.round(chosenBoxPrice / count) : 28333;

  if (shouldReset) {
    initActivitySessionData(true);
  }
  activityState.date = chosenDate;
  activityState.type = chosenType;
  activityState.dailyBoxPrice = chosenBoxPrice;
  activityState.isEditingFinalizedSession = false;
  activityState.editingSessionId = null;

  if (chosenType === 'Giao lưu') {
    const rawClubName = document.getElementById('newActExchangeClubName')?.value.trim() || 'CLB Giao lưu';
    const rawMems = document.getElementById('newActExchangeMembers')?.value || '';
    const clubNames = rawClubName.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
    if (clubNames.length === 0) clubNames.push('CLB Giao lưu');

    const parsedMems = rawMems.split(/[,;\n\r]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

    activityState.exchangeClubs = clubNames.map((cName, idx) => ({
      id: 'EXC_' + Date.now() + '_' + idx,
      name: cName,
      members: (idx === 0) ? parsedMems : []
    }));
    if (typeof syncExchangeClubsBackward === 'function') {
      syncExchangeClubsBackward();
    } else {
      activityState.exchangeClubName = clubNames.join(', ');
      activityState.exchangeMembers = parsedMems;
    }
  } else {
    activityState.exchangeClubName = '';
    activityState.exchangeMembers = [];
    activityState.exchangeClubs = [];
  }

  if (activityState.expenses && activityState.expenses.length > 0) {
    const exp = activityState.expenses.find(e => e.isShuttleRow) || activityState.expenses[0];
    if (exp) {
      exp.unitPrice = unitPrice;
      if (exp.qty === count) exp.amount = chosenBoxPrice;
      else exp.amount = exp.qty * unitPrice;
    }
  }

  if (shouldReset) {
    activityState.selectedMemberIds = new Set();
    activityState.selectedGuestIds = new Set();
    activityState.matches = [];
    activityState.temporaryAttendanceSaved = false;
    activityState.savedAttendanceTime = null;
    activityState.isEditingAttendance = false;
  }
  saveActivitySessionState();

  closeModal('createActivityModal');
  switchTab('attendance');
  renderAttendanceTab();

  let toastExtra = chosenType === 'Giao lưu' ? ` (${(activityState.exchangeClubs || []).length} CLB: ${activityState.exchangeClubName}: ${activityState.exchangeMembers.length} người)` : '';
  showToast(`✓ Đã tạo buổi hoạt động ngày ${formattedDate} (${chosenType}${toastExtra}) với đơn giá hộp: ${formatMoney(chosenBoxPrice)} (1 quả = ${formatMoney(unitPrice)})!`, 'success');
}

// Giữ lại createNewActivitySession làm alias
function createNewActivitySession() {
  openCreateActivityModal();
}

function hasUserPermission(permKey) {
  const role = getCurrentUserRole();
  if (role === 'ADMIN' || role === 'DEV_ADMIN') return true;

  const user = AppState.auth?.user;
  if (user && user.permissions && typeof user.permissions[permKey] === 'boolean') {
    return user.permissions[permKey];
  }

  // Fallback to role presets
  const defaults = getRoleDefaultPermissions(role);
  return !!defaults[permKey];
}

function canPerformAttendance() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('attendance');
}

function canPerformFinance() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('finance');
}

function canManageMembers() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('member');
}

function canManageTournaments() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('tournament');
}

function canScoreMatch() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('referee');
}

function canConfigSystem() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('config');
}

function canSyncTournament() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) return false;
  return hasUserPermission('tournament');
}

function switchActiveUserRole(role) {
  if (!AppState.auth) {
    AppState.auth = { isLoggedIn: true, user: {} };
  }
  AppState.auth.isLoggedIn = true;

  const activeClub = getActiveClub();
  const defaultAdminName = activeClub?.adminName || 'Quản lý CLB';
  const president = (AppState.members && AppState.members.find(m => m.id === (AppState.config?.leadership?.president || 'M001'))) || (AppState.members ? AppState.members[0] : null);
  const presidentName = president ? president.name : defaultAdminName;

  const viceLeader = (AppState.members && AppState.members.find(m => m.id === (AppState.config?.viceLeaderId || AppState.config?.leadership?.vicePresident1))) || (AppState.members && AppState.members.length > 1 ? AppState.members[1] : null);
  const viceName = viceLeader ? viceLeader.name : 'Phó quản lý CLB';

  const treasurer = (AppState.members && AppState.members.find(m => m.id === AppState.config?.leadership?.treasurer)) || (AppState.members && AppState.members.length > 2 ? AppState.members[2] : null);
  const treasurerName = treasurer ? treasurer.name : 'Thủ quỹ CLB';

  const referee = (AppState.members && AppState.members.find(m => m.id === AppState.config?.leadership?.secretary)) || (AppState.members && AppState.members.length > 3 ? AppState.members[3] : null);
  const refereeName = referee ? referee.name : 'Trọng tài CLB';

  const sampleMember = (AppState.members && AppState.members.find(m => m.role === 'MEMBER')) || (AppState.members ? AppState.members[AppState.members.length - 1] : null);

  if (role === 'ADMIN') {
    AppState.auth.user = {
      id: president ? president.id : 'M001',
      username: (president && president.username) ? president.username : (activeClub?.adminUsername || 'admin'),
      role: 'ADMIN',
      name: `${presidentName} (Quản lý)`,
      permissions: getRoleDefaultPermissions('ADMIN')
    };
  } else if (role === 'VICE_ADMIN') {
    AppState.auth.user = {
      id: viceLeader ? viceLeader.id : 'M002',
      username: (viceLeader && viceLeader.username) ? viceLeader.username : 'vice_admin',
      role: 'VICE_ADMIN',
      name: `${viceName} (Phó nhóm)`,
      permissions: getRoleDefaultPermissions('VICE_ADMIN')
    };
  } else if (role === 'TREASURER') {
    AppState.auth.user = {
      id: treasurer ? treasurer.id : 'M005',
      username: (treasurer && treasurer.username) ? treasurer.username : 'thuquy',
      role: 'TREASURER',
      name: `${treasurerName} (Thủ quỹ)`,
      permissions: getRoleDefaultPermissions('TREASURER')
    };
  } else if (role === 'REFEREE') {
    AppState.auth.user = {
      id: referee ? referee.id : 'M004',
      username: (referee && referee.username) ? referee.username : 'trongtai',
      role: 'REFEREE',
      name: `${refereeName} (Trọng tài)`,
      permissions: getRoleDefaultPermissions('REFEREE')
    };
  } else {
    AppState.auth.user = {
      id: sampleMember ? sampleMember.id : (president ? president.id : 'M001'),
      username: (sampleMember && sampleMember.username) ? sampleMember.username : 'member',
      role: 'MEMBER',
      name: sampleMember ? `${sampleMember.name} (Thành viên)` : 'Thành viên CLB',
      permissions: getRoleDefaultPermissions('MEMBER')
    };
  }

  saveData();
  renderAuthBadge();
  renderAttendanceRoleBanner();
  renderUserAccessTable();
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();

  const roleSelect = document.getElementById('configActiveRoleSelect');
  if (roleSelect) roleSelect.value = `ROLE_${role}`;

  const roleDef = ROLE_DEFINITIONS[role] || { label: role, icon: '👤' };
  showToast(`Đã chuyển sang vai trò: ${roleDef.icon} ${roleDef.label}`, 'info');
}

function loginAsMemberAccount(memberId) {
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) {
    showToast('Không tìm thấy tài khoản thành viên!', 'error');
    return;
  }
  if (member.status === 'LOCKED') {
    showToast(`⚠️ Tài khoản ${member.name} (@${member.username}) đang bị tạm khóa bởi Ban quản trị!`, 'warning');
    return;
  }
  if (!AppState.auth) {
    AppState.auth = { isLoggedIn: true, user: {} };
  }
  AppState.auth.isLoggedIn = true;
  AppState.auth.user = {
    id: member.id,
    username: member.username || member.id.toLowerCase(),
    role: member.role || 'MEMBER',
    name: member.name,
    permissions: member.permissions ? { ...member.permissions } : getRoleDefaultPermissions(member.role || 'MEMBER')
  };

  saveData();
  renderAuthBadge();
  renderAttendanceRoleBanner();
  renderUserAccessTable();
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();

  const roleSelect = document.getElementById('configActiveRoleSelect');
  if (roleSelect) roleSelect.value = `MEMBER_${member.id}`;

  const roleDef = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.MEMBER;
  showToast(`✓ Đã đăng nhập: ${member.name} (${roleDef.icon} ${roleDef.label})`, 'success');
}

function onRoleOrAccountSelected(val) {
  if (!val) return;
  if (val.startsWith('ROLE_')) {
    const role = val.replace('ROLE_', '');
    switchActiveUserRole(role);
  } else if (val.startsWith('MEMBER_')) {
    const memberId = val.replace('MEMBER_', '');
    loginAsMemberAccount(memberId);
  }
}

function renderAttendanceRoleBanner() {
  const banner = document.getElementById('actRolePermissionBanner');
  if (!banner) return;

  const role = getCurrentUserRole();
  const user = AppState.auth?.user;
  const userName = user?.name || 'Người dùng';
  const canAttend = canPerformAttendance();

  if (role === 'ADMIN') {
    banner.className = 'hidden';
    banner.innerHTML = '';
    return;
  } else if (role === 'VICE_ADMIN') {
    if (canAttend) {
      banner.className = 'p-3 rounded-2xl border text-xs flex items-center justify-between transition shadow-2xs bg-blue-50/90 border-blue-300 text-blue-950 flex-wrap gap-2';
      banner.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="text-2xl select-none">🛡️</span>
          <div>
            <div class="font-extrabold text-xs text-blue-950 flex items-center gap-1.5 flex-wrap">
              <span>Vai trò: Phó nhóm (${userName})</span>
              <span class="px-2 py-0.5 bg-blue-200 text-blue-900 rounded-full text-[10px] font-black uppercase">Được cấp quyền điểm danh</span>
            </div>
            <div class="text-[11px] text-blue-800 mt-0.5">✓ Bạn có quyền chọn thành viên, chốt tiền sân và chia tiền buổi sinh hoạt.</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="switchActiveUserRole('ADMIN')" class="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1">
            <span>👑</span>
            <span>Về vai Quản lý</span>
          </button>
        </div>
      `;
    } else {
      banner.className = 'p-3 rounded-2xl border text-xs flex items-center justify-between transition shadow-2xs bg-amber-50 border-amber-300 text-amber-950 flex-wrap gap-2';
      banner.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="text-2xl select-none">🔒</span>
          <div>
            <div class="font-extrabold text-xs text-amber-950 flex items-center gap-1.5 flex-wrap">
              <span>Vai trò: Phó nhóm (${userName})</span>
              <span class="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase">Chưa được cấp quyền điểm danh</span>
            </div>
            <div class="text-[11px] text-amber-800 mt-0.5">⚠️ Quyền điểm danh chưa được bật cho tài khoản này. Vui lòng liên hệ Quản lý để cấp quyền.</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="switchActiveUserRole('ADMIN')" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1">
            <span>👑</span>
            <span>Đổi về Quản lý cấp quyền</span>
          </button>
        </div>
      `;
    }
  } else if (role === 'TREASURER') {
    banner.className = 'p-3 rounded-2xl border text-xs flex items-center justify-between transition shadow-2xs bg-emerald-50 border-emerald-300 text-emerald-950 flex-wrap gap-2';
    banner.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="text-2xl select-none">💰</span>
        <div>
          <div class="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5 flex-wrap">
            <span>Vai trò: Thủ quỹ (${userName})</span>
            <span class="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[10px] font-black uppercase">Điểm danh & Quản lý Quỹ</span>
          </div>
          <div class="text-[11px] text-emerald-800 mt-0.5">✓ Bạn có quyền điểm danh, nạp tiền ví thành viên và quản lý Quỹ CLB.</div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="switchActiveUserRole('ADMIN')" class="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1">
          <span>👑</span>
          <span>Về vai Quản lý</span>
        </button>
      </div>
    `;
  } else if (role === 'REFEREE') {
    banner.className = 'p-3 rounded-2xl border text-xs flex items-center justify-between transition shadow-2xs bg-purple-50 border-purple-300 text-purple-950 flex-wrap gap-2';
    banner.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="text-2xl select-none">⚖️</span>
        <div>
          <div class="font-extrabold text-xs text-purple-950 flex items-center gap-1.5 flex-wrap">
            <span>Vai trò: Trọng tài (${userName})</span>
            <span class="px-2 py-0.5 bg-purple-200 text-purple-900 rounded-full text-[10px] font-black uppercase">Nhập điểm giải đấu</span>
          </div>
          <div class="text-[11px] text-purple-800 mt-0.5">ℹ️ Bạn có quyền cập nhật tỉ số các sân đấu giải. Quyền điểm danh sinh hoạt: ${canAttend ? 'Được cấp' : 'Chỉ xem'}.</div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="switchActiveUserRole('ADMIN')" class="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1">
          <span>👑</span>
          <span>Về vai Quản lý</span>
        </button>
      </div>
    `;
  } else {
    banner.className = 'hidden';
    banner.innerHTML = '';
  }
}

function renderSelfAttendanceBanner() {
  const banner = document.getElementById('actSelfAttendanceBanner');
  if (banner) {
    banner.className = 'hidden';
    banner.innerHTML = '';
  }
}

function memberSelfCheckIn(memberId) {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('🔐 Vui lòng đăng nhập tài khoản thành viên để điểm danh tham gia hoạt động!', 'warning');
    openLoginModal();
    return;
  }

  const currentUserId = AppState.auth.user.id;
  const targetId = memberId || currentUserId;

  if (!isAttendanceManager() && targetId !== currentUserId) {
    showToast('⚠️ Bạn chỉ có quyền tự điểm danh cho chính mình!', 'warning');
    return;
  }

  if (!isAttendanceManager() && isPastAttendanceCutoff(activityState.date)) {
    const cutoff = getAttendanceCutoffTime();
    showToast(`⚠️ Đã quá giờ chốt điểm danh (${cutoff})! Vui lòng liên hệ Ban Quản lý để được bổ sung.`, 'error');
    return;
  }

  activityState.selectedMemberIds.add(targetId);
  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }
  saveActivitySessionState();
  renderActivityMemberChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  renderSelfAttendanceBanner();
  showToast('✓ Bạn đã điểm danh tham gia hoạt động hôm nay thành công! 🏸', 'success');
}

function memberSelfCancel(memberId) {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('🔐 Vui lòng đăng nhập để thao tác!', 'warning');
    openLoginModal();
    return;
  }

  const currentUserId = AppState.auth.user.id;
  const targetId = memberId || currentUserId;

  if (!isAttendanceManager() && targetId !== currentUserId) {
    showToast('⚠️ Bạn chỉ có quyền chỉnh sửa điểm danh của chính mình!', 'warning');
    return;
  }

  if (!isAttendanceManager() && isPastAttendanceCutoff(activityState.date)) {
    const cutoff = getAttendanceCutoffTime();
    showToast(`⚠️ Đã quá giờ chốt điểm danh (${cutoff})! Thành viên không thể tự hủy điểm danh. Chỉ Ban Quản lý mới có quyền sửa đổi.`, 'error');
    return;
  }

  activityState.selectedMemberIds.delete(targetId);
  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }
  saveActivitySessionState();
  renderActivityMemberChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  renderSelfAttendanceBanner();
  showToast('✓ Bạn đã hủy điểm danh hoạt động hôm nay.', 'info');
}

function renderAttendanceTab() {
  if (!activityState.initialized) {
    initActivitySessionData();
  }

  const dateInp = document.getElementById('actDateInput');
  if (dateInp) dateInp.value = activityState.date || getTodayInputFormat();

  const typeSel = document.getElementById('actTypeSelect');
  if (typeSel) typeSel.value = activityState.type;

  renderAttendanceRoleBanner();
  renderSelfAttendanceBanner();
  renderSessionFinalizedBanner();
  updateDailyRatePresetBadgeUI();
  updateShuttleBillingUI();

  renderActivityMemberChips();
  renderActivityGuestChips();
  renderExchangeClubUI();
  renderActivityExpenseRows();
  populateFrontPersonDropdown();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  lucide.createIcons();
}

// --- 3. ĐIỂM DANH THÀNH VIÊN (CHIP NÚT 6 TRÊN CÙNG 1 HÀNG THU GỌN GÀNG) ---
function renderActivityMemberChips() {
  const officialGrid = document.getElementById('actOfficialMemberGrid');
  const honoraryGrid = document.getElementById('actHonoraryMemberGrid');
  const totalBadge = document.getElementById('actMemberCountBadge');
  const offBadge = document.getElementById('actOfficialCountBadge');
  const honBadge = document.getElementById('actHonoraryCountBadge');

  if (!officialGrid || !honoraryGrid) return;

  const OFFICIAL_ORDER = ['TNTOAN', 'CHÍNH', 'MẠNH', 'KIÊN', 'TƯƠI', 'THẮNG', 'QUẢNG', 'HẢI', 'PHÁP', 'HỒNG', 'HẠNH', 'CÔNG', 'THUỘC', 'THÀNH', 'TÂN', 'LƯỢNG', 'T.ANH', 'TRƯỜNG', 'ĐÊ', 'DUY', 'KHƯƠNG', 'MINH'];
  const HONORARY_ORDER = ['HIẾU', 'NGUYÊN', 'ĐẠT', 'DŨNG'];

  let officialMembers = AppState.members.filter(m => m.type === 'OFFICIAL');
  officialMembers.sort((a, b) => {
    const aName = (a.chipName || a.name || '').toUpperCase();
    const bName = (b.chipName || b.name || '').toUpperCase();
    const idxA = OFFICIAL_ORDER.indexOf(aName);
    const idxB = OFFICIAL_ORDER.indexOf(bName);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return aName.localeCompare(bName, 'vi');
  });

  let honoraryMembers = AppState.members.filter(m => m.type === 'HONORARY' || m.type === 'UNOFFICIAL');
  honoraryMembers.sort((a, b) => {
    const aName = (a.chipName || a.name || '').toUpperCase();
    const bName = (b.chipName || b.name || '').toUpperCase();
    const idxA = HONORARY_ORDER.indexOf(aName);
    const idxB = HONORARY_ORDER.indexOf(bName);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return aName.localeCompare(bName, 'vi');
  });

  // Các thành viên quản lý tham gia sinh hoạt và điểm danh bình thường giống mọi thành viên

  let offSelectedCount = 0;
  let honSelectedCount = 0;
  const currentUserId = AppState.auth?.user?.id;
  const isPast = isPastAttendanceCutoff(activityState.date);
  const isMgr = isAttendanceManager();

  // Render Thành viên chính thức (5 cột gọn gàng, hiển thị trọn vẹn tên)
  officialGrid.innerHTML = officialMembers.map(m => {
    const isSel = activityState.selectedMemberIds.has(m.id);
    if (isSel) offSelectedCount++;
    const label = m.chipName || m.name.split(' ').pop().toUpperCase();
    const isSelf = AppState.auth?.isLoggedIn && currentUserId === m.id;

    let titleExtra = '';
    if (isSelf) {
      titleExtra = ' [Tài khoản của bạn]';
      if (!isMgr && isPast) {
        titleExtra += isSel ? ' - Đã chốt điểm danh (Không thể hủy quá giờ)' : ' - Đã hết giờ tự điểm danh';
      }
    }

    return `
      <button type="button" onclick="toggleActivityMember('${m.id}')"
        class="py-1.5 px-0.5 sm:px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-2xs select-none min-h-[36px] flex items-center justify-center cursor-pointer leading-tight ${
          isSel 
            ? 'bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-emerald-900/15 ring-1 ring-emerald-600 active:scale-95' 
            : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 active:scale-95'
        } ${isSelf ? 'ring-2 ring-amber-400 ring-offset-1 font-black' : ''}" title="${m.name}${titleExtra} (${formatMoney(m.balance || 0)})">
        <span class="whitespace-nowrap tracking-tight font-black">${isSel ? '✓ ' : ''}${label}${isSelf ? ' ⭐' : ''}</span>
      </button>
    `;
  }).join('');

  // Render Thành viên danh dự (5 cột gọn gàng, hiển thị trọn vẹn tên)
  honoraryGrid.innerHTML = honoraryMembers.map(m => {
    const isSel = activityState.selectedMemberIds.has(m.id);
    if (isSel) honSelectedCount++;
    const label = m.chipName || m.name.split(' ').pop().toUpperCase();
    const isSelf = AppState.auth?.isLoggedIn && currentUserId === m.id;

    let titleExtra = '';
    if (isSelf) {
      titleExtra = ' [Tài khoản của bạn]';
      if (!isMgr && isPast) {
        titleExtra += isSel ? ' - Đã chốt điểm danh (Không thể hủy quá giờ)' : ' - Đã hết giờ tự điểm danh';
      }
    }

    return `
      <button type="button" onclick="toggleActivityMember('${m.id}')"
        class="py-1.5 px-0.5 sm:px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-2xs select-none min-h-[36px] flex items-center justify-center cursor-pointer leading-tight ${
          isSel 
            ? 'bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-emerald-900/15 ring-1 ring-emerald-600 active:scale-95' 
            : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 active:scale-95'
        } ${isSelf ? 'ring-2 ring-amber-400 ring-offset-1 font-black' : ''}" title="${m.name}${titleExtra} (${formatMoney(m.balance || 0)})">
        <span class="whitespace-nowrap tracking-tight font-black">${isSel ? '✓ ' : ''}${label}${isSelf ? ' ⭐' : ''}</span>
      </button>
    `;
  }).join('');

  if (totalBadge) totalBadge.textContent = activityState.selectedMemberIds.size;
  if (offBadge) offBadge.textContent = `${offSelectedCount}/${officialMembers.length}`;
  if (honBadge) honBadge.textContent = `${honSelectedCount}/${honoraryMembers.length}`;
}

function toggleActivityMember(memberId) {
  if (typeof assertRealtimeOnlineConnected === 'function' && !assertRealtimeOnlineConnected('điểm danh thành viên')) {
    return;
  }
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('🔐 Vui lòng đăng nhập để thực hiện điểm danh!', 'warning');
    openLoginModal();
    return;
  }
  const currentUserId = AppState.auth.user.id;
  if (!isAttendanceManager() && memberId !== currentUserId) {
    showToast('⚠️ Bạn chỉ có quyền tự điểm danh cho chính mình!', 'warning');
    return;
  }
  if (!isAttendanceManager() && isPastAttendanceCutoff(activityState.date)) {
    const cutoff = getAttendanceCutoffTime();
    showToast(`⚠️ Đã quá giờ chốt điểm danh (${cutoff})! Vui lòng liên hệ Ban Quản lý để được bổ sung.`, 'error');
    return;
  }

  const existingSes = (AppState.activitySessions || []).find(s => s.date === activityState.date);
  if (existingSes && !activityState.isEditingFinalizedSession) {
    if (isMonthClosed(activityState.date)) {
      showToast('🔒 Tháng này đã chốt sổ cuối tháng! Không thể chỉnh sửa buổi hoạt động này.', 'error');
      return;
    }
    activityState.isEditingFinalizedSession = true;
    activityState.editingSessionId = existingSes.id;
    renderSessionFinalizedBanner();
    showToast('✏️ Đã mở chế độ chỉnh sửa buổi hoạt động! Chạm để chọn người và bấm "Cập nhật & Chốt lại".', 'info');
  }

  // Tự động chuyển đổi trạng thái chọn / bỏ chọn ngay lập tức
  if (activityState.selectedMemberIds.has(memberId)) {
    activityState.selectedMemberIds.delete(memberId);
  } else {
    activityState.selectedMemberIds.add(memberId);
  }

  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }

  saveActivitySessionState();
  renderActivityMemberChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  renderSelfAttendanceBanner();
}

function selectAllActivityMembers() {
  if (typeof assertRealtimeOnlineConnected === 'function' && !assertRealtimeOnlineConnected('chọn tất cả thành viên')) {
    return;
  }
  if (!isAttendanceManager()) {
    showToast('⚠️ Chỉ Ban Quản lý mới có quyền thao tác chọn tất cả danh sách thành viên!', 'warning');
    return;
  }
  AppState.members.forEach(m => {
    if (m.type === 'OFFICIAL' || m.type === 'HONORARY' || m.type === 'UNOFFICIAL') {
      activityState.selectedMemberIds.add(m.id);
    }
  });
  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }
  saveActivitySessionState();
  renderActivityMemberChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  renderSelfAttendanceBanner();
}

function deselectAllActivityMembers() {
  if (typeof assertRealtimeOnlineConnected === 'function' && !assertRealtimeOnlineConnected('bỏ chọn thành viên')) {
    return;
  }
  if (!isAttendanceManager()) {
    showToast('⚠️ Chỉ Ban Quản lý mới có quyền thao tác bỏ chọn tất cả danh sách thành viên!', 'warning');
    return;
  }
  activityState.selectedMemberIds.clear();
  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }
  saveActivitySessionState();
  renderActivityMemberChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  renderSelfAttendanceBanner();
}

// --- 4. KHÁCH (HIỂN THỊ MỖI LEVEL TRÊN 1 DÒNG: Level A : THẾ ANH , PHONG , QUANG-Q) ---
function renderActivityGuestChips() {
  const container = document.getElementById('actGuestLevelsContainer') || document.getElementById('actGuestMemberGrid');
  const countBadge = document.getElementById('actGuestCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = activityState.selectedGuestIds.size;

  const guests = AppState.members.filter(m => m.type && m.type.startsWith('GUEST'));

  if (guests.length === 0) {
    container.innerHTML = `<span class="text-slate-400 text-xs italic py-1">Chưa có khách nào trong danh sách.</span>`;
    return;
  }

  const pA = AppState.config?.guestPrices?.GUEST_A || 90000;
  const pB = AppState.config?.guestPrices?.GUEST_B || 70000;
  const pC = AppState.config?.guestPrices?.GUEST_C || 50000;
  const levels = [
    { key: 'GUEST_A', label: 'Level A', price: pA, color: 'text-emerald-800' },
    { key: 'GUEST_B', label: 'Level B', price: pB, color: 'text-amber-800' },
    { key: 'GUEST_C', label: 'Level C', price: pC, color: 'text-blue-800' }
  ];

  container.className = "space-y-1";

  container.innerHTML = levels.map(lvl => {
    const groupGuests = guests.filter(g => g.type === lvl.key || g.level === lvl.label.replace('Level ', ''));
    if (groupGuests.length === 0) return '';

    return `
      <div class="flex items-center gap-1.5 py-0.5 flex-nowrap overflow-x-auto mobile-scroll">
        <!-- Nhãn Level trên cùng 1 dòng: thu nhỏ min-width & text -->
        <div class="shrink-0 flex items-center gap-0.5 font-black text-[11px] min-w-[50px]">
          <span class="${lvl.color} font-black">${lvl.label}</span>
          <span class="text-slate-400 font-bold">:</span>
        </div>

        <!-- Danh sách khách dạng chip thu nhỏ khoảng cách và padding gọn gàng -->
        <div class="flex items-center gap-1 flex-nowrap shrink-0">
          ${groupGuests.map((g, idx) => {
            const isSel = activityState.selectedGuestIds.has(g.id);
            const displayName = g.chipName || g.name;
            return `
              <button type="button" onclick="toggleActivityGuest('${g.id}')"
                class="px-2 py-0.5 rounded-lg text-[11px] font-bold transition shadow-2xs select-none whitespace-nowrap cursor-pointer flex items-center gap-0.5 shrink-0 ${
                  isSel 
                    ? 'bg-emerald-700 text-white shadow-emerald-900/15 ring-1 ring-emerald-600 font-black' 
                    : 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300'
                }">
                <span>${isSel ? '✓ ' : ''}${displayName}</span>
              </button>
              ${idx < groupGuests.length - 1 ? '<span class="text-slate-300 font-bold text-[10px] select-none -ml-0.5">,</span>' : ''}
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleActivityGuest(guestId) {
  if (!isAttendanceManager()) {
    showToast('⚠️ Chỉ Ban Quản lý mới có quyền điểm danh khách giao lưu!', 'warning');
    if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) openLoginModal();
    return;
  }
  const existingSes = (AppState.activitySessions || []).find(s => s.date === activityState.date);
  if (existingSes && !activityState.isEditingFinalizedSession) {
    if (isMonthClosed(activityState.date)) {
      showToast('🔒 Tháng này đã chốt sổ cuối tháng! Không thể chỉnh sửa buổi hoạt động này.', 'error');
      return;
    }
    activityState.isEditingFinalizedSession = true;
    activityState.editingSessionId = existingSes.id;
    renderSessionFinalizedBanner();
    showToast('✏️ Đã mở chế độ chỉnh sửa buổi hoạt động!', 'info');
  }
  if (activityState.selectedGuestIds.has(guestId)) {
    activityState.selectedGuestIds.delete(guestId);
  } else {
    activityState.selectedGuestIds.add(guestId);
  }
  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }
  saveActivitySessionState();
  renderActivityGuestChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
}

function addNewGuestInline() {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền thêm khách vào buổi sinh hoạt!', 'warning');
    return;
  }
  const nameInput = document.getElementById('newGuestNameInput');
  const levelSelect = document.getElementById('newGuestLevelSelect');
  if (!nameInput) return;

  const rawName = nameInput.value.trim();
  if (!rawName) {
    showToast('Vui lòng nhập tên khách mới!', 'warning');
    nameInput.focus();
    return;
  }

  // Không cho phép đặt trùng tên thành viên / khách đã có trong CLB
  const dupGuest = findDuplicateMemberName(rawName, null);
  if (dupGuest) {
    showToast(`⚠️ Tên "${rawName}" đã tồn tại trong danh sách CLB (${dupGuest.name})! Vui lòng chọn tên khác hoặc thêm biệt danh phân biệt.`, 'warning');
    if (typeof validateInlineGuestName === 'function') validateInlineGuestName();
    nameInput.focus();
    return;
  }

  let levelKey = levelSelect ? levelSelect.value : 'GUEST_C';
  if (levelKey === 'UNRANKED') levelKey = 'GUEST_C';

  const fee = (AppState.config && AppState.config.guestPrices && AppState.config.guestPrices[levelKey]) || (levelKey === 'GUEST_A' ? 90000 : (levelKey === 'GUEST_B' ? 70000 : 50000));
  const levelLetter = levelKey.replace('GUEST_', '');

  const newGuest = {
    id: 'G_' + Date.now(),
    name: rawName,
    chipName: rawName.toUpperCase(),
    phone: '',
    type: levelKey,
    level: levelLetter,
    fee: fee,
    username: '',
    password: '',
    balance: 0,
    monthlySessions: 1,
    role: 'MEMBER',
    status: 'ACTIVE',
    permissions: getRoleDefaultPermissions('MEMBER')
  };

  AppState.members.push(newGuest);
  activityState.selectedGuestIds.add(newGuest.id);
  if (activityState.temporaryAttendanceSaved) {
    activityState.isEditingAttendance = true;
  }
  saveData();
  saveActivitySessionState();

  nameInput.value = '';
  renderActivityGuestChips();
  recalculateActivitySplit();
  updateAttendanceSaveBarUI();
  renderActivityMatches();
  showToast(`Đã thêm khách "${rawName}" (${levelLetter} - ${formatMoney(fee)})!`, 'success');
}

function toggleSaveGuestDebt(checked) {
  activityState.saveGuestDebt = checked;
  saveActivitySessionState();
}

// --- 4C. DÒNG LƯU VÀ SỬA ĐIỂM DANH TẠM THỜI (ÁP DỤNG CHO THỐNG KÊ TRẬN CẦU) ---
function updateAttendanceSaveBarUI() {
  const bar = document.getElementById('actAttendanceSaveBar');
  const badge = document.getElementById('actSaveStatusBadge');
  const countText = document.getElementById('actSaveCountText');
  const noteText = document.getElementById('actSaveNoteText');
  const btnSave = document.getElementById('btnSaveTempAttendance');
  const btnLabel = document.getElementById('btnSaveTempAttendanceLabel');

  if (!bar) return;

  const memCount = activityState.selectedMemberIds ? activityState.selectedMemberIds.size : 0;
  const guestCount = activityState.selectedGuestIds ? activityState.selectedGuestIds.size : 0;
  const total = memCount + guestCount;

  if (noteText) noteText.className = 'hidden';

  if (activityState.temporaryAttendanceSaved) {
    if (activityState.isEditingAttendance) {
      // Đang ở chế độ chỉnh sửa / bổ sung
      bar.className = 'mt-1.5 p-1.5 sm:p-2 rounded-xl border border-amber-300 bg-amber-50/90 flex items-center justify-between gap-1.5 flex-wrap shadow-2xs transition-all';
      if (badge) {
        badge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0';
        badge.textContent = 'Đang sửa...';
      }
      if (countText) countText.textContent = `${total} người (${memCount} TV, ${guestCount} Khách)`;
      if (btnLabel) btnLabel.textContent = 'Lưu sửa';
      if (btnSave) btnSave.className = 'px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer';
    } else {
      // Đã lưu tạm thành công
      bar.className = 'mt-1.5 p-1.5 sm:p-2 rounded-xl border border-emerald-300 bg-emerald-50/90 flex items-center justify-between gap-1.5 flex-wrap shadow-2xs transition-all';
      if (badge) {
        badge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900 shrink-0';
        badge.textContent = '✓ Đã lưu';
      }
      if (countText) countText.textContent = `${total} người (${memCount} TV, ${guestCount} Khách)`;
      if (btnLabel) btnLabel.textContent = 'Đã lưu';
      if (btnSave) btnSave.className = 'px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer';
    }
  } else {
    // Chưa lưu lần nào
    bar.className = 'mt-1.5 p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-1.5 flex-wrap shadow-2xs transition-all';
    if (badge) {
      badge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0';
      badge.textContent = 'Chưa lưu';
    }
    if (countText) countText.textContent = `${total} người (${memCount} TV, ${guestCount} Khách)`;
    if (btnLabel) btnLabel.textContent = 'Lưu';
    if (btnSave) btnSave.className = 'px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer';
  }
}

function saveTemporaryAttendance() {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền lưu điểm danh! Vui lòng liên hệ Trưởng nhóm để được cấp quyền.', 'warning');
    return;
  }
  const memCount = activityState.selectedMemberIds ? activityState.selectedMemberIds.size : 0;
  const guestCount = activityState.selectedGuestIds ? activityState.selectedGuestIds.size : 0;
  const total = memCount + guestCount;

  if (total === 0) {
    showToast('Vui lòng chọn ít nhất 1 thành viên hoặc khách trước khi lưu điểm danh!', 'warning');
    return;
  }

  activityState.temporaryAttendanceSaved = true;
  activityState.isEditingAttendance = false;
  activityState.savedAttendanceTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Tự động gán người chơi cho các trận cầu mẫu nếu đang để trống
  const attendees = getCheckedInAttendees();
  if (activityState.matches && activityState.matches.length > 0 && attendees.length >= 4) {
    const m1 = activityState.matches[0];
    if (m1 && (!m1.team1[0] || m1.team1[0] === 'M001')) {
      m1.team1 = [attendees[0].id, attendees[1].id];
      m1.team2 = [attendees[2].id, attendees[3].id];
    }
  }

  saveActivitySessionState();
  updateAttendanceSaveBarUI();
  renderActivityMatches();

  showToast(`✓ Đã lưu tạm ${total} người điểm danh! Đã áp dụng cho thống kê các trận cầu.`, 'success');
}

function editAttendancePrompt() {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền sửa điểm danh! Vui lòng liên hệ Trưởng nhóm.', 'warning');
    return;
  }
  activityState.isEditingAttendance = true;
  updateAttendanceSaveBarUI();

  // Cuộn mượt mà lên phần điểm danh thành viên
  const memSection = document.getElementById('actOfficialMemberGrid');
  if (memSection) {
    memSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    memSection.classList.add('ring-2', 'ring-amber-400', 'p-1', 'rounded-xl', 'transition-all');
    setTimeout(() => {
      memSection.classList.remove('ring-2', 'ring-amber-400', 'p-1', 'rounded-xl');
    }, 1200);
  }

  showToast('Chế độ sửa / bổ sung: Hãy chạm chọn thêm người vừa đến rồi bấm "Lưu bổ sung"!', 'info');
}

// --- 5. CHI PHÍ (THEO ẢNH 1) ---
function renderActivityExpenseRows() {
  const container = document.getElementById('actExpenseRowsContainer');
  if (!container) return;

  container.innerHTML = activityState.expenses.map((exp, idx) => {
    return `
      <div class="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm relative">
        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <div>
            <label class="block text-[10px] text-slate-400 font-bold mb-0.5 sm:mb-1 text-center truncate">Số lượng (quả)</label>
            <input type="number" min="0" value="${exp.qty}" oninput="updateExpenseQty(${exp.id}, this.value)" class="w-full text-xs font-black border border-slate-200 rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-slate-900" />
          </div>
          <div>
            <label class="block text-[10px] text-slate-400 font-bold mb-0.5 sm:mb-1 text-right truncate">Đơn giá</label>
            <input type="number" id="expUnitPrice_${exp.id}" min="0" step="any" value="${exp.unitPrice}" oninput="updateExpenseUnitPrice(${exp.id}, this.value)" class="w-full text-xs font-black border border-slate-200 rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right text-slate-900" />
          </div>
          <div>
            <label class="block text-[10px] text-slate-400 font-bold mb-0.5 sm:mb-1 text-right truncate">Số tiền</label>
            <input type="number" id="expAmount_${exp.id}" min="0" step="any" value="${exp.amount}" oninput="updateExpenseAmountDirect(${exp.id}, this.value)" class="w-full text-xs font-black text-emerald-800 border border-slate-200 rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 bg-emerald-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right" />
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function addActivityExpenseRow() {
  activityState.expenses.push({
    id: Date.now(),
    title: '',
    qty: 1,
    unitPrice: 0,
    amount: 0,
    isCombo: false
  });
  saveActivitySessionState();
  renderActivityExpenseRows();
  recalculateActivitySplit();
}

function removeActivityExpenseRow(id) {
  activityState.expenses = activityState.expenses.filter(e => e.id !== id);
  if (activityState.expenses.length === 0) {
    activityState.expenses.push({ id: Date.now(), title: '', qty: 1, unitPrice: 0, amount: 0, isCombo: false });
  }
  saveActivitySessionState();
  renderActivityExpenseRows();
  recalculateActivitySplit();
}

function updateExpenseTitle(id, val) {
  const exp = activityState.expenses.find(e => e.id === id);
  if (exp) {
    exp.title = val;
    saveActivitySessionState();
  }
}

function updateExpenseQty(id, val) {
  const exp = activityState.expenses.find(e => e.id === id);
  if (exp) {
    const parsed = (val !== '' && !isNaN(Number(val))) ? Math.max(0, parseInt(val, 10)) : 0;
    exp.qty = parsed;
    if (exp.isShuttleRow && (AppState.config?.shuttleBillingMode !== 'BY_BOX')) {
      const boxPrice = activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
      const countPerBox = AppState.config?.shuttlecocksPerBox || 12;
      const unitPrice = countPerBox > 0 ? Math.round(boxPrice / countPerBox) : 28333;
      exp.unitPrice = unitPrice;
      if (exp.qty === countPerBox) {
        exp.amount = boxPrice;
      } else {
        exp.amount = exp.qty * unitPrice;
      }
    } else {
      exp.amount = exp.qty * exp.unitPrice;
    }
    saveActivitySessionState();
    const amtInput = document.getElementById(`expAmount_${id}`);
    if (amtInput) amtInput.value = exp.amount;
    const unitInput = document.getElementById(`expUnitPrice_${id}`);
    if (unitInput) unitInput.value = exp.unitPrice;
    recalculateActivitySplit();
  }
}

function updateExpenseUnitPrice(id, val) {
  const exp = activityState.expenses.find(e => e.id === id);
  if (exp) {
    exp.unitPrice = Math.max(0, Number(val) || 0);
    exp.amount = exp.qty * exp.unitPrice;
    saveActivitySessionState();
    renderActivityExpenseRows();
    recalculateActivitySplit();
  }
}

function updateExpenseAmountDirect(id, val) {
  const exp = activityState.expenses.find(e => e.id === id);
  if (exp) {
    exp.amount = Math.max(0, Number(val) || 0);
    exp.unitPrice = Math.round(exp.amount / exp.qty);
    saveActivitySessionState();
    recalculateActivitySplit();
  }
}

function updateExpenseCombo(id, checked) {
  const exp = activityState.expenses.find(e => e.id === id);
  if (exp) exp.isCombo = checked;
}

function updateShuttleBillingUI() {
  updateDailyRatePresetBadgeUI();
}

function switchShuttleBillingMode(mode) {
  AppState.config.shuttleBillingMode = mode;
  saveData();
  applyDailyRatePreset();
  updateDailyRatePresetBadgeUI();
}

function setShuttleCount(count) {
  const parsedCount = Math.max(1, Math.min(100, Number(count) || 1));
  const exp = activityState.expenses.find(e => e.isShuttleRow) || activityState.expenses[0];
  if (exp) {
    updateExpenseQty(exp.id, parsedCount);
  }
}

function adjustShuttleCount(delta) {
  const exp = activityState.expenses.find(e => e.isShuttleRow) || activityState.expenses[0];
  if (exp) {
    updateExpenseQty(exp.id, (exp.qty || 1) + delta);
  }
}

function onActivityDailyBoxPriceChanged(val) {
  const boxPrice = Math.max(0, Number(val) || 0);
  const count = AppState.config?.shuttlecocksPerBox || 12;
  const unitPrice = count > 0 ? Math.round(boxPrice / count) : 0;

  activityState.dailyBoxPrice = boxPrice;

  // Cập nhật dòng chi phí tiền cầu
  const exp = (activityState.expenses || []).find(e => e.isShuttleRow) || activityState.expenses[0];
  if (exp) {
    exp.unitPrice = unitPrice;
    if (exp.qty === count) {
      exp.amount = boxPrice;
    } else {
      exp.amount = exp.qty * unitPrice;
    }
  }

  saveActivitySessionState();
  updateDailyRatePresetBadgeUI();
  renderActivityExpenseRows();
  recalculateActivitySplit();
}

function updateDailyRatePresetBadgeUI() {
  const badge = document.getElementById('actDailyRatePresetBadge');
  const boxPrice = activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
  const count = AppState.config?.shuttlecocksPerBox || 12;
  const unitPrice = count > 0 ? Math.round(boxPrice / count) : 28333;
  const mode = AppState.config?.shuttleBillingMode || 'BY_SHUTTLE';

  if (badge) {
    if (mode === 'BY_SHUTTLE') {
      badge.textContent = `ĐƠN GIÁ THEO QUẢ = ${formatMoney(unitPrice)} (1 hộp ${count} quả = ${formatMoney(boxPrice)})`;
    } else {
      const title = AppState.config?.dailyRateTitle || `ĐƠN GIÁ THEO NGÀY ${count}`;
      badge.textContent = `${title} = ${formatMoney(boxPrice)}`;
    }
  }
}

function applyDailyRatePreset(rate) {
  let boxPrice = rate;
  if (boxPrice === undefined) {
    const configInput = document.getElementById('configDailyBoxPrice');
    if (configInput && configInput.value) {
      boxPrice = Number(configInput.value) || 340000;
    } else {
      boxPrice = activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000;
    }
  }
  const countInput = document.getElementById('configShuttlecocksPerBox');
  const count = (countInput && countInput.value) ? (Number(countInput.value) || 12) : (AppState.config?.shuttlecocksPerBox || 12);
  const unitPrice = count > 0 ? Math.round(boxPrice / count) : 28333;
  const mode = AppState.config?.shuttleBillingMode || 'BY_SHUTTLE';

  activityState.dailyBoxPrice = boxPrice;

  if (activityState.expenses.length > 0) {
    if (mode === 'BY_SHUTTLE') {
      const qty = activityState.expenses[0].qty || count;
      activityState.expenses[0].title = 'Tiền cầu';
      activityState.expenses[0].unitPrice = unitPrice;
      activityState.expenses[0].qty = qty;
      activityState.expenses[0].amount = (qty === count) ? boxPrice : (qty * unitPrice);
      activityState.expenses[0].isShuttleRow = true;
    } else {
      const title = AppState.config?.dailyRateTitle || `ĐƠN GIÁ THEO NGÀY ${count}`;
      activityState.expenses[0].title = title;
      activityState.expenses[0].unitPrice = boxPrice;
      activityState.expenses[0].qty = 1;
      activityState.expenses[0].amount = boxPrice;
      activityState.expenses[0].isShuttleRow = true;
    }
  } else {
    if (mode === 'BY_SHUTTLE') {
      activityState.expenses.push({
        id: Date.now(),
        title: 'Tiền cầu',
        qty: count,
        unitPrice: unitPrice,
        amount: boxPrice,
        isCombo: false,
        isShuttleRow: true
      });
    } else {
      const title = AppState.config?.dailyRateTitle || `ĐƠN GIÁ THEO NGÀY ${count}`;
      activityState.expenses.push({
        id: Date.now(),
        title: title,
        qty: 1,
        unitPrice: boxPrice,
        amount: boxPrice,
        isCombo: false,
        isShuttleRow: true
      });
    }
  }
  saveActivitySessionState();
  updateDailyRatePresetBadgeUI();
  renderActivityExpenseRows();
  recalculateActivitySplit();
  showToast(`✓ Đã áp dụng đơn giá theo ngày: ${mode === 'BY_SHUTTLE' ? formatMoney(unitPrice) + '/quả (1 hộp = ' + formatMoney(boxPrice) + ')' : formatMoney(boxPrice) + '/hộp'}!`, 'success');
}

// --- 6. KHOẢN ĐÓNG GÓP & NGƯỜI ỨNG TIỀN ---
function populateFrontPersonDropdown() {
  const select = document.getElementById('actFrontPersonSelect');
  if (!select) return;

  const eligible = AppState.members.filter(m => m.type === 'OFFICIAL' || m.type === 'HONORARY');

  let html = `<option value="NONE" ${activityState.frontPersonId === 'NONE' ? 'selected' : ''}>Không ai</option>`;
  eligible.forEach(m => {
    html += `<option value="${m.id}" ${activityState.frontPersonId === m.id ? 'selected' : ''}>${m.name}</option>`;
  });
  select.innerHTML = html;
}

function onFrontPersonChanged(val) {
  activityState.frontPersonId = val;
  recalculateActivitySplit();
}

function onFrontAllToggled(checked) {
  activityState.isFrontAll = checked;
  recalculateActivitySplit();
}

function onFrontAmountChanged(val) {
  activityState.frontAmount = Math.max(0, Number(val) || 0);
  const chk = document.getElementById('actFrontAllCheckbox');
  if (chk && activityState.isFrontAll) {
    chk.checked = false;
    activityState.isFrontAll = false;
  }
  recalculateActivitySplit();
}

function onTipAmountChanged(val) {
  activityState.tipAmount = Math.max(0, Number(val) || 0);
  recalculateActivitySplit();
}

function onActivityDateChanged(val) {
  const existingSes = (AppState.activitySessions || []).find(s => s.date === val);
  if (existingSes) {
    loadSessionIntoAttendance(existingSes, false);
    const dateFormatted = val.split('-').reverse().join('/');
    showToast(`ℹ️ Ngày ${dateFormatted} đã có buổi hoạt động được chốt. Đã tải thông tin!`, 'info');
    return;
  }
  activityState.date = val;
  activityState.isEditingFinalizedSession = false;
  activityState.editingSessionId = null;
  saveActivitySessionState();
  renderSelfAttendanceBanner();
  renderActivityMemberChips();
  renderSessionFinalizedBanner();
}

function onActivityTypeChanged(val) {
  activityState.type = val;
  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();
}

function syncExchangeClubsBackward() {
  if (!Array.isArray(activityState.exchangeClubs)) {
    activityState.exchangeClubs = [];
  }
  activityState.exchangeClubName = activityState.exchangeClubs.map(c => c.name).filter(Boolean).join(', ');
  activityState.exchangeMembers = activityState.exchangeClubs.flatMap(c => c.members || []);
}

function getNormalizedExchangeClubs() {
  if (Array.isArray(activityState.exchangeClubs) && activityState.exchangeClubs.length > 0) {
    return activityState.exchangeClubs;
  }
  if ((activityState.exchangeClubName && activityState.exchangeClubName.trim()) || (Array.isArray(activityState.exchangeMembers) && activityState.exchangeMembers.length > 0)) {
    const rawName = (activityState.exchangeClubName || 'CLB Giao lưu').trim();
    const names = rawName.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
    if (names.length <= 1) {
      activityState.exchangeClubs = [{
        id: 'EXC_' + Date.now(),
        name: rawName || 'CLB Giao lưu',
        members: Array.isArray(activityState.exchangeMembers) ? [...activityState.exchangeMembers] : []
      }];
    } else {
      activityState.exchangeClubs = names.map((n, i) => ({
        id: 'EXC_' + Date.now() + '_' + i,
        name: n,
        members: i === 0 ? (Array.isArray(activityState.exchangeMembers) ? [...activityState.exchangeMembers] : []) : []
      }));
    }
    syncExchangeClubsBackward();
    return activityState.exchangeClubs;
  }
  return [];
}

function renderExchangeClubUI() {
  const section = document.getElementById('actExchangeClubSection');
  if (!section) return;

  const isExchange = (activityState.type === 'Giao lưu');
  const quickBar = document.getElementById('actAddExchangeClubQuickBar');
  const quickBtn = document.getElementById('btnQuickAddExchangeClub');

  if (!isExchange) {
    section.classList.add('hidden');
    if (quickBar) quickBar.classList.remove('hidden');
    if (quickBtn) quickBtn.classList.remove('hidden');
    return;
  }

  section.classList.remove('hidden');
  if (quickBar) quickBar.classList.add('hidden');
  if (quickBtn) quickBtn.classList.add('hidden');

  const clubs = getNormalizedExchangeClubs();
  if (clubs.length === 0) {
    clubs.push({
      id: 'EXC_' + Date.now(),
      name: 'CLB Giao lưu',
      members: []
    });
    syncExchangeClubsBackward();
  }

  const totalMembers = clubs.reduce((sum, c) => sum + (c.members ? c.members.length : 0), 0);

  // Count badge
  const countBadge = document.getElementById('actExchangeClubMemberCountBadge');
  if (countBadge) {
    countBadge.textContent = `${totalMembers} người • ${clubs.length} CLB`;
  }

  // Render danh sách các thẻ CLB vào actExchangeClubsListContainer
  const container = document.getElementById('actExchangeClubsListContainer');
  if (container) {
    container.innerHTML = clubs.map((club, cIdx) => {
      const cMembers = Array.isArray(club.members) ? club.members : [];
      return `
        <div class="p-2.5 bg-white/95 rounded-xl border border-amber-300 shadow-2xs space-y-2">
          <!-- Club Header -->
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="text-[11px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                CLB #${cIdx + 1}
              </span>
              <input type="text"
                     value="${escapeHtml(club.name)}" 
                     onchange="updateExchangeClubName(${cIdx}, this.value)" 
                     placeholder="Tên CLB bạn (VD: CLB XH, CLB A...)" 
                     class="font-black text-xs text-amber-950 bg-amber-50/60 focus:bg-white border border-amber-200 focus:border-amber-400 rounded-lg px-2 py-1 w-full max-w-[200px] outline-none transition shadow-2xs" 
                     title="Chạm vào để sửa tên CLB này" />
              <span class="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                ${cMembers.length} người
              </span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="promptAddMultipleExchangeMembers(${cIdx})" class="text-[10px] text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer" title="Dán danh sách nhiều thành viên">
                📋 Dán DS
              </button>
              ${clubs.length > 1 ? `
                <button type="button" onclick="removeExchangeClub(${cIdx})" class="text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold px-1.5 py-0.5 rounded transition cursor-pointer" title="Xóa toàn bộ CLB này">
                  ✕ Xóa CLB
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Quick Add Member Row for this Club -->
          <div class="flex items-center gap-1.5">
            <input type="text" 
                   id="actExClubInput_${cIdx}" 
                   placeholder="Nhập tên TV ${escapeHtml(club.name)} (cách nhau dấu phẩy)..." 
                   onkeydown="if(event.key==='Enter'){event.preventDefault();addExchangeMemberFromClubInput(${cIdx});}"
                   class="flex-1 px-2.5 py-1 text-xs font-semibold border border-amber-200 rounded-lg bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400" />
            <button type="button" 
                    onclick="addExchangeMemberFromClubInput(${cIdx})" 
                    class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs shrink-0">
              + Thêm
            </button>
          </div>

          <!-- Member Chips for this Club -->
          <div class="flex flex-wrap gap-1 min-h-[24px]">
            ${cMembers.length > 0 ? cMembers.map((memName, mIdx) => `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 border border-amber-200 text-amber-950 shadow-2xs">
                <span>🤝 ${escapeHtml(memName)}</span>
                <button type="button" onclick="removeExchangeMemberFromClub(${cIdx}, ${mIdx})" class="w-3.5 h-3.5 rounded-full hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-[10px] text-slate-400 font-black transition cursor-pointer" title="Xóa người này">✕</button>
              </span>
            `).join('') : '<span class="text-[11px] text-amber-700/70 italic py-0.5">Chưa có thành viên nào. Nhập tên và bấm "+ Thêm".</span>'}
          </div>
        </div>
      `;
    }).join('');
  }
}

function enableExchangeClubMode() {
  activityState.type = 'Giao lưu';
  const typeSelect = document.getElementById('actTypeSelect');
  if (typeSelect) typeSelect.value = 'Giao lưu';

  const clubs = getNormalizedExchangeClubs();
  if (clubs.length === 0) {
    clubs.push({
      id: 'EXC_' + Date.now(),
      name: 'CLB Giao lưu',
      members: []
    });
    syncExchangeClubsBackward();
  }

  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();

  setTimeout(() => {
    const firstInput = document.getElementById('actExClubInput_0');
    if (firstInput) {
      firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInput.focus();
    }
  }, 150);
  showToast('🤝 Đã bật chế độ Giao lưu! Bạn có thể thêm nhiều CLB bạn (CLB XH, CLB A...).', 'info');
}

function disableExchangeClubMode() {
  activityState.type = 'Buổi cầu';
  const typeSelect = document.getElementById('actTypeSelect');
  if (typeSelect) typeSelect.value = 'Buổi cầu';

  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();
  showToast('Đã chuyển về chế độ Buổi cầu định kỳ.', 'info');
}

function addNewExchangeClub(name = '') {
  if (!Array.isArray(activityState.exchangeClubs)) {
    activityState.exchangeClubs = [];
  }
  const defaultLetter = String.fromCharCode(65 + activityState.exchangeClubs.length);
  const clubName = (name && name.trim()) ? name.trim() : (`CLB ${defaultLetter}`);
  activityState.exchangeClubs.push({
    id: 'EXC_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: clubName,
    members: []
  });
  syncExchangeClubsBackward();
  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();

  const newIdx = activityState.exchangeClubs.length - 1;
  setTimeout(() => {
    const newInp = document.getElementById(`actExClubInput_${newIdx}`);
    if (newInp) {
      newInp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newInp.focus();
    }
  }, 100);
  showToast(`✓ Đã thêm ${clubName}! Nhập thành viên tham gia của CLB này.`, 'success');
}

function promptAddNewExchangeClub() {
  const currentCount = (activityState.exchangeClubs || []).length;
  const defaultName = currentCount === 0 ? 'CLB XH' : ('CLB ' + String.fromCharCode(65 + currentCount));
  const val = prompt('Nhập tên CLB giao lưu mới (VD: CLB XH, CLB A, CLB B...):', defaultName);
  if (val !== null) {
    addNewExchangeClub(val.trim() || defaultName);
  }
}

function removeExchangeClub(clubIdx) {
  if (!Array.isArray(activityState.exchangeClubs)) return;
  if (clubIdx < 0 || clubIdx >= activityState.exchangeClubs.length) return;
  const target = activityState.exchangeClubs[clubIdx];
  if (target.members && target.members.length > 0) {
    if (!confirm(`Xác nhận xóa "${target.name}" và toàn bộ ${target.members.length} thành viên của CLB này?`)) {
      return;
    }
  }
  activityState.exchangeClubs.splice(clubIdx, 1);
  if (activityState.exchangeClubs.length === 0) {
    activityState.exchangeClubs.push({
      id: 'EXC_' + Date.now(),
      name: 'CLB Giao lưu',
      members: []
    });
  }
  syncExchangeClubsBackward();
  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();
  showToast(`Đã xóa ${target.name}`, 'info');
}

function updateExchangeClubName(clubIdx, newName) {
  if (!Array.isArray(activityState.exchangeClubs)) return;
  if (clubIdx < 0 || clubIdx >= activityState.exchangeClubs.length) return;
  activityState.exchangeClubs[clubIdx].name = newName.trim() || (`CLB #${clubIdx + 1}`);
  syncExchangeClubsBackward();
  saveActivitySessionState();
  recalculateActivitySplit();
}

function addExchangeMemberFromClubInput(clubIdx) {
  if (!Array.isArray(activityState.exchangeClubs)) return;
  if (clubIdx < 0 || clubIdx >= activityState.exchangeClubs.length) return;
  const input = document.getElementById(`actExClubInput_${clubIdx}`);
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return;

  const names = raw.split(/[,;\n\r]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  if (names.length === 0) return;

  const club = activityState.exchangeClubs[clubIdx];
  if (!Array.isArray(club.members)) club.members = [];

  let added = 0;
  names.forEach(n => {
    if (!club.members.includes(n)) {
      club.members.push(n);
      added++;
    }
  });

  input.value = '';
  syncExchangeClubsBackward();
  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();
  showToast(`✓ Đã thêm ${added} thành viên vào ${club.name}!`, 'success');
}

function removeExchangeMemberFromClub(clubIdx, memIdx) {
  if (!Array.isArray(activityState.exchangeClubs)) return;
  if (clubIdx < 0 || clubIdx >= activityState.exchangeClubs.length) return;
  const club = activityState.exchangeClubs[clubIdx];
  if (!Array.isArray(club.members)) return;
  if (memIdx >= 0 && memIdx < club.members.length) {
    const removed = club.members.splice(memIdx, 1);
    syncExchangeClubsBackward();
    saveActivitySessionState();
    renderExchangeClubUI();
    recalculateActivitySplit();
    showToast(`Đã xóa ${removed[0]} khỏi ${club.name}`, 'info');
  }
}

function promptAddMultipleExchangeMembers(clubIdx) {
  if (!Array.isArray(activityState.exchangeClubs)) return;
  if (clubIdx < 0 || clubIdx >= activityState.exchangeClubs.length) return;
  const club = activityState.exchangeClubs[clubIdx];
  const defaultText = (club.members && club.members.length > 0) ? club.members.join(', ') : 'HÀ, PHƯỢNG, TUẤN, MINH';
  const val = prompt(`Dán hoặc nhập danh sách thành viên của ${club.name} (phân cách bằng dấu phẩy):`, defaultText);
  if (val === null) return;

  const names = val.split(/[,;\n\r]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  if (names.length === 0) return;

  club.members = names;
  syncExchangeClubsBackward();
  saveActivitySessionState();
  renderExchangeClubUI();
  recalculateActivitySplit();
  showToast(`✓ Đã cập nhật ${names.length} thành viên cho ${club.name}!`, 'success');
}

// Giữ lại các hàm cũ làm alias để tránh lỗi nếu có mã gọi
function promptChangeExchangeClubName() {
  promptAddNewExchangeClub();
}
function onExchangeClubNameChanged(val) {
  if (activityState.exchangeClubs && activityState.exchangeClubs.length > 0) {
    updateExchangeClubName(0, val);
  }
}
function addExchangeMemberFromInput() {
  addExchangeMemberFromClubInput(0);
}
function removeExchangeMember(index) {
  removeExchangeMemberFromClub(0, index);
}

function setActivityLanguage(lang) {
  activityState.lang = lang;
  const btnVI = document.getElementById('actBtnLangVI');
  const btnEN = document.getElementById('actBtnLangEN');
  if (lang === 'VI') {
    if (btnVI) { btnVI.className = 'px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-sm transition'; }
    if (btnEN) { btnEN.className = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 transition'; }
  } else {
    if (btnVI) { btnVI.className = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 transition'; }
    if (btnEN) { btnEN.className = 'px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-sm transition'; }
  }
}

// --- 6B. THỐNG KÊ CÁC TRẬN CẦU & CHỌN NHANH NGƯỜI CHƠI (MATCH LOG) ---
function getCheckedInAttendees() {
  const list = [];
  // Thành viên có mặt (Chính thức + Danh dự)
  activityState.selectedMemberIds.forEach(id => {
    const m = AppState.members.find(x => x.id === id);
    if (m) {
      list.push({
        id: m.id,
        name: m.name,
        chipName: m.chipName || m.name.split(' ').pop().toUpperCase(),
        type: m.type
      });
    }
  });
  // Khách có mặt
  activityState.selectedGuestIds.forEach(id => {
    const g = AppState.members.find(x => x.id === id);
    if (g) {
      list.push({
        id: g.id,
        name: g.name,
        chipName: g.chipName || g.name,
        type: g.type
      });
    }
  });
  // Thành viên các CLB giao lưu (hỗ trợ nhiều CLB)
  if (activityState.type === 'Giao lưu') {
    const clubs = (typeof getNormalizedExchangeClubs === 'function') ? getNormalizedExchangeClubs() : [];
    clubs.forEach((club, cIdx) => {
      const cName = club.name || `CLB ${cIdx + 1}`;
      (club.members || []).forEach((memName, mIdx) => {
        const exId = `EX_${cIdx}_${mIdx}_${memName.replace(/\s+/g, '_')}`;
        list.push({
          id: exId,
          name: `${memName} (${cName})`,
          chipName: `${memName} (${cName})`,
          clubName: cName,
          type: 'EXCHANGE'
        });
      });
    });
  }
  return list;
}

function buildAttendeeOptions(selectedId, excludeIds = [], placeholder = '-- Chọn --') {
  const attendees = getCheckedInAttendees();
  let html = `<option value="">${placeholder}</option>`;
  attendees.forEach(a => {
    if (excludeIds.includes(a.id) && a.id !== selectedId) {
      return;
    }
    const isSel = a.id === selectedId ? 'selected' : '';
    html += `<option value="${a.id}" ${isSel}>${a.chipName}</option>`;
  });
  return html;
}

function getAttendeeDisplayName(id) {
  if (!id) return '';
  const found = getCheckedInAttendees().find(a => a.id === id);
  if (found) return found.chipName || found.name;
  if (typeof id === 'string' && id.startsWith('EX_')) {
    const parts = id.split('_');
    return parts.slice(3).join(' ') || parts.slice(2).join(' ') || id;
  }
  const m = AppState.members.find(x => x.id === id);
  if (!m) return id;
  return m.chipName || m.name.split(' ').pop().toUpperCase();
}

/**
 * Format dòng kết quả trận đấu hiển thị tỉ số ngay theo từng cặp:
 * Ví dụ: Trận 1: CHÍNH CÔNG (21) 🏆 đấu với DŨNG DUY (18)
 */
function formatMatchResultInfo(idx, m) {
  const p1 = (m.team1 && m.team1[0]) || '';
  const p2 = (m.team1 && m.team1[1]) || '';
  const p3 = (m.team2 && m.team2[0]) || '';
  const p4 = (m.team2 && m.team2[1]) || '';

  const name1 = getAttendeeDisplayName(p1);
  const name2 = getAttendeeDisplayName(p2);
  const name3 = getAttendeeDisplayName(p3);
  const name4 = getAttendeeDisplayName(p4);

  const pair1 = [name1, name2].filter(Boolean).join(' ') || 'Đội 1';
  const pair2 = [name3, name4].filter(Boolean).join(' ') || 'Đội 2';
  const hasPlayers = Boolean(p1 || p2 || p3 || p4);

  const s1 = (m.score1 !== undefined && m.score1 !== null) ? Number(m.score1) : 0;
  const s2 = (m.score2 !== undefined && m.score2 !== null) ? Number(m.score2) : 0;
  const prize = (m.prize && m.prize.trim()) ? m.prize.trim() : '';
  const matchTitle = (m.name && m.name.trim()) ? m.name.trim() : `Trận ${idx + 1}`;

  let highlight1 = 'font-bold text-slate-800 bg-slate-100 px-1 py-0.2 rounded text-[10px] sm:text-[10.5px]';
  let highlight2 = 'font-bold text-slate-800 bg-slate-100 px-1 py-0.2 rounded text-[10px] sm:text-[10.5px]';
  let badge1 = '';
  let badge2 = '';
  let compactBadge = '<span class="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-500">Chưa đấu</span>';

  if (s1 > s2 && (s1 > 0 || s2 > 0)) {
    highlight1 = 'font-black text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 text-[10px] sm:text-[10.5px]';
    badge1 = ' 🏆';
    compactBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">🏆 ${pair1} Thắng</span>`;
  } else if (s2 > s1 && (s1 > 0 || s2 > 0)) {
    highlight2 = 'font-black text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 text-[10px] sm:text-[10.5px]';
    badge2 = ' 🏆';
    compactBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">🏆 ${pair2} Thắng</span>`;
  } else if (s1 === s2 && s1 > 0) {
    compactBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Hòa</span>`;
  } else if (prize) {
    compactBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-600">Đang đấu</span>`;
  }

  const prizeLineTag = prize ? ` <span class="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 shrink-0">🎁 ${prize}</span>` : '';
  const lineHtml = `<span class="font-bold text-slate-700 text-[10px] sm:text-[10.5px] shrink-0">${matchTitle}:</span> <span class="${highlight1} truncate"><b>${pair1}</b> (${s1})${badge1}</span> <span class="text-slate-400 font-bold px-0.5 text-[9px] sm:text-[10px] shrink-0">đấu</span> <span class="${highlight2} truncate"><b>${pair2}</b> (${s2})${badge2}</span>${prizeLineTag}`;
  
  let headerPill = '';
  if (s1 === 0 && s2 === 0) {
    headerPill = hasPlayers ? `${matchTitle}: ${pair1} vs ${pair2}${prize ? ` • 🎁 ${prize}` : ''}` : `${matchTitle}: Chưa đấu`;
  } else {
    headerPill = `${matchTitle}: 🏸 ${pair1} (${s1}) - (${s2}) ${pair2}${prize ? ` • 🎁 ${prize}` : ''}`;
  }

  return { s1, s2, pair1, pair2, prize, matchTitle, lineHtml, headerPill, statusBadge: compactBadge, compactBadge };
}

function updateMatchResultRealtime() {
  const matches = activityState.matches || [];
  
  // Cập nhật bảng tổng hợp dòng KẾT QUẢ ở trên (1 dòng tinh gọn mỗi trận)
  const summaryCard = document.getElementById('actMatchLinesSummaryCard');
  const summaryContainer = document.getElementById('actMatchLinesSummary');
  if (summaryCard && summaryContainer) {
    if (matches.length === 0) {
      summaryCard.classList.add('hidden');
    } else {
      summaryCard.classList.remove('hidden');
      summaryContainer.innerHTML = matches.map((m, idx) => {
        const info = formatMatchResultInfo(idx, m);
        return `
          <div class="py-1 px-1.5 sm:px-2 bg-white rounded-lg border border-emerald-200/90 shadow-2xs flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
            <div class="flex items-center gap-1.5 min-w-0 truncate">
              <span class="w-4 h-4 rounded bg-emerald-700 text-white font-black text-[10px] flex items-center justify-center shrink-0">${idx + 1}</span>
              <div class="flex items-center gap-1 min-w-0 truncate">${info.lineHtml}</div>
            </div>
            <div class="shrink-0 flex items-center gap-1">${info.compactBadge}</div>
          </div>
        `;
      }).join('');
    }
  }

  // Cập nhật từng card trận đấu (1 dòng chân card tinh gọn)
  matches.forEach((m, idx) => {
    const info = formatMatchResultInfo(idx, m);
    const lineEl = document.getElementById(`matchCardResultLine-${m.id}`);
    const badgeEl = document.getElementById(`matchHeaderResult-${m.id}`);
    const prizeBadgeEl = document.getElementById(`matchPrizeBadge-${m.id}`);

    if (lineEl) {
      lineEl.innerHTML = `
        <div class="flex items-center gap-1.5 min-w-0 truncate">
          <span class="text-[10px] shrink-0">🏸</span>
          <div class="flex items-center gap-1 min-w-0 truncate text-[10px] sm:text-[10.5px] text-slate-800">${info.lineHtml}</div>
        </div>
        <div class="shrink-0 flex items-center gap-1">${info.compactBadge}</div>
      `;
    }
    if (badgeEl) {
      badgeEl.textContent = info.headerPill;
    }
    if (prizeBadgeEl) {
      if (m.prize && m.prize.trim()) {
        prizeBadgeEl.textContent = m.prize.trim();
        prizeBadgeEl.classList.remove('hidden');
      } else {
        prizeBadgeEl.classList.add('hidden');
      }
    }
  });
}

function renderActivityMatches() {
  const container = document.getElementById('actMatchesContainer');
  const countBadge = document.getElementById('actMatchCountBadge');
  const statsBar = document.getElementById('actMemberMatchStatsBar');
  const contentArea = document.getElementById('actMatchStatsContentArea');
  const randomBtn = document.getElementById('btnActRandomMatch');

  const matches = activityState.matches || [];

  // Mặc định ẩn toàn bộ chi tiết thống kê và các trận đấu khi chưa có trận nào (chỉ hiển thị khi bấm nút Thêm trận)
  if (matches.length === 0) {
    if (contentArea) contentArea.classList.add('hidden');
    if (countBadge) {
      countBadge.classList.add('hidden');
      countBadge.textContent = '0 trận';
    }
    if (randomBtn) randomBtn.classList.add('hidden');
    if (container) container.innerHTML = '';
    return;
  }

  // Khi có trận đấu (do bấm + Thêm trận hoặc Bốc thăm ngẫu nhiên) -> Hiển thị
  if (contentArea) contentArea.classList.remove('hidden');
  if (countBadge) {
    countBadge.classList.remove('hidden');
    countBadge.textContent = `${matches.length} trận`;
  }
  if (randomBtn) randomBtn.classList.remove('hidden');

  if (!container) return;

  // Thống kê số lần ra sân của từng thành viên có mặt
  const matchCounts = {};
  const attendees = getCheckedInAttendees();
  attendees.forEach(a => matchCounts[a.id] = 0);

  matches.forEach(m => {
    (m.team1 || []).forEach(pId => { if (matchCounts[pId] !== undefined) matchCounts[pId]++; });
    (m.team2 || []).forEach(pId => { if (matchCounts[pId] !== undefined) matchCounts[pId]++; });
  });

  // Render thanh tần suất
  if (statsBar) {
    if (attendees.length === 0) {
      statsBar.innerHTML = `<span class="text-slate-400 text-[10px] sm:text-[11px] italic">Chưa có ai được điểm danh có mặt trong buổi này</span>`;
    } else {
      statsBar.innerHTML = attendees.map(a => {
        const c = matchCounts[a.id] || 0;
        const color = c === 0 ? 'bg-slate-100 text-slate-500 border-slate-200' : (c >= 2 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' : 'bg-white text-slate-800 border-slate-200');
        return `
          <span class="px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] border ${color} flex items-center gap-1 shadow-2xs">
            <span>${a.chipName}:</span>
            <b class="text-[10px] sm:text-[11px]">${c} trận</b>
          </span>
        `;
      }).join('');
    }
  }

  const prizeTypes = getPrizeTypes();

  container.innerHTML = matches.map((m, idx) => {
    const p1 = (m.team1 && m.team1[0]) || '';
    const p2 = (m.team1 && m.team1[1]) || '';
    const p3 = (m.team2 && m.team2[0]) || '';
    const p4 = (m.team2 && m.team2[1]) || '';

    const info = formatMatchResultInfo(idx, m);
    const prizeDetails = getMatchPrizeDetails(m);

    return `
      <div class="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
        <!-- Match Header: Tên trận tùy chọn + Huy hiệu kết quả theo cặp + Xóa -->
        <div class="flex items-center justify-between gap-1">
          <div class="flex items-center gap-1 min-w-0 truncate">
            <span class="w-5 h-5 rounded-md bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
            <div class="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-md px-1 py-0.2 shadow-2xs shrink-0">
              <span class="text-[9px] text-slate-400 font-bold">Tên:</span>
              <input type="text" value="${m.name || `Trận ${idx + 1}`}" 
                     oninput="updateMatchName(${m.id}, this.value)" 
                     placeholder="Tên..." 
                     class="text-xs text-slate-900 font-black uppercase tracking-tight bg-transparent focus:outline-none border-0 w-16 sm:w-28 p-0" 
                     title="Chạm để đổi tên trận đấu" />
            </div>
            <span id="matchHeaderResult-${m.id}" class="text-[9.5px] sm:text-[10.5px] font-bold text-emerald-900 bg-emerald-100/90 px-1.5 py-0.2 rounded-md border border-emerald-300 shadow-2xs truncate">
              ${info.headerPill}
            </span>
          </div>
          <button type="button" onclick="removeActivityMatch(${m.id})" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition shrink-0" title="Xóa trận này">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Match Teams & Scores Pickers (2 Cột song song như trên máy tính) -->
        <div class="grid grid-cols-2 gap-1.5 sm:gap-2 bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200">
          
          <!-- Đội 1 (Cặp 1) + Ô nhập tỉ số của Đội 1 -->
          <div class="space-y-1 bg-emerald-50/50 p-1.5 sm:p-2 rounded-xl border border-emerald-200/80">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-black text-emerald-900 uppercase tracking-tight truncate">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span class="truncate">Đội 1 (Cặp 1)</span>
              </div>
              <div class="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded-md border border-emerald-300 shadow-2xs shrink-0">
                <span class="text-[9px] font-bold text-slate-400">Tỉ số:</span>
                <input type="number" min="0" max="30" value="${info.s1}" 
                       oninput="updateMatchScore(${m.id}, this.value, null)" 
                       class="w-7 sm:w-8 text-center font-black text-xs text-emerald-900 bg-transparent focus:outline-none p-0" 
                       title="Nhập tỉ số của Đội 1" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <select onchange="updateMatchPlayer(${m.id}, 0, 0, this.value)" class="w-full text-[9px] sm:text-[10px] font-bold border border-slate-200 rounded-lg py-0.5 px-0.5 sm:px-1 bg-white focus:ring-1 focus:ring-emerald-500 tracking-tight" title="Người 1">
                ${buildAttendeeOptions(p1, [p2, p3, p4].filter(Boolean), '-- 1 --')}
              </select>
              <select onchange="updateMatchPlayer(${m.id}, 0, 1, this.value)" class="w-full text-[9px] sm:text-[10px] font-bold border border-slate-200 rounded-lg py-0.5 px-0.5 sm:px-1 bg-white focus:ring-1 focus:ring-emerald-500 tracking-tight" title="Người 2">
                ${buildAttendeeOptions(p2, [p1, p3, p4].filter(Boolean), '-- 2 --')}
              </select>
            </div>
          </div>

          <!-- Đội 2 (Cặp 2) + Ô nhập tỉ số của Đội 2 -->
          <div class="space-y-1 bg-amber-50/50 p-1.5 sm:p-2 rounded-xl border border-amber-200/80">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-black text-amber-900 uppercase tracking-tight truncate">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span class="truncate">Đội 2 (Cặp 2)</span>
              </div>
              <div class="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded-md border border-amber-300 shadow-2xs shrink-0">
                <span class="text-[9px] font-bold text-slate-400">Tỉ số:</span>
                <input type="number" min="0" max="30" value="${info.s2}" 
                       oninput="updateMatchScore(${m.id}, null, this.value)" 
                       class="w-7 sm:w-8 text-center font-black text-xs text-amber-900 bg-transparent focus:outline-none p-0" 
                       title="Nhập tỉ số của Đội 2" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <select onchange="updateMatchPlayer(${m.id}, 1, 0, this.value)" class="w-full text-[9px] sm:text-[10px] font-bold border border-slate-200 rounded-lg py-0.5 px-0.5 sm:px-1 bg-white focus:ring-1 focus:ring-emerald-500 tracking-tight" title="Người 1">
                ${buildAttendeeOptions(p3, [p1, p2, p4].filter(Boolean), '-- 1 --')}
              </select>
              <select onchange="updateMatchPlayer(${m.id}, 1, 1, this.value)" class="w-full text-[9px] sm:text-[10px] font-bold border border-slate-200 rounded-lg py-0.5 px-0.5 sm:px-1 bg-white focus:ring-1 focus:ring-emerald-500 tracking-tight" title="Người 2">
                ${buildAttendeeOptions(p4, [p1, p2, p3].filter(Boolean), '-- 2 --')}
              </select>
            </div>
          </div>

        </div>

        <!-- Thanh chọn giải thưởng trận đấu (Tùy chỉnh số lượng & loại giải thưởng) -->
        <div class="bg-amber-50/70 p-1.5 sm:p-2 rounded-xl border border-amber-200/90 space-y-1">
          
          <!-- Tiêu đề + Huy hiệu giải thưởng + Nút bỏ thưởng -->
          <div class="flex items-center justify-between flex-wrap gap-1">
            <div class="flex items-center gap-1 text-[11px] font-black text-amber-900 uppercase tracking-tight">
              <span>🎁</span>
              <span>Giải thưởng đội thắng:</span>
            </div>
            <div class="flex items-center gap-1">
              <span id="matchPrizeBadge-${m.id}" class="font-bold text-amber-900 bg-amber-200/90 px-1.5 py-0.2 rounded-md border border-amber-300 text-[10px] shadow-2xs ${m.prize ? '' : 'hidden'}">
                ${m.prize || ''}
              </span>
              ${m.prize ? `
              <button type="button" onclick="clearMatchPrize(${m.id})" class="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1 transition cursor-pointer" title="Bỏ giải thưởng">✕ Bỏ thưởng</button>
              ` : ''}
            </div>
          </div>

          <!-- Bộ điều chỉnh số lượng & Chọn loại giải thưởng -->
          <div class="flex items-center gap-1">
            
            <!-- Tùy chỉnh số lượng: [ - ] [ 2 ] [ + ] -->
            <div class="flex items-center bg-white border border-amber-300 rounded-lg p-0.5 shadow-2xs shrink-0" title="Điều chỉnh số lượng phần thưởng">
              <span class="text-[9px] font-black text-amber-900 px-1 select-none">SL:</span>
              <button type="button" onclick="changeMatchPrizeQty(${m.id}, -1)" class="w-5 h-5 rounded bg-amber-100/80 hover:bg-amber-200 text-amber-900 font-black text-xs flex items-center justify-center transition cursor-pointer select-none">
                −
              </button>
              <input type="number" min="1" max="99" value="${prizeDetails.qty}" 
                     oninput="setMatchPrizeQty(${m.id}, this.value)" 
                     class="w-5 text-center font-black text-xs text-amber-950 bg-transparent focus:outline-none p-0" 
                     title="Số lượng" />
              <button type="button" onclick="changeMatchPrizeQty(${m.id}, 1)" class="w-5 h-5 rounded bg-amber-100/80 hover:bg-amber-200 text-amber-900 font-black text-xs flex items-center justify-center transition cursor-pointer select-none">
                +
              </button>
            </div>

            <!-- Danh sách các loại giải thưởng: cuộn ngang mượt mà trên mobile -->
            <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
              ${prizeTypes.map(t => {
                const isSelected = prizeDetails.type && prizeDetails.type.toLowerCase() === t.name.toLowerCase();
                const activeClass = isSelected 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-black' 
                  : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100 font-bold';
                return `
                  <button type="button" onclick="selectMatchPrizeType(${m.id}, '${t.name}')" 
                          class="px-1.5 py-0.5 rounded-lg text-[10px] border transition flex items-center gap-1 cursor-pointer select-none whitespace-nowrap shrink-0 ${activeClass}">
                    <span>${t.icon || '🎁'}</span>
                    <span>${t.name}</span>
                    ${t.isCustom ? `
                      <span onclick="event.stopPropagation(); removeCustomPrizeTypePrompt('${t.name}')" class="ml-0.5 text-[9px] text-amber-200 hover:text-white" title="Xóa loại này">✕</span>
                    ` : ''}
                  </button>
                `;
              }).join('')}

              <!-- Nút Thêm loại giải thưởng -->
              <button type="button" onclick="promptAddNewPrizeType(${m.id})" 
                      class="px-1.5 py-0.5 rounded-lg text-[10px] font-bold border border-dashed border-amber-400 bg-amber-100/50 hover:bg-amber-200/80 text-amber-900 flex items-center gap-0.5 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0" 
                      title="Thêm loại giải thưởng mới vào danh sách">
                <span>➕</span> Thêm
              </button>
            </div>

          </div>

          <!-- Nhập tự do khác -->
          <div class="flex items-center gap-1 pt-0.5">
            <span class="text-[10px] font-bold text-amber-900 shrink-0">Khác:</span>
            <input type="text" id="matchPrizeInput-${m.id}" 
                   value="${isCustomPrizeText(m.prize, prizeTypes) ? m.prize : ''}" 
                   oninput="updateMatchCustomPrize(${m.id}, this.value)" 
                   placeholder="Nhập giải thưởng khác..." 
                   class="flex-1 text-[11px] font-medium px-2 py-0.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 placeholder:text-slate-400" />
            ${isCustomPrizeText(m.prize, prizeTypes) ? `
            <button type="button" onclick="clearMatchPrize(${m.id})" class="text-slate-400 hover:text-rose-600 text-xs px-1 font-bold cursor-pointer" title="Xóa">✕</button>
            ` : ''}
          </div>

        </div>

        <!-- Dòng kết quả chân thẻ trận đấu hiển thị 1 dòng gọn gàng -->
        <div id="matchCardResultLine-${m.id}" class="text-[11px] font-semibold text-slate-700 bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-200/80 flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5 min-w-0 truncate">
            <span class="text-[10px] shrink-0">🏸</span>
            <div class="flex items-center gap-1 min-w-0 truncate text-[11px] text-slate-800">${info.lineHtml}</div>
          </div>
          <div class="shrink-0 flex items-center gap-1">${info.compactBadge}</div>
        </div>

      </div>
    `;
  }).join('');

  updateMatchResultRealtime();
  lucide.createIcons();
}

// --- QUẢN LÝ LOẠI GIẢI THƯỞNG & SỐ LƯỢNG TÙY CHỈNH ---
const DEFAULT_PRIZE_TYPES = [
  { name: 'Nước lọc', icon: '🥤' },
  { name: 'Bò húc', icon: '⚡' },
  { name: 'Bia', icon: '🍺' },
  { name: 'Nước ngọt', icon: '🧃' },
  { name: 'Cà phê', icon: '☕' }
];

function getPrizeTypes() {
  let custom = [];
  try {
    const saved = localStorage.getItem('clb_custom_prize_types');
    if (saved) custom = JSON.parse(saved);
  } catch (e) {}
  if (AppState && AppState.customPrizeTypes && AppState.customPrizeTypes.length > 0) {
    custom = AppState.customPrizeTypes;
  }

  const list = [...DEFAULT_PRIZE_TYPES];
  custom.forEach(item => {
    const name = typeof item === 'string' ? item : item.name;
    const icon = typeof item === 'object' && item.icon ? item.icon : '🎁';
    if (!list.some(x => x.name.toLowerCase() === name.toLowerCase())) {
      list.push({ name, icon, isCustom: true });
    }
  });
  return list;
}

function saveCustomPrizeType(typeName, icon = '🎁') {
  const trimmed = typeName.trim();
  if (!trimmed) return null;
  let custom = [];
  try {
    const saved = localStorage.getItem('clb_custom_prize_types');
    if (saved) custom = JSON.parse(saved);
  } catch (e) {}
  if (!custom.some(x => (typeof x === 'string' ? x : x.name).toLowerCase() === trimmed.toLowerCase())) {
    custom.push({ name: trimmed, icon, isCustom: true });
    localStorage.setItem('clb_custom_prize_types', JSON.stringify(custom));
    if (AppState) {
      AppState.customPrizeTypes = custom;
      if (typeof saveData === 'function') saveData();
    }
  }
  return trimmed;
}

function removeCustomPrizeType(typeName) {
  let custom = [];
  try {
    const saved = localStorage.getItem('clb_custom_prize_types');
    if (saved) custom = JSON.parse(saved);
  } catch (e) {}
  custom = custom.filter(x => (typeof x === 'string' ? x : x.name).toLowerCase() !== typeName.toLowerCase());
  localStorage.setItem('clb_custom_prize_types', JSON.stringify(custom));
  if (AppState) {
    AppState.customPrizeTypes = custom;
    if (typeof saveData === 'function') saveData();
  }
}

function removeCustomPrizeTypePrompt(name) {
  if (confirm(`Bạn có chắc muốn xóa loại giải thưởng "${name}" khỏi danh sách chọn nhanh?`)) {
    removeCustomPrizeType(name);
    renderActivityMatches();
    showToast(`Đã xóa loại giải thưởng: ${name}`, 'info');
  }
}

function getMatchPrizeDetails(m) {
  let qty = m.prizeQty || 2;
  let type = m.prizeType || '';
  if (!type && m.prize) {
    const match = m.prize.match(/^(\d+)\s+(.+)$/);
    if (match) {
      qty = parseInt(match[1]) || 2;
      type = match[2].trim();
    } else {
      type = m.prize.trim();
    }
  }
  return { qty, type };
}

function isCustomPrizeText(prize, availableTypes) {
  if (!prize || !prize.trim()) return false;
  const types = availableTypes || getPrizeTypes();
  const match = prize.match(/^\d+\s+(.+)$/);
  const typeName = match ? match[1].trim().toLowerCase() : prize.trim().toLowerCase();
  return !types.some(t => t.name.toLowerCase() === typeName);
}

function selectMatchPrizeType(matchId, typeName) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  const { qty, type } = getMatchPrizeDetails(m);

  if (type && type.toLowerCase() === typeName.toLowerCase()) {
    // Nhấp lại vào loại đang chọn để bỏ chọn
    m.prize = '';
    m.prizeType = '';
  } else {
    m.prizeType = typeName;
    m.prizeQty = qty || 2;
    m.prize = `${m.prizeQty} ${typeName}`;
  }
  saveActivitySessionState();
  renderActivityMatches();
}

function changeMatchPrizeQty(matchId, delta) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  const { qty, type } = getMatchPrizeDetails(m);
  const newQty = Math.max(1, Math.min(99, qty + delta));
  m.prizeQty = newQty;
  if (type) {
    m.prize = `${newQty} ${type}`;
  }
  saveActivitySessionState();
  renderActivityMatches();
}

function setMatchPrizeQty(matchId, val) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  const num = parseInt(val);
  if (isNaN(num) || num < 1) return;
  const newQty = Math.max(1, Math.min(99, num));
  m.prizeQty = newQty;
  const { type } = getMatchPrizeDetails(m);
  if (type) {
    m.prize = `${newQty} ${type}`;
    updateMatchResultRealtime();
    saveActivitySessionState();
  }
}

function promptAddNewPrizeType(matchId) {
  const newName = prompt('Nhập tên loại giải thưởng mới (ví dụ: Nước dừa, Trà chanh, Revive, Trà sữa...):');
  if (newName && newName.trim()) {
    const saved = saveCustomPrizeType(newName.trim());
    if (saved) {
      selectMatchPrizeType(matchId, saved);
      showToast(`✨ Đã thêm loại giải thưởng: "${saved}"!`, 'success');
    }
  }
}

function updateMatchCustomPrize(matchId, val) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  m.prize = val ? val.trim() : '';
  m.prizeType = ''; // Tự do
  updateMatchResultRealtime();
  saveActivitySessionState();
}

function clearMatchPrize(matchId) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  m.prize = '';
  m.prizeType = '';
  saveActivitySessionState();
  renderActivityMatches();
}

function setQuickMatchPrize(matchId, val) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  if (m.prize === val) {
    clearMatchPrize(matchId);
  } else {
    m.prize = val;
    const match = val.match(/^(\d+)\s+(.+)$/);
    if (match) {
      m.prizeQty = parseInt(match[1]) || 2;
      m.prizeType = match[2].trim();
    } else {
      m.prizeType = val;
    }
    saveActivitySessionState();
    renderActivityMatches();
  }
}

function addActivityMatch() {
  const attendees = getCheckedInAttendees();

  // Đếm số trận đã đấu của từng người để ưu tiên chọn người chưa đấu hoặc đấu ít nhất
  const matchCounts = {};
  attendees.forEach(a => matchCounts[a.id] = 0);
  (activityState.matches || []).forEach(m => {
    (m.team1 || []).forEach(pId => { if (matchCounts[pId] !== undefined) matchCounts[pId]++; });
    (m.team2 || []).forEach(pId => { if (matchCounts[pId] !== undefined) matchCounts[pId]++; });
  });

  const sorted = [...attendees].sort((a, b) => (matchCounts[a.id] || 0) - (matchCounts[b.id] || 0));

  const nextP1 = sorted.length > 0 ? sorted[0].id : '';
  const nextP2 = sorted.length > 1 ? sorted[1].id : '';
  const nextP3 = sorted.length > 2 ? sorted[2].id : '';
  const nextP4 = sorted.length > 3 ? sorted[3].id : '';

  activityState.matches.push({
    id: Date.now(),
    name: `Trận ${activityState.matches.length + 1}`,
    team1: [nextP1, nextP2],
    team2: [nextP3, nextP4],
    score1: 21,
    score2: 19,
    prize: '',
    prizeQty: 2,
    prizeType: ''
  });
  saveActivitySessionState();
  renderActivityMatches();
}

function removeActivityMatch(id) {
  activityState.matches = activityState.matches.filter(m => m.id !== id);
  saveActivitySessionState();
  renderActivityMatches();
}

function updateMatchName(matchId, val) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (m) {
    m.name = val;
    updateMatchResultRealtime();
    saveActivitySessionState();
  }
}

function updateMatchPlayer(matchId, teamIdx, playerIdx, val) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (!m) return;
  if (!m.team1) m.team1 = ['', ''];
  if (!m.team2) m.team2 = ['', ''];

  if (val) {
    // Nếu thành viên này đã ở vị trí khác trong cùng trận, tự động xóa ở vị trí cũ để không bị trùng lặp
    if (teamIdx === 0) {
      if (playerIdx === 0 && m.team1[1] === val) m.team1[1] = '';
      if (playerIdx === 1 && m.team1[0] === val) m.team1[0] = '';
      if (m.team2[0] === val) m.team2[0] = '';
      if (m.team2[1] === val) m.team2[1] = '';
      m.team1[playerIdx] = val;
    } else {
      if (playerIdx === 0 && m.team2[1] === val) m.team2[1] = '';
      if (playerIdx === 1 && m.team2[0] === val) m.team2[0] = '';
      if (m.team1[0] === val) m.team1[0] = '';
      if (m.team1[1] === val) m.team1[1] = '';
      m.team2[playerIdx] = val;
    }
  } else {
    if (teamIdx === 0) m.team1[playerIdx] = '';
    else m.team2[playerIdx] = '';
  }
  saveActivitySessionState();
  renderActivityMatches();
}

function updateMatchScore(matchId, s1, s2) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (m) {
    if (s1 !== null && s1 !== undefined) m.score1 = Number(s1) || 0;
    if (s2 !== null && s2 !== undefined) m.score2 = Number(s2) || 0;
    updateMatchResultRealtime();
    saveActivitySessionState();
  }
}

function updateMatchPrize(matchId, val) {
  const m = activityState.matches.find(x => x.id === matchId);
  if (m) {
    m.prize = val;
    updateMatchResultRealtime();
    saveActivitySessionState();
  }
}

function randomActivityMatch() {
  const attendees = getCheckedInAttendees();
  if (attendees.length < 4) {
    showToast('Cần ít nhất 4 người có mặt để bốc thăm trận đấu!', 'warning');
    return;
  }

  // Sắp xếp người chơi theo số trận đã đấu ít nhất để ưu tiên vào sân
  const matchCounts = {};
  attendees.forEach(a => matchCounts[a.id] = 0);
  activityState.matches.forEach(m => {
    (m.team1 || []).forEach(pId => { if (matchCounts[pId] !== undefined) matchCounts[pId]++; });
    (m.team2 || []).forEach(pId => { if (matchCounts[pId] !== undefined) matchCounts[pId]++; });
  });

  // Shuffle nhẹ và sort theo match count
  const shuffled = attendees.slice().sort(() => 0.5 - Math.random());
  shuffled.sort((a, b) => (matchCounts[a.id] || 0) - (matchCounts[b.id] || 0));

  const p1 = shuffled[0].id;
  const p2 = shuffled[1].id;
  const p3 = shuffled[2].id;
  const p4 = shuffled[3].id;

  const newMatch = {
    id: Date.now(),
    name: `Trận ${activityState.matches.length + 1}`,
    team1: [p1, p2],
    team2: [p3, p4],
    score1: 21,
    score2: 19,
    prize: '',
    prizeQty: 2,
    prizeType: ''
  };

  activityState.matches.push(newMatch);
  saveActivitySessionState();
  renderActivityMatches();

  showToast(`🎲 Đã ghép Trận #${activityState.matches.length}: ${shuffled[0].chipName} ${shuffled[1].chipName} đấu với ${shuffled[2].chipName} ${shuffled[3].chipName}!`, 'success');
}

// --- 7. BỘ TÍNH TOÁN & CHIA TIỀN REAL-TIME (CHỈ TÍNH TIỀN CẦU, KHÔNG HIỂN THỊ TIỀN SÂN TẠM ỨNG) ---
function renderActivityMemberBreakdown(list, shuttleFeePerMember, totalMemberCourtFee, shuttleTotal, guestPaid, needSplit) {
  const container = document.getElementById('actMemberBreakdownContainer');
  if (!container) return;

  const isExchange = (activityState.type === 'Giao lưu');
  const clubs = isExchange ? ((typeof getNormalizedExchangeClubs === 'function') ? getNormalizedExchangeClubs() : []) : [];
  const exCount = clubs.reduce((sum, c) => sum + (c.members ? c.members.length : 0), 0);
  const totalSplitParticipants = (list ? list.length : 0) + exCount;
  const exTotalPay = exCount * shuttleFeePerMember;
  const exClubsName = clubs.map(c => c.name).filter(Boolean).join(', ') || 'CLB Giao lưu';

  if ((!list || list.length === 0) && exCount === 0) {
    container.innerHTML = `
      <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <div class="text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5">
          <span>📋</span>
          <span>Dự Toán Tiền Cầu Từng Người Điểm Danh</span>
        </div>
        <p class="text-[10px] text-emerald-800 font-bold mt-1">
          Tổng số cầu trừ khách = Số tiền chia đều cho tất cả người tham gia
        </p>
        <p class="text-[11px] text-slate-400 mt-0.5">
          Chưa chọn người tham gia nào. Hãy tích chọn thành viên bên trên hoặc thêm thành viên các CLB giao lưu để hệ thống tự động tính tiền cầu và chia đều.
        </p>
      </div>
    `;
    return;
  }

  const negativeCount = (list || []).filter(item => item.isNegative).length;

  let rowsHtml = (list || []).map(item => {
    const balBadge = item.isNegative
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">Dư nợ: ${formatMoney(item.nextBal)}</span>`
      : `<span class="text-emerald-700 font-bold text-[11px]">${formatMoney(item.nextBal)}</span>`;

    return `
      <div class="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs shadow-2xs">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <b class="text-slate-900 truncate">${item.chipName}</b>
            <span class="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200">Buổi #${item.nextSession}</span>
            <span class="text-[10px] font-semibold text-slate-400">(${item.tierName})</span>
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Tiền cầu: <b class="text-emerald-700 font-bold">${formatMoney(item.shuttleFee)}</b></span>
            <span>•</span>
            <span>Ví trước: <span class="${item.currentBal < 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}">${formatMoney(item.currentBal)}</span></span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-black text-rose-600 text-xs">-${formatMoney(item.totalDeduct)}</div>
          <div class="mt-0.5">${balBadge}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="p-3 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-2.5">
      <div class="flex items-center justify-between flex-wrap gap-1.5">
        <div class="flex items-center gap-1.5">
          <span class="text-base">${isExchange ? '🤝' : '📋'}</span>
          <div>
            <h4 class="font-black text-slate-900 text-xs leading-tight">
              ${isExchange && exCount > 0 ? `Dự Toán Tiền Cầu Buổi Giao Lưu Với ${escapeHtml(exClubsName)}` : `Dự Toán Tiền Cầu Từng Người Điểm Danh`}
            </h4>
            <p class="text-[10px] text-emerald-800 font-bold leading-tight">
              ${isExchange && exCount > 0 ? `Tổng ${totalSplitParticipants} người chia đều (${(list || []).length} TV chủ nhà + ${exCount} TV bạn) • Mỗi người đóng ${formatMoney(shuttleFeePerMember)}` : `Tổng số cầu trừ khách = Số tiền chia đều cho thành viên`}
            </p>
            <p class="text-[10px] text-slate-500 leading-tight">Đơn giá theo quả = 28.333đ (1 hộp 12 quả = 340.000đ) • Tiền cầu chia đều • Cho phép ví âm</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-bold">
          <span class="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
            ${isExchange && exCount > 0 ? `${(list || []).length} TV chủ nhà + ${exCount} TV bạn` : `${(list || []).length} thành viên`}
          </span>
          ${negativeCount > 0 ? `<span class="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-300">⚠️ ${negativeCount} ví âm</span>` : ''}
        </div>
      </div>

      <!-- Quick KPI Strip -->
      <div class="grid grid-cols-3 gap-1.5 p-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 text-center text-xs">
        <div>
          <span class="text-[10px] text-slate-500 block">🏸 Tổng tiền cầu</span>
          <b class="text-slate-900 font-black text-xs sm:text-sm text-emerald-800">${formatMoney(shuttleTotal || 0)}</b>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 block">
            ${isExchange && exCount > 0 ? `🤝 ${escapeHtml(exClubsName)} (${exCount} TV)` : `🎟️ Thu khách (${activityState.selectedGuestIds ? activityState.selectedGuestIds.size : 0} khách)`}
          </span>
          <b class="text-slate-900 font-black text-xs sm:text-sm text-amber-800">
            -${formatMoney(isExchange && exCount > 0 ? (guestPaid + exTotalPay) : (guestPaid || 0))}
          </b>
        </div>
        <div>
          <span class="text-[10px] text-slate-500 block">⚡ Mỗi người đóng (${totalSplitParticipants} người)</span>
          <b class="text-slate-900 font-black text-xs sm:text-sm text-indigo-800">${formatMoney(shuttleFeePerMember || 0)}</b>
        </div>
      </div>

      ${(isExchange && clubs.length > 0 && exCount > 0) ? `
      <!-- Thẻ các CLB Giao lưu thanh toán -->
      <div class="space-y-1.5">
        ${clubs.map(c => {
          const cMems = c.members || [];
          const cCount = cMems.length;
          const cTotalPay = cCount * shuttleFeePerMember;
          return `
          <div class="p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 text-xs shadow-2xs">
            <div class="flex items-center justify-between text-amber-950 font-bold mb-1.5 flex-wrap gap-1">
              <span class="flex items-center gap-1.5">
                <span>🤝</span>
                <span>CLB giao lưu: <b>${escapeHtml(c.name)}</b> (${cCount} người)</span>
              </span>
              <span class="text-amber-900 font-black px-2 py-0.5 rounded-lg bg-amber-200 border border-amber-300">
                Thanh toán: ${formatMoney(cTotalPay)} (${formatMoney(shuttleFeePerMember)}/người)
              </span>
            </div>
            <div class="flex flex-wrap gap-1">
              ${cMems.length > 0 ? cMems.map(m => `
                <span class="px-2 py-0.5 bg-white border border-amber-300 text-amber-950 rounded-lg text-[11px] font-black shadow-2xs">
                  🤝 ${escapeHtml(m)}
                </span>
              `).join('') : '<span class="text-[11px] text-amber-600 italic">Chưa có thành viên</span>'}
            </div>
          </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      <!-- Member Rows List -->
      <div class="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
        ${rowsHtml || '<div class="text-center py-2 text-slate-400 text-xs italic">Chưa chọn thành viên CLB chủ nhà</div>'}
      </div>
    </div>
  `;
}

function recalculateActivitySplit() {
  // 1. Phân loại chi phí: Tiền cầu vs Chi phí khác
  let shuttleTotal = 0;
  let otherExpensesTotal = 0;
  (activityState.expenses || []).forEach(e => {
    const amt = Number(e.amount) || 0;
    const title = (e.title || '').toLowerCase();
    if (e.isShuttleRow || title.includes('cầu')) {
      shuttleTotal += amt;
    } else {
      otherExpensesTotal += amt;
    }
  });
  if (shuttleTotal === 0 && (activityState.expenses || []).length > 0) {
    shuttleTotal = Number(activityState.expenses[0].amount) || 0;
  }
  const totalCost = shuttleTotal + otherExpensesTotal;

  // Nếu chọn Tất cả cho ứng trước
  if (activityState.isFrontAll) {
    activityState.frontAmount = totalCost;
    const frontInp = document.getElementById('actFrontAmountInput');
    if (frontInp) frontInp.value = totalCost;
  }

  // 2. Khách đóng theo hạng (Level A: 90k, Level B: 70k, Level C: 50k)
  let guestPaid = 0;
  (activityState.selectedGuestIds || new Set()).forEach(id => {
    const guest = AppState.members.find(m => m.id === id);
    if (guest) {
      if (guest.fee) guestPaid += guest.fee;
      else if (guest.type === 'GUEST_A') guestPaid += (AppState.config?.guestPrices?.GUEST_A || 90000);
      else if (guest.type === 'GUEST_B') guestPaid += (AppState.config?.guestPrices?.GUEST_B || 70000);
      else if (guest.type === 'GUEST_C') guestPaid += (AppState.config?.guestPrices?.GUEST_C || 50000);
      else guestPaid += 50000;
    }
  });

  // 3. Số người tham gia chia đều (Thành viên CLB chủ nhà + Thành viên tất cả các CLB giao lưu)
  const isExchange = (activityState.type === 'Giao lưu');
  const clubs = isExchange ? ((typeof getNormalizedExchangeClubs === 'function') ? getNormalizedExchangeClubs() : []) : [];
  const exCount = clubs.reduce((sum, c) => sum + (c.members ? c.members.length : 0), 0);
  const memberCount = (activityState.selectedMemberIds || new Set()).size;
  const totalSplitParticipants = memberCount + exCount;

  // 4. Dự Toán Tiền Cầu Từng Người = Tổng số cầu trừ khách lẻ = số tiền chia đều cho tất cả thành viên (chủ nhà + các CLB bạn)
  const needSplit = Math.max(0, shuttleTotal - guestPaid);
  const shuttleFeePerMember = totalSplitParticipants > 0 ? Math.round(needSplit / totalSplitParticipants) : 0;
  const totalMemberShuttleFee = shuttleFeePerMember * memberCount;
  const exchangeTotalPay = exCount * shuttleFeePerMember;

  // 5. Cập nhật thẻ tóm tắt CLB Giao lưu trong Attendance
  const shareTextEl = document.getElementById('actExchangeClubShareText');
  const exTotalPayEl = document.getElementById('actExchangeClubTotalPay');
  if (shareTextEl) {
    const clubsSummary = clubs.map(c => `${c.name} (${(c.members || []).length}ng)`).join(' + ') || 'CLB Giao lưu';
    shareTextEl.textContent = `${clubsSummary} • ${formatMoney(shuttleFeePerMember)}/người`;
  }
  if (exTotalPayEl) {
    exTotalPayEl.textContent = formatMoney(exchangeTotalPay);
  }

  // 6. Danh sách thành viên chủ nhà
  const memberBreakdownList = [];

  (activityState.selectedMemberIds || new Set()).forEach(id => {
    const member = AppState.members.find(m => m.id === id);
    if (member) {
      const nextSession = (member.monthlySessions || 0) + 1;
      const tierName = getTierNameForSession(nextSession);
      const totalDeduct = shuttleFeePerMember; // Chỉ tính tiền cầu sau khi trừ khách và chia đều
      const currentBal = member.balance || 0;
      const nextBal = currentBal - totalDeduct;

      memberBreakdownList.push({
        id: member.id,
        name: member.name,
        chipName: member.chipName || member.name,
        type: member.type,
        currentSessions: member.monthlySessions || 0,
        nextSession: nextSession,
        tierName: tierName,
        courtFee: 0,
        shuttleFee: shuttleFeePerMember,
        totalDeduct: totalDeduct,
        currentBal: currentBal,
        nextBal: nextBal,
        isNegative: nextBal < 0
      });
    }
  });

  // Cập nhật giao diện Sticky bottom summary
  const totalCostEl = document.getElementById('actSummaryTotalCost');
  const guestPaidEl = document.getElementById('actSummaryGuestPaid');
  const needSplitEl = document.getElementById('actSummaryNeedSplit');
  const perPersonBadge = document.getElementById('actSummaryPerPersonBadge');
  const shuttleTotalEl = document.getElementById('actSummaryShuttleTotal');
  const courtTotalEl = document.getElementById('actSummaryCourtTotal');

  if (totalCostEl) totalCostEl.textContent = formatMoney(shuttleTotal);
  if (guestPaidEl) {
    if (isExchange && exCount > 0) {
      guestPaidEl.textContent = formatMoney(guestPaid + exchangeTotalPay);
    } else {
      guestPaidEl.textContent = formatMoney(guestPaid);
    }
  }
  if (needSplitEl) needSplitEl.textContent = formatMoney(shuttleFeePerMember);
  if (shuttleTotalEl) shuttleTotalEl.textContent = formatMoney(shuttleTotal);
  if (courtTotalEl) courtTotalEl.textContent = formatMoney(0);

  if (perPersonBadge) {
    if (totalSplitParticipants > 0) {
      perPersonBadge.textContent = `${formatMoney(shuttleFeePerMember)} / người`;
      perPersonBadge.title = isExchange && exCount > 0 
        ? `${totalSplitParticipants} người chia đều (${memberCount} TV chủ nhà + ${exCount} TV bạn: ${clubs.map(c => c.name).join(', ')})` 
        : `Mỗi người đóng: ${formatMoney(shuttleFeePerMember)}`;
    } else {
      perPersonBadge.textContent = '0đ / người';
      perPersonBadge.title = '';
    }
  }

  // Cập nhật bảng Chi tiết tiền cầu từng thành viên (Preview table)
  renderActivityMemberBreakdown(memberBreakdownList, shuttleFeePerMember, 0, shuttleTotal, guestPaid, needSplit);
}

// --- 8. LƯU VÀ CHIA TIỀN (EXECUTION - CHỈ TRỪ TIỀN CẦU, KHÔNG TRỪ TIỀN SÂN TẠM ỨNG) ---
function saveAndSplitActivitySession() {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền chốt và chia tiền buổi sinh hoạt! Vui lòng liên hệ Trưởng nhóm.', 'warning');
    return;
  }
  const memberCount = (activityState.selectedMemberIds || new Set()).size;
  const guestCount = (activityState.selectedGuestIds || new Set()).size;
  const isExchange = (activityState.type === 'Giao lưu');
  const clubs = isExchange ? ((typeof getNormalizedExchangeClubs === 'function') ? getNormalizedExchangeClubs() : []) : [];
  const exCount = clubs.reduce((sum, c) => sum + (c.members ? c.members.length : 0), 0);
  const exClubNames = clubs.map(c => c.name).filter(Boolean).join(', ') || 'CLB Giao lưu';
  const totalSplitParticipants = memberCount + exCount;

  if (memberCount === 0 && guestCount === 0 && exCount === 0) {
    showToast('Vui lòng chọn ít nhất 1 người tham gia buổi cầu!', 'warning');
    return;
  }

  const dateStr = activityState.date || getTodayInputFormat();
  const dateFormatted = dateStr.split('-').reverse().join('/');
  const nowTime = getNowTimestampString();

  // 1. Kiểm tra tháng đã chốt sổ cuối tháng chưa
  if (isMonthClosed(dateStr)) {
    alert(`⚠️ Tháng ${dateStr.slice(0, 7)} đã CHỐT SỔ CUỐI THÁNG!\nKhông thể chỉnh sửa hoặc lưu hoạt động trong tháng này.`);
    return;
  }

  // 2. Kiểm tra quy tắc 1 hoạt động / ngày & xử lý Chế độ Chỉnh sửa
  if (!AppState.activitySessions) AppState.activitySessions = [];
  const existingSesIndex = AppState.activitySessions.findIndex(s => s.date === dateStr);
  const existingSes = existingSesIndex !== -1 ? AppState.activitySessions[existingSesIndex] : null;

  if (existingSes && !activityState.isEditingFinalizedSession) {
    const confirmEdit = confirm(
      `⚠️ QUY TẮC: MỖI NGÀY CHỈ ĐƯỢC CÓ 1 HOẠT ĐỘNG!\n\n` +
      `Buổi hoạt động ngày ${dateFormatted} đã được chốt sổ trước đó (${existingSes.attendeeCount || 0} người).\n\n` +
      `Bạn có muốn MỞ CHẾ ĐỘ CHỈNH SỬA để cập nhật lại buổi hoạt động ngày ${dateFormatted} không?`
    );
    if (confirmEdit) {
      loadSessionIntoEditMode(existingSes.id);
    }
    return;
  }

  let shuttleTotal = 0;
  (activityState.expenses || []).forEach(e => {
    const amt = Number(e.amount) || 0;
    shuttleTotal += amt;
  });

  let guestPaid = 0;
  (activityState.selectedGuestIds || new Set()).forEach(id => {
    const guest = AppState.members.find(m => m.id === id);
    if (guest) {
      const gFee = guest.fee || (guest.type === 'GUEST_A' ? (AppState.config?.guestPrices?.GUEST_A || 90000) : (guest.type === 'GUEST_B' ? (AppState.config?.guestPrices?.GUEST_B || 70000) : (AppState.config?.guestPrices?.GUEST_C || 50000)));
      guestPaid += gFee;
    }
  });

  // Dự Toán Tiền Cầu Từng Người = Tổng số cầu trừ khách lẻ = số tiền chia đều cho tất cả thành viên (làm tròn 1đ)
  const needSplit = Math.max(0, shuttleTotal - guestPaid);
  const shuttleFeePerMember = totalSplitParticipants > 0 ? Math.round(needSplit / totalSplitParticipants) : 0;
  const totalMemberShuttleFee = shuttleFeePerMember * memberCount;
  const exchangeTotalPay = exCount * shuttleFeePerMember;
  const totalMemberCourtFee = 0;

  const isEditing = !!activityState.isEditingFinalizedSession;
  let confirmTitle = isEditing ? `[CHẾ ĐỘ SỬA] Xác nhận CẬP NHẬT & CHỐT LẠI buổi hoạt động ngày ${dateFormatted}?` : `Xác nhận lưu buổi hoạt động ngày ${dateFormatted}?`;
  let confirmMsg = '';

  if (isExchange && exCount > 0) {
    confirmTitle = isEditing ? `[CHẾ ĐỘ SỬA] Xác nhận CẬP NHẬT & CHỐT LẠI buổi GIAO LƯU ngày ${dateFormatted}?` : `Xác nhận lưu & chốt buổi GIAO LƯU ngày ${dateFormatted}?`;
    const clubsBreakdownLines = clubs.map(c => {
      const cCount = (c.members || []).length;
      return `  ↳ ${c.name} (${cCount} người: ${(c.members || []).join(', ')}): Đóng ${formatMoney(cCount * shuttleFeePerMember)}`;
    }).join('\n');

    confirmMsg = `${confirmTitle}\n` +
      `• Đối tác giao lưu: ${exClubNames} (${exCount} người)\n` +
      `• CLB Lập Trí: ${memberCount} thành viên tham gia\n` +
      `• Tổng người chia đều: ${totalSplitParticipants} người (${memberCount} TV chủ nhà + ${exCount} TV bạn)\n` +
      `• Tổng tiền cầu: ${formatMoney(shuttleTotal)}\n` +
      (guestPaid > 0 ? `• Khách lẻ đóng: -${formatMoney(guestPaid)} (${guestCount} khách)\n` : '') +
      `• Số tiền chia đều: ${formatMoney(shuttleFeePerMember)} / người\n` +
      clubsBreakdownLines + '\n' +
      `  ↳ Mỗi TV Lập Trí trừ ví: ${formatMoney(shuttleFeePerMember)}\n` +
      (isEditing ? `• HỆ THỐNG SẼ HOÀN TÁC TOÀN BỘ SỐ TIỀN VÀ SỐ BUỔI CŨ CỦA NGÀY ${dateFormatted}, sau đó trừ ví và cập nhật lại theo số liệu mới.` : `• Tiền cầu TV chủ nhà được trừ trực tiếp vào ví, tiền các CLB bạn được ghi vào Sổ Quỹ Tạm Ứng.`);
  } else {
    confirmMsg = `${confirmTitle}\n` +
      `• Tổng tiền cầu: ${formatMoney(shuttleTotal)}\n` +
      `• Thu khách giao lưu: -${formatMoney(guestPaid)} (${guestCount} khách)\n` +
      `• Còn lại chia đều TV: ${formatMoney(needSplit)} (${formatMoney(shuttleFeePerMember)}/người × ${memberCount} TV)\n` +
      (isEditing ? `• HỆ THỐNG SẼ HOÀN TÁC TOÀN BỘ SỐ TIỀN VÀ SỐ BUỔI CŨ CỦA NGÀY ${dateFormatted}, sau đó trừ ví và cập nhật lại theo số liệu mới.` : `• Hệ thống trừ tiền cầu trực tiếp vào Ví TV (cho phép dư nợ ví âm) và cộng vào Quỹ Tạm Ứng Cầu.`);
  }

  if (!confirm(confirmMsg)) return;

  // Xác định ID phiên
  let targetSessionId = (isEditing && existingSes) ? existingSes.id : ('SES_' + Date.now());

  // NẾU ĐANG CHỈNH SỬA: HOÀN TÁC TOÀN BỘ DỮ LIỆU CŨ CỦA BUỔI TRƯỚC KHI ÁP DỤNG DỮ LIỆU MỚI
  if (isEditing && existingSes) {
    // A. Hoàn lại số dư ví và giảm số buổi của các thành viên cũ trong buổi
    (existingSes.members || []).forEach(mOld => {
      const mem = (AppState.members || []).find(m => m.id === mOld.id);
      if (mem) {
        const oldFee = mOld.fee !== undefined ? mOld.fee : (existingSes.shuttleFeePerMember || 0);
        mem.balance = (mem.balance || 0) + oldFee; // Hoàn tiền cũ về ví
        mem.monthlySessions = Math.max(0, (mem.monthlySessions || 1) - 1);
      }
    });

    // B. Giảm số buổi của khách cũ
    (existingSes.guests || []).forEach(gOld => {
      const guest = (AppState.members || []).find(m => m.id === gOld.id);
      if (guest) {
        guest.monthlySessions = Math.max(0, (guest.monthlySessions || 1) - 1);
      }
    });

    // C. Xóa các giao dịch cũ liên quan đến buổi hoạt động này
    AppState.transactions = (AppState.transactions || []).filter(tx => {
      if (tx.sessionId && tx.sessionId === targetSessionId) return false;
      if (tx.date && (tx.date.includes(dateFormatted) || tx.date.startsWith(dateStr))) {
        if (tx.type === 'SHUTTLE_FEE' || tx.subType === 'SHUTTLE_ADV_IN' || tx.subType === 'GUEST_ADV_IN' || tx.categoryGroup === 'ADVANCE_SHUTTLE_IN' || tx.categoryGroup === 'ADVANCE_GUEST_IN') {
          return false;
        }
      }
      return true;
    });

    // D. Xóa nhật ký điểm danh cũ của buổi hoạt động này
    AppState.attendanceRecords = (AppState.attendanceRecords || []).filter(att => {
      if (att.sessionId && att.sessionId === targetSessionId) return false;
      if (att.date === dateStr) return false;
      return true;
    });
  }

  // 1. Trừ tiền ví (CHỈ TRỪ TIỀN CẦU) và tăng số buổi tháng cho từng thành viên tham gia (Hỗ trợ số dư âm)
  let negativeCount = 0;
  (activityState.selectedMemberIds || new Set()).forEach(id => {
    const member = AppState.members.find(m => m.id === id);
    if (member) {
      const totalDeduct = shuttleFeePerMember;

      member.balance = (member.balance || 0) - totalDeduct;
      if (member.balance < 0) negativeCount++;

      member.monthlySessions = (member.monthlySessions || 0) + 1;

      // Ghi lịch sử giao dịch trừ ví
      AppState.transactions.push({
        id: 'TX_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        sessionId: targetSessionId,
        date: nowTime,
        type: 'SHUTTLE_FEE',
        categoryGroup: 'ADVANCE_SHUTTLE_IN',
        subType: 'SHUTTLE_ADV_IN',
        categoryName: 'Tiền cầu sinh hoạt',
        amount: -totalDeduct,
        walletImpact: -totalDeduct,
        fundImpact: 0,
        targetName: member.name,
        memberId: member.id,
        description: `Trừ tiền cầu ngày ${dateFormatted} (${formatMoney(shuttleFeePerMember)}/người, Buổi #${member.monthlySessions})`,
        operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
      });

      // Nhật ký điểm danh
      AppState.attendanceRecords.push({
        id: 'ATT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        sessionId: targetSessionId,
        date: dateStr,
        memberId: member.id,
        memberName: member.name,
        courtFee: 0,
        shuttleFee: shuttleFeePerMember,
        fee: totalDeduct,
        sessionIndex: member.monthlySessions,
        timestamp: nowTime
      });
    }
  });

  // 2. Ghi nhận tăng số buổi cho khách tham gia
  (activityState.selectedGuestIds || new Set()).forEach(id => {
    const guest = AppState.members.find(m => m.id === id);
    if (guest) {
      guest.monthlySessions = (guest.monthlySessions || 0) + 1;
    }
  });

  // 3. Ghi Sổ Quỹ Tạm Ứng (Tạm ứng tiền cầu + Thu khách theo hạng + Thu CLB giao lưu)
  if (totalMemberShuttleFee > 0) {
    AppState.transactions.push({
      id: 'TX_' + Date.now() + '_SHUTTLE',
      sessionId: targetSessionId,
      date: nowTime,
      categoryGroup: 'ADVANCE_SHUTTLE_IN',
      subType: 'SHUTTLE_ADV_IN',
      categoryName: 'Tạm ứng tiền cầu',
      amount: totalMemberShuttleFee,
      walletImpact: -totalMemberShuttleFee,
      fundImpact: totalMemberShuttleFee,
      targetName: 'Quỹ Tạm Ứng Tiền Cầu',
      description: `Thu tạm ứng tiền cầu ${memberCount} thành viên buổi ngày ${dateFormatted} (${formatMoney(shuttleFeePerMember)}/người)`,
      operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
    });
  }

  if (guestPaid > 0) {
    AppState.transactions.push({
      id: 'TX_' + Date.now() + '_GUEST',
      sessionId: targetSessionId,
      date: nowTime,
      categoryGroup: 'ADVANCE_GUEST_IN',
      subType: 'GUEST_ADV_IN',
      categoryName: 'Thu khách giao lưu',
      amount: guestPaid,
      walletImpact: 0,
      fundImpact: guestPaid,
      targetName: 'Khách giao lưu theo hạng',
      description: `Khoản thu phí tham gia của ${guestCount} khách giao lưu theo hạng ngày ${dateFormatted}`,
      operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
    });
  }

  if (isExchange && clubs.length > 0) {
    clubs.forEach((c, idx) => {
      const cMems = c.members || [];
      const cCount = cMems.length;
      const cTotalPay = cCount * shuttleFeePerMember;
      if (cTotalPay > 0) {
        AppState.transactions.push({
          id: 'TX_' + Date.now() + '_EXCHANGE_' + idx,
          sessionId: targetSessionId,
          date: nowTime,
          categoryGroup: 'ADVANCE_GUEST_IN',
          subType: 'GUEST_ADV_IN',
          categoryName: 'Thu tiền giao lưu CLB',
          amount: cTotalPay,
          walletImpact: 0,
          fundImpact: cTotalPay,
          targetName: `${c.name} (${cCount} người)`,
          description: `Thu tiền buổi cầu giao lưu từ ${c.name} (${cMems.join(', ')}) ngày ${dateFormatted} (${formatMoney(shuttleFeePerMember)}/người × ${cCount} người)`,
          operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
        });
      }
    });
  }

  // 4. Nếu có người ứng tiền ngoài
  if (activityState.frontPersonId && activityState.frontPersonId !== 'NONE' && activityState.frontAmount > 0) {
    const frontPerson = AppState.members.find(m => m.id === activityState.frontPersonId);
    const frontName = frontPerson ? frontPerson.name : 'Người ứng tiền';
    AppState.transactions.push({
      id: 'TX_' + Date.now() + '_FRONT',
      sessionId: targetSessionId,
      date: nowTime,
      type: 'ADVANCE',
      categoryGroup: 'ADVANCE',
      subType: 'ADVANCE',
      categoryName: 'Quỹ tạm ứng ngoài',
      amount: activityState.frontAmount,
      targetName: 'Quỹ Tạm Ứng',
      walletImpact: 0,
      fundImpact: activityState.frontAmount,
      description: `${frontName} ứng tiền ngoài buổi cầu ngày ${dateFormatted}`,
      operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
    });
  }

  // 5. Lưu hoặc cập nhật phiên hoạt động trong AppState.activitySessions
  const sessionMembers = [];
  (activityState.selectedMemberIds || new Set()).forEach(id => {
    const m = AppState.members.find(x => x.id === id);
    if (m) {
      sessionMembers.push({
        id: m.id,
        name: m.name,
        fee: shuttleFeePerMember
      });
    }
  });

  const sessionGuests = [];
  (activityState.selectedGuestIds || new Set()).forEach(id => {
    const g = AppState.members.find(x => x.id === id);
    if (g) {
      sessionGuests.push({
        id: g.id,
        name: g.name,
        fee: g.fee || 50000
      });
    }
  });

  const sessionData = {
    id: targetSessionId,
    date: dateStr,
    title: activityState.type || 'Buổi cầu',
    attendeeCount: memberCount + guestCount + exCount,
    memberCount: memberCount,
    guestCount: guestCount,
    exchangeCount: exCount,
    exchangeClubs: (isExchange && clubs.length > 0) ? clubs.map(c => ({
      id: c.id,
      name: c.name,
      members: Array.from(c.members || []),
      count: (c.members || []).length,
      feePerPerson: shuttleFeePerMember,
      totalPay: (c.members || []).length * shuttleFeePerMember
    })) : [],
    exchangeClub: (isExchange && clubs.length > 0) ? {
      name: exClubNames,
      members: clubs.flatMap(c => c.members || []),
      count: exCount,
      feePerPerson: shuttleFeePerMember,
      totalPay: exchangeTotalPay
    } : null,
    shuttleTotal: shuttleTotal,
    shuttleFeePerMember: shuttleFeePerMember,
    courtFee: totalMemberCourtFee || 0,
    guestPaid: guestPaid,
    exchangePaid: exchangeTotalPay,
    needSplit: needSplit,
    dailyBoxPrice: activityState.dailyBoxPrice || AppState.config?.dailyBoxPrice || 340000,
    expenses: activityState.expenses ? JSON.parse(JSON.stringify(activityState.expenses)) : [],
    matches: activityState.matches ? JSON.parse(JSON.stringify(activityState.matches)) : [],
    members: sessionMembers,
    guests: sessionGuests,
    timestamp: nowTime,
    isEdited: isEditing,
    lastEditedAt: isEditing ? nowTime : null
  };

  if (isEditing && existingSesIndex !== -1) {
    AppState.activitySessions[existingSesIndex] = sessionData;
  } else {
    AppState.activitySessions.unshift(sessionData);
  }

  // Cập nhật lại toàn bộ chỉ số quỹ tạm ứng và quỹ CLB
  calculateAdvanceFundStats();
  saveData();

  // Dọn sạch trạng thái chỉnh sửa
  activityState.isEditingFinalizedSession = false;
  activityState.editingSessionId = null;

  // Tự động xuất và tải file ảnh của buổi hoạt động đó về máy
  try {
    const reportCanvas = generateActivityReportCanvas(sessionData);
    window.__lastReportCanvas = reportCanvas;
    const downloadLink = document.createElement('a');
    downloadLink.download = `Bao_Cao_Buoi_Cau_${sessionData.date || getTodayInputFormat()}.png`;
    downloadLink.href = reportCanvas.toDataURL('image/png');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  } catch (canvasErr) {
    console.warn('Lỗi tự động xuất ảnh buổi cầu:', canvasErr);
  }

  clearActivitySessionState();
  initActivitySessionData(true);

  let successMsg = '';
  if (isExchange && exCount > 0) {
    successMsg = isEditing
      ? `✓ Đã CẬP NHẬT & CHỐT LẠI thành công buổi giao lưu ngày ${dateFormatted}! (${totalSplitParticipants} người chia đều: ${memberCount} TV Lập Trí + ${exCount} TV ${exClubName}, mỗi người: ${formatMoney(shuttleFeePerMember)})`
      : `Đã lưu & chốt buổi giao lưu với ${exClubName}! Chia đều ${formatMoney(shuttleFeePerMember)}/người cho ${totalSplitParticipants} người (${memberCount} TV Lập Trí: ${formatMoney(totalMemberShuttleFee)}, ${exCount} TV ${exClubName}: ${formatMoney(exchangeTotalPay)}).`;
  } else {
    successMsg = isEditing
      ? `✓ Đã CẬP NHẬT & CHỐT LẠI thành công buổi hoạt động ngày ${dateFormatted}! (${memberCount} TV, mỗi TV: ${formatMoney(shuttleFeePerMember)})`
      : `Đã lưu và trừ ví thành công ${memberCount} thành viên! (Cầu: +${formatMoney(totalMemberShuttleFee)}, Khách: +${formatMoney(guestPaid)}).`;
  }
  if (negativeCount > 0) successMsg += ` Có ${negativeCount} thành viên đang có số dư âm (dư nợ).`;
  showToast(successMsg, 'success');

  renderDashboard();
  renderFinanceTab();
  if (currentTab === 'attendance') {
    renderAttendanceTab();
  } else {
    recalculateActivitySplit();
  }

  // Tự động mở modal xem và chia sẻ ảnh báo cáo khi kết thúc hoạt động
  setTimeout(() => {
    openActivityReportModal(sessionData);
  }, 400);
}

// ==========================================
// 8.5 XUẤT ẢNH BÁO CÁO BUỔI HOẠT ĐỘNG (CANVAS 2D)
// ==========================================
function drawReportRoundedRect(ctx, x, y, w, h, r, fillStyle, strokeStyle, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function generateActivityReportCanvas(targetSession = null) {
  const session = targetSession;
  const dateStr = session ? (session.date || getTodayInputFormat()) : (activityState.date || getTodayInputFormat());
  const dateFormatted = dateStr.split('-').reverse().join('/');
  const nowTime = session ? (session.timestamp || getNowTimestampString()) : getNowTimestampString();
  const clubName = (AppState.config && AppState.config.clubName) || 'CLB CẦU LÔNG LẬP TRÍ';
  const actType = session ? (session.title || 'Buổi cầu') : (activityState.type || 'Buổi cầu');

  // Chi phí
  let totalCost = 0;
  let shuttleExpense = null;
  const expensesList = session ? (session.expenses || []) : (activityState.expenses || []);
  expensesList.forEach(e => {
    totalCost += (e.amount || 0);
    if (e.isShuttleRow) shuttleExpense = e;
  });
  if (!shuttleExpense && expensesList.length > 0) {
    shuttleExpense = expensesList[0];
  }
  if (session && session.shuttleTotal) {
    totalCost = session.shuttleTotal;
  }

  // Khách
  let guestPaid = 0;
  const guestList = [];
  if (session && session.guests) {
    session.guests.forEach(g => {
      const gFee = g.fee || 50000;
      guestPaid += gFee;
      guestList.push({ name: g.name, type: 'GUEST', fee: gFee });
    });
    if (session.guestPaid !== undefined) guestPaid = session.guestPaid;
  } else {
    (activityState.selectedGuestIds || new Set()).forEach(id => {
      const guest = AppState.members.find(m => m.id === id);
      if (guest) {
        const gFee = guest.fee || (guest.type === 'GUEST_A' ? 90000 : (guest.type === 'GUEST_B' ? 70000 : 50000));
        guestPaid += gFee;
        guestList.push({ name: guest.name, type: guest.type, fee: gFee });
      }
    });
  }

  // Thành viên
  const memberList = [];
  if (session && session.members) {
    session.members.forEach(m => {
      memberList.push(m.chipName || m.name);
    });
  } else {
    (activityState.selectedMemberIds || new Set()).forEach(id => {
      const m = AppState.members.find(x => x.id === id);
      if (m) memberList.push(m.chipName || m.name);
    });
  }
  const memberCount = memberList.length;

  // CLB Giao lưu (nếu có - hỗ trợ nhiều CLB)
  let exClubsList = [];
  if (session) {
    if (Array.isArray(session.exchangeClubs) && session.exchangeClubs.length > 0) {
      exClubsList = session.exchangeClubs;
    } else if (session.exchangeClub) {
      exClubsList = [session.exchangeClub];
    }
  } else if (activityState.type === 'Giao lưu') {
    exClubsList = (typeof getNormalizedExchangeClubs === 'function') ? getNormalizedExchangeClubs() : [];
  }
  const exCount = exClubsList.reduce((sum, c) => sum + ((c.members || []).length || c.count || 0), 0);
  const isExchange = (exCount > 0);
  const totalSplitCount = memberCount + exCount;

  const needSplit = session ? (session.needSplit !== undefined ? session.needSplit : Math.max(0, totalCost - guestPaid)) : Math.max(0, totalCost - guestPaid);
  const perPerson = session ? (session.shuttleFeePerMember !== undefined ? session.shuttleFeePerMember : (totalSplitCount > 0 ? Math.round(needSplit / totalSplitCount) : 0)) : (totalSplitCount > 0 ? Math.round(needSplit / totalSplitCount) : 0);
  const exTotalPay = session ? (session.exchangePaid !== undefined ? session.exchangePaid : exClubsList.reduce((sum, c) => sum + (c.totalPay || (((c.members || []).length || c.count || 0) * perPerson)), 0)) : (exCount * perPerson);

  // Người ứng tiền
  let frontText = null;
  if (!session && activityState.frontPersonId && activityState.frontPersonId !== 'NONE' && activityState.frontAmount > 0) {
    const frontPerson = AppState.members.find(m => m.id === activityState.frontPersonId);
    frontText = `${frontPerson ? frontPerson.name : 'Thành viên'} đã ứng trước: ${formatMoney(activityState.frontAmount)}`;
  }

  // Trận đấu
  const matches = session ? (session.matches || []) : (activityState.matches || []);

  // STK ngân hàng
  const bankInfo = (AppState.config && AppState.config.bankInfo) || '';

  // Kích thước canvas
  const CANVAS_WIDTH = 800;
  const PADDING = 28;
  const CONTENT_WIDTH = CANVAS_WIDTH - PADDING * 2;

  // Tính toán chiều cao linh hoạt
  let estHeight = PADDING; // lề trên
  estHeight += 125; // Header banner
  estHeight += 16;  // khoảng cách
  estHeight += 92;  // 4 thẻ số liệu KPI
  estHeight += 16;  // khoảng cách
  const expenseH = 68 + (frontText ? 32 : 0);
  estHeight += expenseH;
  estHeight += 16;  // khoảng cách

  // Chiều cao khối các CLB giao lưu
  let exTotalBoxHeight = 0;
  if (isExchange) {
    exClubsList.forEach(c => {
      const cMems = Array.isArray(c.members) ? c.members : [];
      const rows = Math.ceil(Math.max(1, cMems.length) / 5);
      exTotalBoxHeight += (44 + (rows * 34) + 12);
    });
    estHeight += exTotalBoxHeight + 16;
  }

  // Chiều cao khối điểm danh thành viên chủ nhà
  const chipRows = Math.ceil(Math.max(1, memberList.length) / 5);
  const attBoxHeight = 44 + (chipRows * 34) + (guestList.length > 0 ? 38 : 0) + 12;
  estHeight += attBoxHeight;
  estHeight += 16;  // khoảng cách

  // Chiều cao khối trận đấu
  let matchBoxHeight = 0;
  if (matches.length > 0) {
    matchBoxHeight = 40 + (matches.length * 42) + 8;
    estHeight += matchBoxHeight + 16;
  }

  // Chiều cao khối ngân hàng
  let bankBoxHeight = 0;
  if (bankInfo) {
    bankBoxHeight = 65;
    estHeight += bankBoxHeight + 16;
  }

  // Footer
  estHeight += 80;
  estHeight += PADDING; // lề dưới

  // Khởi tạo Canvas độ nét cao (2x Retina)
  const canvas = document.createElement('canvas');
  const SCALE = 2;
  canvas.width = CANVAS_WIDTH * SCALE;
  canvas.height = estHeight * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Nền canvas tổng thể
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, CANVAS_WIDTH, estHeight);

  // Viền bo góc thẻ card bao ngoài
  drawReportRoundedRect(ctx, 10, 10, CANVAS_WIDTH - 20, estHeight - 20, 24, '#ffffff', '#e2e8f0', 1.5);

  let curY = PADDING;

  // 1. BANNER TIÊU ĐỀ ĐẦU TRANG
  const headerGrad = ctx.createLinearGradient(PADDING, curY, PADDING + CONTENT_WIDTH, curY + 125);
  headerGrad.addColorStop(0, '#064e3b');
  headerGrad.addColorStop(1, '#047857');
  drawReportRoundedRect(ctx, PADDING, curY, CONTENT_WIDTH, 125, 18, headerGrad, null);

  // Huy hiệu loại buổi sinh hoạt
  drawReportRoundedRect(ctx, PADDING + CONTENT_WIDTH - 156, curY + 14, 140, 26, 8, 'rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.35)', 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const badgeTitle = isExchange ? `✓ GIAO LƯU CLB` : `✓ ${actType.toUpperCase()}`;
  ctx.fillText(badgeTitle, PADDING + CONTENT_WIDTH - 86, curY + 31);

  // Tên CLB & Tiêu đề
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '900 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`🏸  ${clubName.toUpperCase()}`, PADDING + 20, curY + 35);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  const mainBannerTitle = isExchange ? `BÁO CÁO GIAO LƯU: ${clubName.replace('CLB CẦU LÔNG ', '')} ⚔️ ${(exClub.name || 'CLB BẠN').toUpperCase()}` : 'BÁO CÁO TỔNG KẾT BUỔI CẦU';
  ctx.fillText(mainBannerTitle, PADDING + 20, curY + 68);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`📅 Ngày sinh hoạt: ${dateFormatted}  •  ⏰ Thời gian chốt: ${nowTime}`, PADDING + 20, curY + 98);

  curY += 125 + 16;

  // 2. 4 THẺ SỐ LIỆU TÀI CHÍNH NỔI BẬT
  const gap = 10;
  const colW = (CONTENT_WIDTH - gap * 3) / 4;
  const statBoxH = 92;

  // Thẻ 1: Tổng chi phí
  drawReportRoundedRect(ctx, PADDING, curY, colW, statBoxH, 14, '#f8fafc', '#e2e8f0', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TỔNG CHI PHÍ', PADDING + colW / 2, curY + 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatMoney(totalCost), PADDING + colW / 2, curY + 54);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('Sân & Cầu thi đấu', PADDING + colW / 2, curY + 75);

  // Thẻ 2: Khách & CLB bạn đóng
  const col2X = PADDING + colW + gap;
  drawReportRoundedRect(ctx, col2X, curY, colW, statBoxH, 14, '#f8fafc', '#e2e8f0', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  if (isExchange) {
    ctx.fillText('CLB BẠN & KHÁCH', col2X + colW / 2, curY + 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatMoney(guestPaid + exTotalPay), col2X + colW / 2, curY + 54);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${exCount} TV ${exClub.name || 'CLB bạn'}${guestList.length > 0 ? ` + ${guestList.length} khách` : ''}`, col2X + colW / 2, curY + 75);
  } else {
    ctx.fillText('KHÁCH ĐÓNG', col2X + colW / 2, curY + 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatMoney(guestPaid), col2X + colW / 2, curY + 54);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${guestList.length} khách tham gia`, col2X + colW / 2, curY + 75);
  }

  // Thẻ 3: Cần chia
  const col3X = col2X + colW + gap;
  drawReportRoundedRect(ctx, col3X, curY, colW, statBoxH, 14, '#f8fafc', '#e2e8f0', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CẦN CHIA', col3X + colW / 2, curY + 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatMoney(needSplit), col3X + colW / 2, curY + 54);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px system-ui, -apple-system, sans-serif';
  if (isExchange) {
    ctx.fillText(`Chia đều ${totalSplitCount} người`, col3X + colW / 2, curY + 75);
  } else {
    ctx.fillText(`Chia ${memberCount} thành viên`, col3X + colW / 2, curY + 75);
  }

  // Thẻ 4: MỖI NGƯỜI ĐÓNG (HIGHLIGHT)
  const col4X = col3X + colW + gap;
  drawReportRoundedRect(ctx, col4X, curY, colW, statBoxH, 14, '#ecfdf5', '#10b981', 1.5);
  ctx.fillStyle = '#047857';
  ctx.font = '900 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MỖI NGƯỜI ĐÓNG', col4X + colW / 2, curY + 26);
  ctx.fillStyle = '#065f46';
  ctx.font = '900 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatMoney(perPerson), col4X + colW / 2, curY + 54);
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(isExchange ? '★ Chia đều tất cả' : '★ Trừ vào ví TV', col4X + colW / 2, curY + 75);

  curY += statBoxH + 16;

  // 3. CHI TIẾT CHI PHÍ
  drawReportRoundedRect(ctx, PADDING, curY, CONTENT_WIDTH, expenseH, 14, '#f8fafc', '#e2e8f0', 1);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('🏸  CHI PHÍ CẦU VÀ TIỀN SÂN TRONG BUỔI:', PADDING + 16, curY + 25);

  const shuttleQty = shuttleExpense ? (shuttleExpense.qty || 12) : 12;
  const shuttleUnit = shuttleExpense ? (shuttleExpense.unitPrice || 28333) : 28333;
  const shuttleTotal = shuttleExpense ? (shuttleExpense.amount || 340000) : 340000;

  ctx.fillStyle = '#334155';
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`• Cầu thi đấu đã dùng: ${shuttleQty} quả × ${formatMoney(shuttleUnit)}/quả = ${formatMoney(shuttleTotal)}`, PADDING + 20, curY + 48);

  if (frontText) {
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`• ${frontText}`, PADDING + 20, curY + 76);
  }

  curY += expenseH + 16;

  // 4A. KHỐI CÁC CLB GIAO LƯU (NẾU CÓ)
  if (isExchange) {
    exClubsList.forEach(c => {
      const cMems = Array.isArray(c.members) ? c.members : [];
      const cCount = (cMems.length || c.count || 0);
      const cPay = c.totalPay || (cCount * perPerson);
      const cRows = Math.ceil(Math.max(1, cMems.length) / 5);
      const cBoxHeight = 44 + (cRows * 34) + 10;

      drawReportRoundedRect(ctx, PADDING, curY, CONTENT_WIDTH, cBoxHeight, 14, '#fffbeb', '#fcd34d', 1.2);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#78350f';
      ctx.font = '900 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`🤝  CLB GIAO LƯU: ${(c.name || 'CLB BẠN').toUpperCase()} (${cCount} người • Đóng: ${formatMoney(cPay)} • ${formatMoney(perPerson)}/người):`, PADDING + 16, curY + 25);

      let exX = PADDING + 16;
      let exY = curY + 40;
      const exChipW = 135;
      const exChipH = 26;
      const exGapX = 8;
      const exGapY = 6;

      cMems.forEach((name) => {
        if (exX + exChipW > PADDING + CONTENT_WIDTH - 16) {
          exX = PADDING + 16;
          exY += exChipH + exGapY;
        }
        drawReportRoundedRect(ctx, exX, exY, exChipW, exChipH, 7, '#ffffff', '#f59e0b', 1);
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🤝 ${name}`, exX + exChipW / 2, exY + 17);
        exX += exChipW + exGapX;
      });

      curY += cBoxHeight + 10;
    });

    curY += 6;
  }

  // 4B. DANH SÁCH ĐIỂM DANH THÀNH VIÊN LẬP TRÍ
  drawReportRoundedRect(ctx, PADDING, curY, CONTENT_WIDTH, attBoxHeight, 14, '#ffffff', '#e2e8f0', 1);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 12px system-ui, -apple-system, sans-serif';
  const attTitle = isExchange
    ? `👥  DANH SÁCH THÀNH VIÊN LẬP TRÍ (${memberCount} người${guestList.length > 0 ? ` + ${guestList.length} khách lẻ` : ''} • ${formatMoney(perPerson)}/người):`
    : `👥  DANH SÁCH ĐIỂM DANH (${memberCount + guestList.length} người: ${memberCount} thành viên, ${guestList.length} khách):`;
  ctx.fillText(attTitle, PADDING + 16, curY + 25);

  let chipX = PADDING + 16;
  let chipY = curY + 40;
  const chipW = 135;
  const chipH = 26;
  const chipGapX = 8;
  const chipGapY = 6;

  if (memberList.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Chưa có thành viên nào được chọn điểm danh', chipX, chipY + 16);
    chipY += 30;
  } else {
    memberList.forEach((name) => {
      if (chipX + chipW > PADDING + CONTENT_WIDTH - 16) {
        chipX = PADDING + 16;
        chipY += chipH + chipGapY;
      }
      drawReportRoundedRect(ctx, chipX, chipY, chipW, chipH, 7, '#ecfdf5', '#a7f3d0', 1);
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`✓ ${name}`, chipX + chipW / 2, chipY + 17);
      chipX += chipW + chipGapX;
    });
    chipY += chipH + 8;
  }

  // Dòng khách mời
  if (guestList.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Khách mời:', PADDING + 16, chipY + 17);

    let gX = PADDING + 84;
    guestList.forEach(g => {
      const gTag = `${g.name} (${formatMoney(g.fee)})`;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const tw = ctx.measureText(gTag).width + 16;
      drawReportRoundedRect(ctx, gX, chipY + 1, tw, 24, 6, '#fef3c7', '#fde68a', 1);
      ctx.fillStyle = '#92400e';
      ctx.textAlign = 'center';
      ctx.fillText(gTag, gX + tw / 2, chipY + 17);
      gX += tw + 8;
    });
  }

  curY += attBoxHeight + 16;

  // 5. KẾT QUẢ CÁC TRẬN ĐẤU (NẾU CÓ)
  if (matches.length > 0) {
    drawReportRoundedRect(ctx, PADDING, curY, CONTENT_WIDTH, matchBoxHeight, 14, '#f8fafc', '#e2e8f0', 1);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`🏸  KẾT QUẢ CÁC TRẬN CẦU TRONG BUỔI (${matches.length} trận):`, PADDING + 16, curY + 25);

    let mY = curY + 36;
    matches.forEach((m, idx) => {
      const info = formatMatchResultInfo(idx, m);
      const rowH = 34;
      drawReportRoundedRect(ctx, PADDING + 12, mY, CONTENT_WIDTH - 24, rowH, 8, '#ffffff', '#e2e8f0', 1);

      // Số trận
      drawReportRoundedRect(ctx, PADDING + 16, mY + 6, 22, 22, 5, '#047857', null);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, PADDING + 27, mY + 21);

      // Thông tin hai cặp đấu
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      const matchLabel = info.matchTitle && info.matchTitle !== `Trận ${idx + 1}` ? `[${info.matchTitle}] ` : '';
      const matchText = `${matchLabel}${info.pair1} (${info.s1})  đấu với  ${info.pair2} (${info.s2})`;
      ctx.fillText(matchText, PADDING + 46, mY + 21);

      // Thưởng / Đội thắng
      let rightBadge = '';
      if (info.s1 > info.s2 && (info.s1 > 0 || info.s2 > 0)) rightBadge = `🏆 ${info.pair1} Thắng`;
      else if (info.s2 > info.s1 && (info.s1 > 0 || info.s2 > 0)) rightBadge = `🏆 ${info.pair2} Thắng`;
      if (info.prize) rightBadge += ` • 🎁 ${info.prize}`;

      if (rightBadge) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(rightBadge, PADDING + CONTENT_WIDTH - 24, mY + 21);
      }

      mY += rowH + 8;
    });

    curY += matchBoxHeight + 16;
  }

  // 6. THÔNG TIN CHUYỂN KHOẢN (NẾU CÓ)
  if (bankInfo) {
    drawReportRoundedRect(ctx, PADDING, curY, CONTENT_WIDTH, bankBoxHeight, 14, '#eff6ff', '#bfdbfe', 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('💳  THÔNG TIN THANH TOÁN / CHUYỂN KHOẢN CLB:', PADDING + 16, curY + 25);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(bankInfo, PADDING + 20, curY + 48);

    curY += bankBoxHeight + 16;
  }

  // 7. FOOTER CHỮ KÝ VÀ WATERMARK
  ctx.textAlign = 'center';
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('✓ ĐÃ QUYẾT TOÁN & CẬP NHẬT SỔ QUỸ CLB THÀNH CÔNG', CANVAS_WIDTH / 2, curY + 22);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Xuất tự động từ Hệ thống Quản lý CLB Cầu Lông • ${nowTime}`, CANVAS_WIDTH / 2, curY + 44);

  return canvas;
}

function openActivityReportModal(targetSession = null) {
  const modal = document.getElementById('actReportModal');
  const loading = document.getElementById('actReportLoadingState');
  const previewImg = document.getElementById('actReportPreviewImg');
  if (!modal) return;

  modal.classList.remove('hidden');
  if (loading) loading.classList.remove('hidden');
  if (previewImg) previewImg.classList.add('hidden');

  const sessionToRender = targetSession || (AppState.activitySessions && AppState.activitySessions.length > 0 ? AppState.activitySessions[0] : null);

  setTimeout(() => {
    try {
      const canvas = generateActivityReportCanvas(sessionToRender);
      window.__lastReportCanvas = canvas;
      const dataUrl = canvas.toDataURL('image/png');
      if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.classList.remove('hidden');
      }
      if (loading) loading.classList.add('hidden');
    } catch (e) {
      console.error(e);
      if (loading) loading.textContent = 'Lỗi tạo ảnh báo cáo: ' + e.message;
    }
  }, 60);
}

function closeActivityReportModal() {
  const modal = document.getElementById('actReportModal');
  if (modal) modal.classList.add('hidden');
}

function downloadActivityReportImage() {
  const canvas = window.__lastReportCanvas;
  if (!canvas) {
    showToast('Chưa có ảnh báo cáo để tải xuống!', 'warning');
    return;
  }
  const dateStr = activityState.date || getTodayInputFormat();
  const link = document.createElement('a');
  link.download = `Bao_Cao_Buoi_Cau_${dateStr}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('💾 Đã tải ảnh báo cáo buổi cầu (.PNG) thành công!', 'success');
}

async function copyActivityReportImage() {
  const canvas = window.__lastReportCanvas;
  if (!canvas) {
    showToast('Chưa có ảnh báo cáo để sao chép!', 'warning');
    return;
  }
  const btn = document.getElementById('btnCopyReportImg');
  try {
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Không tạo được dữ liệu ảnh');
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('📋 Đã sao chép ảnh báo cáo! Bạn có thể dán (Ctrl + V) ngay vào Zalo / Facebook.', 'success');
        if (btn) {
          const old = btn.innerHTML;
          btn.innerHTML = '<span>✓</span> Đã chép!';
          setTimeout(() => { btn.innerHTML = old; }, 2000);
        }
      } else {
        downloadActivityReportImage();
      }
    }, 'image/png');
  } catch (err) {
    console.error(err);
    showToast('Trình duyệt chưa hỗ trợ sao chép ảnh trực tiếp. Hệ thống đang tải ảnh về máy.', 'info');
    downloadActivityReportImage();
  }
}

// ==========================================
// 10. THU – CHI – VÍ THÀNH VIÊN – QUỸ CLB (CÔNG THỨC & MA TRẬN ĐỐI SOÁT)
// ==========================================

/**
 * CÔNG THỨC QUỸ CLB:
 * QUỸ CLB = Tổng tất cả khoản thu (A) − Tổng tất cả khoản chi (B)
 * Trong đó tách riêng:
 * - Thu (A):
 *   1. Quỹ thành viên (A.1): Ví TV (−), Quỹ CLB (+)
 *   2. Phạt (A.2):           Ví TV (−), Quỹ CLB (+)
 *   3. Giải thưởng (A.3):    Ví TV (Không), Quỹ CLB (+)
 *   4. Tài trợ (A.4):        Ví TV (Không), Quỹ CLB (+)
 *   5. Thu khác (A.5):       Ví TV (Không), Quỹ CLB (+)
 * - Chi (B):
 *   1. Hoạt động chung (B.1): Liên hoan (1.1), Giao lưu (1.2), Chi khác (1.3) -> Quỹ CLB (−)
 *   2. Chi phí cho TV (B.2):  Hiếu (2.1), Hỷ (2.2), Ốm (2.3), Khác (2.4)     -> Quỹ CLB (−)
 */
function calculateClubFundStats() {
  let carried = Number(AppState.funds?.carriedForwardFund) || 0;
  // Loại bỏ giá trị lỗi 1099986 (vốn là quỹ tạm ứng tháng 9 cũ bị gán nhầm sang quỹ tồn)
  if (carried === 1099986 || AppState.funds?.carriedForwardFund === 1099986) {
    carried = 4400000;
    if (AppState.funds) {
      AppState.funds.carriedForwardFund = 4400000;
      AppState.funds.carriedForwardFromMonth = '09/2026';
    }
  }

  const stats = {
    // Khoản Thu (A)
    incomeA: {
      memFund: 0,   // A.1 Quỹ thành viên
      fine: 0,      // A.2 Phạt
      prize: 0,     // A.3 Giải thưởng
      sponsor: 0,   // A.4 Tài trợ
      other: 0,     // A.5 Thu khác
      total: 0
    },
    // Khoản Chi (B)
    expenseB: {
      general: {
        party: 0,     // 1.1 Liên hoan
        exchange: 0,  // 1.2 Giao lưu
        other: 0,     // 1.3 Chi khác
        total: 0
      },
      member: {
        hieu: 0,      // 2.1 Hiếu
        hy: 0,        // 2.2 Hỷ
        om: 0,        // 2.3 Ốm
        other: 0,     // 2.4 Chi khác
        total: 0
      },
      total: 0
    },
    carriedForward: carried,
    clubFund: 0, // Số dư quỹ tồn kỳ trước + Tổng Thu A - Tổng Chi B
    wallet: {
      total: 0,
      negativeCount: 0,
      negativeList: []
    }
  };

  let hasCarriedForwardTx = false;
  let cfTxAmount = 0;

  (AppState.transactions || []).forEach(tx => {
    // Bỏ qua các giao dịch thuộc các chu kỳ tháng đã chốt sổ
    if (isDateOrMonthInClosedCycle(tx.date)) return;
    if (tx.isCancelled || tx.status === 'CANCELLED') return;

    const amt = Math.abs(tx.amount || 0);
    const desc = String(tx.description || '').toLowerCase();
    const cat = String(tx.categoryName || '').toLowerCase();
    const target = String(tx.targetName || '').toLowerCase();

    // Nhận diện giao dịch ghi nhận Quỹ tồn tháng trước chuyển sang (TX_1790987680701 hoặc có chữ 'quỹ tồn')
    const isCFTx = (tx.subType === 'OTHER_IN' || tx.type === 'FUND_IN' || tx.categoryGroup === 'INCOME_A') &&
                   (desc.includes('quỹ tồn') || cat.includes('quỹ tồn') || target.includes('quỹ tồn') || tx.id === 'TX_1790987680701');

    if (isCFTx) {
      hasCarriedForwardTx = true;
      cfTxAmount = amt;
      // Giao dịch này đại diện cho Quỹ tồn từ chu kỳ trước chuyển sang -> Đưa vào stats.carriedForward, không tính trùng vào Thu khác A.5
      return;
    }

    // Xử lý nhóm Thu (A)
    if (tx.subType === 'MEM_FUND') {
      stats.incomeA.memFund += amt;
    } else if (tx.subType === 'FINE' || tx.type === 'FINE') {
      stats.incomeA.fine += amt;
    } else if (tx.subType === 'PRIZE') {
      stats.incomeA.prize += amt;
    } else if (tx.subType === 'SPONSOR') {
      stats.incomeA.sponsor += amt;
    } else if (tx.subType === 'OTHER_IN' || tx.type === 'FUND_IN') {
      stats.incomeA.other += amt;
    }
    // Xử lý nhóm Chi (B)
    else if (tx.subType === 'EXP_PARTY') {
      stats.expenseB.general.party += amt;
    } else if (tx.subType === 'EXP_EXCHANGE') {
      stats.expenseB.general.exchange += amt;
    } else if (tx.subType === 'EXP_GENERAL_OTHER' || tx.type === 'FUND_OUT') {
      stats.expenseB.general.other += amt;
    } else if (tx.subType === 'EXP_HIEU') {
      stats.expenseB.member.hieu += amt;
    } else if (tx.subType === 'EXP_HY') {
      stats.expenseB.member.hy += amt;
    } else if (tx.subType === 'EXP_OM') {
      stats.expenseB.member.om += amt;
    } else if (tx.subType === 'EXP_MEMBER_OTHER') {
      stats.expenseB.member.other += amt;
    }
  });

  if (hasCarriedForwardTx && cfTxAmount > 0) {
    stats.carriedForward = cfTxAmount;
    if (AppState.funds) {
      AppState.funds.carriedForwardFund = cfTxAmount;
      if (!AppState.funds.carriedForwardFromMonth) {
        AppState.funds.carriedForwardFromMonth = '09/2026';
      }
    }
  } else if (!stats.carriedForward && AppState.funds?.carriedForwardFund) {
    stats.carriedForward = Number(AppState.funds.carriedForwardFund) || 4400000;
  }

  stats.incomeA.total = stats.incomeA.memFund + stats.incomeA.fine + stats.incomeA.prize + stats.incomeA.sponsor + stats.incomeA.other;
  stats.expenseB.general.total = stats.expenseB.general.party + stats.expenseB.general.exchange + stats.expenseB.general.other;
  stats.expenseB.member.total = stats.expenseB.member.hieu + stats.expenseB.member.hy + stats.expenseB.member.om + stats.expenseB.member.other;
  stats.expenseB.total = stats.expenseB.general.total + stats.expenseB.member.total;

  stats.clubFund = stats.carriedForward + stats.incomeA.total - stats.expenseB.total;

  // Tính ví thành viên
  (AppState.members || []).forEach(m => {
    const bal = m.balance || 0;
    stats.wallet.total += bal;
    if (bal < 0) {
      stats.wallet.negativeCount++;
      stats.wallet.negativeList.push(m);
    }
  });

  // Đồng bộ số dư Quỹ CLB vào AppState
  if (AppState.funds) {
    AppState.funds.clubFund = stats.clubFund;
  }

  return stats;
}

function getFinanceOperatorName() {
  return (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin';
}

/**
 * Tính toán số dư và các thành phần của Quỹ Tạm Ứng theo công thức:
 * - Quỹ tạm ứng tiền cầu = Tổng tiền cầu đã thu từ TV − Tổng tiền đã chi/trả cho tiền cầu
 * - Quỹ tạm ứng tiền sân = Tổng tiền sân đã thu từ TV − Tổng tiền đã chi/trả cho sân
 * - Tổng Quỹ tạm ứng = Quỹ tạm ứng tiền cầu + Quỹ tạm ứng tiền sân + Khoản thu của khách giao lưu theo hạng
 */
function calculateAdvanceFundStats() {
  const stats = {
    shuttle: {
      collected: 0,
      paid: 0,
      balance: 0
    },
    court: {
      collected: 0,
      paid: 0,
      balance: 0
    },
    guest: {
      collected: 0
    },
    totalAdvanceFund: 0
  };

  (AppState.transactions || []).forEach(tx => {
    // Bỏ qua các giao dịch thuộc các chu kỳ tháng đã chốt sổ
    if (isDateOrMonthInClosedCycle(tx.date)) return;
    if (tx.isCancelled || tx.status === 'CANCELLED') return;

    const amt = Math.abs(tx.amount || 0);

    // 1. Tiền cầu thu từ TV
    if (tx.categoryGroup === 'ADVANCE_SHUTTLE_IN' || tx.subType === 'SHUTTLE_ADV_IN') {
      stats.shuttle.collected += amt;
    }
    // 2. Tiền cầu đã chi/trả (mua cầu)
    else if (tx.categoryGroup === 'ADVANCE_SHUTTLE_OUT' || tx.subType === 'SHUTTLE_EXP_PAY') {
      stats.shuttle.paid += amt;
    }
    // 3. Tiền sân thu từ TV (theo bậc)
    else if (tx.categoryGroup === 'ADVANCE_COURT_IN' || tx.subType === 'COURT_ADV_IN') {
      stats.court.collected += amt;
    }
    // 4. Tiền sân đã chi/trả (trả chủ sân)
    else if (tx.categoryGroup === 'ADVANCE_COURT_OUT' || tx.subType === 'COURT_EXP_PAY') {
      stats.court.paid += amt;
    }
    // 5. Khoản thu của khách giao lưu theo hạng
    else if (tx.categoryGroup === 'ADVANCE_GUEST_IN' || tx.subType === 'GUEST_ADV_IN') {
      stats.guest.collected += amt;
    }
    // Legacy support
    else if (tx.type === 'ADVANCE') {
      stats.court.collected += amt;
    }
  });

  stats.shuttle.balance = stats.shuttle.collected - stats.shuttle.paid;
  stats.court.balance = stats.court.collected - stats.court.paid;
  stats.totalAdvanceFund = stats.shuttle.balance + stats.court.balance + stats.guest.collected;

  if (AppState.funds) {
    AppState.funds.advanceFund = stats.totalAdvanceFund;
    AppState.funds.shuttleAdvanceFund = stats.shuttle.balance;
    AppState.funds.courtAdvanceFund = stats.court.balance;
    AppState.funds.guestAdvanceIncome = stats.guest.collected;
    AppState.funds.shuttlePaidTotal = stats.shuttle.paid;
    AppState.funds.courtPaidTotal = stats.court.paid;
  }

  return stats;
}

function renderFinanceTab() {
  refreshAllMembersWalletBreakdown();
  const stats = calculateClubFundStats();
  const advStats = calculateAdvanceFundStats();

  // 1. Thẻ Quỹ CLB Hiện Tại
  const clubFundEl = document.getElementById('kpiFinanceClubFund');
  if (clubFundEl) clubFundEl.textContent = formatMoney(stats.clubFund);

  const formulaEl = document.getElementById('kpiFinanceClubFundFormula');
  const carried = Number(AppState.funds?.carriedForwardFund) || 0;
  const carriedFrom = AppState.funds?.carriedForwardFromMonth;
  if (formulaEl) {
    if (carried > 0) {
      const fromText = carriedFrom ? `Tồn T${carriedFrom}` : 'Tồn kỳ trước';
      formulaEl.innerHTML = `${fromText}: <b class="text-amber-300">${formatMoney(carried)}</b> | Thu: <b class="text-emerald-300">+${formatMoney(stats.incomeA.total)}</b> | Chi: <b class="text-rose-300">-${formatMoney(stats.expenseB.total)}</b>`;
    } else {
      formulaEl.innerHTML = `Công thức: <b class="text-white">Tổng Thu (A) − Tổng Chi (B)</b>`;
    }
  }

  const miniInc = document.getElementById('kpiMiniTotalIncome');
  if (miniInc) miniInc.textContent = `+${formatMoney(stats.incomeA.total)}`;

  const miniExp = document.getElementById('kpiMiniTotalExpense');
  if (miniExp) miniExp.textContent = `-${formatMoney(stats.expenseB.total)}`;

  // 2. Thẻ Khoản Thu (A)
  const totalIncEl = document.getElementById('kpiFinanceTotalIncome');
  if (totalIncEl) totalIncEl.textContent = formatMoney(stats.incomeA.total);

  const incMemFund = document.getElementById('kpiIncomeMemFund');
  if (incMemFund) incMemFund.textContent = formatMoney(stats.incomeA.memFund);

  const incFine = document.getElementById('kpiIncomeFine');
  if (incFine) incFine.textContent = formatMoney(stats.incomeA.fine);

  const incPrize = document.getElementById('kpiIncomePrize');
  if (incPrize) incPrize.textContent = formatMoney(stats.incomeA.prize);

  const incSponsor = document.getElementById('kpiIncomeSponsor');
  if (incSponsor) incSponsor.textContent = formatMoney(stats.incomeA.sponsor);

  const incOther = document.getElementById('kpiIncomeOther');
  if (incOther) incOther.textContent = formatMoney(stats.incomeA.other);

  // 3. Thẻ Khoản Chi (B)
  const totalExpEl = document.getElementById('kpiFinanceTotalExpense');
  if (totalExpEl) totalExpEl.textContent = formatMoney(stats.expenseB.total);

  const expGen = document.getElementById('kpiExpenseGeneral');
  if (expGen) expGen.textContent = formatMoney(stats.expenseB.general.total);

  const expParty = document.getElementById('kpiExpParty');
  if (expParty) expParty.textContent = formatMoney(stats.expenseB.general.party);

  const expExchange = document.getElementById('kpiExpExchange');
  if (expExchange) expExchange.textContent = formatMoney(stats.expenseB.general.exchange);

  const expOther = document.getElementById('kpiExpOther');
  if (expOther) expOther.textContent = formatMoney(stats.expenseB.general.other);

  const expMember = document.getElementById('kpiExpenseMember');
  if (expMember) expMember.textContent = formatMoney(stats.expenseB.member.total);

  const expHieu = document.getElementById('kpiExpHieu');
  if (expHieu) expHieu.textContent = formatMoney(stats.expenseB.member.hieu);

  const expHy = document.getElementById('kpiExpHy');
  if (expHy) expHy.textContent = formatMoney(stats.expenseB.member.hy);

  const expOm = document.getElementById('kpiExpOm');
  if (expOm) expOm.textContent = formatMoney(stats.expenseB.member.om);

  // 4. Thẻ Ví Thành Viên & Công Nợ
  const totalWalletEl = document.getElementById('kpiFinanceTotalWallet');
  const negCountEl = document.getElementById('kpiFinanceNegativeCount');
  const advEl = document.getElementById('kpiFinanceAdvance');
  const walletTitleEl = document.getElementById('kpiFinanceWalletTitle');
  const sublabel1El = document.getElementById('kpiFinanceSublabel1');
  const sublabel2El = document.getElementById('kpiFinanceSublabel2');

  const isMemberRoleFin = AppState.auth && AppState.auth.user && AppState.auth.user.role === 'MEMBER';
  const currentUserIdFin = AppState.auth && AppState.auth.user ? AppState.auth.user.id : null;
  const currentMemberFin = currentUserIdFin ? (AppState.members || []).find(m => m.id === currentUserIdFin) : null;

  if (isMemberRoleFin && currentMemberFin) {
    const memBreakdown = calculateMemberWalletBreakdown(currentMemberFin);
    if (walletTitleEl) walletTitleEl.textContent = 'Ví Của Bạn';
    if (totalWalletEl) {
      totalWalletEl.textContent = formatMoney(memBreakdown.balance);
      totalWalletEl.className = memBreakdown.balance < 0 ? 'text-xl font-black text-rose-600 mt-1' : 'text-xl font-black text-blue-700 mt-1';
    }
    if (sublabel1El) sublabel1El.textContent = 'Chủ tài khoản:';
    if (negCountEl) {
      negCountEl.textContent = currentMemberFin.name;
      negCountEl.className = 'text-blue-700 font-bold';
    }
    if (sublabel2El) sublabel2El.textContent = 'Tháng này:';
    if (advEl) {
      advEl.textContent = `${memBreakdown.sessionsCount} buổi tham gia`;
      advEl.className = 'text-slate-800 font-bold';
    }
  } else {
    if (walletTitleEl) walletTitleEl.textContent = 'Ví Thành Viên';
    if (totalWalletEl) {
      totalWalletEl.textContent = formatMoney(stats.wallet.total);
      totalWalletEl.className = 'text-xl font-black text-blue-700 mt-1';
    }
    if (sublabel1El) sublabel1El.textContent = 'Nợ ví / âm:';
    if (negCountEl) {
      negCountEl.textContent = `${stats.wallet.negativeCount} người`;
      negCountEl.className = 'text-rose-600 font-bold';
    }
    if (sublabel2El) sublabel2El.textContent = 'Quỹ tạm ứng:';
    if (advEl) {
      advEl.textContent = formatMoney(advStats.totalAdvanceFund);
      advEl.className = 'text-slate-800 font-bold';
    }
  }

  // 5. Thẻ & Thành Phần Quỹ Tạm Ứng Mới
  const kpiAdvTotalEl = document.getElementById('kpiCardAdvanceFundTotal');
  if (kpiAdvTotalEl) kpiAdvTotalEl.textContent = formatMoney(advStats.totalAdvanceFund);

  const kpiShuttleBalEl = document.getElementById('kpiAdvShuttleBalance');
  if (kpiShuttleBalEl) kpiShuttleBalEl.textContent = formatMoney(advStats.shuttle.balance);

  const kpiShuttleColEl = document.getElementById('kpiAdvShuttleCollected');
  if (kpiShuttleColEl) kpiShuttleColEl.textContent = `+${formatMoney(advStats.shuttle.collected)}`;

  const kpiShuttlePaidEl = document.getElementById('kpiAdvShuttlePaid');
  if (kpiShuttlePaidEl) kpiShuttlePaidEl.textContent = `-${formatMoney(advStats.shuttle.paid)}`;

  const kpiCourtBalEl = document.getElementById('kpiAdvCourtBalance');
  if (kpiCourtBalEl) kpiCourtBalEl.textContent = formatMoney(advStats.court.balance);

  const kpiCourtColEl = document.getElementById('kpiAdvCourtCollected');
  if (kpiCourtColEl) kpiCourtColEl.textContent = `+${formatMoney(advStats.court.collected)}`;

  const kpiCourtPaidEl = document.getElementById('kpiAdvCourtPaid');
  if (kpiCourtPaidEl) kpiCourtPaidEl.textContent = `-${formatMoney(advStats.court.paid)}`;

  const kpiGuestColEl = document.getElementById('kpiAdvGuestCollected');
  if (kpiGuestColEl) kpiGuestColEl.textContent = `+${formatMoney(advStats.guest.collected)}`;

  // Thống kê dư nợ ví âm thành viên
  let negativeDebtTotal = 0;
  let negativeMemberCount = 0;
  (AppState.members || []).forEach(m => {
    const bal = m.balance || 0;
    if (bal < 0) {
      negativeDebtTotal += Math.abs(bal);
      negativeMemberCount++;
    }
  });

  const negDebtEl = document.getElementById('kpiAdvNegativeDebtTotal');
  if (negDebtEl) negDebtEl.textContent = formatMoney(negativeDebtTotal);

  const negCountAdvEl = document.getElementById('kpiAdvNegativeMemberCount');
  if (negCountAdvEl) negCountAdvEl.textContent = `${negativeMemberCount} người nợ ví`;

  // Đồng bộ lên thanh tóm tắt thu gọn của Quỹ Tạm Ứng
  const miniShuttle = document.getElementById('kpiAdvShuttleBalanceMini');
  if (miniShuttle) miniShuttle.textContent = formatMoney(advStats.shuttle.balance);

  const miniCourt = document.getElementById('kpiAdvCourtBalanceMini');
  if (miniCourt) miniCourt.textContent = formatMoney(advStats.court.balance);

  const miniGuest = document.getElementById('kpiAdvGuestCollectedMini');
  if (miniGuest) miniGuest.textContent = `+${formatMoney(advStats.guest.collected)}`;

  const miniDebt = document.getElementById('kpiAdvNegativeDebtMini');
  if (miniDebt) miniDebt.textContent = formatMoney(negativeDebtTotal);

  // Đồng bộ lên dashboard KPI
  const dashFund = document.getElementById('kpiClubFund');
  if (dashFund) dashFund.textContent = formatMoney(stats.clubFund);

  const dashAdv = document.getElementById('kpiAdvanceFund');
  if (dashAdv) dashAdv.textContent = formatMoney(advStats.totalAdvanceFund);

  const dashWallet = document.getElementById('kpiTotalWallet');
  if (dashWallet) {
    const curUser = AppState.auth?.user;
    if (curUser) {
      const mem = (AppState.members || []).find(m => 
        m.id === curUser.id || 
        (m.username && m.username.toLowerCase() === (curUser.username || '').toLowerCase()) ||
        (m.name && m.name.toLowerCase() === (curUser.name || '').toLowerCase())
      ) || (AppState.members ? AppState.members[0] : null);
      const b = mem ? calculateMemberWalletBreakdown(mem) : null;
      const myBal = (mem && mem.balance !== undefined) ? mem.balance : (b ? b.balance : 0);
      dashWallet.textContent = formatMoney(myBal);
      dashWallet.className = myBal < 0 
        ? 'text-xs sm:text-lg md:text-2xl font-black text-rose-600 block truncate' 
        : 'text-xs sm:text-lg md:text-2xl font-black text-emerald-700 block truncate';
    } else {
      dashWallet.textContent = formatMoney(stats.wallet.total);
      dashWallet.className = 'text-xs sm:text-lg md:text-2xl font-black text-slate-900 block truncate';
    }
  }

  // Render bảng giao dịch
  renderFullTransactionTable();

  // Render danh sách yêu cầu nạp tiền chờ xác thực & thông báo
  renderTopUpBadges();

  // Áp dụng nhãn tên gọi thư mục tùy biến
  applyCustomLabels();
}

/**
 * Thu gọn / Mở rộng các mục chi tiết trong Tab Tài chính & Quỹ
 */
function toggleFinanceSection(elementId, btnEl) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const isHidden = el.classList.contains('hidden');
  if (isHidden) {
    el.classList.remove('hidden');
    if (btnEl) {
      const chevron = btnEl.querySelector('.chevron');
      if (chevron) chevron.textContent = '▴';
      const label = btnEl.querySelector('.btn-label');
      if (label && label.dataset.expanded) label.textContent = label.dataset.expanded;
    }
  } else {
    el.classList.add('hidden');
    if (btnEl) {
      const chevron = btnEl.querySelector('.chevron');
      if (chevron) chevron.textContent = '▾';
      const label = btnEl.querySelector('.btn-label');
      if (label && label.dataset.collapsed) label.textContent = label.dataset.collapsed;
    }
  }
}

/**
 * Thu gọn / Mở rộng Thẻ Quỹ Tạm Ứng
 */
function toggleAdvanceFundCard(btnEl) {
  const detailBody = document.getElementById('advanceFundDetailBody');
  const summaryBar = document.getElementById('advanceFundSummaryBar');
  if (!detailBody) return;
  const isCollapsed = detailBody.classList.contains('hidden');
  if (isCollapsed) {
    detailBody.classList.remove('hidden');
    if (summaryBar) summaryBar.classList.add('hidden');
    if (btnEl) {
      const label = btnEl.querySelector('.btn-label') || btnEl;
      label.textContent = 'Thu gọn';
      const chevron = btnEl.querySelector('.chevron');
      if (chevron) chevron.textContent = '▴';
    }
  } else {
    detailBody.classList.add('hidden');
    if (summaryBar) summaryBar.classList.remove('hidden');
    if (btnEl) {
      const label = btnEl.querySelector('.btn-label') || btnEl;
      label.textContent = 'Mở rộng';
      const chevron = btnEl.querySelector('.chevron');
      if (chevron) chevron.textContent = '▾';
    }
  }
}

function renderFullTransactionTable() {
  const tbody = document.getElementById('fullTransactionTableBody');
  const typeFilter = document.getElementById('filterTxType');
  const searchInput = document.getElementById('searchTx');
  if (!tbody) return;

  const selectedType = typeFilter ? typeFilter.value : 'ALL';
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let list = (AppState.transactions || []).slice().reverse();

  // Kiểm tra quyền: nếu là Thành viên (MEMBER), chỉ xem các giao dịch liên quan đến ví/tài khoản của chính mình
  const isMemberRoleTx = AppState.auth && AppState.auth.user && AppState.auth.user.role === 'MEMBER';
  const currentUserIdTx = AppState.auth && AppState.auth.user ? AppState.auth.user.id : null;
  const currentMemberTx = currentUserIdTx ? (AppState.members || []).find(m => m.id === currentUserIdTx) : null;
  const currentMemberNameTx = currentMemberTx ? currentMemberTx.name.trim().toLowerCase() : '';

  if (isMemberRoleTx && currentUserIdTx) {
    list = list.filter(tx => {
      if (tx.memberId && String(tx.memberId) === String(currentUserIdTx)) return true;
      if (tx.targetName && currentMemberNameTx && tx.targetName.trim().toLowerCase() === currentMemberNameTx) return true;
      return false;
    });
  }

  if (selectedType !== 'ALL') {
    list = list.filter(tx => {
      if (selectedType === 'CANCELLED') return tx.isCancelled || tx.status === 'CANCELLED';
      // Với các bộ lọc danh mục cụ thể (không phải CANCELLED), chỉ hiển thị giao dịch còn hiệu lực:
      if (tx.isCancelled || tx.status === 'CANCELLED') return false;

      if (selectedType === 'MEM_FUND') return tx.subType === 'MEM_FUND';
      if (selectedType === 'FINE') return tx.subType === 'FINE' || tx.type === 'FINE';
      if (selectedType === 'PRIZE') return tx.subType === 'PRIZE';
      if (selectedType === 'SPONSOR') return tx.subType === 'SPONSOR';
      if (selectedType === 'OTHER_IN') return tx.subType === 'OTHER_IN' || tx.type === 'FUND_IN';
      if (selectedType === 'EXP_GENERAL') return tx.subType === 'EXP_PARTY' || tx.subType === 'EXP_EXCHANGE' || tx.subType === 'EXP_GENERAL_OTHER' || tx.type === 'FUND_OUT';
      if (selectedType === 'EXP_MEMBER') return tx.subType === 'EXP_HIEU' || tx.subType === 'EXP_HY' || tx.subType === 'EXP_OM' || tx.subType === 'EXP_MEMBER_OTHER';
      if (selectedType === 'TOPUP') return tx.subType === 'TOPUP' || tx.type === 'TOPUP';
      if (selectedType === 'COURT_FEE') return tx.type === 'COURT_FEE';
      if (selectedType === 'ADVANCE') return tx.type === 'ADVANCE';
      return tx.type === selectedType || tx.subType === selectedType;
    });
  }

  if (query) {
    list = list.filter(tx => 
      (tx.targetName && tx.targetName.toLowerCase().includes(query)) ||
      (tx.description && tx.description.toLowerCase().includes(query)) ||
      (tx.categoryName && tx.categoryName.toLowerCase().includes(query)) ||
      (tx.cancelReason && tx.cancelReason.toLowerCase().includes(query)) ||
      (tx.cancelledBy && tx.cancelledBy.toLowerCase().includes(query)) ||
      (tx.id && tx.id.toLowerCase().includes(query)) ||
      (tx.date && tx.date.includes(query))
    );
  }

  if (list.length === 0) {
    const emptyMsg = isMemberRoleTx 
      ? 'Chưa có lịch sử giao dịch ví của bạn'
      : (selectedType === 'CANCELLED' ? 'Không có khoản thu chi nào bị hủy bỏ' : 'Chưa có giao dịch phù hợp điều kiện lọc');
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 italic">${emptyMsg}</td></tr>`;
    return;
  }

  const canCancelTx = canPerformFinance();

  tbody.innerHTML = list.map(tx => {
    let typeBadge = '';
    const st = tx.subType || tx.type;
    const isCancelled = !!(tx.isCancelled || tx.status === 'CANCELLED');

    switch (st) {
      case 'MEM_FUND':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-[10px]">📅 Quỹ TV (A.1)</span>`;
        break;
      case 'FINE':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[10px]">⚡ Phạt (A.2)</span>`;
        break;
      case 'PRIZE':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-300 text-[10px]">🏆 Giải thưởng (A.3)</span>`;
        break;
      case 'SPONSOR':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-300 text-[10px]">🤝 Tài trợ (A.4)</span>`;
        break;
      case 'OTHER_IN':
      case 'FUND_IN':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold border border-teal-300 text-[10px]">📥 Thu khác (A.5)</span>`;
        break;
      case 'EXP_PARTY':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[10px]">🍻 Liên hoan (B.1.1)</span>`;
        break;
      case 'EXP_EXCHANGE':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold border border-orange-300 text-[10px]">🏸 Giao lưu (B.1.2)</span>`;
        break;
      case 'EXP_GENERAL_OTHER':
      case 'FUND_OUT':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-300 text-[10px]">📦 Chi HĐ khác (B.1.3)</span>`;
        break;
      case 'EXP_HY':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 font-bold border border-pink-300 text-[10px]">💐 Chi Hỷ (B.2.2)</span>`;
        break;
      case 'EXP_HIEU':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-slate-200 text-slate-900 font-bold border border-slate-400 text-[10px]">🖤 Chi Hiếu (B.2.1)</span>`;
        break;
      case 'EXP_OM':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-[10px]">🩺 Chi Thăm ốm (B.2.3)</span>`;
        break;
      case 'EXP_MEMBER_OTHER':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-bold border border-pink-200 text-[10px]">🎁 Chi TV khác (B.2.4)</span>`;
        break;
      case 'TOPUP':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">💳 Nạp ví TV</span>`;
        break;
      case 'COURT_FEE':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px]">🏸 Tiền sân & cầu</span>`;
        break;
      case 'SHUTTLE_ADV_IN':
      case 'ADVANCE_SHUTTLE_IN':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-[10px]">🏸 Tạm ứng cầu (Thu)</span>`;
        break;
      case 'SHUTTLE_EXP_PAY':
      case 'ADVANCE_SHUTTLE_OUT':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[10px]">🏸 Chi trả tiền cầu</span>`;
        break;
      case 'COURT_ADV_IN':
      case 'ADVANCE_COURT_IN':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-300 text-[10px]">🏟️ Tạm ứng sân (Thu)</span>`;
        break;
      case 'COURT_EXP_PAY':
      case 'ADVANCE_COURT_OUT':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[10px]">🏟️ Chi trả tiền sân</span>`;
        break;
      case 'GUEST_ADV_IN':
      case 'ADVANCE_GUEST_IN':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[10px]">🎟️ Thu khách (Hạng)</span>`;
        break;
      case 'SETTLEMENT':
      case 'WALLET_SETTLEMENT':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-300 text-[10px]">💰 Tất toán dư nợ</span>`;
        break;
      case 'ADVANCE':
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px]">💼 Quỹ tạm ứng</span>`;
        break;
      default:
        typeBadge = `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px]">${tx.categoryName || 'Giao dịch'}</span>`;
    }

    if (isCancelled) {
      typeBadge += ` <span class="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black border border-rose-300 text-[10px] ml-1">❌ Đã hủy</span>`;
    }

    // Tác động Ví thành viên
    let walletImpactHtml = `<span class="text-slate-300 font-medium">—</span>`;
    if (tx.walletImpact !== undefined && tx.walletImpact !== 0) {
      if (tx.walletImpact < 0) {
        walletImpactHtml = `<b class="text-rose-600 font-black text-xs">−${formatMoney(Math.abs(tx.walletImpact))}</b>`;
      } else {
        walletImpactHtml = `<b class="text-emerald-600 font-black text-xs">+${formatMoney(tx.walletImpact)}</b>`;
      }
    } else if (tx.type === 'TOPUP') {
      walletImpactHtml = `<b class="text-emerald-600 font-black text-xs">+${formatMoney(Math.abs(tx.amount))}</b>`;
    } else if (tx.type === 'COURT_FEE') {
      walletImpactHtml = `<b class="text-rose-600 font-black text-xs">−${formatMoney(Math.abs(tx.amount))}</b>`;
    }

    if (isCancelled && walletImpactHtml !== `<span class="text-slate-300 font-medium">—</span>`) {
      walletImpactHtml = `<s class="line-through text-slate-400 opacity-70">${walletImpactHtml}</s>`;
    }

    // Tác động Quỹ CLB
    let fundImpactHtml = `<span class="text-slate-300 font-medium">—</span>`;
    if (tx.fundImpact !== undefined && tx.fundImpact !== 0) {
      if (tx.fundImpact > 0) {
        fundImpactHtml = `<b class="text-emerald-700 font-black text-xs">+${formatMoney(tx.fundImpact)}</b>`;
      } else {
        fundImpactHtml = `<b class="text-rose-600 font-black text-xs">−${formatMoney(Math.abs(tx.fundImpact))}</b>`;
      }
    } else if (tx.subType === 'MEM_FUND' || tx.subType === 'FINE' || tx.subType === 'PRIZE' || tx.subType === 'SPONSOR' || tx.subType === 'OTHER_IN' || tx.type === 'FUND_IN') {
      fundImpactHtml = `<b class="text-emerald-700 font-black text-xs">+${formatMoney(Math.abs(tx.amount))}</b>`;
    } else if (tx.subType === 'EXP_PARTY' || tx.subType === 'EXP_EXCHANGE' || tx.subType === 'EXP_GENERAL_OTHER' || tx.subType === 'EXP_HY' || tx.subType === 'EXP_HIEU' || tx.subType === 'EXP_OM' || tx.subType === 'EXP_MEMBER_OTHER' || tx.type === 'FUND_OUT') {
      fundImpactHtml = `<b class="text-rose-600 font-black text-xs">−${formatMoney(Math.abs(tx.amount))}</b>`;
    }

    if (isCancelled && fundImpactHtml !== `<span class="text-slate-300 font-medium">—</span>`) {
      fundImpactHtml = `<s class="line-through text-slate-400 opacity-70">${fundImpactHtml}</s>`;
    }

    // Hiển thị ghi chú lý do hủy nếu có
    const cancelAuditNote = isCancelled && tx.cancelReason
      ? `<div class="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1"><span>⚠️ Lý do hủy:</span> <span class="italic font-normal">${tx.cancelReason}</span> ${tx.cancelledBy ? `<span class="text-slate-400">(${tx.cancelledBy})</span>` : ''}</div>`
      : '';

    // Cột thao tác
    let actionColHtml = '';
    if (isCancelled) {
      actionColHtml = `
        <div class="flex items-center justify-center gap-1">
          <button type="button" onclick="showCancelAuditDetails('${tx.id}')" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] border border-slate-300 transition cursor-pointer flex items-center gap-0.5" title="Xem lý do hủy và thông tin kiểm toán">
            <span>ℹ️</span> <span>Chi tiết</span>
          </button>
          ${canCancelTx ? `
            <button type="button" onclick="restoreCancelledTransaction('${tx.id}')" class="px-1.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300 transition cursor-pointer" title="Khôi phục lại giao dịch này">
              ↺
            </button>
          ` : ''}
        </div>
      `;
    } else {
      actionColHtml = `
        ${canCancelTx ? `
          <button type="button" onclick="openCancelTransactionModal('${tx.id}')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 font-bold text-[10px] border border-rose-200 hover:border-rose-300 transition cursor-pointer flex items-center gap-1 mx-auto" title="Hủy / xóa giao dịch thu sai, thu thừa">
            <span>🗑️</span> <span>Hủy</span>
          </button>
        ` : `<span class="text-slate-300 font-medium">—</span>`}
      `;
    }

    const rowClass = isCancelled 
      ? 'bg-rose-50/20 hover:bg-rose-50/40 text-slate-500 opacity-75 transition' 
      : 'hover:bg-slate-50 transition';

    return `
      <tr class="${rowClass}">
        <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">${tx.date}</td>
        <td class="py-2.5 px-2 whitespace-nowrap">${typeBadge}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-slate-900 text-xs">${tx.targetName || 'Giao dịch CLB'}</div>
          <div class="text-[11px] text-slate-500 line-clamp-1">${tx.description || ''}</div>
          ${cancelAuditNote}
        </td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap">
          ${walletImpactHtml}
        </td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          ${fundImpactHtml}
        </td>
        <td class="py-2.5 px-3 text-slate-500 font-medium text-[11px] whitespace-nowrap">${tx.operator || 'admin'}</td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          ${actionColHtml}
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// A.1 THU QUỸ THÀNH VIÊN THEO THÁNG (NHIỀU THÀNH VIÊN)
// ==========================================
function openMonthlyFundModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để thu Quỹ CLB từ các thành viên!', 'warning');
    openLoginModal();
    return;
  }

  const monthInput = document.getElementById('monthlyFundMonth');
  if (monthInput) {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthInput.value = ym;
  }

  const amtInput = document.getElementById('monthlyFundAmount');
  if (amtInput) amtInput.value = (AppState.config?.monthlyClubFund !== undefined && AppState.config?.monthlyClubFund !== null) ? AppState.config.monthlyClubFund : 50000;

  renderMonthlyFundMemberList();
  updateMonthlyFundSummary();
  openModal('monthlyFundModal');
}

/**
 * Kiểm tra xem một thành viên đã nộp Quỹ CLB cho tháng chỉ định hay chưa (bỏ qua giao dịch đã bị hủy)
 * @param {string} memberId
 * @param {string} monthVal - 'YYYY-MM' (VD: '2026-10')
 * @returns {object|null} Giao dịch đã nộp nếu có
 */
function getMemberMonthlyFundPaymentTx(memberId, monthVal) {
  if (!memberId || !monthVal) return null;
  const [y, m] = monthVal.split('-');
  const mNum = parseInt(m, 10);
  const yNum = parseInt(y, 10);
  const monthSlash = `${String(mNum).padStart(2, '0')}/${yNum}`;
  const monthSlashShort = `${mNum}/${yNum}`;

  const member = (AppState.members || []).find(x => x.id === memberId);
  const memberName = (member?.name || '').trim().toLowerCase();

  return (AppState.transactions || []).find(tx => {
    if (tx.isCancelled || tx.status === 'CANCELLED') return false;
    if (tx.subType !== 'MEM_FUND') return false;

    // Khớp danh tính thành viên
    const isTarget = (tx.memberId && tx.memberId === memberId) ||
      (tx.targetName && memberName && (tx.targetName.trim().toLowerCase() === memberName || tx.targetName.toLowerCase().includes(memberName) || memberName.includes(tx.targetName.toLowerCase())));
    if (!isTarget) return false;

    // 1. Kiểm tra trường month trực tiếp
    if (tx.month === monthVal) return true;

    // 2. Kiểm tra chuỗi description (VD: 'Thu Quỹ thành viên Tháng 10/2026')
    const desc = (tx.description || '').toLowerCase();
    if (desc.includes(monthSlash.toLowerCase()) || desc.includes(monthSlashShort.toLowerCase())) return true;
    if (desc.includes(`tháng ${mNum}/${yNum}`) || desc.includes(`tháng ${String(mNum).padStart(2, '0')}/${yNum}`)) return true;

    // 3. Nếu ngày giao dịch nằm trong tháng đó và không chỉ định tháng khác
    if (tx.date) {
      if (tx.date.startsWith(`${yNum}-${String(mNum).padStart(2, '0')}`)) {
        return true;
      }
      if (tx.date.includes('/')) {
        const parts = tx.date.split(' ')[0].split('/');
        if (parts.length === 3 && parts[1] === String(mNum).padStart(2, '0') && parts[2] === String(yNum)) {
          return true;
        }
      }
    }

    return false;
  });
}

function isMemberMonthlyFundPaid(memberId, monthVal) {
  return !!getMemberMonthlyFundPaymentTx(memberId, monthVal);
}

function renderMonthlyFundMemberList() {
  const container = document.getElementById('monthlyFundMemberList');
  if (!container) return;

  const monthInput = document.getElementById('monthlyFundMonth');
  const monthVal = monthInput ? monthInput.value : '';

  // CHỈ ÁP DỤNG CHO THÀNH VIÊN CHÍNH THỨC
  const officialMembers = (AppState.members || []).filter(m => m.type === 'OFFICIAL');

  container.innerHTML = officialMembers.map(m => {
    const bal = m.balance || 0;
    const isNeg = bal < 0;
    const paidTx = getMemberMonthlyFundPaymentTx(m.id, monthVal);

    if (paidTx) {
      const paidDate = paidTx.date ? paidTx.date.split(' ')[0] : '';
      return `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-500 opacity-80" title="Thành viên này đã đóng Quỹ ${monthVal} vào ngày ${paidDate}">
          <div class="flex items-center gap-1.5 min-w-0">
            <input type="checkbox" name="monthlyFundMemberCheckbox" value="${m.id}" disabled class="rounded text-slate-400 focus:ring-0 w-3.5 h-3.5 cursor-not-allowed opacity-50" />
            <span class="font-bold text-slate-700 text-[11px] truncate">${m.name}</span>
          </div>
          <span class="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full shrink-0 ml-1">
            ✓ Đã thu
          </span>
        </div>
      `;
    }

    return `
      <label class="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
        <div class="flex items-center gap-1.5 min-w-0">
          <input type="checkbox" name="monthlyFundMemberCheckbox" value="${m.id}" checked onchange="updateMonthlyFundSummary()" class="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
          <span class="font-bold text-slate-800 text-[11px] truncate">${m.name}</span>
        </div>
        <span class="text-[10px] font-semibold shrink-0 ml-1 ${isNeg ? 'text-rose-600' : 'text-slate-400'}">
          ${formatMoney(bal)}
        </span>
      </label>
    `;
  }).join('');

  updateMonthlyFundSummary();
}

function toggleAllMonthlyFundMembers(selectAll) {
  const checkboxes = document.querySelectorAll('input[name="monthlyFundMemberCheckbox"]:not(:disabled)');
  checkboxes.forEach(cb => cb.checked = selectAll);
  updateMonthlyFundSummary();
}

function setMonthlyFundAmountQuick(val) {
  const input = document.getElementById('monthlyFundAmount');
  if (input) {
    input.value = val;
    updateMonthlyFundSummary();
  }
}

function updateMonthlyFundSummary() {
  const checkboxes = document.querySelectorAll('input[name="monthlyFundMemberCheckbox"]:checked');
  const count = checkboxes.length;
  const officialTotal = (AppState.members || []).filter(m => m.type === 'OFFICIAL').length;
  const monthInput = document.getElementById('monthlyFundMonth');
  const monthVal = monthInput ? monthInput.value : '';
  const paidCount = (AppState.members || []).filter(m => m.type === 'OFFICIAL' && isMemberMonthlyFundPaid(m.id, monthVal)).length;

  const countBadge = document.getElementById('monthlyFundSelectedCount');
  if (countBadge) {
    if (paidCount > 0) {
      countBadge.textContent = `${count}/${officialTotal - paidCount} chưa thu (${paidCount} đã nộp)`;
    } else {
      countBadge.textContent = `${count}/${officialTotal}`;
    }
  }

  const amtInput = document.getElementById('monthlyFundAmount');
  const eachAmt = Math.max(0, Number(amtInput?.value) || 0);
  const totalAmt = count * eachAmt;

  const totalEl = document.getElementById('monthlyFundTotalEst');
  if (totalEl) totalEl.textContent = formatMoney(totalAmt);

  const eachEl = document.getElementById('monthlyFundEachEst');
  if (eachEl) eachEl.textContent = formatMoney(eachAmt);

  const plusEl = document.getElementById('monthlyFundPlusFundEst');
  if (plusEl) plusEl.textContent = formatMoney(totalAmt);
}

function handleMonthlyFundSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thu Quỹ CLB! Vui lòng đăng nhập tài khoản Quản lý hoặc Thủ quỹ.', 'error');
    openLoginModal();
    return;
  }
  const monthVal = document.getElementById('monthlyFundMonth').value;
  const amount = Number(document.getElementById('monthlyFundAmount').value);
  const checkboxes = document.querySelectorAll('input[name="monthlyFundMemberCheckbox"]:checked');

  if (!monthVal) {
    showToast('Vui lòng chọn tháng áp dụng thu quỹ!', 'warning');
    return;
  }
  if (amount <= 0) {
    showToast('Mức thu phải lớn hơn 0đ!', 'warning');
    return;
  }
  if (checkboxes.length === 0) {
    showToast('Vui lòng tích chọn ít nhất 1 thành viên chính thức cần thu!', 'warning');
    return;
  }

  const [y, m] = monthVal.split('-');
  const monthFormatted = `Tháng ${m}/${y}`;
  const nowStr = getNowTimestampString();
  const operator = getFinanceOperatorName();

  // QUY TẮC CỐT LÕI: QUỸ CLB CHỈ ĐƯỢC THU 1 LẦN TRÊN THÁNG CHO MỖI THÀNH VIÊN
  const duplicateMembers = [];
  checkboxes.forEach(cb => {
    const memId = cb.value;
    if (isMemberMonthlyFundPaid(memId, monthVal)) {
      const mem = (AppState.members || []).find(x => x.id === memId);
      duplicateMembers.push(mem ? mem.name : memId);
    }
  });

  if (duplicateMembers.length > 0) {
    showToast(`⚠️ Không thể thu! Các thành viên sau đã đóng Quỹ ${monthFormatted}: ${duplicateMembers.join(', ')}. Mỗi người chỉ được thu 1 lần/tháng.`, 'error', 7000);
    renderMonthlyFundMemberList();
    return;
  }

  let totalCollected = 0;
  const memberNames = [];

  checkboxes.forEach(cb => {
    const memberId = cb.value;
    const member = (AppState.members || []).find(x => x.id === memberId);
    if (!member) return;

    totalCollected += amount;
    memberNames.push(member.name);

    // Ghi nhận giao dịch trừ ví cho từng thành viên (gán rõ tx.month và status)
    AppState.transactions.push({
      id: 'TX_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: nowStr,
      month: monthVal,
      categoryGroup: 'INCOME_A',
      subType: 'MEM_FUND',
      categoryName: 'Quỹ thành viên',
      amount: amount,
      targetName: member.name,
      memberId: member.id,
      walletImpact: -amount, // Trừ ví thành viên
      fundImpact: amount,    // Cộng Quỹ CLB
      description: `Thu Quỹ thành viên ${monthFormatted} (Trừ ví)`,
      operator: operator,
      status: 'ACTIVE'
    });
  });

  // Tự động tính toán lại số dư Ví thành viên và Quỹ CLB
  refreshAllMembersWalletBreakdown();
  calculateClubFundStats();
  calculateAdvanceFundStats();
  saveData();

  closeModal('monthlyFundModal');
  renderDashboard();
  renderFinanceTab();
  renderFullTransactionTable();
  renderMemberManagementList();
  showToast(`✓ Đã thu thành công ${formatMoney(totalCollected)} Quỹ ${monthFormatted} từ ${checkboxes.length} thành viên!`, 'success');
}

// ==========================================
// QUẢN LÝ HỦY / XÓA GIAO DỊCH THU CHI SAI (LƯU VẾT KIỂM TOÁN)
// ==========================================
function openCancelTransactionModal(txId) {
  if (!canPerformFinance()) {
    showToast('⚠️ Chỉ Quản lý hoặc Ban tài chính mới có quyền hủy / xóa giao dịch!', 'error');
    openLoginModal();
    return;
  }

  const tx = (AppState.transactions || []).find(t => t.id === txId);
  if (!tx) {
    showToast('Không tìm thấy thông tin giao dịch!', 'error');
    return;
  }

  if (tx.isCancelled || tx.status === 'CANCELLED') {
    showCancelAuditDetails(txId);
    return;
  }

  const idInp = document.getElementById('cancelTxId');
  if (idInp) idInp.value = tx.id;

  const codeEl = document.getElementById('cancelTxCodeBadge');
  if (codeEl) codeEl.textContent = tx.id;

  const nameEl = document.getElementById('cancelTxTargetName');
  if (nameEl) nameEl.textContent = tx.targetName || 'CLB';

  const dateEl = document.getElementById('cancelTxDate');
  if (dateEl) dateEl.textContent = tx.date || '';

  const descEl = document.getElementById('cancelTxDesc');
  if (descEl) descEl.textContent = `${tx.categoryName || tx.subType || 'Giao dịch'} — ${tx.description || ''}`;

  const wEl = document.getElementById('cancelTxWalletImpact');
  if (wEl) {
    if (tx.walletImpact !== undefined && tx.walletImpact !== 0) {
      wEl.textContent = (tx.walletImpact < 0 ? '-' : '+') + formatMoney(Math.abs(tx.walletImpact));
      wEl.className = tx.walletImpact < 0 ? 'text-xs font-black text-rose-700' : 'text-xs font-black text-emerald-700';
    } else {
      wEl.textContent = '0 đ (Không ảnh hưởng)';
      wEl.className = 'text-xs font-bold text-slate-500';
    }
  }

  const fEl = document.getElementById('cancelTxFundImpact');
  if (fEl) {
    if (tx.fundImpact !== undefined && tx.fundImpact !== 0) {
      fEl.textContent = (tx.fundImpact > 0 ? '+' : '-') + formatMoney(Math.abs(tx.fundImpact));
      fEl.className = tx.fundImpact > 0 ? 'text-xs font-black text-emerald-700' : 'text-xs font-black text-rose-700';
    } else if (tx.amount) {
      fEl.textContent = formatMoney(tx.amount);
      fEl.className = 'text-xs font-black text-slate-800';
    } else {
      fEl.textContent = '0 đ';
      fEl.className = 'text-xs font-bold text-slate-500';
    }
  }

  const opEl = document.getElementById('cancelTxOperator');
  if (opEl) opEl.textContent = getFinanceOperatorName();

  const nowEl = document.getElementById('cancelTxTimeNow');
  if (nowEl) nowEl.textContent = getNowTimestampString();

  const reasonInp = document.getElementById('cancelTxReason');
  if (reasonInp) {
    reasonInp.value = '';
    // Gợi ý thông minh nếu là giao dịch Quỹ thành viên
    if (tx.subType === 'MEM_FUND') {
      reasonInp.value = 'Quỹ CLB tháng bị thu trùng 2 lần, hủy bỏ khoản thu thừa';
    }
  }

  openModal('modalCancelTransaction');
}

function setCancelReasonQuick(text) {
  const reasonInp = document.getElementById('cancelTxReason');
  if (reasonInp) {
    reasonInp.value = text;
    reasonInp.focus();
  }
}

function handleConfirmCancelTransaction(e) {
  if (e) e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thực hiện hủy giao dịch!', 'error');
    return;
  }

  const txId = document.getElementById('cancelTxId')?.value;
  const reason = document.getElementById('cancelTxReason')?.value.trim();

  if (!txId) {
    showToast('Lỗi: Thiếu mã giao dịch cần hủy!', 'error');
    return;
  }
  if (!reason) {
    showToast('⚠️ Vui lòng nhập lý do hủy / xóa giao dịch để lưu vết kiểm toán!', 'warning');
    return;
  }

  const tx = (AppState.transactions || []).find(t => t.id === txId);
  if (!tx) {
    showToast('Không tìm thấy giao dịch này trong hệ thống!', 'error');
    return;
  }

  const operator = getFinanceOperatorName();
  const nowStr = getNowTimestampString();

  // Đánh dấu hủy giao dịch và lưu vết kiểm toán đầy đủ
  tx.isCancelled = true;
  tx.status = 'CANCELLED';
  tx.cancelReason = reason;
  tx.cancelledBy = operator;
  tx.cancelledAt = nowStr;

  // Tính toán lại toàn bộ ví thành viên và Quỹ CLB tự động
  refreshAllMembersWalletBreakdown();
  calculateClubFundStats();
  calculateAdvanceFundStats();
  saveData();

  closeModal('modalCancelTransaction');
  renderDashboard();
  renderFinanceTab();
  renderFullTransactionTable();
  renderMemberManagementList();

  showToast(`✓ Đã hủy giao dịch ${tx.id}! Số dư ví thành viên và Quỹ CLB đã được tự động hoàn trả chuẩn xác.`, 'success', 5000);
}

function showCancelAuditDetails(txId) {
  const tx = (AppState.transactions || []).find(t => t.id === txId);
  if (!tx) return;

  const modal = document.getElementById('modalCancelAuditDetails');
  if (!modal) return;

  const idEl = document.getElementById('auditTxId');
  if (idEl) idEl.textContent = tx.id;

  const descEl = document.getElementById('auditTxDesc');
  if (descEl) descEl.textContent = `${tx.categoryName || tx.subType || 'Giao dịch'} — ${tx.description || ''} (${tx.targetName || 'CLB'})`;

  const wEl = document.getElementById('auditTxWallet');
  if (wEl) {
    wEl.textContent = tx.walletImpact !== undefined && tx.walletImpact !== 0 ? formatMoney(tx.walletImpact) : '—';
  }

  const fEl = document.getElementById('auditTxFund');
  if (fEl) {
    fEl.textContent = tx.fundImpact !== undefined && tx.fundImpact !== 0 ? formatMoney(tx.fundImpact) : formatMoney(tx.amount || 0);
  }

  const rEl = document.getElementById('auditCancelReason');
  if (rEl) rEl.textContent = tx.cancelReason || 'Thu sai/thu thừa, đã hủy bỏ';

  const byEl = document.getElementById('auditCancelledBy');
  if (byEl) byEl.textContent = tx.cancelledBy || 'Quản lý';

  const atEl = document.getElementById('auditCancelledAt');
  if (atEl) atEl.textContent = tx.cancelledAt || 'Trước đó';

  const restoreBtn = document.getElementById('btnRestoreTx');
  if (restoreBtn) {
    const canRestore = canPerformFinance();
    if (canRestore) {
      restoreBtn.classList.remove('hidden');
      restoreBtn.onclick = () => {
        closeModal('modalCancelAuditDetails');
        restoreCancelledTransaction(tx.id);
      };
    } else {
      restoreBtn.classList.add('hidden');
    }
  }

  openModal('modalCancelAuditDetails');
}

function restoreCancelledTransaction(txId) {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền khôi phục giao dịch!', 'error');
    return;
  }

  const tx = (AppState.transactions || []).find(t => t.id === txId);
  if (!tx) return;

  if (!confirm(`Bạn có chắc chắn muốn KHÔI PHỤC lại giao dịch [${tx.id}]?\n\nNội dung: ${tx.description || tx.categoryName}\nSố tiền sẽ được tính toán trở lại vào Sổ Quỹ và Ví thành viên.`)) {
    return;
  }

  tx.isCancelled = false;
  tx.status = 'ACTIVE';
  tx.lastRestoredAt = getNowTimestampString();
  tx.restoredBy = getFinanceOperatorName();

  refreshAllMembersWalletBreakdown();
  calculateClubFundStats();
  calculateAdvanceFundStats();
  saveData();

  renderDashboard();
  renderFinanceTab();
  renderFullTransactionTable();
  renderMemberManagementList();

  showToast(`↺ Đã khôi phục lại giao dịch ${tx.id}! Số liệu tài chính đã được cập nhật lại.`, 'success');
}

// ==========================================
// A.2 DANH SÁCH PHẠT NHANH THEO NGÀY
// ==========================================
let quickFineRowCounter = 0;

function openQuickFineModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản có quyền Quản lý hoặc Ban điều hành để xử phạt!', 'warning');
    openLoginModal();
    return;
  }

  const dateInput = document.getElementById('quickFineGlobalDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  const tbody = document.getElementById('quickFineTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    quickFineRowCounter = 0;
    // Mặc định chỉ hiển thị 1 dòng với mức phạt 10.000đ
    addQuickFineRow('', 'Đi muộn', 10000);
  }

  updateQuickFineSummary();
  openModal('quickFineModal');
}

function addQuickFineRow(preMemberId = '', preReason = 'Đi muộn', preAmount = 10000) {
  const tbody = document.getElementById('quickFineTableBody');
  if (!tbody) return;

  quickFineRowCounter++;
  const rowId = `fineRow_${quickFineRowCounter}`;

  const allMembers = (AppState.members || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

  const memberOptions = allMembers.map(m => `
    <option value="${m.id}" ${m.id === preMemberId ? 'selected' : ''}>
      ${m.name} (${getMemberRoleTypeText(m.type)})
    </option>
  `).join('');

  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.className = 'hover:bg-amber-50/40 transition border-b border-slate-100 last:border-b-0';
  tr.innerHTML = `
    <td class="py-1.5 px-2">
      <select class="quick-fine-member w-full text-xs font-semibold border border-slate-200 rounded-lg p-1.5 bg-white focus:ring-1 focus:ring-amber-500">
        <option value="">-- Chọn thành viên --</option>
        ${memberOptions}
      </select>
    </td>
    <td class="py-1.5 px-2">
      <input type="text" value="${preReason}" placeholder="Đi muộn, vắng k phép..." class="quick-fine-reason w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-amber-500" list="fineCommonReasons" />
    </td>
    <td class="py-1.5 px-2">
      <input type="number" value="${preAmount}" min="1000" step="5000" oninput="updateQuickFineSummary()" class="quick-fine-amount w-full text-xs font-black text-amber-900 border border-slate-200 rounded-lg p-1.5 text-right focus:ring-1 focus:ring-amber-500" />
    </td>
    <td class="py-1.5 px-1 text-center">
      <button type="button" onclick="removeQuickFineRow('${rowId}')" class="text-slate-400 hover:text-rose-600 font-black p-1 text-xs rounded hover:bg-rose-50 transition cursor-pointer" title="Xóa dòng này">✕</button>
    </td>
  `;

  tbody.appendChild(tr);
  updateQuickFineSummary();
}

function removeQuickFineRow(rowId) {
  const row = document.getElementById(rowId);
  if (row && row.parentNode) {
    row.parentNode.removeChild(row);
  }
  const remainingRows = document.querySelectorAll('#quickFineTableBody tr');
  if (remainingRows.length === 0) {
    addQuickFineRow('', 'Đi muộn', 10000);
  } else {
    updateQuickFineSummary();
  }
}

function updateQuickFineSummary() {
  const rows = document.querySelectorAll('#quickFineTableBody tr');
  const countEl = document.getElementById('quickFineRowCount');
  if (countEl) countEl.textContent = rows.length;

  let total = 0;
  document.querySelectorAll('.quick-fine-amount').forEach(inp => {
    total += Math.max(0, Number(inp.value) || 0);
  });

  const totalEl = document.getElementById('quickFineTotalAmount');
  if (totalEl) totalEl.textContent = formatMoney(total);
}

function handleQuickFineSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền xử phạt vi phạm! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const dateVal = document.getElementById('quickFineGlobalDate').value || getTodayInputFormat();
  const [y, m, d] = dateVal.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const operator = getFinanceOperatorName();

  const rows = document.querySelectorAll('#quickFineTableBody tr');
  if (rows.length === 0) {
    showToast('Chưa có dòng phạt nào trong danh sách!', 'warning');
    return;
  }

  const finesToApply = [];

  for (const row of rows) {
    const memberSelect = row.querySelector('.quick-fine-member');
    const reasonInput = row.querySelector('.quick-fine-reason');
    const amountInput = row.querySelector('.quick-fine-amount');

    const memberId = memberSelect ? memberSelect.value : '';
    const reason = reasonInput ? reasonInput.value.trim() : '';
    const amount = amountInput ? Number(amountInput.value) : 0;

    if (!memberId) {
      showToast('Vui lòng chọn thành viên ở tất cả các dòng phạt!', 'warning');
      return;
    }
    if (!reason) {
      showToast('Vui lòng nhập nội dung/lý do phạt!', 'warning');
      return;
    }
    if (amount <= 0) {
      showToast('Số tiền phạt phải lớn hơn 0đ!', 'warning');
      return;
    }

    const member = AppState.members.find(x => x.id === memberId);
    if (member) {
      finesToApply.push({ member, reason, amount });
    }
  }

  let totalFineApplied = 0;

  finesToApply.forEach(item => {
    // Xác nhận → trừ trực tiếp vào Ví thành viên
    item.member.balance = (item.member.balance || 0) - item.amount;
    totalFineApplied += item.amount;

    AppState.transactions.push({
      id: 'TX_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      categoryGroup: 'INCOME_A',
      subType: 'FINE',
      categoryName: 'Phạt vi phạm',
      amount: item.amount,
      targetName: item.member.name,
      memberId: item.member.id,
      walletImpact: -item.amount, // Trừ ví thành viên
      fundImpact: item.amount,    // Cộng Quỹ CLB
      description: `Phạt vi phạm ngày ${dateFormatted}: ${item.reason}`,
      operator: operator
    });
  });

  saveData();
  closeModal('quickFineModal');
  renderDashboard();
  renderFinanceTab();
  if (typeof renderMembersTab === 'function') renderMembersTab();
  if (typeof renderSettlementReport === 'function') renderSettlementReport();
  showToast(`⚡ Đã xử phạt ${finesToApply.length} thành viên, trừ ví thành công và nộp cộng dồn +${formatMoney(totalFineApplied)} vào Quỹ CLB!`, 'success');
}

// ==========================================
// A.3 THU GIẢI THƯỞNG CLB
// ==========================================
function openPrizeIncomeModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để ghi nhận giải thưởng!', 'warning');
    openLoginModal();
    return;
  }

  const dateInput = document.getElementById('prizeDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  const tInput = document.getElementById('prizeTournamentName');
  if (tInput) tInput.value = '';

  const amtInput = document.getElementById('prizeAmount');
  if (amtInput) amtInput.value = '';

  openModal('prizeIncomeModal');
}

function handlePrizeIncomeSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const name = document.getElementById('prizeTournamentName').value.trim();
  const amount = Number(document.getElementById('prizeAmount').value);
  const dateVal = document.getElementById('prizeDate').value || getTodayInputFormat();
  const rank = document.getElementById('prizeRank').value.trim();
  const note = document.getElementById('prizeNote').value.trim();

  if (!name || amount <= 0) {
    showToast('Vui lòng nhập tên giải đấu và số tiền thưởng hợp lệ!', 'warning');
    return;
  }

  const [y, m, d] = dateVal.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const operator = getFinanceOperatorName();

  const desc = `${rank ? `[${rank}] ` : ''}${name}${note ? ` (${note})` : ''}`;

  // Cộng vào Quỹ CLB, không trừ Ví TV
  AppState.transactions.push({
    id: 'TX_' + Date.now(),
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'INCOME_A',
    subType: 'PRIZE',
    categoryName: 'Giải thưởng CLB',
    amount: amount,
    targetName: name,
    walletImpact: 0,        // Không tác động ví
    fundImpact: amount,     // Cộng Quỹ CLB
    description: `Tiền giải thưởng: ${desc}`,
    operator: operator
  });

  saveData();
  closeModal('prizeIncomeModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`🏆 Đã ghi nhận +${formatMoney(amount)} tiền giải thưởng vào Quỹ CLB!`, 'success');
}

// ==========================================
// A.4 THU TÀI TRỢ
// ==========================================
function openSponsorIncomeModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để ghi nhận tài trợ!', 'warning');
    openLoginModal();
    return;
  }

  const dateInput = document.getElementById('sponsorDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  const nameInput = document.getElementById('sponsorName');
  if (nameInput) nameInput.value = '';

  const amtInput = document.getElementById('sponsorAmount');
  if (amtInput) amtInput.value = '';

  openModal('sponsorIncomeModal');
}

function handleSponsorIncomeSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const name = document.getElementById('sponsorName').value.trim();
  const amount = Number(document.getElementById('sponsorAmount').value);
  const dateVal = document.getElementById('sponsorDate').value || getTodayInputFormat();
  const content = document.getElementById('sponsorContent').value.trim();

  if (!name || amount <= 0) {
    showToast('Vui lòng nhập tên người/đơn vị tài trợ và số tiền hợp lệ!', 'warning');
    return;
  }

  const [y, m, d] = dateVal.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const operator = getFinanceOperatorName();

  // Cộng vào Quỹ CLB, không trừ Ví TV
  AppState.transactions.push({
    id: 'TX_' + Date.now(),
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'INCOME_A',
    subType: 'SPONSOR',
    categoryName: 'Tài trợ',
    amount: amount,
    targetName: name,
    walletImpact: 0,        // Không tác động ví
    fundImpact: amount,     // Cộng Quỹ CLB
    description: `Tài trợ từ ${name}: ${content || 'Ủng hộ hoạt động CLB'}`,
    operator: operator
  });

  saveData();
  closeModal('sponsorIncomeModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`🤝 Đã ghi nhận +${formatMoney(amount)} tài trợ từ ${name} vào Quỹ CLB!`, 'success');
}

// ==========================================
// A.5 KHOẢN THU KHÁC
// ==========================================
function openOtherIncomeModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để ghi nhận khoản thu!', 'warning');
    openLoginModal();
    return;
  }

  const dateInput = document.getElementById('otherIncomeDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  const contentInput = document.getElementById('otherIncomeContent');
  if (contentInput) contentInput.value = '';

  const amtInput = document.getElementById('otherIncomeAmount');
  if (amtInput) amtInput.value = '';

  openModal('otherIncomeModal');
}

function handleOtherIncomeSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const content = document.getElementById('otherIncomeContent').value.trim();
  const amount = Number(document.getElementById('otherIncomeAmount').value);
  const dateVal = document.getElementById('otherIncomeDate').value || getTodayInputFormat();
  const party = document.getElementById('otherIncomeParty').value.trim() || 'CLB';

  if (!content || amount <= 0) {
    showToast('Vui lòng nhập nội dung và số tiền thu khác hợp lệ!', 'warning');
    return;
  }

  const [y, m, d] = dateVal.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const operator = getFinanceOperatorName();

  // Cộng vào Quỹ CLB, không trừ Ví TV
  AppState.transactions.push({
    id: 'TX_' + Date.now(),
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'INCOME_A',
    subType: 'OTHER_IN',
    categoryName: 'Thu khác',
    amount: amount,
    targetName: party,
    walletImpact: 0,        // Không tác động ví
    fundImpact: amount,     // Cộng Quỹ CLB
    description: `Thu khác: ${content} (Liên quan: ${party})`,
    operator: operator
  });

  saveData();
  closeModal('otherIncomeModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`📥 Đã ghi nhận +${formatMoney(amount)} khoản thu khác vào Quỹ CLB!`, 'success');
}

// ==========================================
// B.1 CHI HOẠT ĐỘNG CHUNG CLB (LIÊN HOAN / GIAO LƯU / KHÁC)
// ==========================================
function openGeneralExpenseModal(defaultCat = 'EXP_PARTY') {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để ghi nhận khoản chi!', 'warning');
    openLoginModal();
    return;
  }

  const dateInput = document.getElementById('generalExpenseDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  const radio = document.querySelector(`input[name="generalExpenseCategory"][value="${defaultCat}"]`);
  if (radio) radio.checked = true;

  const amtInput = document.getElementById('generalExpenseAmount');
  if (amtInput) amtInput.value = '';

  const contentInput = document.getElementById('generalExpenseContent');
  if (contentInput) contentInput.value = '';

  openModal('generalExpenseModal');
}

function handleGeneralExpenseSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const cat = document.querySelector('input[name="generalExpenseCategory"]:checked').value;
  const amount = Number(document.getElementById('generalExpenseAmount').value);
  const dateVal = document.getElementById('generalExpenseDate').value || getTodayInputFormat();
  const payer = document.getElementById('generalExpensePayer').value.trim() || 'Ban quản lý';
  const content = document.getElementById('generalExpenseContent').value.trim();

  if (!content || amount <= 0) {
    showToast('Vui lòng nhập nội dung chi và số tiền hợp lệ!', 'warning');
    return;
  }

  const [y, m, d] = dateVal.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const operator = getFinanceOperatorName();

  let catLabel = 'Chi hoạt động chung';
  if (cat === 'EXP_PARTY') catLabel = 'Liên hoan';
  else if (cat === 'EXP_EXCHANGE') catLabel = 'Giao lưu';
  else catLabel = 'Chi HĐ khác';

  // Trừ trực tiếp vào Quỹ CLB, không trừ Ví TV
  AppState.transactions.push({
    id: 'TX_' + Date.now(),
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'EXPENSE_B',
    subType: cat,
    categoryName: catLabel,
    amount: amount,
    targetName: payer,
    walletImpact: 0,        // Không tác động ví
    fundImpact: -amount,    // Trừ Quỹ CLB
    description: `Chi ${catLabel}: ${content} (Phụ trách: ${payer})`,
    operator: operator
  });

  saveData();
  closeModal('generalExpenseModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`🍻 Đã chi -${formatMoney(amount)} từ Quỹ CLB cho ${catLabel}!`, 'info');
}

// ==========================================
// B.2 CHI PHÍ CHO THÀNH VIÊN (HIẾU / HỶ / ỐM / KHÁC)
// ==========================================
function openMemberExpenseModal(preselectMemberId = null, defaultCat = 'EXP_HY') {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để chi phí cho thành viên!', 'warning');
    openLoginModal();
    return;
  }

  populateMemberExpenseSelect(preselectMemberId);

  const dateInput = document.getElementById('memberExpenseDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  const radio = document.querySelector(`input[name="memberExpenseCategory"][value="${defaultCat}"]`);
  if (radio) radio.checked = true;

  const amtInput = document.getElementById('memberExpenseAmount');
  if (amtInput) amtInput.value = 1000000;

  const noteInput = document.getElementById('memberExpenseNote');
  if (noteInput) noteInput.value = '';

  openModal('memberExpenseModal');
}

function populateMemberExpenseSelect(preselectId = null) {
  const select = document.getElementById('memberExpenseMemberSelect');
  if (!select) return;

  select.innerHTML = AppState.members.map(m => `
    <option value="${m.id}" ${m.id === preselectId ? 'selected' : ''}>
      ${m.name} (${getMemberRoleTypeText(m.type)})
    </option>
  `).join('');
}

function setMemberExpenseAmountQuick(amount) {
  const input = document.getElementById('memberExpenseAmount');
  if (input) input.value = amount;
}

function handleMemberExpenseSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const memberId = document.getElementById('memberExpenseMemberSelect').value;
  const cat = document.querySelector('input[name="memberExpenseCategory"]:checked').value;
  const amount = Number(document.getElementById('memberExpenseAmount').value);
  const dateVal = document.getElementById('memberExpenseDate').value || getTodayInputFormat();
  const rep = document.getElementById('memberExpenseRepresentative').value.trim() || 'Ban quản lý';
  const note = document.getElementById('memberExpenseNote').value.trim();

  const member = AppState.members.find(x => x.id === memberId);
  if (!member || amount <= 0) {
    showToast('Vui lòng chọn thành viên và nhập số tiền chi hợp lệ!', 'warning');
    return;
  }

  const [y, m, d] = dateVal.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const operator = getFinanceOperatorName();

  let catLabel = 'Chi cho thành viên';
  if (cat === 'EXP_HY') catLabel = 'Hỷ (Cưới hỏi, sinh nhật)';
  else if (cat === 'EXP_HIEU') catLabel = 'Hiếu (Phúng viếng)';
  else if (cat === 'EXP_OM') catLabel = 'Thăm ốm';
  else catLabel = 'Chi khác TV';

  // Trừ trực tiếp vào Quỹ CLB. KHÔNG trừ Ví thành viên!
  AppState.transactions.push({
    id: 'TX_' + Date.now(),
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'EXPENSE_B',
    subType: cat,
    categoryName: `Chi ${catLabel}`,
    amount: amount,
    targetName: member.name,
    memberId: member.id,
    walletImpact: 0,        // Không tác động ví
    fundImpact: -amount,    // Trừ Quỹ CLB
    description: `Chi cho TV: ${member.name} → ${catLabel}${note ? ` (${note})` : ''} (Đại diện: ${rep})`,
    operator: operator
  });

  saveData();
  closeModal('memberExpenseModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`💝 Đã trích -${formatMoney(amount)} từ Quỹ CLB chi cho ${member.name} (${catLabel})!`, 'info');
}

// ==========================================
// 11. NẠP TIỀN VÀO VÍ THÀNH VIÊN
// ==========================================
function populateTopUpMemberSelect(preselectId = null) {
  const select = document.getElementById('topUpMemberSelect');
  if (!select) return;

  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;

  if (isMemberRole && currentUserId) {
    const m = (AppState.members || []).find(x => x.id === currentUserId) || AppState.auth?.user;
    select.innerHTML = `
      <option value="${m.id}" selected>
        ${escapeHtml(m.name)} (${getMemberRoleTypeText(m.type)}) - Ví hiện tại: ${formatMoney(m.balance || 0)}
      </option>
    `;
    select.disabled = true;
  } else {
    select.disabled = false;
    select.innerHTML = (AppState.members || []).map(m => `
      <option value="${m.id}" ${m.id === preselectId ? 'selected' : ''}>
        ${escapeHtml(m.name)} (${getMemberRoleTypeText(m.type)}) - Ví: ${formatMoney(m.balance || 0)}
      </option>
    `).join('');
  }
}

function openTopUpModal() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('⚠️ Vui lòng đăng nhập để nạp tiền vào ví hoặc gửi yêu cầu!', 'warning');
    openLoginModal();
    return;
  }

  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;

  populateTopUpMemberSelect(isMemberRole ? currentUserId : null);

  const notice = document.getElementById('topUpMemberNotice');
  const titleText = document.getElementById('topUpModalTitleText');
  const submitBtn = document.getElementById('topUpSubmitBtn');

  if (isMemberRole) {
    if (notice) notice.classList.remove('hidden');
    if (titleText) titleText.textContent = 'Gửi yêu cầu nạp tiền vào ví';
    if (submitBtn) submitBtn.innerHTML = '<span>📩</span> <span>Gửi Yêu Cầu Đến Kế Toán</span>';
  } else {
    if (notice) notice.classList.add('hidden');
    if (titleText) titleText.textContent = 'Nạp tiền vào ví thành viên';
    if (submitBtn) submitBtn.innerHTML = '<span>✓</span> <span>Xác nhận Nạp tiền ngay</span>';
  }

  openModal('topUpModal');
}

function openTopUpModalForMember(memberId) {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('⚠️ Vui lòng đăng nhập để nạp tiền vào ví hoặc gửi yêu cầu!', 'warning');
    openLoginModal();
    return;
  }

  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;

  const targetId = isMemberRole ? currentUserId : memberId;
  populateTopUpMemberSelect(targetId);

  const notice = document.getElementById('topUpMemberNotice');
  const titleText = document.getElementById('topUpModalTitleText');
  const submitBtn = document.getElementById('topUpSubmitBtn');

  if (isMemberRole) {
    if (notice) notice.classList.remove('hidden');
    if (titleText) titleText.textContent = 'Gửi yêu cầu nạp tiền vào ví';
    if (submitBtn) submitBtn.innerHTML = '<span>📩</span> <span>Gửi Yêu Cầu Đến Kế Toán</span>';
  } else {
    if (notice) notice.classList.add('hidden');
    if (titleText) titleText.textContent = 'Nạp tiền vào ví thành viên';
    if (submitBtn) submitBtn.innerHTML = '<span>✓</span> <span>Xác nhận Nạp tiền ngay</span>';
  }

  openModal('topUpModal');
}

function setTopUpAmount(amount) {
  const input = document.getElementById('topUpAmount');
  if (input) input.value = amount;
}

function handleTopUpSubmit(e) {
  if (e) e.preventDefault();
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('⚠️ Vui lòng đăng nhập để thực hiện nạp tiền!', 'warning');
    openLoginModal();
    return;
  }

  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;

  let memberId = document.getElementById('topUpMemberSelect')?.value;
  if (isMemberRole && currentUserId) {
    memberId = currentUserId;
  }
  const amount = Number(document.getElementById('topUpAmount')?.value) || 0;
  const methodInput = document.querySelector('input[name="topUpMethod"]:checked');
  const method = methodInput ? methodInput.value : 'TRANSFER';
  const note = document.getElementById('topUpNote')?.value.trim() || '';

  const member = (AppState.members || []).find(m => m.id === memberId);
  if (!member || amount <= 0) {
    showToast('Dữ liệu nạp ví không hợp lệ!', 'error');
    return;
  }

  // 1. NẾU LÀ THÀNH VIÊN: Gửi yêu cầu nạp tiền đến Kế toán / Thủ quỹ chờ xác thực
  if (isMemberRole) {
    if (!AppState.topUpRequests) AppState.topUpRequests = [];

    const newReq = {
      id: 'REQ_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      memberId: member.id,
      memberName: member.name,
      amount: amount,
      method: method,
      note: note,
      date: getNowTimestampString(),
      createdAt: Date.now(),
      status: 'PENDING', // 'PENDING' | 'APPROVED' | 'REJECTED'
      verifiedBy: null,
      verifiedAt: null
    };

    AppState.topUpRequests.unshift(newReq);
    saveData();
    closeModal('topUpModal');
    renderDashboard();
    renderFinanceTab();
    renderTopUpBadges();
    showToast(`📩 Đã gửi yêu cầu nạp ${formatMoney(amount)} đến Kế toán / Thủ quỹ! Tiền sẽ được cộng vào ví ngay sau khi xác thực.`, 'success');
    return;
  }

  // 2. NẾU LÀ KẾ TOÁN / THỦ QUỸ / ADMIN: Nạp tiền trực tiếp vào ví
  member.balance = (member.balance || 0) + amount;
  const methodDesc = method === 'TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt';
  const desc = note ? `${note} (${methodDesc})` : `Nạp tiền vào ví (${methodDesc})`;
  const verifierName = AppState.auth?.user?.name || getFinanceOperatorName() || 'Kế toán CLB';

  if (!AppState.topUpRequests) AppState.topUpRequests = [];
  AppState.topUpRequests.unshift({
    id: 'REQ_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    memberId: member.id,
    memberName: member.name,
    amount: amount,
    method: method,
    note: desc,
    date: getNowTimestampString(),
    createdAt: Date.now(),
    status: 'APPROVED',
    verifiedBy: verifierName,
    verifiedAt: getNowTimestampString()
  });

  // KHÔNG ghi nhận vào sổ quỹ CLB (AppState.transactions) - tiền chỉ cộng trực tiếp vào ví thành viên
  refreshAllMembersWalletBreakdown();

  saveData();
  closeModal('topUpModal');
  renderDashboard();
  renderFinanceTab();
  renderTopUpBadges();
  showToast(`Đã nạp thành công ${formatMoney(amount)} cho ${member.name}!`, 'success');
}

/**
 * Kế toán / Thủ quỹ duyệt và xác thực yêu cầu nạp tiền
 */
function approveTopUpRequest(requestId) {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền duyệt nạp tiền ví! Vui lòng liên hệ Kế toán hoặc Quản trị viên.', 'warning');
    return;
  }

  if (!AppState.topUpRequests) AppState.topUpRequests = [];
  const req = AppState.topUpRequests.find(r => r.id === requestId);
  if (!req) {
    showToast('Không tìm thấy yêu cầu nạp tiền!', 'error');
    return;
  }
  if (req.status !== 'PENDING') {
    showToast(`Yêu cầu này đã được xử lý (${req.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'})!`, 'info');
    return;
  }

  const verifierName = AppState.auth?.user?.name || getFinanceOperatorName() || 'Kế toán CLB';
  req.status = 'APPROVED';
  req.verifiedBy = verifierName;
  req.verifiedAt = getNowTimestampString();

  const member = (AppState.members || []).find(m => m.id === req.memberId);
  if (member) {
    member.balance = (member.balance || 0) + req.amount;
  }

  const methodDesc = req.method === 'TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt';
  const desc = req.note ? `${req.note} (${methodDesc} - Duyệt bởi ${verifierName})` : `Nạp tiền vào ví (${methodDesc} - Duyệt bởi ${verifierName})`;

  // KHÔNG ghi nhận vào sổ quỹ CLB (AppState.transactions) - tiền chỉ cộng trực tiếp vào ví thành viên
  refreshAllMembersWalletBreakdown();
  saveData();

  renderDashboard();
  renderFinanceTab();
  renderTopUpBadges();
  renderPendingTopUpModalList(currentTopUpModalFilter);

  showToast(`✅ Đã xác thực nhận ${formatMoney(req.amount)} và cộng tiền vào ví của ${req.memberName} thành công!`, 'success');
}

/**
 * Kế toán / Thủ quỹ từ chối yêu cầu nạp tiền
 */
function rejectTopUpRequest(requestId) {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác!', 'warning');
    return;
  }

  if (!AppState.topUpRequests) AppState.topUpRequests = [];
  const req = AppState.topUpRequests.find(r => r.id === requestId);
  if (!req) return;
  if (req.status !== 'PENDING') {
    showToast(`Yêu cầu này đã được xử lý trước đó!`, 'info');
    return;
  }

  const reason = prompt('Nhập lý do từ chối yêu cầu nạp tiền:', 'Chưa nhận được chuyển khoản / Thông tin chưa khớp');
  if (reason === null) return; // Người dùng bấm Hủy prompt

  const verifierName = AppState.auth?.user?.name || getFinanceOperatorName() || 'Kế toán CLB';
  req.status = 'REJECTED';
  req.rejectReason = reason.trim() || 'Chưa nhận được chuyển khoản';
  req.verifiedBy = verifierName;
  req.verifiedAt = getNowTimestampString();

  saveData();
  renderDashboard();
  renderFinanceTab();
  renderTopUpBadges();
  renderPendingTopUpModalList(currentTopUpModalFilter);

  showToast(`Đã từ chối yêu cầu nạp tiền của ${req.memberName}.`, 'info');
}

/**
 * Xóa yêu cầu nạp tiền (chỉ dành cho Admin/Kế toán đối với các yêu cầu cũ đã duyệt hoặc từ chối)
 */
function deleteTopUpRequest(requestId) {
  if (!canPerformFinance()) return;
  if (!confirm('Bạn có chắc chắn muốn xóa bản ghi yêu cầu này khỏi danh sách?')) return;
  AppState.topUpRequests = (AppState.topUpRequests || []).filter(r => r.id !== requestId);
  saveData();
  renderFinanceTab();
  renderTopUpBadges();
  renderPendingTopUpModalList(currentTopUpModalFilter);
  showToast('Đã xóa bản ghi yêu cầu.', 'info');
}

let currentTopUpModalFilter = 'PENDING';

function filterPendingTopUpModalList(filterType) {
  currentTopUpModalFilter = filterType;

  ['PENDING', 'APPROVED', 'ALL'].forEach(ft => {
    const btn = document.getElementById(`btnFilterTopUp${ft.charAt(0) + ft.slice(1).toLowerCase()}`);
    if (btn) {
      if (ft === filterType) {
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white transition shadow-2xs cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer';
      }
    }
  });

  renderPendingTopUpModalList(filterType);
}

function openPendingTopUpRequestsModal() {
  if (!AppState.auth || !AppState.auth.isLoggedIn || !AppState.auth.user) {
    showToast('⚠️ Vui lòng đăng nhập để xem danh sách yêu cầu nạp tiền!', 'warning');
    openLoginModal();
    return;
  }
  currentTopUpModalFilter = 'PENDING';
  filterPendingTopUpModalList('PENDING');
  openModal('modalPendingTopUpRequests');
}

function renderPendingTopUpModalList(filterType = 'PENDING') {
  const container = document.getElementById('modalPendingTopUpListContainer');
  const countBadge = document.getElementById('modalPendingTopUpPendingCount');
  if (!container) return;

  const allRequests = AppState.topUpRequests || [];
  const pendingCount = allRequests.filter(r => r.status === 'PENDING').length;
  if (countBadge) countBadge.textContent = String(pendingCount);

  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;

  let list = allRequests;
  // Nếu là thành viên: chỉ thấy yêu cầu của chính mình
  if (isMemberRole && currentUserId) {
    list = list.filter(r => r.memberId === currentUserId);
  }

  if (filterType === 'PENDING') {
    list = list.filter(r => r.status === 'PENDING');
  } else if (filterType === 'APPROVED') {
    list = list.filter(r => r.status === 'APPROVED');
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-xs">
        <span class="text-3xl block mb-2">📭</span>
        <span>Không có yêu cầu nạp tiền nào ${filterType === 'PENDING' ? 'đang chờ xác thực' : 'phù hợp'}.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(req => {
    const isPending = req.status === 'PENDING';
    const isApproved = req.status === 'APPROVED';
    const isRejected = req.status === 'REJECTED';
    const methodDesc = req.method === 'TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt';

    let statusBadge = '';
    if (isPending) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">⏳ Chờ xác thực</span>';
    } else if (isApproved) {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">✅ Đã duyệt (+${formatMoney(req.amount)})</span>`;
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">❌ Đã từ chối</span>';
    }

    const currentMember = (AppState.members || []).find(m => m.id === req.memberId);
    const curBalance = currentMember ? currentMember.balance : 0;

    return `
      <div class="p-3.5 rounded-2xl border ${isPending ? 'border-amber-300 bg-amber-50/50 shadow-xs' : 'border-slate-200 bg-white'} space-y-2">
        <div class="flex items-start justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl ${isPending ? 'bg-amber-200 text-amber-900' : (isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')} flex items-center justify-center font-bold text-sm shrink-0">
              ${isPending ? '⏳' : (isApproved ? '✓' : '✕')}
            </div>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <b class="text-xs sm:text-sm text-slate-900">${escapeHtml(req.memberName)}</b>
                <span class="text-[10px] text-slate-500">(${escapeHtml(req.memberId)})</span>
                ${statusBadge}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Ví hiện tại: <b class="${curBalance < 0 ? 'text-rose-600' : 'text-slate-800'}">${formatMoney(curBalance)}</b>
                • Gửi lúc: <span class="font-mono">${req.date || ''}</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm sm:text-base font-black text-emerald-600">+${formatMoney(req.amount)}</div>
            <span class="text-[10px] text-slate-400 block">${methodDesc}</span>
          </div>
        </div>

        ${req.note ? `
          <div class="p-2 rounded-xl bg-white/80 border border-slate-100 text-xs text-slate-700 flex items-start gap-1.5">
            <span class="text-slate-400">📝</span>
            <span class="italic">"${escapeHtml(req.note)}"</span>
          </div>
        ` : ''}

        ${req.rejectReason ? `
          <div class="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-1.5">
            <span class="text-rose-500">⚠️</span>
            <span>Lý do từ chối: <b>${escapeHtml(req.rejectReason)}</b></span>
          </div>
        ` : ''}

        ${req.verifiedBy ? `
          <div class="text-[10px] text-slate-400 flex items-center gap-1">
            <span>Xác nhận bởi: <b>${escapeHtml(req.verifiedBy)}</b> (${req.verifiedAt || ''})</span>
          </div>
        ` : ''}

        <!-- Actions for Accountant -->
        ${canPerformFinance() && isPending ? `
          <div class="pt-2 border-t border-amber-200/80 flex items-center justify-end gap-2">
            <button type="button" onclick="rejectTopUpRequest('${req.id}')" class="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs">
              ✕ Từ chối
            </button>
            <button type="button" onclick="approveTopUpRequest('${req.id}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1">
              <span>✓</span>
              <span>Xác nhận đã nhận tiền (Cộng ví)</span>
            </button>
          </div>
        ` : ''}

        ${canPerformFinance() && !isPending ? `
          <div class="pt-1 flex items-center justify-end">
            <button type="button" onclick="deleteTopUpRequest('${req.id}')" class="text-slate-400 hover:text-rose-600 text-[11px] p-1 transition cursor-pointer" title="Xóa lịch sử yêu cầu này">
              🗑️ Xóa bản ghi
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

/**
 * Cập nhật chuông thông báo Header, Badges menu và Banner
 */
function renderTopUpBadges() {
  const allRequests = AppState.topUpRequests || [];
  const pendingRequests = allRequests.filter(r => r.status === 'PENDING');
  const pendingCount = pendingRequests.length;

  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;
  const myPendingRequests = isMemberRole && currentUserId ? pendingRequests.filter(r => r.memberId === currentUserId) : [];

  // 1. Header Notification Bell
  const bellBtn = document.getElementById('headerTopUpNoticeBtn');
  const bellBadge = document.getElementById('headerTopUpNoticeBadge');

  if (bellBtn && bellBadge) {
    if (canPerformFinance()) {
      if (pendingCount > 0) {
        bellBtn.classList.remove('hidden');
        bellBtn.classList.add('flex');
        bellBadge.textContent = String(pendingCount);
        bellBadge.classList.remove('hidden');
        bellBtn.title = `Có ${pendingCount} yêu cầu nạp tiền chờ bạn xác thực!`;
      } else {
        bellBtn.classList.add('hidden');
        bellBtn.classList.remove('flex');
      }
    } else if (isMemberRole) {
      if (myPendingRequests.length > 0) {
        bellBtn.classList.remove('hidden');
        bellBtn.classList.add('flex');
        bellBadge.textContent = String(myPendingRequests.length);
        bellBadge.classList.remove('hidden');
        bellBtn.title = `Bạn có ${myPendingRequests.length} yêu cầu nạp tiền đang chờ kế toán duyệt`;
      } else {
        bellBtn.classList.add('hidden');
        bellBtn.classList.remove('flex');
      }
    } else {
      bellBtn.classList.add('hidden');
      bellBtn.classList.remove('flex');
    }
  }

  // 2. Sidebar Navigation Badge
  const navBadge = document.getElementById('navFinancePendingBadge');
  if (navBadge) {
    const showCount = canPerformFinance() ? pendingCount : myPendingRequests.length;
    if (showCount > 0) {
      navBadge.textContent = String(showCount);
      navBadge.classList.remove('hidden');
    } else {
      navBadge.classList.add('hidden');
    }
  }

  // 3. Mobile Bottom Navigation Dot
  const mNavDot = document.getElementById('mNavFinancePendingDot');
  if (mNavDot) {
    const showCount = canPerformFinance() ? pendingCount : myPendingRequests.length;
    if (showCount > 0) {
      mNavDot.classList.remove('hidden');
    } else {
      mNavDot.classList.add('hidden');
    }
  }

  // 4. Dashboard Alert Banner
  const dashContainer = document.getElementById('dashboardTopUpNoticeContainer');
  if (dashContainer) {
    if (canPerformFinance() && pendingCount > 0) {
      dashContainer.innerHTML = `
        <div class="p-3 sm:p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-100/60 to-orange-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl select-none">🔔</span>
            <div>
              <div class="text-xs font-black text-amber-950 flex items-center gap-1.5 flex-wrap">
                <span>CÓ ${pendingCount} YÊU CẦU NẠP TIỀN CHỜ BẠN XÁC THỰC</span>
                <span class="px-2 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">Chờ duyệt</span>
              </div>
              <div class="text-[11px] text-amber-900 mt-0.5">
                Thành viên đã gửi yêu cầu nạp ví. Vui lòng kiểm tra tài khoản ngân hàng và xác thực để tiền hiện trên ví của họ!
              </div>
            </div>
          </div>
          <button type="button" onclick="openPendingTopUpRequestsModal()" class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0 flex items-center gap-1">
            <span>Duyệt ngay</span> <span>➔</span>
          </button>
        </div>
      `;
    } else if (isMemberRole && myPendingRequests.length > 0) {
      const myTotal = myPendingRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
      dashContainer.innerHTML = `
        <div class="p-3 sm:p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl select-none">⏳</span>
            <div>
              <div class="text-xs font-black text-blue-950 flex items-center gap-1.5 flex-wrap">
                <span>YÊU CẦU NẠP VÍ ĐANG CHỜ KẾ TOÁN XÁC THỰC</span>
                <span class="px-2 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-bold">${myPendingRequests.length} yêu cầu</span>
              </div>
              <div class="text-[11px] text-blue-800 mt-0.5">
                Bạn đã gửi yêu cầu nạp tổng cộng <b>${formatMoney(myTotal)}</b>. Số tiền sẽ tự động hiện lên ví ngay khi Kế toán kiểm tra và duyệt!
              </div>
            </div>
          </div>
          <button type="button" onclick="openPendingTopUpRequestsModal()" class="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs rounded-xl transition cursor-pointer shrink-0">
            Xem trạng thái
          </button>
        </div>
      `;
    } else {
      dashContainer.innerHTML = '';
    }
  }

  // 5. Finance Tab Section (#financePendingTopUpSection)
  renderFinancePendingTopUpSection();
}

/**
 * Hiển thị khối quản lý yêu cầu nạp tiền trong tab "Thanh Toán & Ví"
 */
function renderFinancePendingTopUpSection() {
  const section = document.getElementById('financePendingTopUpSection');
  if (!section) return;

  const allRequests = AppState.topUpRequests || [];
  const pendingRequests = allRequests.filter(r => r.status === 'PENDING');
  const curRole = getCurrentUserRole();
  const isMemberRole = curRole === 'MEMBER' || !canPerformFinance();
  const currentUserId = AppState.auth?.user?.id;
  const myPendingRequests = isMemberRole && currentUserId ? pendingRequests.filter(r => r.memberId === currentUserId) : [];

  const displayList = canPerformFinance() ? pendingRequests : myPendingRequests;

  if (displayList.length === 0) {
    section.classList.add('hidden');
    section.innerHTML = '';
    return;
  }

  section.classList.remove('hidden');

  const title = canPerformFinance() 
    ? `🔔 CÓ ${pendingRequests.length} YÊU CẦU NẠP VÍ CHỜ KẾ TOÁN XÁC THỰC`
    : `📩 YÊU CẦU NẠP VÍ CỦA BẠN ĐANG CHỜ KẾ TOÁN DUYỆT (${myPendingRequests.length} yêu cầu)`;

  const subtitle = canPerformFinance()
    ? 'Thành viên đã gửi yêu cầu nạp tiền. Hãy kiểm tra biến động số dư tài khoản nhận tiền và bấm "Xác nhận đã nhận tiền" để tiền lập tức hiện lên ví của họ.'
    : 'Yêu cầu của bạn đang được Kế toán / Thủ quỹ đối soát. Tiền sẽ được cộng tự động vào ví của bạn ngay sau khi xác thực.';

  section.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-amber-300/80 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <span class="text-xl">🔔</span>
        <div>
          <b class="text-xs sm:text-sm font-black text-amber-950 block">${title}</b>
          <p class="text-[11px] text-amber-900">${subtitle}</p>
        </div>
      </div>
      <button type="button" onclick="openPendingTopUpRequestsModal()" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1">
        <span>Xem tất cả & lịch sử</span> <span>➔</span>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
      ${displayList.slice(0, 4).map(req => {
        const methodDesc = req.method === 'TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt';
        const currentMember = (AppState.members || []).find(m => m.id === req.memberId);
        const curBal = currentMember ? currentMember.balance : 0;
        return `
          <div class="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div>
                <b class="text-xs text-slate-900 block">${escapeHtml(req.memberName)}</b>
                <span class="text-[10px] text-slate-500">Ví hiện tại: <b>${formatMoney(curBal)}</b> • Lúc: ${req.date || ''}</span>
              </div>
              <div class="text-right">
                <b class="text-sm font-black text-emerald-600">+${formatMoney(req.amount)}</b>
                <span class="text-[10px] text-slate-400 block">${methodDesc}</span>
              </div>
            </div>

            ${req.note ? `
              <div class="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                "${escapeHtml(req.note)}"
              </div>
            ` : ''}

            ${canPerformFinance() ? `
              <div class="pt-1.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button type="button" onclick="rejectTopUpRequest('${req.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg text-xs font-bold transition cursor-pointer">
                  ✕ Từ chối
                </button>
                <button type="button" onclick="approveTopUpRequest('${req.id}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1">
                  <span>✓</span> <span>Xác nhận & Cộng ví</span>
                </button>
              </div>
            ` : `
              <div class="pt-1 text-right">
                <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">⏳ Đang chờ Kế toán duyệt</span>
              </div>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;

  lucide.createIcons();
}

// ==========================================
// 12. THU / CHI QUỸ CLB (LEGACY ROUTER)
// ==========================================
function openFundTransactionModal(type = 'expense') {
  if (type === 'income') {
    openOtherIncomeModal();
  } else {
    openGeneralExpenseModal('EXP_GENERAL_OTHER');
  }
}

function setFundCategoryQuick(val) {
  const input = document.getElementById('fundCategory');
  if (input) input.value = val;
}

function handleFundTransactionSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const type = document.getElementById('fundTransactionType').value;
  const amount = Number(document.getElementById('fundAmount').value);
  const category = document.getElementById('fundCategory').value.trim();
  const party = document.getElementById('fundParty').value.trim() || 'Thủ quỹ / Ban quản lý';

  if (amount <= 0 || !category) {
    showToast('Vui lòng nhập đầy đủ thông tin số tiền và hạng mục!', 'warning');
    return;
  }

  if (type === 'income') {
    AppState.transactions.push({
      id: 'TX_' + Date.now(),
      date: getNowTimestampString(),
      categoryGroup: 'INCOME_A',
      subType: 'OTHER_IN',
      categoryName: 'Thu khác',
      amount: amount,
      targetName: party,
      walletImpact: 0,
      fundImpact: amount,
      description: `Thu: ${category} (Từ: ${party})`,
      operator: getFinanceOperatorName()
    });
    showToast(`Đã thu ${formatMoney(amount)} vào Quỹ CLB!`, 'success');
  } else {
    AppState.transactions.push({
      id: 'TX_' + Date.now(),
      date: getNowTimestampString(),
      categoryGroup: 'EXPENSE_B',
      subType: 'EXP_GENERAL_OTHER',
      categoryName: 'Chi HĐ khác',
      amount: amount,
      targetName: party,
      walletImpact: 0,
      fundImpact: -amount,
      description: `Chi: ${category} (Phụ trách: ${party})`,
      operator: getFinanceOperatorName()
    });
    showToast(`Đã chi ${formatMoney(amount)} từ Quỹ CLB!`, 'info');
  }

  saveData();
  closeModal('fundTransactionModal');
  renderDashboard();
  renderFinanceTab();
}

// ==========================================
// 13. QUỸ THÀNH VIÊN TẠM ỨNG & TẤT TOÁN DƯ NỢ
// ==========================================
function openAdvanceFundModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để điều chỉnh quỹ tạm ứng!', 'warning');
    openLoginModal();
    return;
  }
  openModal('advanceFundModal');
}

function handleAdvanceFundSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const type = document.getElementById('advanceType').value;
  const amount = Number(document.getElementById('advanceAmount').value);
  const description = document.getElementById('advanceDescription').value.trim();

  if (amount <= 0 || !description) {
    showToast('Vui lòng nhập số tiền và nội dung tạm ứng!', 'warning');
    return;
  }

  if (type === 'IN') {
    AppState.funds.advanceFund = (AppState.funds.advanceFund || 0) + amount;
    AppState.transactions.push({
      id: 'TX_' + Date.now(),
      date: getNowTimestampString(),
      type: 'ADVANCE',
      amount: amount,
      targetName: 'Quỹ Tạm Ứng',
      walletImpact: 0,
      fundImpact: 0,
      description: `[Đóng ứng trước] ${description}`,
      operator: getFinanceOperatorName()
    });
    showToast(`Đã ghi nhận +${formatMoney(amount)} vào Quỹ tạm ứng!`, 'success');
  } else {
    AppState.funds.advanceFund = (AppState.funds.advanceFund || 0) - amount;
    AppState.transactions.push({
      id: 'TX_' + Date.now(),
      date: getNowTimestampString(),
      type: 'ADVANCE',
      amount: -amount,
      targetName: 'Quỹ Tạm Ứng',
      walletImpact: 0,
      fundImpact: 0,
      description: `[Hoàn trả / Chi ứng trước] ${description}`,
      operator: getFinanceOperatorName()
    });
    showToast(`Đã chi trả -${formatMoney(amount)} từ Quỹ tạm ứng!`, 'info');
  }

  calculateAdvanceFundStats();
  saveData();
  closeModal('advanceFundModal');
  renderDashboard();
  renderFinanceTab();
}

// 13.1 CHI TRẢ TIỀN CẦU (RÚT QUỸ TẠM ỨNG CẦU)
function openPayShuttleExpenseModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để chi trả tiền cầu!', 'warning');
    openLoginModal();
    return;
  }
  const dateInput = document.getElementById('payShuttleDate');
  if (dateInput) dateInput.value = getTodayInputFormat();
  const amtInput = document.getElementById('payShuttleAmount');
  if (amtInput) amtInput.value = 680000;
  openModal('payShuttleExpenseModal');
}

function handlePayShuttleExpenseSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const dateStr = document.getElementById('payShuttleDate')?.value || getTodayInputFormat();
  const dateFormatted = dateStr.split('-').reverse().join('/');
  const supplier = document.getElementById('payShuttleSupplier')?.value.trim() || 'Đại lý Cầu Lông';
  const amount = Number(document.getElementById('payShuttleAmount')?.value) || 0;
  const boxes = Number(document.getElementById('payShuttleBoxes')?.value) || 2;
  const note = document.getElementById('payShuttleNote')?.value.trim() || '';

  if (amount <= 0) {
    showToast('Vui lòng nhập số tiền chi trả mua cầu!', 'warning');
    return;
  }

  AppState.transactions.push({
    id: 'TX_' + Date.now() + '_SHUTTLE_PAY',
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'ADVANCE_SHUTTLE_OUT',
    subType: 'SHUTTLE_EXP_PAY',
    categoryName: 'Chi trả tiền cầu',
    amount: amount,
    walletImpact: 0,
    fundImpact: -amount,
    targetName: supplier,
    description: `Chi trả tiền mua ${boxes} hộp cầu lông${note ? ` (${note})` : ''} (Rút Quỹ tạm ứng tiền cầu)`,
    operator: getFinanceOperatorName()
  });

  calculateAdvanceFundStats();
  saveData();
  closeModal('payShuttleExpenseModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`🏸 Đã ghi nhận chi trả tiền mua cầu: -${formatMoney(amount)} (Rút Quỹ tạm ứng tiền cầu)!`, 'success');
}

// 13.2 CHI TRẢ TIỀN SÂN (RÚT QUỸ TẠM ỨNG SÂN)
function openPayCourtExpenseModal() {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để chi trả tiền sân!', 'warning');
    openLoginModal();
    return;
  }
  const dateInput = document.getElementById('payCourtDate');
  if (dateInput) dateInput.value = getTodayInputFormat();
  const amtInput = document.getElementById('payCourtAmount');
  if (amtInput) amtInput.value = 1500000;
  openModal('payCourtExpenseModal');
}

function handlePayCourtExpenseSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const dateStr = document.getElementById('payCourtDate')?.value || getTodayInputFormat();
  const dateFormatted = dateStr.split('-').reverse().join('/');
  const owner = document.getElementById('payCourtOwner')?.value.trim() || 'Chủ sân Cầu Lông';
  const amount = Number(document.getElementById('payCourtAmount')?.value) || 0;
  const period = document.getElementById('payCourtPeriod')?.value.trim() || 'Tiền thuê sân tháng này';
  const note = document.getElementById('payCourtNote')?.value.trim() || '';

  if (amount <= 0) {
    showToast('Vui lòng nhập số tiền chi trả cho chủ sân!', 'warning');
    return;
  }

  AppState.transactions.push({
    id: 'TX_' + Date.now() + '_COURT_PAY',
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'ADVANCE_COURT_OUT',
    subType: 'COURT_EXP_PAY',
    categoryName: 'Chi trả tiền sân',
    amount: amount,
    walletImpact: 0,
    fundImpact: -amount,
    targetName: owner,
    description: `Chi trả tiền thuê sân (${period})${note ? ` (${note})` : ''} (Rút Quỹ tạm ứng tiền sân)`,
    operator: getFinanceOperatorName()
  });

  calculateAdvanceFundStats();
  saveData();
  closeModal('payCourtExpenseModal');
  renderDashboard();
  renderFinanceTab();
  showToast(`🏟️ Đã ghi nhận chi trả tiền thuê sân: -${formatMoney(amount)} (Rút Quỹ tạm ứng tiền sân)!`, 'success');
}

// 13.3 TẤT TOÁN DƯ NỢ VÍ THÀNH VIÊN
let currentSettlementFilterMode = 'ALL'; // 'ALL', 'DAILY', 'MONTHLY'

function openSettlementDebtModal(targetMemberId = null) {
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý hoặc Thủ quỹ để thực hiện tất toán!', 'warning');
    openLoginModal();
    return;
  }
  const dateInput = document.getElementById('settlementDate');
  if (dateInput) dateInput.value = getTodayInputFormat();

  populateSettlementMemberSelect(targetMemberId);
  renderSettlementDebtMemberList();
  openModal('settlementDebtModal');
}

function setSettlementModeFilter(mode) {
  currentSettlementFilterMode = mode;
  ['btnSetDaily', 'btnSetMonthly', 'btnSetCustom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.className = 'px-2.5 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer bg-white text-slate-700 border-slate-200';
    }
  });
  const activeBtn = document.getElementById(mode === 'DAILY' ? 'btnSetDaily' : (mode === 'MONTHLY' ? 'btnSetMonthly' : 'btnSetCustom'));
  if (activeBtn) {
    activeBtn.className = 'px-2.5 py-1.5 rounded-xl font-black text-xs border transition cursor-pointer bg-emerald-700 text-white border-emerald-800 shadow-sm';
  }

  const noteEl = document.getElementById('settlementModeDesc');
  if (noteEl) {
    if (mode === 'DAILY') noteEl.textContent = 'Thu hết dư nợ trong ngày sinh hoạt hôm nay. Nộp tiền để đưa số dư âm về 0đ.';
    else if (mode === 'MONTHLY') noteEl.textContent = 'Dư nợ theo dõi lũy kế cả tháng, tổng kết và tất toán cuối tháng.';
    else noteEl.textContent = 'Tất toán linh hoạt vào bất kỳ ngày nào do Ban quản lý chỉ định.';
  }
}

function populateSettlementMemberSelect(preselectId = null) {
  const select = document.getElementById('settlementMemberSelect');
  if (!select) return;

  const negMembers = (AppState.members || []).filter(m => (m.balance || 0) < 0);
  const posMembers = (AppState.members || []).filter(m => (m.balance || 0) >= 0);

  let html = '';
  if (negMembers.length > 0) {
    html += `<optgroup label="⚠️ Thành viên đang có số dư âm (Dư nợ)">`;
    negMembers.forEach(m => {
      html += `<option value="${m.id}" ${m.id === preselectId ? 'selected' : ''}>${m.name} (${getMemberRoleTypeText(m.type)}) — NỢ: ${formatMoney(Math.abs(m.balance))}</option>`;
    });
    html += `</optgroup>`;
  }

  html += `<optgroup label="Thành viên số dư dương / bình thường">`;
  posMembers.forEach(m => {
    html += `<option value="${m.id}" ${m.id === preselectId ? 'selected' : ''}>${m.name} (${getMemberRoleTypeText(m.type)}) — Ví: ${formatMoney(m.balance || 0)}</option>`;
  });
  html += `</optgroup>`;

  select.innerHTML = html;

  const chosenId = preselectId || (negMembers.length > 0 ? negMembers[0].id : (posMembers.length > 0 ? posMembers[0].id : null));
  if (chosenId) {
    select.value = chosenId;
    onSettlementMemberChanged(chosenId);
  }
}

function onSettlementMemberChanged(memberId) {
  const member = (AppState.members || []).find(m => m.id === memberId);
  if (!member) return;

  const curBalEl = document.getElementById('settlementCurrentBalText');
  const debtAmtInput = document.getElementById('settlementAmount');

  const curBal = member.balance || 0;
  if (curBalEl) {
    if (curBal < 0) {
      curBalEl.innerHTML = `<span class="px-2 py-0.5 rounded-md font-black bg-rose-100 text-rose-700 border border-rose-300">Dư nợ: ${formatMoney(curBal)}</span>`;
    } else {
      curBalEl.innerHTML = `<span class="px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Ví: ${formatMoney(curBal)}</span>`;
    }
  }

  const suggestedAmount = curBal < 0 ? Math.abs(curBal) : 50000;
  if (debtAmtInput) {
    debtAmtInput.value = suggestedAmount;
  }
  updateSettlementNewBalancePreview();
}

function updateSettlementNewBalancePreview() {
  const select = document.getElementById('settlementMemberSelect');
  if (!select) return;
  const member = (AppState.members || []).find(m => m.id === select.value);
  if (!member) return;

  const curBal = member.balance || 0;
  const payAmt = Number(document.getElementById('settlementAmount')?.value) || 0;
  const newBal = curBal + payAmt;

  const newBalPreview = document.getElementById('settlementNewBalText');
  if (newBalPreview) {
    if (newBal < 0) {
      newBalPreview.innerHTML = `<b class="text-rose-600 font-black">${formatMoney(newBal)}</b> (vẫn còn nợ)`;
    } else if (newBal === 0) {
      newBalPreview.innerHTML = `<b class="text-emerald-700 font-black">0 đ</b> (đã hết sạch nợ ✅)`;
    } else {
      newBalPreview.innerHTML = `<b class="text-emerald-700 font-black">+${formatMoney(newBal)}</b> (dư tài khoản ✅)`;
    }
  }
}

function renderSettlementDebtMemberList() {
  const container = document.getElementById('settlementDebtMemberListContainer');
  if (!container) return;

  const negMembers = (AppState.members || []).filter(m => (m.balance || 0) < 0);
  if (negMembers.length === 0) {
    container.innerHTML = `
      <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800 font-bold">
        🎉 Tuyệt vời! Hiện tại không có thành viên nào bị dư nợ ví âm.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
      <span>Danh sách thành viên đang có số dư âm (${negMembers.length} người)</span>
      <span class="text-rose-600 font-black">Tổng nợ: ${formatMoney(negMembers.reduce((sum, m) => sum + Math.abs(m.balance), 0))}</span>
    </div>
    <div class="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
      ${negMembers.map(m => `
        <div class="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs hover:border-emerald-300 transition">
          <div>
            <b class="text-slate-900">${m.name}</b>
            <span class="text-[10px] text-slate-400 block">${getMemberRoleTypeText(m.type)} • ${m.monthlySessions || 0} buổi</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-black text-rose-600">${formatMoney(m.balance)}</span>
            <button type="button" onclick="selectMemberForSettlement('${m.id}')" class="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] cursor-pointer shadow-2xs">
              Tất toán
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function selectMemberForSettlement(memberId) {
  const select = document.getElementById('settlementMemberSelect');
  if (select) {
    select.value = memberId;
    onSettlementMemberChanged(memberId);
  }
}

function handleSettlementDebtSubmit(e) {
  e.preventDefault();
  if (!canPerformFinance()) {
    showToast('⚠️ Bạn không có quyền thao tác! Vui lòng đăng nhập tài khoản có thẩm quyền.', 'error');
    openLoginModal();
    return;
  }
  const select = document.getElementById('settlementMemberSelect');
  const memberId = select ? select.value : null;
  const member = (AppState.members || []).find(m => m.id === memberId);

  if (!member) {
    showToast('Vui lòng chọn thành viên cần tất toán!', 'warning');
    return;
  }

  const payAmt = Number(document.getElementById('settlementAmount')?.value) || 0;
  if (payAmt <= 0) {
    showToast('Số tiền nộp tất toán phải lớn hơn 0đ!', 'warning');
    return;
  }

  const dateStr = document.getElementById('settlementDate')?.value || getTodayInputFormat();
  const dateFormatted = dateStr.split('-').reverse().join('/');
  const method = document.querySelector('input[name="settlementMethod"]:checked')?.value || 'CASH';
  const methodText = method === 'TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt';
  const note = document.getElementById('settlementNote')?.value.trim() || '';

  const oldBal = member.balance || 0;
  member.balance = oldBal + payAmt;
  const newBal = member.balance;

  const modeText = currentSettlementFilterMode === 'DAILY' ? 'Cuối ngày' : (currentSettlementFilterMode === 'MONTHLY' ? 'Cuối tháng' : 'Chỉ định');

  AppState.transactions.push({
    id: 'TX_' + Date.now() + '_SETTLEMENT',
    date: `${dateFormatted} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
    categoryGroup: 'WALLET_SETTLEMENT',
    subType: 'SETTLEMENT',
    categoryName: 'Tất toán dư nợ',
    amount: payAmt,
    walletImpact: payAmt,
    fundImpact: 0,
    targetName: member.name,
    memberId: member.id,
    description: `Tất toán dư nợ (${modeText}) ngày ${dateFormatted} qua ${methodText}: Đã nộp ${formatMoney(payAmt)}${note ? ` (${note})` : ''} (Ví: ${formatMoney(oldBal)} ➔ ${formatMoney(newBal)})`,
    operator: getFinanceOperatorName()
  });

  calculateAdvanceFundStats();
  saveData();
  closeModal('settlementDebtModal');
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();
  showToast(`💰 Tất toán thành công cho ${member.name}! Số dư ví mới: ${formatMoney(newBal)}.`, 'success');
}

// 13.4 LƯU CẤU HÌNH VÍ THÀNH VIÊN & TẤT TOÁN (Quản lý tập trung tại hàm saveWalletSettlementConfig bên dưới)

// ==========================================
// 14. XỬ PHẠT VI PHẠM (LEGACY ROUTER -> QUICK FINE)
// ==========================================
function openFineModal() {
  openQuickFineModal();
}

function handleFineSubmit(e) {
  handleQuickFineSubmit(e);
}

// ==========================================
// 15. QUẢN LÝ THÀNH VIÊN
// ==========================================
let memberListFilter = 'ALL';

/**
 * Kiểm tra tên thành viên đã tồn tại trong danh sách CLB hay chưa (không phân biệt hoa thường, chuẩn hóa khoảng trắng)
 * @param {string} name - Tên cần kiểm tra
 * @param {string|null} excludeMemberId - ID thành viên bỏ qua (khi chỉnh sửa thông tin chính mình)
 * @returns {object|null} - Trả về thành viên bị trùng hoặc null nếu không trùng
 */
function findDuplicateMemberName(name, excludeMemberId = null) {
  if (!name || typeof name !== 'string') return null;
  const cleanName = name.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!cleanName) return null;
  return (AppState.members || []).find(m => {
    if (excludeMemberId && String(m.id) === String(excludeMemberId)) return false;
    const existingName = (m.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    return existingName === cleanName;
  }) || null;
}

function validateMemberModalName() {
  const input = document.getElementById('memberFullName');
  const warning = document.getElementById('memberFullNameWarning');
  const editId = document.getElementById('memberEditId')?.value || null;
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.textContent = '';
      warning.classList.add('hidden');
    }
    return;
  }
  const dup = findDuplicateMemberName(name, editId);
  if (dup) {
    input.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 shrink-0"></i> Tên "<b>${escapeHtml ? escapeHtml(dup.name) : dup.name}</b>" đã tồn tại trong CLB! Vui lòng chọn tên khác hoặc thêm biệt danh.`;
      warning.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  } else {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.textContent = '';
      warning.classList.add('hidden');
    }
  }
}

function validateGuestModalName() {
  const input = document.getElementById('guestName');
  const warning = document.getElementById('guestNameWarning');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.textContent = '';
      warning.classList.add('hidden');
    }
    return;
  }
  const dup = findDuplicateMemberName(name, null);
  if (dup) {
    input.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 shrink-0"></i> Tên khách "<b>${escapeHtml ? escapeHtml(dup.name) : dup.name}</b>" đã tồn tại trong CLB! Vui lòng đặt tên khác.`;
      warning.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  } else {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.textContent = '';
      warning.classList.add('hidden');
    }
  }
}

function validateQuickRenameName() {
  const input = document.getElementById('quickRenameName');
  const warning = document.getElementById('quickRenameWarning');
  const editId = document.getElementById('quickRenameMemberId')?.value || null;
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.textContent = '';
      warning.classList.add('hidden');
    }
    return;
  }
  const dup = findDuplicateMemberName(name, editId);
  if (dup) {
    input.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 shrink-0"></i> Tên "<b>${escapeHtml ? escapeHtml(dup.name) : dup.name}</b>" đã tồn tại cho thành viên khác trong CLB!`;
      warning.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  } else {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    if (warning) {
      warning.textContent = '';
      warning.classList.add('hidden');
    }
  }
}

function validateInlineGuestName() {
  const input = document.getElementById('newGuestNameInput');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    input.title = '';
    return;
  }
  const dup = findDuplicateMemberName(name, null);
  if (dup) {
    input.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
    input.title = `⚠️ Tên "${dup.name}" đã tồn tại trong danh sách CLB!`;
  } else {
    input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    input.title = '';
  }
}

function setMemberListFilter(filter) {
  if (filter === 'OFFICIAL' || filter === 'HONORARY') filter = 'MEMBERS';
  if (filter === 'GUEST') filter = 'OTHER';
  memberListFilter = filter;
  document.querySelectorAll('.mem-filter-btn').forEach(btn => {
    btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-800');
    btn.classList.add('text-slate-600');
  });
  const activeBtn = document.getElementById(`filter-mem-${filter.toLowerCase()}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600');
    activeBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-800');
  }
  renderMemberManagementList();
}

function renderMemberManagementList() {
  refreshAllMembersWalletBreakdown();
  const tbody = document.getElementById('memberManagementTableBody');
  const searchInput = document.getElementById('searchMemberList');
  if (!tbody) return;

  const isMemberRoleMem = AppState.auth && AppState.auth.user && AppState.auth.user.role === 'MEMBER';
  const currentUserIdMem = AppState.auth && AppState.auth.user ? AppState.auth.user.id : null;

  // Ẩn/hiện các nút hành chính nếu là tài khoản thành viên thông thường
  const adminBtns = document.getElementById('memberManagementAdminButtons');
  if (adminBtns) {
    if (isMemberRoleMem) adminBtns.classList.add('hidden');
    else adminBtns.classList.remove('hidden');
  }

  // Ẩn thanh phân loại nếu là tài khoản thành viên thông thường
  const filterTabsContainer = document.getElementById('filter-mem-all')?.parentElement;
  if (filterTabsContainer) {
    if (isMemberRoleMem) filterTabsContainer.classList.add('hidden');
    else filterTabsContainer.classList.remove('hidden');
  }

  // Cập nhật số lượng trên các nút phân loại: Tất cả, Danh sách thành viên, Khác
  const allBtn = document.getElementById('filter-mem-all');
  const memBtn = document.getElementById('filter-mem-members');
  const otherBtn = document.getElementById('filter-mem-other');

  const baseList = AppState.members || [];
  const totalCount = baseList.length;
  const isMemberItem = m => m.type !== 'GUEST_A' && m.type !== 'GUEST_B' && m.type !== 'GUEST_C' && !String(m.type || '').startsWith('GUEST') && m.type !== 'OTHER';
  const memCount = baseList.filter(isMemberItem).length;
  const otherCount = totalCount - memCount;

  if (allBtn) {
    allBtn.innerHTML = `Tất cả <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700 font-bold">${totalCount}</span>`;
  }
  if (memBtn) {
    memBtn.innerHTML = `Danh sách thành viên <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">${memCount}</span>`;
  }
  if (otherBtn) {
    otherBtn.innerHTML = `Khác <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">${otherCount}</span>`;
  }

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let list = baseList;

  if (memberListFilter === 'MEMBERS' || memberListFilter === 'OFFICIAL' || memberListFilter === 'HONORARY') {
    list = list.filter(isMemberItem);
  } else if (memberListFilter === 'OTHER' || memberListFilter === 'GUEST') {
    list = list.filter(m => !isMemberItem(m));
  }

  if (query) {
    list = list.filter(m => 
      m.name.toLowerCase().includes(query) || 
      (m.phone && m.phone.includes(query)) ||
      (m.username && m.username.toLowerCase().includes(query))
    );
  }

  if (list.length === 0) {
    const emptyMsg = isMemberRoleMem ? 'Không tìm thấy thông tin tài khoản của bạn' : 'Không tìm thấy thành viên nào';
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">${emptyMsg}</td></tr>`;
    if (typeof updateSelectedMembersCount === 'function') updateSelectedMembersCount();
    return;
  }

  tbody.innerHTML = list.map(m => {
    const isNegative = (m.balance || 0) < 0;
    const balanceClass = isNegative ? 'text-rose-600 font-bold' : 'text-slate-900 font-bold';
    const mRole = m.role || 'MEMBER';
    const mRoleDef = ROLE_DEFINITIONS[mRole] || ROLE_DEFINITIONS.MEMBER;
    const isLocked = m.status === 'LOCKED';

    const accountInfo = `
      <div>
        <div class="font-mono text-slate-800 font-semibold text-xs flex items-center gap-1">
          <span>@${m.username || 'chưa_tạo'}</span>
          ${isLocked ? `<span class="text-rose-600 text-[10px]" title="Tài khoản đang bị khóa">🔒</span>` : ''}
        </div>
        <div class="mt-0.5">
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${mRoleDef.badgeClass}">
            ${mRoleDef.icon} ${mRoleDef.label}
          </span>
        </div>
      </div>
    `;

    let actionsHtml = '';
    if (isMemberRoleMem) {
      const isSelf = String(m.id) === String(currentUserIdMem);
      if (isSelf) {
        actionsHtml = `
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <button onclick="openTopUpModalForMember('${m.id}')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold cursor-pointer" title="Nạp thêm vào ví cá nhân">
              💳 Nạp ví
            </button>
            <button onclick="openQuickRenameModal('${m.id}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer" title="Sửa SĐT / Tên hiển thị">
              ✏️ Sửa thông tin
            </button>
          </div>
        `;
      } else {
        actionsHtml = `<div class="text-center text-slate-400 text-xs">—</div>`;
      }
    } else {
      actionsHtml = `
        <div class="flex items-center justify-center gap-1.5 flex-wrap">
          <button onclick="quickCheckInSingleMember('${m.id}')" class="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded text-[11px] font-bold cursor-pointer" title="Điểm danh 1-chạm (trừ ví ngay)">
            ⚡ Điểm danh
          </button>
          <button onclick="openTopUpModalForMember('${m.id}')" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold cursor-pointer" title="Nạp ví">
            Nạp ví
          </button>
          <button onclick="openUserAccessModal('${m.id}')" class="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1" title="Cấp quyền sử dụng & Mật khẩu">
            <span>🔑</span>
            <span>Cấp quyền</span>
          </button>
          <button onclick="openMemberModal('edit', '${m.id}')" class="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer" title="Sửa thông tin đầy đủ">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteMember('${m.id}')" class="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer" title="Xóa">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
    }

    const isSelfRow = !isMemberRoleMem || String(m.id) === String(currentUserIdMem);

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-3 text-center">
          ${isClubMasterAdmin(m) ? `
            <span class="text-slate-300 text-xs" title="Tài khoản Quản trị viên tối cao không thể xóa">—</span>
          ` : `
            <input type="checkbox" class="member-select-checkbox w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer" value="${m.id}" onchange="updateSelectedMembersCount()">
          `}
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-900 text-xs">${m.name}</span>
            ${isSelfRow ? `
            <button onclick="openQuickRenameModal('${m.id}')" class="text-slate-400 hover:text-brand-600 p-0.5 rounded transition cursor-pointer" title="Đổi tên / SĐT thành viên">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            </button>` : ''}
          </div>
          <div class="text-[11px] text-slate-400">${m.phone || 'Chưa có SĐT'}</div>
        </td>
        <td class="py-3 px-2">
          ${getMemberRoleBadge(m.type)}
        </td>
        <td class="py-3 px-3">
          ${accountInfo}
        </td>
        <td class="py-3 px-3 text-right ${balanceClass} text-xs">
          ${formatMoney(m.balance || 0)}
        </td>
        <td class="py-3 px-2 text-center font-bold text-slate-700 text-xs">
          ${m.monthlySessions || 0} buổi
        </td>
        <td class="py-3 px-4 text-center">
          ${actionsHtml}
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
  if (typeof updateSelectedMembersCount === 'function') updateSelectedMembersCount();
}

function openMemberModal(mode = 'official', memberId = null) {
  if (!canManageMembers()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý để quản lý thông tin thành viên!', 'warning');
    openLoginModal();
    return;
  }

  const modalTitle = document.getElementById('memberModalTitle');
  const editIdInput = document.getElementById('memberEditId');
  const nameInput = document.getElementById('memberFullName');
  const phoneInput = document.getElementById('memberPhone');
  const typeSelect = document.getElementById('memberTypeSelect');
  const usernameInput = document.getElementById('memberUsername');
  const passwordInput = document.getElementById('memberPassword');
  const initBalanceInput = document.getElementById('memberInitialBalance');
  const warningEl = document.getElementById('memberFullNameWarning');

  if (nameInput) nameInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
  if (warningEl) {
    warningEl.textContent = '';
    warningEl.classList.add('hidden');
  }

  if (mode === 'edit' && memberId) {
    const member = AppState.members.find(m => m.id === memberId);
    if (!member) return;
    modalTitle.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-brand-600"></i> Sửa Thông Tin Thành Viên`;
    editIdInput.value = member.id;
    nameInput.value = member.name;
    phoneInput.value = member.phone || '';
    typeSelect.value = member.type;
    usernameInput.value = member.username || '';
    passwordInput.value = member.password || '';
    initBalanceInput.value = member.balance || 0;
    initBalanceInput.disabled = true; // Không sửa balance tại đây, qua nạp ví
  } else {
    modalTitle.innerHTML = `<i data-lucide="user-plus" class="w-5 h-5 text-brand-600"></i> Thêm Thành Viên Mới`;
    editIdInput.value = '';
    nameInput.value = '';
    phoneInput.value = '';
    typeSelect.value = (mode === 'honorary' || mode === 'unofficial') ? 'HONORARY' : 'OFFICIAL';
    usernameInput.value = '';
    passwordInput.value = '123';
    initBalanceInput.value = 0;
    initBalanceInput.disabled = false;
  }

  lucide.createIcons();
  openModal('memberModal');
}

function handleMemberSubmit(e) {
  e.preventDefault();
  if (!canManageMembers()) {
    showToast('⚠️ Bạn không có quyền thực hiện thao tác này! Vui lòng đăng nhập tài khoản Quản lý.', 'error');
    openLoginModal();
    return;
  }
  const editId = document.getElementById('memberEditId').value;
  const name = document.getElementById('memberFullName').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const type = document.getElementById('memberTypeSelect').value;
  const username = document.getElementById('memberUsername').value.trim();
  const password = document.getElementById('memberPassword').value.trim();
  const initBalance = Number(document.getElementById('memberInitialBalance').value || 0);

  if (!name) {
    showToast('Vui lòng nhập họ và tên thành viên!', 'warning');
    return;
  }

  // Không cho phép đặt tên trùng với thành viên khác đã có trong CLB
  const dupMember = findDuplicateMemberName(name, editId || null);
  if (dupMember) {
    showToast(`⚠️ Tên thành viên "${name}" đã tồn tại trong CLB! Vui lòng chọn tên khác hoặc thêm biệt danh phân biệt.`, 'warning');
    validateMemberModalName();
    const nameInput = document.getElementById('memberFullName');
    if (nameInput) nameInput.focus();
    return;
  }

  if (editId) {
    // Sửa thông tin thành viên hiện có
    const member = AppState.members.find(m => m.id === editId);
    if (member) {
      member.name = name;
      member.chipName = name.trim().split(/\s+/).pop().toUpperCase();
      member.phone = phone;
      member.type = type;
      member.username = username;
      if (password) member.password = password;
    }
  } else {
    // Thêm thành viên mới
    const newId = 'M' + String(Date.now()).slice(-4);
    const chip = name.trim().split(/\s+/).pop().toUpperCase();
    const newMember = {
      id: newId,
      name: name,
      chipName: chip,
      phone: phone,
      type: type,
      username: username || generateAutoUsername(name),
      password: password || '123456',
      balance: initBalance,
      monthlySessions: 0,
      role: 'MEMBER',
      status: 'ACTIVE',
      hasChangedPassword: false,
      mustChangePassword: true,
      permissions: getRoleDefaultPermissions('MEMBER')
    };
    AppState.members.push(newMember);

    if (initBalance > 0) {
      AppState.transactions.push({
        id: 'TX_' + Date.now(),
        date: getNowTimestampString(),
        type: 'TOPUP',
        categoryGroup: 'WALLET_TOPUP',
        subType: 'TOPUP',
        categoryName: 'Nạp ví ban đầu',
        amount: initBalance,
        targetName: name,
        memberId: newId,
        walletImpact: initBalance,
        fundImpact: 0,
        description: 'Số dư ví ban đầu khi tạo thành viên',
        operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
      });
    }
  }

  saveData();
  closeModal('memberModal');
  renderDashboard();
  renderMemberManagementList();
  showToast('Đã lưu thông tin thành viên thành công!', 'success');
}

function deleteMember(memberId) {
  if (!canManageMembers()) {
    showToast('⚠️ Bạn không có quyền xóa thành viên! Vui lòng đăng nhập tài khoản Quản lý.', 'warning');
    openLoginModal();
    return;
  }
  if (typeof assertRealtimeOnlineConnected === 'function' && !assertRealtimeOnlineConnected('xóa thành viên')) {
    return;
  }
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) return;

  if (isClubMasterAdmin(member)) {
    showToast('⚠️ Không thể xóa tài khoản Quản trị viên tối cao đang hoạt động!', 'error');
    return;
  }

  const confirmed = confirm(`Bạn có chắc chắn muốn xóa thành viên "${member.name}" khỏi danh sách CLB?`);
  if (!confirmed) return;

  AppState.members = AppState.members.filter(m => m.id !== memberId);
  saveData();
  renderDashboard();
  renderMemberManagementList();
  showToast(`🗑️ Đã xóa thành viên "${member.name}" thành công!`, 'info');
}

function toggleSelectAllMembers(isChecked) {
  const checkboxes = document.querySelectorAll('.member-select-checkbox');
  checkboxes.forEach(cb => {
    if (!cb.disabled) cb.checked = isChecked;
  });
  updateSelectedMembersCount();
}

function updateSelectedMembersCount() {
  const checkboxes = document.querySelectorAll('.member-select-checkbox:checked');
  const count = checkboxes.length;
  const btn = document.getElementById('btnDeleteSelectedMembers');
  const badge = document.getElementById('selectedMembersCountBadge');
  const selectAllCb = document.getElementById('selectAllMembersCheckbox');
  const allCheckboxes = document.querySelectorAll('.member-select-checkbox:not(:disabled)');

  if (badge) badge.textContent = count;
  if (btn) {
    if (count > 0) {
      btn.classList.remove('hidden');
      btn.classList.add('inline-flex');
    } else {
      btn.classList.add('hidden');
      btn.classList.remove('inline-flex');
    }
  }
  if (selectAllCb && allCheckboxes.length > 0) {
    selectAllCb.checked = count === allCheckboxes.length;
  }
}

function deleteSelectedMembers() {
  if (!canManageMembers()) {
    showToast('⚠️ Bạn không có quyền xóa thành viên! Vui lòng đăng nhập tài khoản Quản lý.', 'warning');
    openLoginModal();
    return;
  }
  if (typeof assertRealtimeOnlineConnected === 'function' && !assertRealtimeOnlineConnected('xóa các thành viên đã chọn')) {
    return;
  }
  const checkboxes = document.querySelectorAll('.member-select-checkbox:checked');
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);
  if (selectedIds.length === 0) {
    showToast('⚠️ Vui lòng tích chọn ít nhất một thành viên để xóa!', 'warning');
    return;
  }

  const membersToDelete = AppState.members.filter(m => selectedIds.includes(m.id) && !isClubMasterAdmin(m));
  if (membersToDelete.length === 0) {
    showToast('⚠️ Không có thành viên hợp lệ để xóa (Không thể xóa tài khoản Admin)!', 'warning');
    return;
  }

  const namesPreview = membersToDelete.slice(0, 5).map(m => m.name).join(', ') + (membersToDelete.length > 5 ? ` và ${membersToDelete.length - 5} người khác` : '');
  const confirmed = confirm(`Bạn có chắc chắn muốn xóa ${membersToDelete.length} thành viên đã chọn:\n[ ${namesPreview} ]\nkhỏi danh sách CLB?`);
  if (!confirmed) return;

  const deleteIdSet = new Set(membersToDelete.map(m => m.id));
  AppState.members = AppState.members.filter(m => !deleteIdSet.has(m.id));
  saveData();
  renderDashboard();
  renderMemberManagementList();
  showToast(`🗑️ Đã xóa thành công ${membersToDelete.length} thành viên đã chọn!`, 'success');
}

// ==========================================
// 15.1 NHẬP NHANH DANH SÁCH THÀNH VIÊN TỪ ZALO / EXCEL (BATCH IMPORT)
// ==========================================
function openBatchImportMemberModal() {
  if (!canManageMembers()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Quản lý để nhập danh sách thành viên!', 'warning');
    openLoginModal();
    return;
  }
  const textarea = document.getElementById('batchMemberTextarea');
  const previewArea = document.getElementById('batchMemberPreviewArea');
  const previewList = document.getElementById('batchMemberPreviewList');
  const countBadge = document.getElementById('batchMemberCountBadge');

  if (textarea) textarea.value = '';
  if (previewArea) previewArea.classList.add('hidden');
  if (previewList) previewList.innerHTML = '';
  if (countBadge) countBadge.textContent = '0 người';

  openModal('modalBatchImportMembers');
}

function parseBatchMemberLines(text) {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result = [];
  const existingNames = new Set((AppState.members || []).map(m => (m.name || '').trim().toLowerCase()));

  lines.forEach((rawLine, idx) => {
    // 1. Loại bỏ số thứ tự ở đầu dòng: "1.", "1/", "1-", "1)", "1 "
    let clean = rawLine.replace(/^[\d\s\.\/\-\+\:\)]+/, '').trim();
    if (!clean) return;

    // 2. Tìm số điện thoại
    let phone = '';
    const phoneMatch = clean.match(/(0\d{2,3}[\.\s\-]?\d{3}[\.\s\-]?\d{3,4}|0\d{9,10})/);
    if (phoneMatch) {
      phone = phoneMatch[0].replace(/[\.\s\-]/g, '');
      clean = clean.replace(phoneMatch[0], '').trim();
    }

    // 3. Phân loại thành viên
    let type = 'OFFICIAL';
    const lowerClean = clean.toLowerCase();
    if (lowerClean.includes('danh dự') || lowerClean.includes('danh du') || lowerClean.includes('dự bị') || lowerClean.includes('du bi') || lowerClean.includes('honorary')) {
      type = 'HONORARY';
      clean = clean.replace(/[\(\[\{]?(?:thành viên\s+)?(?:danh dự|danh du|dự bị|du bi|honorary)[\)\]\}]?/gi, '').trim();
    } else if (lowerClean.includes('khách') || lowerClean.includes('khach') || lowerClean.includes('giao lưu') || lowerClean.includes('giao luu') || lowerClean.includes('guest')) {
      type = 'GUEST_B';
      clean = clean.replace(/[\(\[\{]?(?:khách|khach|giao lưu|giao luu|guest)[\)\]\}]?/gi, '').trim();
    } else {
      clean = clean.replace(/[\(\[\{]?(?:chính thức|chinh thuc|thành viên|official)[\)\]\}]?/gi, '').trim();
    }

    // 4. Làm sạch các ký tự phân cách còn sót lại: "-", ":", ","
    clean = clean.replace(/^[\-\:\,\.\s]+|[\-\:\,\.\s]+$/g, '').trim();
    if (!clean || clean.length < 2) return;

    // Chuẩn hóa chữ hoa đầu mỗi từ
    const words = clean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    const name = words.join(' ');
    const chipName = words[words.length - 1].toUpperCase();

    const isDup = existingNames.has(name.toLowerCase());

    result.push({
      id: 'M_' + (Date.now() + idx),
      name: name,
      chipName: chipName,
      phone: phone,
      type: type,
      username: generateAutoUsername(name),
      password: '123',
      isDuplicate: isDup
    });
  });

  return result;
}

let currentParsedBatchMembers = [];

function previewBatchImportMembers() {
  const textarea = document.getElementById('batchMemberTextarea');
  const previewArea = document.getElementById('batchMemberPreviewArea');
  const previewList = document.getElementById('batchMemberPreviewList');
  const countBadge = document.getElementById('batchMemberCountBadge');
  const confirmBtn = document.getElementById('btnConfirmBatchImport');

  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) {
    showToast('Vui lòng dán danh sách họ tên thành viên vào ô!', 'warning');
    return;
  }

  currentParsedBatchMembers = parseBatchMemberLines(text);

  if (currentParsedBatchMembers.length === 0) {
    showToast('Không nhận diện được thành viên nào từ nội dung dán vào!', 'warning');
    return;
  }

  if (countBadge) countBadge.textContent = `${currentParsedBatchMembers.length} người`;
  if (previewArea) previewArea.classList.remove('hidden');

  if (previewList) {
    previewList.innerHTML = currentParsedBatchMembers.map((m, idx) => `
      <div class="p-2 rounded-xl bg-white border ${m.isDuplicate ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'} flex items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">${idx + 1}</span>
          <div class="min-w-0">
            <div class="font-bold text-slate-900 flex items-center gap-1.5">
              <span class="truncate">${escapeHtml(m.name)}</span>
              ${m.isDuplicate ? '<span class="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[9px] font-bold">Trùng tên</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400">📞 ${m.phone || 'Chưa có SĐT'} • @${m.username}</div>
          </div>
        </div>
        <div class="shrink-0 text-right">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${m.type === 'OFFICIAL' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : (m.type === 'HONORARY' ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-amber-100 text-amber-800 border border-amber-300')}">
            ${m.type === 'OFFICIAL' ? 'Chính thức' : (m.type === 'HONORARY' ? 'Danh dự' : 'Khách')}
          </span>
        </div>
      </div>
    `).join('');
  }

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `<span>✓</span> <span>Xác nhận thêm ${currentParsedBatchMembers.length} thành viên vào CLB</span>`;
  }
}

function handleBatchImportMembersSubmit() {
  if (!canManageMembers()) {
    showToast('⚠️ Bạn không có quyền thực hiện thao tác này! Vui lòng đăng nhập tài khoản Quản lý.', 'error');
    openLoginModal();
    return;
  }
  if (!currentParsedBatchMembers || currentParsedBatchMembers.length === 0) {
    showToast('Chưa có danh sách thành viên để thêm!', 'warning');
    return;
  }

  const defaultInitBalance = Number(document.getElementById('batchMemberInitBalance')?.value) || 0;
  let addedCount = 0;

  if (!AppState.members) AppState.members = [];

  currentParsedBatchMembers.forEach((m, idx) => {
    // Tạo ID mới tuần tự
    const newId = 'M' + String(Date.now() + idx).slice(-4);
    const newMember = {
      id: newId,
      name: m.name,
      chipName: m.chipName,
      phone: m.phone,
      type: m.type,
      username: m.username,
      password: '123',
      balance: defaultInitBalance,
      monthlySessions: 0,
      role: 'MEMBER',
      status: 'ACTIVE',
      hasChangedPassword: false,
      mustChangePassword: true,
      permissions: getRoleDefaultPermissions('MEMBER')
    };

    AppState.members.push(newMember);
    addedCount++;

    if (defaultInitBalance > 0) {
      if (!AppState.transactions) AppState.transactions = [];
      AppState.transactions.push({
        id: 'TX_' + Date.now() + '_' + idx,
        date: getNowTimestampString(),
        type: 'TOPUP',
        categoryGroup: 'WALLET_TOPUP',
        subType: 'TOPUP',
        categoryName: 'Nạp ví ban đầu',
        amount: defaultInitBalance,
        targetName: m.name,
        memberId: newId,
        walletImpact: defaultInitBalance,
        fundImpact: 0,
        description: 'Số dư ví ban đầu khi nhập thành viên',
        operator: (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin'
      });
    }
  });

  saveData();
  closeModal('modalBatchImportMembers');
  renderDashboard();
  renderMemberManagementList();
  renderAttendanceTab();

  showToast(`🎉 Chúc mừng! Đã thêm thành công ${addedCount} thành viên mới vào CLB!`, 'success');
}

// ==========================================
// 15.2 KHỞI TẠO LẠI DỮ LIỆU SẠCH 100% CHO CLB
// ==========================================
function resetToCleanNewClubData() {
  const activeClub = getActiveClub();
  const confirmed = confirm(
    `🧹 XÁC NHẬN KHỞI TẠO LẠI DỮ LIỆU SẠCH 100%:\n\n` +
    `Thao tác này sẽ dọn sạch toàn bộ các buổi cầu cũ, giao dịch cũ và đưa CLB "${activeClub.name}" về trạng thái hoạt động sạch ban đầu.\n\n` +
    `• Quỹ CLB & Quỹ tạm ứng = 0 đ\n` +
    `• Số buổi hoạt động = 0 buổi\n` +
    `• Danh sách thành viên: Chỉ giữ lại tài khoản Quản lý / Chủ nhiệm (@chinh)\n\n` +
    `Bạn có chắc chắn muốn làm mới sạch 100% để bắt đầu nhập dữ liệu mới thực tế không?`
  );
  if (!confirmed) return;

  AppState = JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
  saveData();
  applyThemeColor(AppState.config?.themeColor || 'emerald');

  try {
    const clubId = getActiveClubId();
    localStorage.removeItem('CLB_SESSION_' + clubId);
    localStorage.removeItem('CLB_SESSION_lap-tri');
    localStorage.removeItem('CLB_SESSION_club_laptri');
  } catch (e) {}

  clearActivitySessionState();
  initActivitySessionData(true);

  renderDashboard();
  renderMemberManagementList();
  renderFinanceTab();
  renderAttendanceTab();
  populateLeadershipSelects();

  showToast(`🎉 Đã làm mới dữ liệu CLB sạch 100%! Bạn có thể bắt đầu dán danh sách thành viên mới ngay.`, 'success');
}

// Khách giao lưu nhanh
function openAddGuestModal() {
  const nameEl = document.getElementById('guestName');
  const phoneEl = document.getElementById('guestPhone');
  const typeSelect = document.getElementById('guestTypeSelect');
  const warningEl = document.getElementById('guestNameWarning');

  if (nameEl) {
    nameEl.value = '';
    nameEl.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
  }
  if (phoneEl) phoneEl.value = '';
  if (warningEl) {
    warningEl.textContent = '';
    warningEl.classList.add('hidden');
  }

  if (typeSelect) {
    const prices = (AppState.config && AppState.config.guestPrices) || { GUEST_A: 90000, GUEST_B: 70000, GUEST_C: 50000 };
    const pA = prices.GUEST_A || 90000;
    const pB = prices.GUEST_B || 70000;
    const pC = prices.GUEST_C || 50000;
    typeSelect.innerHTML = `
      <option value="GUEST_A">Khách Loại A (Level A · ${formatMoney(pA)})</option>
      <option value="GUEST_B" selected>Khách Loại B (Level B · ${formatMoney(pB)})</option>
      <option value="GUEST_C">Khách Loại C (Level C · ${formatMoney(pC)})</option>
    `;
    typeSelect.value = 'GUEST_B';
  }
  updateGuestPricePreview();
  openModal('addGuestModal');
}

function updateGuestPricePreview() {
  const select = document.getElementById('guestTypeSelect');
  const type = select ? select.value : 'GUEST_B';
  const defaultPrices = { GUEST_A: 90000, GUEST_B: 70000, GUEST_C: 50000 };
  const price = (AppState.config && AppState.config.guestPrices && AppState.config.guestPrices[type]) || defaultPrices[type] || 70000;
  const preview = document.getElementById('guestPricePreview');
  if (preview) preview.textContent = formatMoney(price);
}

function handleAddGuestSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('guestName').value.trim();
  const phone = document.getElementById('guestPhone').value.trim();
  const type = document.getElementById('guestTypeSelect').value;

  if (!name) {
    showToast('Vui lòng nhập tên khách giao lưu!', 'warning');
    return;
  }

  // Không cho phép đặt trùng tên thành viên / khách đã có trong CLB
  const dupGuest = findDuplicateMemberName(name, null);
  if (dupGuest) {
    showToast(`⚠️ Tên khách "${name}" đã tồn tại trong danh sách CLB! Vui lòng đặt tên khác hoặc thêm biệt danh phân biệt.`, 'warning');
    validateGuestModalName();
    const guestInput = document.getElementById('guestName');
    if (guestInput) guestInput.focus();
    return;
  }

  const chip = name.trim().split(/\s+/).pop().toUpperCase();
  const levelLetter = type.replace('GUEST_', '');
  const prices = (AppState.config && AppState.config.guestPrices) || { GUEST_A: 90000, GUEST_B: 70000, GUEST_C: 50000 };
  const fee = prices[type] || (type === 'GUEST_A' ? 90000 : (type === 'GUEST_B' ? 70000 : 50000));

  const newGuest = {
    id: 'GUEST_' + Date.now(),
    name: name,
    chipName: chip,
    phone: phone,
    type: type,
    level: levelLetter,
    fee: fee,
    username: '',
    password: '',
    balance: 0,
    monthlySessions: 0,
    role: 'MEMBER',
    status: 'ACTIVE',
    permissions: getRoleDefaultPermissions('MEMBER')
  };

  AppState.members.push(newGuest);
  saveData();
  closeModal('addGuestModal');
  renderDashboard();
  renderAttendanceChecklist();
  renderMemberManagementList();
  showToast(`Đã thêm khách giao lưu ${name} (Level ${levelLetter}) thành công!`, 'success');
}

// ==========================================
// 15.5 PHÂN HỆ QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & CẤP QUYỀN SỬ DỤNG
// ==========================================
let currentUserAccessRoleFilter = 'ALL';
let currentSelectedModalPreset = 'ADMIN';

function setUserAccessRoleFilter(role) {
  currentUserAccessRoleFilter = role;
  const roles = ['ALL', 'ADMIN', 'VICE_ADMIN', 'TREASURER', 'REFEREE', 'MEMBER'];
  roles.forEach(r => {
    const btn = document.getElementById(`btnAccessFilter-${r}`);
    if (btn) {
      if (r === role) {
        btn.className = 'px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer bg-purple-700 text-white border-purple-700 shadow-2xs';
      } else {
        btn.className = 'px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
      }
    }
  });
  renderUserAccessTable();
}

function renderUserAccessTable() {
  const container = document.getElementById('userAccessTableContainer');
  if (!container) return;

  const members = AppState.members || [];

  // Thống kê số lượng tài khoản theo vai trò
  let adminCount = 0;
  let viceCount = 0;
  let treasurerCount = 0;
  let refereeCount = 0;
  let memberCount = 0;
  let lockedCount = 0;

  members.forEach(m => {
    const r = m.role || 'MEMBER';
    if (r === 'ADMIN') adminCount++;
    else if (r === 'VICE_ADMIN') viceCount++;
    else if (r === 'TREASURER') treasurerCount++;
    else if (r === 'REFEREE') refereeCount++;
    else memberCount++;

    if (m.status === 'LOCKED') lockedCount++;
  });

  const statAdminEl = document.getElementById('accessStatAdmin');
  if (statAdminEl) statAdminEl.textContent = adminCount;
  const statViceEl = document.getElementById('accessStatVice');
  if (statViceEl) statViceEl.textContent = viceCount;
  const statTreasurerEl = document.getElementById('accessStatTreasurer');
  if (statTreasurerEl) statTreasurerEl.textContent = treasurerCount;
  const statRefereeEl = document.getElementById('accessStatReferee');
  if (statRefereeEl) statRefereeEl.textContent = refereeCount;
  const statMemberEl = document.getElementById('accessStatMember');
  if (statMemberEl) statMemberEl.textContent = memberCount;
  const statLockedEl = document.getElementById('accessStatLocked');
  if (statLockedEl) statLockedEl.textContent = lockedCount;

  const filterCountAllEl = document.getElementById('filterCountAll');
  if (filterCountAllEl) filterCountAllEl.textContent = members.length;

  // Đổ danh sách vào bộ chuyển đổi tài khoản / vai trò giả lập (quick switcher)
  const activeRoleSelect = document.getElementById('configActiveRoleSelect');
  if (activeRoleSelect) {
    const currentLoggedUser = AppState.auth?.user;
    const currentRole = getCurrentUserRole();
    let selHtml = `
      <optgroup label="🎭 1. Trải Nghiệm Thử Theo Vai Trò Chuẩn">
        <option value="ROLE_ADMIN" ${currentRole === 'ADMIN' && (!currentLoggedUser?.id || currentLoggedUser.id === 'M001') ? 'selected' : ''}>👑 Quản lý (Toàn quyền 6/6)</option>
        <option value="ROLE_VICE_ADMIN" ${currentRole === 'VICE_ADMIN' ? 'selected' : ''}>🛡️ Phó nhóm (Điểm danh, Giải đấu, Trọng tài)</option>
        <option value="ROLE_TREASURER" ${currentRole === 'TREASURER' ? 'selected' : ''}>💰 Thủ quỹ (Quản lý Quỹ, Nạp ví, Tất toán)</option>
        <option value="ROLE_REFEREE" ${currentRole === 'REFEREE' ? 'selected' : ''}>⚖️ Trọng tài (Nhập điểm số & Điều hành sân)</option>
        <option value="ROLE_MEMBER" ${currentRole === 'MEMBER' ? 'selected' : ''}>👤 Hội viên thường (Chỉ xem cá nhân)</option>
      </optgroup>
      <optgroup label="👤 2. Đăng Nhập Đúng Tài Khoản Từng Thành Viên">
    `;
    members.forEach(m => {
      const isCur = currentLoggedUser && currentLoggedUser.id === m.id;
      const roleDef = ROLE_DEFINITIONS[m.role] || ROLE_DEFINITIONS.MEMBER;
      selHtml += `<option value="MEMBER_${m.id}" ${isCur ? 'selected' : ''}>${roleDef.icon} ${escapeHtml(m.name)} (@${m.username || 'chưa_tạo'}${m.status === 'LOCKED' ? ' - 🔒 Khóa' : ''})</option>`;
    });
    selHtml += `</optgroup>`;
    activeRoleSelect.innerHTML = selHtml;
  }

  // Lọc danh sách thành viên theo tab và từ khóa
  const searchInput = document.getElementById('searchUserAccessInput');
  const query = (searchInput?.value || '').toLowerCase().trim();

  const filtered = members.filter(m => {
    if (currentUserAccessRoleFilter !== 'ALL') {
      const r = m.role || 'MEMBER';
      if (r !== currentUserAccessRoleFilter) return false;
    }
    if (query) {
      const matchName = m.name && m.name.toLowerCase().includes(query);
      const matchUser = m.username && m.username.toLowerCase().includes(query);
      const matchPhone = m.phone && m.phone.includes(query);
      const matchChip = m.chipName && m.chipName.toLowerCase().includes(query);
      if (!matchName && !matchUser && !matchPhone && !matchChip) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center">
        <span class="text-4xl block mb-2">🔍</span>
        <h4 class="font-bold text-slate-800 text-sm">Không tìm thấy tài khoản nào phù hợp</h4>
        <p class="text-xs text-slate-500 mt-1">Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.</p>
      </div>
    `;
    return;
  }

  let tableHtml = `
    <table class="w-full text-left text-xs whitespace-nowrap">
      <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
        <tr>
          <th class="py-3 px-3.5">Thành viên CLB</th>
          <th class="py-3 px-3">Tài khoản & Mật khẩu</th>
          <th class="py-3 px-3">Vai trò chính</th>
          <th class="py-3 px-3">Quyền sử dụng cấp phát</th>
          <th class="py-3 px-3 text-center">Trạng thái</th>
          <th class="py-3 px-3 text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
  `;

  filtered.forEach(m => {
    const role = m.role || 'MEMBER';
    const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.MEMBER;
    const isLocked = m.status === 'LOCKED';
    const isCurrentLoggedIn = AppState.auth?.user?.id === m.id || (AppState.auth?.user?.username === m.username && m.username);

    // Xử lý huy hiệu quyền hạn
    const perms = m.permissions || getRoleDefaultPermissions(role);
    const activePermKeys = PERMISSION_KEYS.filter(k => perms[k] === true);

    let permsHtml = '';
    if (role === 'ADMIN' || activePermKeys.length === 6) {
      permsHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">👑 Toàn quyền (6/6)</span>`;
    } else if (activePermKeys.length === 0) {
      permsHtml = `<span class="text-[11px] text-slate-400 italic">Chỉ xem (Không cấp quyền thao tác)</span>`;
    } else {
      permsHtml = `<div class="flex flex-wrap items-center gap-1 max-w-xs">`;
      activePermKeys.forEach(pk => {
        const pDef = PERMISSION_DEFINITIONS[pk];
        permsHtml += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200" title="${pDef.desc}">${pDef.icon} ${pDef.label}</span>`;
      });
      permsHtml += `</div>`;
    }

    // Huy hiệu vai trò
    const roleBadgeHtml = `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${roleDef.badgeClass}">
        <span>${roleDef.icon}</span>
        <span>${roleDef.label}</span>
      </span>
    `;

    // Huy hiệu trạng thái
    const statusBadgeHtml = isLocked
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">🔒 Đã khóa</span>`
      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Hoạt động</span>`;

    const rowBg = isCurrentLoggedIn ? 'bg-purple-50/60' : (isLocked ? 'bg-rose-50/30' : 'hover:bg-slate-50/80');

    tableHtml += `
      <tr class="${rowBg} transition">
        <td class="py-2.5 px-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
              ${escapeHtml(m.chipName ? m.chipName.charAt(0) : m.name.charAt(0))}
            </div>
            <div>
              <div class="font-bold text-slate-900 flex items-center gap-1.5">
                <span>${escapeHtml(m.name)}</span>
                ${isCurrentLoggedIn ? `<span class="px-1.5 py-0.2 bg-purple-200 text-purple-900 rounded text-[9px] font-black uppercase">Đang đăng nhập</span>` : ''}
              </div>
              <div class="text-[11px] text-slate-400 flex items-center gap-2">
                <span>ID: ${m.id}</span>
                ${m.phone ? `<span>• 📞 ${m.phone}</span>` : ''}
              </div>
            </div>
          </div>
        </td>

        <td class="py-2.5 px-3 font-mono">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">@${escapeHtml(m.username || 'chưa_tạo')}</span>
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5">MK: ${escapeHtml(m.password || '123456')}</div>
        </td>

        <td class="py-2.5 px-3">
          ${roleBadgeHtml}
        </td>

        <td class="py-2.5 px-3">
          ${permsHtml}
        </td>

        <td class="py-2.5 px-3 text-center">
          ${statusBadgeHtml}
        </td>

        <td class="py-2.5 px-3 text-center">
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <button type="button" onclick="openUserAccessModal('${m.id}')" class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Chỉnh sửa quyền sử dụng & tài khoản">
              <span>🔑</span>
              <span>Cấp quyền</span>
            </button>
            <button type="button" onclick="loginAsMemberAccount('${m.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Đăng nhập thử vai trò của thành viên này">
              <span>🎭</span>
              <span>Đăng nhập</span>
            </button>
            <button type="button" onclick="toggleUserAccountLock('${m.id}')" class="px-2 py-1 ${isLocked ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'} rounded-lg font-bold text-[11px] transition cursor-pointer shadow-2xs" title="${isLocked ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản'}">
              <span>${isLocked ? '🔓 Mở' : '🔒 Khóa'}</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;
  lucide.createIcons();
}

function openCreateUserAccessModal() {
  const members = AppState.members || [];
  const m = members[0];
  if (m) {
    openUserAccessModal(m.id);
  }
}

function openUserAccessModal(memberId) {
  const members = AppState.members || [];
  const member = members.find(m => m.id === memberId) || members[0];
  if (!member) return;

  // Đổ danh sách vào select chọn thành viên
  const memberSelect = document.getElementById('accessEditMemberSelect');
  if (memberSelect) {
    const official = members.filter(m => m.type === 'OFFICIAL');
    const honorary = members.filter(m => m.type === 'HONORARY');
    const other = members.filter(m => m.type !== 'OFFICIAL' && m.type !== 'HONORARY');

    let html = '';
    if (official.length > 0) {
      html += `<optgroup label="Thành viên chính thức (${official.length} người)">`;
      official.forEach(item => {
        html += `<option value="${item.id}" ${item.id === member.id ? 'selected' : ''}>${escapeHtml(item.name)} (${escapeHtml(item.chipName || item.id)})</option>`;
      });
      html += `</optgroup>`;
    }
    if (honorary.length > 0) {
      html += `<optgroup label="Thành viên danh dự (${honorary.length} người)">`;
      honorary.forEach(item => {
        html += `<option value="${item.id}" ${item.id === member.id ? 'selected' : ''}>${escapeHtml(item.name)} (${escapeHtml(item.chipName || item.id)})</option>`;
      });
      html += `</optgroup>`;
    }
    if (other.length > 0) {
      html += `<optgroup label="Khách / Khác (${other.length} người)">`;
      other.forEach(item => {
        html += `<option value="${item.id}" ${item.id === member.id ? 'selected' : ''}>${escapeHtml(item.name || item.chipName || item.id)}</option>`;
      });
      html += `</optgroup>`;
    }
    memberSelect.innerHTML = html;
  }

  // Điền dữ liệu vào form
  const idInput = document.getElementById('accessEditMemberId');
  if (idInput) idInput.value = member.id;

  const userInput = document.getElementById('accessEditUsername');
  if (userInput) userInput.value = member.username || generateAutoUsername(member.name);

  const passInput = document.getElementById('accessEditPassword');
  if (passInput) passInput.value = member.password || '123456';

  const statusActive = document.getElementById('accessStatusActive');
  const statusLocked = document.getElementById('accessStatusLocked');
  if (member.status === 'LOCKED') {
    if (statusLocked) statusLocked.checked = true;
  } else {
    if (statusActive) statusActive.checked = true;
  }

  // Thiết lập quyền hạn & Preset vai trò
  const role = member.role || 'MEMBER';
  const perms = member.permissions || getRoleDefaultPermissions(role);

  const pAttendance = document.getElementById('permAttendance');
  if (pAttendance) pAttendance.checked = !!perms.attendance;
  const pFinance = document.getElementById('permFinance');
  if (pFinance) pFinance.checked = !!perms.finance;
  const pMember = document.getElementById('permMember');
  if (pMember) pMember.checked = !!perms.member;
  const pTour = document.getElementById('permTournament');
  if (pTour) pTour.checked = !!perms.tournament;
  const pRef = document.getElementById('permReferee');
  if (pRef) pRef.checked = !!perms.referee;
  const pConfig = document.getElementById('permConfig');
  if (pConfig) pConfig.checked = !!perms.config;

  highlightRolePresetButton(role);
  openModal('modalEditUserAccess');
}

function onAccessMemberSelectChanged(memberId) {
  openUserAccessModal(memberId);
}

function highlightRolePresetButton(role) {
  currentSelectedModalPreset = role;
  const presets = ['ADMIN', 'VICE_ADMIN', 'TREASURER', 'REFEREE', 'MEMBER', 'CUSTOM'];
  presets.forEach(p => {
    const btn = document.getElementById(`btnPreset-${p}`);
    if (btn) {
      if (p === role) {
        btn.className = 'p-2 rounded-xl border text-left font-bold transition cursor-pointer flex flex-col justify-between ring-2 ring-purple-600 bg-purple-50 text-purple-950 border-purple-400 shadow-xs';
      } else {
        btn.className = 'p-2 rounded-xl border text-left font-bold transition cursor-pointer flex flex-col justify-between hover:border-slate-300 bg-white text-slate-700 border-slate-200';
      }
    }
  });
}

function applyRolePreset(role) {
  highlightRolePresetButton(role);
  if (role === 'CUSTOM') return;

  const defaults = getRoleDefaultPermissions(role);
  const pAtt = document.getElementById('permAttendance');
  if (pAtt) pAtt.checked = defaults.attendance;
  const pFin = document.getElementById('permFinance');
  if (pFin) pFin.checked = defaults.finance;
  const pMem = document.getElementById('permMember');
  if (pMem) pMem.checked = defaults.member;
  const pTour = document.getElementById('permTournament');
  if (pTour) pTour.checked = defaults.tournament;
  const pRef = document.getElementById('permReferee');
  if (pRef) pRef.checked = defaults.referee;
  const pCfg = document.getElementById('permConfig');
  if (pCfg) pCfg.checked = defaults.config;
}

function onCustomPermChanged() {
  highlightRolePresetButton('CUSTOM');
}

function setQuickDefaultPassword() {
  const p = document.getElementById('accessEditPassword');
  if (p) p.value = '123456';
  showToast('Đã áp dụng mật khẩu mặc định: 123456', 'info');
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function handleSaveUserAccessSubmit(e) {
  e.preventDefault();
  const memberId = document.getElementById('accessEditMemberId').value;
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) {
    showToast('Lỗi: Không tìm thấy thành viên tương ứng!', 'error');
    return;
  }

  const username = document.getElementById('accessEditUsername').value.trim();
  const password = document.getElementById('accessEditPassword').value.trim();
  const status = document.querySelector('input[name="accessEditStatus"]:checked')?.value || 'ACTIVE';

  if (!username) {
    showToast('Vui lòng nhập tên đăng nhập (Username)!', 'warning');
    return;
  }
  if (!password) {
    showToast('Vui lòng nhập mật khẩu tài khoản!', 'warning');
    return;
  }

  // Kiểm tra trùng username với người khác
  const dup = AppState.members.find(m => m.id !== member.id && m.username && m.username.toLowerCase() === username.toLowerCase());
  if (dup) {
    showToast(`Tên đăng nhập "${username}" đã được sử dụng bởi ${dup.name}! Vui lòng chọn tên khác.`, 'error');
    return;
  }

  const permissions = {
    attendance: !!document.getElementById('permAttendance')?.checked,
    finance: !!document.getElementById('permFinance')?.checked,
    member: !!document.getElementById('permMember')?.checked,
    tournament: !!document.getElementById('permTournament')?.checked,
    referee: !!document.getElementById('permReferee')?.checked,
    config: !!document.getElementById('permConfig')?.checked
  };

  // Xác định vai trò tương ứng
  let role = currentSelectedModalPreset;
  if (role === 'CUSTOM') {
    const allChecked = Object.values(permissions).every(Boolean);
    if (allChecked) role = 'ADMIN';
    else role = 'CUSTOM';
  }

  const oldPassword = member.password;
  member.username = username;
  member.password = password;
  if (oldPassword !== password || password === '123' || password === '123456') {
    member.hasChangedPassword = false;
    member.mustChangePassword = true;
  }
  member.status = status;
  member.role = role;
  member.permissions = permissions;

  // Cập nhật phiên đăng nhập hiện tại nếu trùng tài khoản
  if (AppState.auth && AppState.auth.user && AppState.auth.user.id === member.id) {
    AppState.auth.user.username = username;
    AppState.auth.user.role = role;
    AppState.auth.user.permissions = permissions;
  }

  // Đồng bộ phân quyền thời gian thực lên Google Firebase (Memberships node)
  if (firebaseDb) {
    try {
      const club = getActiveClub();
      const cleanSlug = getCanonicalClubSlug(club?.accessSlug || club?.id || 'lap-tri');
      const targetKey = member.firebaseUid || member.username || member.id;
      const memPayload = {
        role: role,
        status: status,
        permissions: permissions,
        name: member.name,
        username: member.username,
        updatedAt: Date.now()
      };
      firebaseDb.ref('memberships/' + cleanSlug + '/' + targetKey).set(memPayload).catch(() => {});
      if (member.firebaseUid && member.firebaseUid !== targetKey) {
        firebaseDb.ref('memberships/' + cleanSlug + '/' + member.firebaseUid).set(memPayload).catch(() => {});
      }
    } catch (fbErr) {
      console.warn('Lỗi ghi membership lên Firebase:', fbErr);
    }
  }

  saveData();
  closeModal('modalEditUserAccess');
  renderUserAccessTable();
  renderMemberManagementList();
  renderAuthBadge();
  renderAttendanceRoleBanner();

  showToast(`✓ Đã lưu thành công quyền sử dụng & tài khoản cho ${member.name}!`, 'success');
}

function autoSetupAllMemberAccounts() {
  const members = AppState.members || [];
  let updatedCount = 0;

  members.forEach(m => {
    let changed = false;
    if (!m.username) {
      m.username = generateAutoUsername(m.name || m.id);
      changed = true;
    }
    if (!m.password) {
      m.password = '123456';
      changed = true;
    }
    if (!m.role) {
      if (m.id === 'M001') m.role = 'ADMIN';
      else if (m.id === 'M002' || m.id === 'M003') m.role = 'VICE_ADMIN';
      else if (m.id === 'M005') m.role = 'TREASURER';
      else if (m.id === 'M004') m.role = 'REFEREE';
      else m.role = 'MEMBER';
      changed = true;
    }
    if (!m.permissions) {
      m.permissions = getRoleDefaultPermissions(m.role);
      changed = true;
    }
    if (!m.status) {
      m.status = 'ACTIVE';
      changed = true;
    }
    if (changed) updatedCount++;
  });

  saveData();
  renderUserAccessTable();
  renderMemberManagementList();
  showToast(`✓ Đã tự động tạo tài khoản & mật khẩu (123456) cho toàn bộ ${members.length} thành viên!`, 'success');
}

function toggleUserAccountLock(memberId) {
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) return;

  if (member.role === 'ADMIN' && member.status !== 'LOCKED') {
    const adminCount = AppState.members.filter(m => m.role === 'ADMIN' && m.status !== 'LOCKED').length;
    if (adminCount <= 1) {
      showToast('Không thể khóa tài khoản Quản lý duy nhất của CLB!', 'warning');
      return;
    }
  }

  member.status = member.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
  saveData();
  renderUserAccessTable();
  const msg = member.status === 'LOCKED'
    ? `🔒 Đã tạm khóa tài khoản của ${member.name}!`
    : `🔓 Đã mở khóa tài khoản của ${member.name}!`;
  showToast(msg, 'info');
}

// Cấp lại mật khẩu (Tích hợp mở modal phân quyền đầy đủ)
function openResetPasswordModal(memberId) {
  openUserAccessModal(memberId);
}

function handleResetPasswordSubmit(e) {
  handleSaveUserAccessSubmit(e);
}

// ==========================================
// 15.5 PHÂN HỆ QUẢN LÝ ĐA CÂU LẠC BỘ (MULTI-CLUB SWITCHER & ACCOUNTS)
// Cho phép tạo thêm CLB mới (Quỹ, Thành viên, Tài khoản Quản lý riêng) và chuyển đổi linh hoạt
// ==========================================

// renderAuthBadge chính thức được khai báo tại mục 18 (XÁC THỰC & ĐĂNG NHẬP)

function renderClubSwitcher() {
  const container = document.getElementById('headerClubSwitcherContainer');

  const registry = getClubsRegistry();
  const activeClub = getActiveClub();
  const isHideDemo = localStorage.getItem('CLB_HIDE_DEV_DEMO') === 'true';
  const visibleClubs = isHideDemo
    ? registry.filter(c => !c.isDeveloperSample && c.id !== 'club_smash' && c.id !== 'club_lightning')
    : registry;
  const listToRender = visibleClubs.length > 0 ? visibleClubs : registry;

  // Cập nhật biểu tượng và tên trên Header
  const iconEl = document.getElementById('headerClubIconSpan');
  if (iconEl) iconEl.textContent = activeClub.logoIcon || '🏸';

  const nameEl = document.getElementById('headerClubName');
  if (nameEl) nameEl.textContent = AppState.config?.clubName || activeClub.name;

  const subTitleEl = document.getElementById('headerClubSubTitle');
  if (subTitleEl) subTitleEl.textContent = '';

  if (!container) return;

  let optionsHtml = listToRender.map(c => `
    <option value="${c.id}" ${c.id === activeClub.id ? 'selected' : ''} class="text-slate-900 font-bold py-1">
      ${c.logoIcon || '🏸'} ${c.shortName || c.name}
    </option>
  `).join('');

  container.innerHTML = `
    <div class="flex items-center gap-1 bg-slate-100/90 hover:bg-slate-200/60 border border-slate-300/80 rounded-xl p-0.5 sm:p-1 transition shadow-2xs">
      <div class="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 text-xs">
        <span class="text-sm select-none" id="headerSwitcherActiveIcon">${activeClub.logoIcon || '🏸'}</span>
        <select id="headerClubSelect" onchange="switchActiveClub(this.value)" class="bg-transparent font-black text-xs text-slate-900 border-none outline-none cursor-pointer max-w-[100px] sm:max-w-[155px] md:max-w-[190px] truncate" title="Chuyển đổi Câu Lạc Bộ">
          ${optionsHtml}
        </select>
      </div>
      <button type="button" onclick="openClubShortcutGuideModal()" class="px-2 py-1 bg-white hover:bg-slate-50 text-purple-900 border border-purple-200 font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer shrink-0" title="Tạo lối tắt ra màn hình chính & Lấy link CLB này">
        <span>📱</span>
        <span class="hidden xl:inline">Lối tắt</span>
      </button>
      <button type="button" onclick="openCreateClubModal()" class="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer shrink-0" title="Tạo tài khoản Câu Lạc Bộ mới">
        <span>➕</span>
        <span class="hidden md:inline">Tạo CLB</span>
      </button>
    </div>
  `;
}

function switchActiveClub(clubId) {
  const registry = getClubsRegistry();
  const targetClub = registry.find(c => c.id === clubId || c.accessSlug === clubId);
  if (!targetClub) {
    showToast('Không tìm thấy thông tin Câu Lạc Bộ!', 'error');
    return;
  }

  // 1. Lưu lại trạng thái CLB HIỆN TẠI vào đúng storageKey hiện tại của nó (tránh ghi đè sang CLB mới)
  // 1. Lưu lại trạng thái CLB HIỆN TẠI vào đúng storageKey hiện tại của nó (tránh ghi đè sang CLB mới)
  const curKey = STORAGE_KEY || getCurrentClubStorageKey();
  if (curKey && curKey !== targetClub.storageKey && AppState && Object.keys(AppState).length > 0) {
    try {
      localStorage.setItem(curKey, JSON.stringify(AppState));
    } catch (e) {}
  }

  // 2. Chuyển đổi mã CLB tích cực & cập nhật URL
  setActiveClubId(targetClub.id);
  STORAGE_KEY = targetClub.storageKey;
  updateClubUrlParam(targetClub.accessSlug || targetClub.id);

  // 3. Tải dữ liệu của CLB đích
  loadData();
  initActivitySessionData(true);

  // 4. Đồng bộ Theme màu & Header
  applyThemeColor(AppState.config?.themeColor || targetClub.themeColor || 'emerald');

  const nameEl = document.getElementById('headerClubName');
  if (nameEl) nameEl.textContent = AppState.config?.clubName || targetClub.name;

  const iconEl = document.getElementById('headerClubIconSpan');
  if (iconEl) iconEl.textContent = targetClub.logoIcon || '🏸';

  // 5. Render lại toàn bộ giao diện của phân hệ đang mở
  renderClubSwitcher();
  renderDashboard();
  populateLeadershipSelects();

  if (currentTab === 'attendance') renderAttendanceTab();
  else if (currentTab === 'finance') renderFinanceTab();
  else if (currentTab === 'members') renderMemberManagementList();
  else if (currentTab === 'tournament') renderTournamentModule();
  else if (currentTab === 'settings') renderSettingsTab();

  // Chuyển kênh đồng bộ đám mây sang CLB mới
  if (typeof subscribeToCloudClub === 'function') {
    subscribeToCloudClub(targetClub.accessSlug || targetClub.id);
  }

  showToast(`✓ Đã chuyển sang Câu Lạc Bộ: ${targetClub.name}`, 'success');
}

function clearClubInputError(el) {
  if (!el) return;
  el.style.removeProperty('border');
  el.style.removeProperty('box-shadow');
  el.style.removeProperty('background-color');
}

function setClubInputError(el) {
  if (!el) return;
  el.style.setProperty('border', '2px solid #f43f5e', 'important');
  el.style.setProperty('box-shadow', '0 0 0 4px rgba(244, 63, 94, 0.25)', 'important');
  el.style.setProperty('background-color', '#fff1f2', 'important');
}

// ==========================================
// 15.6 QUẢN TRỊ VIÊN NHÀ PHÁT TRIỂN & BẢO VỆ TẠO CLB (DEV SUPER ADMIN GUARD)
// ==========================================

function isDeveloperAdmin() {
  try {
    const sessionActive = localStorage.getItem(DEV_ADMIN_SESSION_KEY) === 'true';
    const isDevRole = AppState?.auth?.isLoggedIn && AppState?.auth?.user?.role === 'DEV_ADMIN';
    if (sessionActive && (!AppState.auth || !AppState.auth.isLoggedIn || AppState?.auth?.user?.role !== 'DEV_ADMIN')) {
      if (!AppState.auth) AppState.auth = {};
      AppState.auth.isLoggedIn = true;
      AppState.auth.user = {
        id: 'DEV_001',
        username: 'developer',
        role: 'DEV_ADMIN',
        name: 'Nhà Phát Triển (Super Admin)',
        permissions: getRoleDefaultPermissions('DEV_ADMIN')
      };
    }
    return sessionActive || isDevRole;
  } catch (e) {
    return false;
  }
}

/**
 * Kiểm tra xem người dùng có đang truy cập bằng đường link dành cho Nhà Phát Triển hay không
 * Hỗ trợ các định dạng:
 * 1. Pathname: /dev, /developer, /admin-dev, /super-admin
 * 2. Query param: ?dev=true, ?dev=1, ?developer=true, ?role=dev
 * 3. Hash: #/dev, #/developer, #dev
 */
function isDevAdminUrlAccess() {
  try {
    // 1. Kiểm tra query parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') || params.get('developer') || params.get('superadmin') || params.get('role') === 'dev') {
      return true;
    }
    // 2. Kiểm tra pathname
    if (window.location.pathname) {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (p === '/dev' || p === '/developer' || p === '/super-admin' || p.endsWith('/dev') || p.endsWith('/developer')) {
        return true;
      }
    }
    // 3. Kiểm tra hash
    if (window.location.hash) {
      const h = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
      if (h === 'dev' || h === 'developer' || h === 'superadmin' || h === 'super-admin') {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

/**
 * Trả về URL trực tiếp dẫn vào Cổng Quản Trị Nhà Phát Triển
 */
function getDeveloperPortalDirectUrl() {
  try {
    const origin = window.location.origin || '';
    if (origin && origin.includes('vercel.app')) {
      return `${origin}/dev`;
    }
    const base = window.location.href.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return `${base}?dev=true`;
  } catch (e) {
    return '/dev';
  }
}

function copyDeveloperPortalLink() {
  const url = getDeveloperPortalDirectUrl();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('📋 Đã sao chép link Cổng Nhà Phát Triển (/dev)!', 'success');
    }).catch(() => {
      prompt('Sao chép đường link Cổng Nhà Phát Triển:', url);
    });
  } else {
    prompt('Sao chép đường link Cổng Nhà Phát Triển:', url);
  }
}

function openDeveloperDirectUrl() {
  const url = getDeveloperPortalDirectUrl();
  window.location.href = url;
}

function handleDevPortalActionClick() {
  if (isDeveloperAdmin()) {
    if (confirm('Bạn có muốn đăng xuất / khóa phiên Admin Nhà phát triển để trở về vai trò thông thường không?')) {
      logoutDeveloperAdmin();
    }
  } else {
    openDevAdminAuthModal();
  }
}

function verifyDevAdminCredentials(username, password) {
  const u = (username || '').trim().toLowerCase();
  const p = (password || '').trim();
  // Tài khoản chính thức Nhà phát triển:
  // Tên đăng nhập: developer, dev, admin, superadmin
  // Mật khẩu: dev123, admin123, dev123456, developer123, 123456, 123
  const validUsers = ['developer', 'dev', 'admin', 'superadmin'];
  const validPass = ['dev123', 'admin123', 'dev123456', 'developer123', '123456', '123'];
  return validUsers.includes(u) && validPass.includes(p);
}

function loginAsDeveloperAdmin(username, password) {
  if (!verifyDevAdminCredentials(username, password)) {
    return false;
  }
  try {
    localStorage.setItem(DEV_ADMIN_SESSION_KEY, 'true');
    const u = (username || 'developer').trim();
    if (!AppState.auth) AppState.auth = {};
    AppState.auth.isLoggedIn = true;
    AppState.auth.user = {
      id: 'DEV_001',
      username: u,
      role: 'DEV_ADMIN',
      name: 'Nhà Phát Triển (Super Admin)',
      permissions: getRoleDefaultPermissions('DEV_ADMIN')
    };
    saveData();
  } catch (e) {}
  updateDevAdminUI();
  renderAuthBadge();
  renderSelfAttendanceBanner();
  renderActivityMemberChips();
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();
  return true;
}

function logoutDeveloperAdmin() {
  try {
    localStorage.removeItem(DEV_ADMIN_SESSION_KEY);
    if (AppState?.auth?.user?.role === 'DEV_ADMIN') {
      const activeClub = getActiveClub();
      const adminMem = AppState.members?.find(m => m.role === 'ADMIN') || AppState.members?.[0];
      const adminName = adminMem ? adminMem.name : (activeClub?.adminName || 'Quản lý');
      AppState.auth = {
        isLoggedIn: true,
        user: {
          id: adminMem ? adminMem.id : 'M001',
          username: adminMem ? adminMem.username : 'admin',
          role: 'ADMIN',
          name: `${adminName} (Quản lý)`,
          permissions: getRoleDefaultPermissions('ADMIN')
        }
      };
      saveData();
    }
  } catch (e) {}
  updateDevAdminUI();
  renderAuthBadge();
  renderSelfAttendanceBanner();
  renderActivityMemberChips();
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();
  showToast('Đã đăng xuất phiên Nhà phát triển. Trở về quyền Quản lý CLB thông thường.', 'info');
}

function openDevAdminAuthModal() {
  const errBox = document.getElementById('devAdminAuthError');
  if (errBox) {
    errBox.textContent = '';
    errBox.classList.add('hidden');
  }
  const uInput = document.getElementById('devAdminAuthUser');
  const pInput = document.getElementById('devAdminAuthPass');
  if (uInput && !uInput.value) uInput.value = 'developer';
  if (pInput && !pInput.value) pInput.value = 'dev123';
  openModal('modalDevAdminAuth');
  setTimeout(() => {
    if (pInput) pInput.focus();
  }, 100);
}

function fillSampleDevAdminCreds() {
  const u = document.getElementById('devAdminAuthUser');
  const p = document.getElementById('devAdminAuthPass');
  if (u) u.value = 'developer';
  if (p) p.value = 'dev123';
}

function fillQuickLogin(username, password) {
  const u = document.getElementById('loginUsername');
  const p = document.getElementById('loginPassword');
  if (u) u.value = username;
  if (p) p.value = password;
}

function handleDevAdminAuthSubmit(e) {
  if (e) e.preventDefault();
  const uInput = document.getElementById('devAdminAuthUser');
  const pInput = document.getElementById('devAdminAuthPass');
  const errBox = document.getElementById('devAdminAuthError');

  const u = uInput?.value.trim() || 'developer';
  const p = pInput?.value.trim() || 'dev123';

  if (loginAsDeveloperAdmin(u, p)) {
    closeModal('modalDevAdminAuth');
    showToast('✓ Xác thực Nhà phát triển thành công! Đã mở quyền Quản trị tối cao (Super Admin).', 'success');
    // Mở màn hình Cấu hình & Multi-Club Manager
    switchTab('settings');
    setTimeout(() => {
      const card = document.getElementById('devAdminPortalCard') || document.getElementById('multiClubListContainer');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  } else {
    if (errBox) {
      errBox.textContent = '❌ Tên đăng nhập hoặc mật khẩu Nhà phát triển không đúng! (Mặc định: developer / dev123)';
      errBox.classList.remove('hidden');
    } else {
      showToast('Tên đăng nhập hoặc mật khẩu Nhà phát triển không đúng!', 'error');
    }
  }
}

function updateDevAdminUI() {
  const isDev = isDeveloperAdmin();

  // 1. Badge trạng thái trong Settings
  const badge = document.getElementById('badgeDevAdminStatus');
  if (badge) {
    if (isDev) {
      badge.classList.remove('hidden');
      badge.className = 'px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 font-extrabold text-xs rounded-full flex items-center gap-1 shadow-2xs';
      badge.innerHTML = `<span>🚀</span><span>Nhà Phát Triển (Đang bật)</span>`;
    } else {
      badge.classList.add('hidden');
      badge.innerHTML = '';
    }
  }

  // 2. Nút chuyển phiên Dev Admin trong thanh điều khiển Settings
  const btnToggle = document.getElementById('btnToggleDevAdminSession');
  if (btnToggle) {
    if (isDev) {
      btnToggle.className = 'px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer';
      btnToggle.onclick = logoutDeveloperAdmin;
      btnToggle.innerHTML = `<span>🔒</span><span>Khóa quyền Dev</span>`;
    } else {
      btnToggle.className = 'px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer';
      btnToggle.onclick = openDevAdminAuthModal;
      btnToggle.innerHTML = `<span>🚀</span><span>Đăng nhập Admin Nhà Phát Triển</span>`;
    }
  }

  // 3. Nút Ẩn/Hiện CLB mẫu Dev
  const btnHideDemo = document.getElementById('btnToggleHideDevDemo');
  if (btnHideDemo) {
    if (isDev) {
      btnHideDemo.classList.remove('hidden');
    } else {
      btnHideDemo.classList.add('hidden');
    }
  }

  // 4. Nút Tạo CLB Mới trong Settings
  const btnCreate = document.getElementById('btnCreateClubInSettings');
  if (btnCreate) {
    if (isDev) {
      btnCreate.classList.remove('hidden');
      btnCreate.className = 'px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer';
      btnCreate.title = 'Khởi tạo CLB mới vào hệ thống';
      btnCreate.innerHTML = `<span>➕</span><span>Tạo Câu Lạc Bộ Mới</span>`;
    } else {
      btnCreate.classList.add('hidden');
    }
  }

  // 5. Cập nhật thẻ Developer Portal Card
  const liveBadge = document.getElementById('devPortalLiveBadge');
  const btnPortalStatus = document.getElementById('btnDevPortalStatusText');
  const urlDisplay = document.getElementById('devDirectUrlDisplay');

  if (liveBadge) {
    if (isDev) {
      liveBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase tracking-wider flex items-center gap-1';
      liveBadge.innerHTML = '<span>🟢</span><span>Đang Đăng Nhập</span>';
    } else {
      liveBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-400 text-purple-950 uppercase tracking-wider';
      liveBadge.textContent = 'Super Admin';
    }
  }

  if (btnPortalStatus) {
    btnPortalStatus.textContent = isDev ? 'Khóa quyền Dev' : 'Đăng nhập Dev';
  }

  if (urlDisplay) {
    urlDisplay.value = getDeveloperPortalDirectUrl();
  }

  // 6. Cập nhật giao diện Đa Câu Lạc Bộ
  if (typeof renderMultiClubSettingsSection === 'function') {
    renderMultiClubSettingsSection();
  }
}

function openCreateClubModal(skipGuard) {
  if (!skipGuard && !isDeveloperAdmin()) {
    showToast('⚠️ Bạn cần đăng nhập tài khoản Admin Nhà phát triển để tạo CLB mới!', 'warning');
    openDevAdminAuthModal();
    return;
  }

  const modal = document.getElementById('modalCreateNewClub');
  if (!modal) return;

  const modalBody = modal.querySelector('.overflow-y-auto');
  if (modalBody) modalBody.scrollTop = 0;

  const nameInput = document.getElementById('newClubName');
  const shortInput = document.getElementById('newClubShortName');
  const slugInput = document.getElementById('newClubAccessSlug');
  const logoInput = document.getElementById('newClubLogoIcon');
  const themeInput = document.getElementById('newClubThemeColor');
  const adminNameInput = document.getElementById('newClubAdminName');
  const adminEmailInput = document.getElementById('newClubAdminEmail');
  const adminPhoneInput = document.getElementById('newClubAdminPhone');
  const adminUserInput = document.getElementById('newClubAdminUsername');
  const adminPassInput = document.getElementById('newClubAdminPassword');
  const fundInput = document.getElementById('newClubInitialFund');
  const bankInput = document.getElementById('newClubBankInfo');

  [nameInput, shortInput, slugInput, adminNameInput, adminUserInput].forEach(clearClubInputError);

  if (nameInput) nameInput.value = '';
  if (shortInput) shortInput.value = '';
  if (slugInput) slugInput.value = '';
  updateNewClubSlugPreview('clb');
  if (logoInput) logoInput.value = '🏸';
  if (themeInput) themeInput.value = 'emerald';
  if (adminNameInput) adminNameInput.value = '';
  if (adminEmailInput) adminEmailInput.value = '';
  if (adminPhoneInput) adminPhoneInput.value = '';
  if (adminUserInput) adminUserInput.value = '';
  if (adminPassInput) adminPassInput.value = '123456';
  if (fundInput) fundInput.value = '0';
  if (bankInput) bankInput.value = '';

  const modeRadios = document.getElementsByName('newClubInitMode');
  for (const r of modeRadios) {
    r.checked = (r.value === 'FRESH');
  }

  selectClubModalIcon('🏸');
  modal.classList.remove('hidden');
}

function selectClubModalIcon(icon) {
  const input = document.getElementById('newClubLogoIcon');
  if (input) input.value = icon;

  document.querySelectorAll('.club-icon-choice').forEach(btn => {
    btn.className = 'club-icon-choice w-9 h-9 rounded-xl border border-slate-200 bg-white text-base flex items-center justify-center hover:bg-slate-50 transition cursor-pointer';
  });

  const activeBtn = document.getElementById(`clubIconBtn-${icon}`);
  if (activeBtn) {
    activeBtn.className = 'club-icon-choice w-9 h-9 rounded-xl border-2 border-emerald-600 bg-emerald-50 text-base flex items-center justify-center transition cursor-pointer shadow-2xs';
  }
}

function getSuggestedClubShortName(fullName) {
  if (!fullName) return '';
  let clean = fullName.replace(/^(clb\s+cầu\s+lông|câu\s+lạc\s+bộ\s+cầu\s+lông|clb|cầu\s+lông)\s*/i, '').trim();
  if (!clean) clean = fullName;
  return clean.toUpperCase();
}

function autoSuggestClubShortName(fullName) {
  const shortInput = document.getElementById('newClubShortName');
  if (!shortInput || !fullName) return;
  shortInput.value = getSuggestedClubShortName(fullName);
}

function autoSuggestClubAdminUsername(name) {
  const userInput = document.getElementById('newClubAdminUsername');
  if (!userInput || !name) return;
  const username = generateAutoUsername(name);
  userInput.value = username;
}

function onNewClubNameChanged(fullName) {
  autoSuggestClubShortName(fullName);
  const slugInput = document.getElementById('newClubAccessSlug');
  if (slugInput) {
    const slug = generateAccessSlug(fullName);
    slugInput.value = slug;
    updateNewClubSlugPreview(slug);
  }
}

function updateNewClubSlugPreview(slug) {
  const preview = document.getElementById('newClubSlugPreview');
  if (!preview) return;
  const cleanSlug = (slug || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const baseUrl = window.location.href.split('#')[0].split('?')[0];
  preview.textContent = `${baseUrl}?club=${encodeURIComponent(cleanSlug || 'clb')}`;
}

function handleCreateNewClubSubmit(event) {
  if (event) event.preventDefault();

  if (!isDeveloperAdmin()) {
    showToast('⛔ Quyền bị từ chối: Chỉ Admin Nhà phát triển mới có quyền khởi tạo CLB!', 'error');
    openDevAdminAuthModal();
    return;
  }

  const modal = document.getElementById('modalCreateNewClub');
  const modalBody = modal ? modal.querySelector('.overflow-y-auto') : null;

  const nameInput = document.getElementById('newClubName');
  const shortInput = document.getElementById('newClubShortName');
  const slugInput = document.getElementById('newClubAccessSlug');
  const logoInput = document.getElementById('newClubLogoIcon');
  const themeInput = document.getElementById('newClubThemeColor');
  const adminNameInput = document.getElementById('newClubAdminName');
  const adminEmailInput = document.getElementById('newClubAdminEmail');
  const adminPhoneInput = document.getElementById('newClubAdminPhone');
  const adminUserInput = document.getElementById('newClubAdminUsername');
  const adminPassInput = document.getElementById('newClubAdminPassword');
  const fundInput = document.getElementById('newClubInitialFund');
  const bankInput = document.getElementById('newClubBankInfo');

  // Reset highlight lỗi trước đó
  [nameInput, shortInput, slugInput, adminNameInput, adminUserInput].forEach(clearClubInputError);

  let name = nameInput?.value.trim() || '';
  let shortName = shortInput?.value.trim() || '';
  let accessSlug = slugInput?.value.trim().toLowerCase() || '';
  const logoIcon = logoInput?.value || '🏸';
  const themeColor = themeInput?.value || 'emerald';
  let adminName = adminNameInput?.value.trim() || '';
  let adminEmail = adminEmailInput?.value.trim() || '';
  const adminPhone = adminPhoneInput?.value.trim() || '';
  let adminUsername = adminUserInput?.value.trim() || '';
  const adminPassword = adminPassInput?.value.trim() || '123456';
  const initialFund = Number(fundInput?.value) || 0;
  const bankInfo = bankInput?.value.trim() || '';

  // 1. Bắt buộc Tên Câu Lạc Bộ
  if (!name) {
    if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    if (nameInput) {
      setClubInputError(nameInput);
      nameInput.focus();
    }
    showToast('Vui lòng nhập Tên Câu Lạc Bộ (*)!', 'warning');
    return;
  }

  // 2. Tự động tạo Tên viết tắt nếu chưa nhập
  if (!shortName) {
    shortName = getSuggestedClubShortName(name) || name.toUpperCase();
    if (shortInput) shortInput.value = shortName;
  }

  // 2.5 Tự động tạo Mã link riêng (Access Slug) nếu chưa nhập
  if (!accessSlug) {
    accessSlug = generateAccessSlug(name);
  }
  accessSlug = accessSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!accessSlug) {
    accessSlug = 'clb-' + Date.now();
  }

  // 3. Thông minh hóa: Kiểm tra Họ tên & Username Quản lý
  if (!adminName && !adminUsername) {
    if (modalBody && adminNameInput) {
      adminNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (adminNameInput) {
      setClubInputError(adminNameInput);
      adminNameInput.focus();
    }
    showToast('Vui lòng nhập Họ tên hoặc Tên đăng nhập Quản lý (*)!', 'warning');
    return;
  }

  // Nếu người dùng chỉ nhập Username (vd: tntoan) -> Tự động lấy làm Họ tên Quản lý
  if (!adminName && adminUsername) {
    adminName = adminUsername;
    if (adminNameInput) adminNameInput.value = adminName;
  }

  // Nếu người dùng chỉ nhập Họ tên -> Tự động tạo Username
  if (!adminUsername && adminName) {
    adminUsername = generateAutoUsername(adminName) || 'admin';
    if (adminUserInput) adminUserInput.value = adminUsername;
  }

  if (!adminEmail) {
    adminEmail = `${adminUsername.toLowerCase()}@${accessSlug}.clb`;
  }

  const modeRadios = document.getElementsByName('newClubInitMode');
  let initMode = 'FRESH';
  for (const r of modeRadios) {
    if (r.checked) { initMode = r.value; break; }
  }

  const cleanSlug = accessSlug;
  const clubId = 'club_' + cleanSlug;
  const storageKey = 'CLB_CAU_LONG_DATA_' + cleanSlug;

  // Xây dựng tài khoản Quản lý CLB mới
  const adminMemberId = 'M001';
  const adminChip = adminName.trim().split(/\s+/).pop().toUpperCase();
  const adminMember = {
    id: adminMemberId,
    name: adminName,
    chipName: adminChip,
    phone: adminPhone,
    email: adminEmail,
    type: 'OFFICIAL',
    username: adminUsername,
    password: adminPassword,
    balance: 0,
    monthlySessions: 0,
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: getRoleDefaultPermissions('ADMIN')
  };

  let membersList = [adminMember];
  let transactionsList = [];
  let attendanceList = [];

  if (initMode === 'SAMPLE') {
    adminMember.balance = 500000;
    // 10 Thành viên mẫu chuẩn (Nam, Nữ, Ban Cán Sự, Khách Giao Lưu)
    const sampleMembers = [
      { id: 'M002', name: 'Trần Bảo Ngọc', chipName: 'NGỌC', phone: '0988111002', type: 'OFFICIAL', username: 'ngoc', password: '123', balance: 400000, monthlySessions: 3, role: 'VICE_ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('VICE_ADMIN') },
      { id: 'M003', name: 'Lê Quốc Huy', chipName: 'HUY', phone: '0988111003', type: 'OFFICIAL', username: 'huy', password: '123', balance: 450000, monthlySessions: 4, role: 'VICE_ADMIN', status: 'ACTIVE', permissions: getRoleDefaultPermissions('VICE_ADMIN') },
      { id: 'M004', name: 'Phạm Thu Thảo', chipName: 'THẢO', phone: '0988111004', type: 'OFFICIAL', username: 'thao', password: '123', balance: 600000, monthlySessions: 5, role: 'TREASURER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('TREASURER') },
      { id: 'M005', name: 'Vũ Minh Đức', chipName: 'ĐỨC', phone: '0988111005', type: 'OFFICIAL', username: 'duc', password: '123', balance: 350000, monthlySessions: 2, role: 'REFEREE', status: 'ACTIVE', permissions: getRoleDefaultPermissions('REFEREE') },
      { id: 'M006', name: 'Đỗ Văn Nam', chipName: 'NAM', phone: '0988111006', type: 'OFFICIAL', username: 'nam', password: '123', balance: 300000, monthlySessions: 2, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
      { id: 'M007', name: 'Hoàng Yến Nhi', chipName: 'NHI', phone: '0988111007', type: 'OFFICIAL', username: 'nhi', password: '123', balance: 500000, monthlySessions: 4, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
      { id: 'M008', name: 'Bùi Anh Tuấn', chipName: 'TUẤN', phone: '0988111008', type: 'HONORARY', username: 'tuan', password: '123', balance: 250000, monthlySessions: 2, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
      { id: 'G001', name: 'Khách Giao Lưu 1', chipName: 'K1', phone: '', type: 'GUEST_A', level: 'A', fee: 90000, username: 'guest1', password: '123', balance: 0, monthlySessions: 1, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') },
      { id: 'G002', name: 'Khách Giao Lưu 2', chipName: 'K2', phone: '', type: 'GUEST_B', level: 'B', fee: 70000, username: 'guest2', password: '123', balance: 0, monthlySessions: 1, role: 'MEMBER', status: 'ACTIVE', permissions: getRoleDefaultPermissions('MEMBER') }
    ];
    membersList = membersList.concat(sampleMembers);

    transactionsList = [
      {
        id: 'TX_INIT_1',
        date: getNowTimestampString(),
        categoryGroup: 'INCOME_A',
        subType: 'MEM_FUND',
        categoryName: 'Quỹ thành viên',
        amount: initialFund,
        targetName: 'Quỹ thành lập CLB',
        walletImpact: 0,
        fundImpact: initialFund,
        description: `Thu quỹ ban đầu khi thành lập ${name}`,
        operator: adminUsername
      },
      {
        id: 'TX_INIT_2',
        date: getNowTimestampString(),
        categoryGroup: 'WALLET_TOPUP',
        subType: 'TOPUP',
        categoryName: 'Nạp ví',
        amount: 500000,
        targetName: adminName,
        memberId: adminMemberId,
        walletImpact: 500000,
        fundImpact: 0,
        description: 'Nạp tiền ví thành viên Quản lý sáng lập',
        operator: adminUsername
      }
    ];
  } else {
    // FRESH mode: Bắt đầu hoàn toàn mới, 0 dummy data, chỉ có duy nhất tài khoản Quản lý
    adminMember.balance = 0;
    if (initialFund > 0) {
      transactionsList.push({
        id: 'TX_INIT_1',
        date: getNowTimestampString(),
        categoryGroup: 'INCOME_A',
        subType: 'MEM_FUND',
        categoryName: 'Quỹ thành viên',
        amount: initialFund,
        targetName: 'Quỹ thành lập CLB',
        walletImpact: 0,
        fundImpact: initialFund,
        description: `Thu quỹ ban đầu khi thành lập ${name}`,
        operator: adminUsername
      });
    }
  }

  // Khởi tạo đối tượng AppState cho CLB mới
  const newClubAppState = {
    config: {
      clubName: name,
      accessSlug: accessSlug,
      themeColor: themeColor,
      bankInfo: bankInfo || `NGAN HANG - 0123456789 - ${shortName}`,
      leadership: {
        president: adminMemberId,
        vicePresident1: initMode === 'SAMPLE' ? 'M002' : '',
        vicePresident2: initMode === 'SAMPLE' ? 'M003' : '',
        secretary: initMode === 'SAMPLE' ? 'M005' : '',
        treasurer: initMode === 'SAMPLE' ? 'M004' : '',
        media: initMode === 'SAMPLE' ? 'M007' : '',
        advisor1: '',
        advisor2: ''
      },
      dailyBoxPrice: 340000,
      shuttlecocksPerBox: 12,
      dailyRateTitle: 'ĐƠN GIÁ THEO NGÀY 12',
      shuttleBillingMode: 'BY_SHUTTLE',
      shuttleUnitPrice: 28333,
      defaultShuttlesPerSession: 6,
      viceLeaderId: initMode === 'SAMPLE' ? 'M002' : '',
      permissions: {
        allowViceLeaderAttendance: true,
        allowViceLeaderTournamentSync: true
      },
      guestPrices: {
        GUEST_A: 90000,
        GUEST_B: 70000,
        GUEST_C: 50000
      },
      feeTiers: [
        { id: 1, name: 'Bậc 1 (0–4 buổi)', minSessions: 0, maxSessions: 4, price: 50000 },
        { id: 2, name: 'Bậc 2 (5–9 buổi)', minSessions: 5, maxSessions: 9, price: 100000 },
        { id: 3, name: 'Bậc 3 (10–15 buổi)', minSessions: 10, maxSessions: 15, price: 150000 },
        { id: 4, name: 'Bậc 4 (16–30+ buổi)', minSessions: 16, maxSessions: 999, price: 200000 }
      ],
      allowNegativeWallet: true,
      settlementMode: 'MONTHLY',
      defaultSettlementDay: 'END_OF_MONTH',
      attendanceCutoffTime: '17:00'
    },
    funds: {
      clubFund: initialFund,
      advanceFund: 0,
      shuttleAdvanceFund: 0,
      courtAdvanceFund: 0,
      guestAdvanceIncome: 0,
      shuttlePaidTotal: 0,
      courtPaidTotal: 0
    },
    members: membersList,
    attendanceRecords: attendanceList,
    transactions: transactionsList,
    auth: {
      isLoggedIn: true,
      user: {
        id: adminMemberId,
        username: adminUsername,
        role: 'ADMIN',
        name: `${adminName} (Quản lý)`,
        permissions: getRoleDefaultPermissions('ADMIN')
      }
    }
  };

  // 1. Lưu lại CLB hiện tại đang chạy (tránh mất dữ liệu của CLB cũ)
  if (STORAGE_KEY && STORAGE_KEY !== storageKey && AppState && Object.keys(AppState).length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
    } catch (e) {}
  }

  // 2. Lưu dữ liệu CLB mới vào localStorage riêng theo key chuẩn định danh
  localStorage.setItem(storageKey, JSON.stringify(newClubAppState));

  // 3. Thêm hoặc cập nhật danh bạ CLB (Registry) không trùng lặp
  const newClubRecord = {
    id: clubId,
    accessSlug: cleanSlug,
    name: name,
    shortName: shortName,
    logoIcon: logoIcon,
    themeColor: themeColor,
    bankInfo: bankInfo,
    createdAt: getFormattedCurrentDate(),
    storageKey: storageKey,
    adminName: adminName,
    adminEmail: adminEmail,
    adminUsername: adminUsername,
    phone: adminPhone,
    isDeveloperSample: false
  };

  const registry = getClubsRegistry();
  const existingIdx = registry.findIndex(c => (c.accessSlug && c.accessSlug.toLowerCase() === cleanSlug) || c.id === clubId);
  if (existingIdx >= 0) {
    registry[existingIdx] = newClubRecord;
  } else {
    registry.push(newClubRecord);
  }
  saveClubsRegistry(registry);

  // 3.5 Đồng bộ khởi tạo CLB mới và Phân quyền Admin lên Google Firebase (Multi-Tenant Node)
  if (firebaseDb) {
    try {
      const safeMembers = membersList.map(m => {
        const copy = { ...m };
        delete copy.password;
        return copy;
      });
      const cloudClubPayload = {
        profile: {
          id: clubId,
          name: name,
          shortName: shortName,
          accessSlug: cleanSlug,
          logoIcon: logoIcon,
          themeColor: themeColor,
          bankInfo: bankInfo,
          createdAt: getFormattedCurrentDate()
        },
        config: newClubAppState.config,
        members: safeMembers,
        attendance: { activitySessions: [], attendanceRecords: [] },
        wallets: { funds: newClubAppState.funds, closedMonths: [] },
        transactions: transactionsList,
        tournaments: [],
        funds: newClubAppState.funds,
        activitySessions: [],
        attendanceRecords: [],
        _lastModified: Date.now()
      };
      firebaseDb.ref('clubs/' + cleanSlug).set(cloudClubPayload).catch(() => {});

      const adminMemPayload = {
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: getRoleDefaultPermissions('ADMIN'),
        name: adminName,
        email: adminEmail,
        username: adminUsername,
        createdAt: Date.now()
      };
      firebaseDb.ref('memberships/' + cleanSlug + '/' + adminUsername).set(adminMemPayload).catch(() => {});
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        firebaseDb.ref('memberships/' + cleanSlug + '/' + firebase.auth().currentUser.uid).set(adminMemPayload).catch(() => {});
      }

      firebaseDb.ref('system/settings/clubs/' + cleanSlug).set({
        clubId: clubId,
        accessSlug: cleanSlug,
        name: name,
        createdAt: Date.now()
      }).catch(() => {});
    } catch (fbErr) {
      console.warn('Lỗi đồng bộ CLB mới lên Firebase:', fbErr);
    }
  }

  // 4. Tự động ẩn CLB demo của nhà phát triển để giao diện người dùng hoàn toàn sạch sẽ
  localStorage.setItem('CLB_HIDE_DEV_DEMO', 'true');

  // 5. Kích hoạt trực tiếp CLB mới vào bộ nhớ mà không qua switchActiveClub để loại trừ hoàn toàn nguy cơ race-condition
  setActiveClubId(clubId);
  STORAGE_KEY = storageKey;
  AppState = newClubAppState;
  updateClubUrlParam(cleanSlug);

  // 6. Xóa và làm mới phiên điểm danh cho CLB mới
  clearActivitySessionState();
  initActivitySessionData(true);

  // 7. Đồng bộ Theme màu & Header
  applyThemeColor(themeColor);
  const nameEl = document.getElementById('headerClubName');
  if (nameEl) nameEl.textContent = name;
  const iconEl = document.getElementById('headerClubIconSpan');
  if (iconEl) iconEl.textContent = logoIcon;

  // 8. Đóng Modal
  closeModal('modalCreateNewClub');

  // 9. Render lại toàn bộ giao diện của phân hệ đang mở
  renderClubSwitcher();
  renderDashboard();
  populateLeadershipSelects();

  if (currentTab === 'attendance') renderAttendanceTab();
  else if (currentTab === 'finance') renderFinanceTab();
  else if (currentTab === 'members') renderMemberManagementList();
  else if (currentTab === 'tournament') renderTournamentModule();
  else if (currentTab === 'settings') renderSettingsTab();

  // 10. Chuyển kênh đồng bộ đám mây sang CLB mới
  if (typeof subscribeToCloudClub === 'function') {
    subscribeToCloudClub(cleanSlug);
  }

  showToast(`🎉 Chúc mừng! Câu Lạc Bộ ${name} đã được khởi tạo thành công! Link riêng: ?club=${cleanSlug}`, 'success');
}

function deleteClub(clubId) {
  // 0. BẢO VỆ PHÂN QUYỀN TỐI CAO: CHỈ NHÀ PHÁT TRIỂN (DEV_ADMIN) MỚI CÓ QUYỀN XÓA TÀI KHOẢN CLB
  if (!isDeveloperAdmin()) {
    showToast('⚠️ Quyền hạn tối cao: Chỉ Nhà Phát Triển (Super Admin) mới có quyền xóa tài khoản Câu Lạc Bộ!', 'warning');
    openDevAdminAuthModal();
    return;
  }

  const registry = getClubsRegistry();
  if (registry.length <= 1) {
    showToast('⚠️ Không thể xóa: Hệ thống cần tối thiểu 1 Câu Lạc Bộ hoạt động!', 'error');
    return;
  }

  const club = registry.find(c => c.id === clubId);
  if (!club) {
    showToast('Không tìm thấy thông tin Câu Lạc Bộ cần xóa!', 'error');
    return;
  }

  const confirmMsg = `🚨 XÁC NHẬN XÓA TÀI KHOẢN CÂU LẠC BỘ (QUYỀN NHÀ PHÁT TRIỂN):\n\nBạn đang thực hiện xóa Câu Lạc Bộ: "${club.name}" (Mã truy cập: ${club.accessSlug || club.id}).\n\nToàn bộ dữ liệu quỹ, danh sách thành viên, nhật ký điểm danh và đồng bộ đám mây Firebase của CLB này sẽ bị xóa vĩnh viễn!\n\nBạn có chắc chắn 100% muốn xóa CLB này không?`;
  if (!confirm(confirmMsg)) {
    return;
  }

  // 1. Xóa dữ liệu cục bộ trong localStorage
  localStorage.removeItem(club.storageKey);
  try {
    localStorage.removeItem('CLB_SESSION_' + club.id);
    if (club.accessSlug) {
      localStorage.removeItem('CLB_SESSION_' + club.accessSlug);
      localStorage.removeItem('CLB_CAU_LONG_DATA_' + club.accessSlug);
    }
  } catch (e) {}

  // 2. Xóa dữ liệu trên Google Firebase Realtime Database
  if (firebaseDb) {
    try {
      const cleanSlug = getCanonicalClubSlug(club.accessSlug || club.id);
      firebaseDb.ref('clubs/' + cleanSlug).remove().catch(() => {});
      firebaseDb.ref('memberships/' + cleanSlug).remove().catch(() => {});
      firebaseDb.ref('system/settings/clubs/' + cleanSlug).remove().catch(() => {});
    } catch (fbErr) {
      console.warn('Lỗi xóa CLB trên Firebase:', fbErr);
    }
  }

  // 3. Cập nhật danh bạ CLB (Registry)
  const updated = registry.filter(c => c.id !== clubId);
  saveClubsRegistry(updated);

  // 4. Nếu đang ở chính CLB vừa xóa -> tự động chuyển sang CLB còn lại
  if (getActiveClubId() === clubId) {
    const nextClub = updated[0];
    switchActiveClub(nextClub.id);
  } else {
    renderClubSwitcher();
    renderMultiClubSettingsSection();
  }

  showToast(`✓ Nhà phát triển đã xóa thành công Câu Lạc Bộ: ${club.name}`, 'info');
}

function toggleHideDeveloperDemoClubs() {
  const isHidden = localStorage.getItem('CLB_HIDE_DEV_DEMO') === 'true';
  const newHidden = !isHidden;
  localStorage.setItem('CLB_HIDE_DEV_DEMO', newHidden ? 'true' : 'false');

  updateDevDemoToggleUI();
  renderClubSwitcher();
  renderMultiClubSettingsSection();

  if (newHidden) {
    showToast('Đã ẩn các CLB dữ liệu mẫu của nhà phát triển (SMASH & Tia Chớp)', 'info');
    const activeId = getActiveClubId();
    if (activeId === 'club_smash' || activeId === 'club_lightning') {
      const registry = getClubsRegistry();
      const userClub = registry.find(c => !c.isDeveloperSample && c.id !== 'club_smash' && c.id !== 'club_lightning');
      if (userClub) {
        switchActiveClub(userClub.id);
      }
    }
  } else {
    showToast('Đã hiển thị các CLB dữ liệu mẫu của nhà phát triển', 'info');
  }
}

function updateDevDemoToggleUI() {
  const isHidden = localStorage.getItem('CLB_HIDE_DEV_DEMO') === 'true';
  const iconEl = document.getElementById('iconToggleHideDevDemo');
  const textEl = document.getElementById('textToggleHideDevDemo');
  const btnEl = document.getElementById('btnToggleHideDevDemo');
  if (!btnEl) return;

  if (isHidden) {
    if (iconEl) iconEl.textContent = '👁️‍🗨️';
    if (textEl) textEl.textContent = 'Hiện CLB mẫu Dev';
    btnEl.className = 'px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer';
  } else {
    if (iconEl) iconEl.textContent = '👁️';
    if (textEl) textEl.textContent = 'Ẩn CLB mẫu Dev';
    btnEl.className = 'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer';
  }
}

function renderMultiClubSettingsSection() {
  const container = document.getElementById('multiClubListContainer');
  const countEl = document.getElementById('multiClubSummaryCount');
  if (!container) return;

  updateDevDemoToggleUI();

  const registry = getClubsRegistry();
  const activeId = getActiveClubId();
  const isDev = isDeveloperAdmin();
  const isHideDemo = !isDev || localStorage.getItem('CLB_HIDE_DEV_DEMO') === 'true';
  const visibleClubs = isHideDemo
    ? registry.filter(c => !c.isDeveloperSample && c.id !== 'club_smash' && c.id !== 'club_lightning')
    : registry;
  const listToRender = visibleClubs.length > 0 ? visibleClubs : registry;

  if (countEl) {
    if (isDev) {
      countEl.textContent = `${listToRender.length} Câu Lạc Bộ` + (isHideDemo && registry.length > listToRender.length ? ` (Đã ẩn ${registry.length - listToRender.length} CLB mẫu Dev)` : '');
    } else {
      countEl.textContent = `${listToRender.length} Câu Lạc Bộ`;
    }
  }

  container.innerHTML = listToRender.map(club => {
    const isActive = club.id === activeId;
    
    let clubFund = 0;
    let memberCount = 0;
    try {
      const raw = localStorage.getItem(club.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        clubFund = parsed.funds?.clubFund || 0;
        memberCount = parsed.members?.length || 0;
      }
    } catch (e) {}

    const directSlug = club.accessSlug || club.shortName?.toLowerCase() || club.id;

    return `
      <div class="p-4 rounded-2xl border ${isActive ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'} flex flex-col justify-between transition space-y-3">
        
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl ${isActive ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md' : 'bg-slate-100 text-slate-800 border border-slate-200'} flex items-center justify-center text-2xl font-bold shadow-xs shrink-0">
              ${club.logoIcon || '🏸'}
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-extrabold text-sm text-slate-900 leading-tight">${club.name}</h3>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  ${club.shortName || 'CLB'}
                </span>
                ${(isDev && club.isDeveloperSample) ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Mẫu Dev</span>' : ''}
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <span>👑 Quản lý: <strong class="text-slate-700">${club.adminName || 'Admin'}</strong></span>
                ${club.phone ? `<span>• 📞 ${club.phone}</span>` : ''}
              </p>
            </div>
          </div>

          <div>
            ${isActive ? `
              <span class="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                <span>✓</span>
                <span>Đang chọn</span>
              </span>
            ` : `
              <button type="button" onclick="switchActiveClub('${club.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white font-bold text-xs rounded-xl border border-slate-200 hover:border-emerald-600 transition flex items-center gap-1 cursor-pointer">
                <span>👉</span>
                <span>Chuyển CLB</span>
              </button>
            `}
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t ${isActive ? 'border-emerald-200/80' : 'border-slate-100'} text-xs">
          <div class="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
            <span class="text-[11px] text-slate-500 block">💰 Quỹ CLB:</span>
            <span class="font-extrabold text-emerald-700 text-xs">${formatMoney(clubFund)}</span>
          </div>
          <div class="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
            <span class="text-[11px] text-slate-500 block">👥 Thành viên:</span>
            <span class="font-extrabold text-slate-800 text-xs">${memberCount} người</span>
          </div>
        </div>

        <!-- Khối Link Riêng & Phím Tắt Màn Hình Chính -->
        <div class="pt-2.5 border-t ${isActive ? 'border-emerald-200/80' : 'border-slate-100'} space-y-2 text-xs">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-extrabold text-slate-700 flex items-center gap-1.5">
              <span>🔗</span>
              <span>Link sử dụng riêng:</span>
            </span>
            <span class="font-mono text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-extrabold border border-emerald-300">
              ?club=${directSlug}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <div class="relative flex-1">
              <input type="text" readonly value="${getClubDirectUrl(club.id)}" onclick="this.select()" class="w-full pl-2.5 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700 truncate select-all focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs" title="Đường dẫn truy cập trực tiếp CLB này" />
              <button type="button" onclick="copyClubDirectLink('${club.id}')" class="absolute right-1 top-1 bottom-1 px-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer" title="Sao chép liên kết này">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <button type="button" onclick="openClubDirectLink('${club.id}')" class="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer shrink-0 shadow-2xs" title="Mở link trong tab mới">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- 2 Phím tắt nhanh: Desktop & Điện thoại -->
          <div class="grid grid-cols-2 gap-2 pt-0.5">
            <button type="button" onclick="downloadClubDesktopShortcut('${club.id}')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs" title="Tải file .url về máy tính và kéo ra màn hình Desktop">
              <span>💻</span>
              <span>Lối Tắt Desktop</span>
            </button>

            <button type="button" onclick="openClubShortcutGuideModal('${club.id}')" class="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs" title="Hướng dẫn tạo phím tắt màn hình chính iOS/Android & mã QR">
              <span>📱</span>
              <span>Lối Tắt MH Chính / QR</span>
            </button>
          </div>
        </div>

        <!-- Details & Actions -->
        <div class="flex items-center justify-between pt-1 text-[11px] text-slate-500">
          <span class="truncate max-w-[200px]" title="${club.bankInfo || ''}">
            🏦 ${club.bankInfo || 'Chưa thiết lập VietQR'}
          </span>
          <div class="flex items-center gap-1.5">
            ${registry.length > 1 ? (
              isDev ? `
                <button type="button" onclick="deleteClub('${club.id}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Nhà phát triển: Xóa tài khoản Câu Lạc Bộ này khỏi hệ thống">
                  <span>🗑️</span>
                  <span>Xóa CLB</span>
                </button>
              ` : `
                <button type="button" onclick="deleteClub('${club.id}')" class="px-2 py-1 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1" title="Chỉ Nhà phát triển mới có quyền xóa Câu Lạc Bộ">
                  <span>🔒</span>
                  <span>Xóa CLB</span>
                </button>
              `
            ) : ''}
          </div>
        </div>

      </div>
    `;
  }).join('');

  lucide.createIcons();
  updateDevAdminUI();
}

// ==========================================
// TIỆN ÍCH LINK RIÊNG & TẠO PHÍM TẮT MÀN HÌNH CHÍNH (SHORTCUT & DEEP LINKS)
// ==========================================

let currentModalShortcutClubId = null;

function copyClubDirectLink(clubId) {
  const targetId = clubId || getActiveClubId();
  const registry = getClubsRegistry();
  const club = registry.find(c => c.id === targetId);
  const directUrl = getClubDirectUrl(targetId);

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(directUrl).then(() => {
      showToast(`✓ Đã sao chép link riêng CLB: ${club?.name || targetId}!`, 'success');
    }).catch(() => {
      fallbackCopyText(directUrl, club?.name);
    });
  } else {
    fallbackCopyText(directUrl, club?.name);
  }
}

function fallbackCopyText(text, clubName) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(`✓ Đã sao chép link riêng CLB: ${clubName || ''}!`, 'success');
  } catch (err) {
    prompt('Sao chép đường dẫn này:', text);
  }
  document.body.removeChild(textArea);
}

function openClubDirectLink(clubId) {
  const targetId = clubId || getActiveClubId();
  const directUrl = getClubDirectUrl(targetId);
  window.open(directUrl, '_blank');
}

function downloadClubDesktopShortcut(clubId) {
  const targetId = clubId || getActiveClubId();
  const registry = getClubsRegistry();
  const club = registry.find(c => c.id === targetId) || getActiveClub();
  if (!club) return;

  const directUrl = getClubDirectUrl(targetId);
  
  // Chuẩn định dạng file .url của Windows Internet Shortcut
  const shortcutContent = `[InternetShortcut]\r\nURL=${directUrl}\r\nIconIndex=0\r\nHotKey=0\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,0\r\n`;
  
  const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  
  const safeName = (club.name || 'CLB_Cau_Long').replace(/[/\\?%*:|"<>]/g, '_');
  a.download = `${safeName}.url`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  showToast(`🎉 Đã tải file lối tắt Desktop cho "${club.name}"! Kéo file này ra màn hình chính để dùng ngay.`, 'success');
}

function openClubShortcutGuideModal(clubId) {
  const targetId = clubId || getActiveClubId();
  const registry = getClubsRegistry();
  const club = registry.find(c => c.id === targetId) || getActiveClub();
  if (!club) return;

  currentModalShortcutClubId = club.id;

  const modal = document.getElementById('modalClubShortcutGuide');
  if (!modal) return;

  const nameEl = document.getElementById('shortcutModalClubName');
  const badgeEl = document.getElementById('shortcutModalClubBadge');
  const iconEl = document.getElementById('shortcutModalClubIcon');
  const urlInput = document.getElementById('shortcutModalUrlInput');
  const qrImg = document.getElementById('shortcutModalQrImg');

  const directUrl = getClubDirectUrl(club.id);

  if (nameEl) nameEl.textContent = club.name;
  if (badgeEl) badgeEl.textContent = club.shortName || 'CLB';
  if (iconEl) iconEl.textContent = club.logoIcon || '🏸';
  if (urlInput) urlInput.value = directUrl;

  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(directUrl)}`;
  }

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function copyModalClubDirectLink() {
  if (currentModalShortcutClubId) {
    copyClubDirectLink(currentModalShortcutClubId);
  }
}

function openModalClubDirectLink() {
  if (currentModalShortcutClubId) {
    openClubDirectLink(currentModalShortcutClubId);
  }
}

function downloadModalClubDesktopShortcut() {
  if (currentModalShortcutClubId) {
    downloadClubDesktopShortcut(currentModalShortcutClubId);
  }
}

// ==========================================
// 16. HỆ THỐNG QUẢN LÝ GIẢI ĐẤU CẦU LÔNG CHUYÊN NGHIỆP (TOURNAMENT ENGINE)
// DỮ LIỆU HOẠT ĐỘNG HOÀN TOÀN ĐỘC LẬP VỚI CÁC HOẠT ĐỘNG NGÀY THƯỜNG CỦA CLB
// CẤU TRÚC 16 NODES: Tournament -> Organization -> Country -> Club -> Player -> Registration
//                   -> Discipline -> Pair -> Seed -> Draw -> Group -> Match -> Game
//                   -> Schedule -> Court -> Ranking -> Award
// ==========================================

const TOURNAMENT_STORAGE_KEY = 'CLB_CAU_LONG_TOURNAMENT_DATA';

const TournamentState = {
  tournaments: [],
  activeTournamentId: null,
  activeSubtab: 'bracket',
  activeDisciplineId: 'MD',
  filters: {
    scope: 'ALL',
    country: 'ALL',
    club: 'ALL'
  }
};

/**
 * Danh mục chuẩn Quốc gia và CLB tham dự giải
 */
const TOURNAMENT_COUNTRIES = [
  { id: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
  { id: 'JP', name: 'Nhật Bản', flag: '🇯🇵' },
  { id: 'KR', name: 'Hàn Quốc', flag: '🇰🇷' },
  { id: 'TH', name: 'Thái Lan', flag: '🇹🇭' }
];

const TOURNAMENT_DATA_VERSION = '2026.8_GENDER_ROSTER';

const TOURNAMENT_CLUBS = [
  { id: 'CLB_A', name: 'CLB A', country: 'VN', participating: true, contact: 'Nguyễn Văn A1 (Trưởng đoàn - 0988.111.001)' },
  { id: 'CLB_B', name: 'CLB B', country: 'VN', participating: true, contact: 'Đặng Văn B1 (Đội trưởng - 0912.222.001)' },
  { id: 'CLB_C', name: 'CLB C', country: 'VN', participating: true, contact: 'Dương Văn C1 (Liên lạc - 0903.333.001)' },
  { id: 'CLB_D', name: 'CLB D', country: 'VN', participating: true, contact: 'Hồ Văn D1 (Quản lý - 0977.444.001)' },
  { id: 'CLB_E', name: 'CLB E', country: 'VN', participating: true, contact: 'Trịnh Thị E1 (Đại diện - 0966.555.001)' }
];

const TOURNAMENT_SCOPES = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'INTERNAL', label: '🏠 Nội bộ' },
  { id: 'MULTI_CLUB', label: '🤝 Liên CLB' },
  { id: 'OPEN', label: '🌟 Mở rộng' },
  { id: 'FRIENDLY', label: '🏸 Giao lưu' },
  { id: 'NATIONAL', label: '🇻🇳 Quốc gia' },
  { id: 'INTERNATIONAL', label: '🌐 Quốc tế' }
];

const RANKING_CRITERIA_DEFINITIONS = [
  { id: 'WINS', name: 'Số trận thắng (Wins)', desc: 'Đội có tổng số trận thắng nhiều hơn xếp trên' },
  { id: 'HEAD_TO_HEAD', name: 'Thành tích đối đầu (Head-to-Head)', desc: 'Xét kết quả trực tiếp khi 2 đội bằng số trận thắng' },
  { id: 'GAME_DIFF', name: 'Hiệu số game / set (Game Diff)', desc: 'Tổng game thắng trừ tổng game thua (Sets won - Sets lost)' },
  { id: 'POINT_DIFF', name: 'Hiệu số điểm (Point Diff)', desc: 'Tổng điểm ghi được trừ tổng điểm bị mất (Points won - Points lost)' },
  { id: 'POINTS_SCORED', name: 'Điểm ghi được (Points Scored)', desc: 'Tổng số điểm thực tế đã ghi được trong các trận' },
  { id: 'FAIR_PLAY', name: 'Tiêu chí phụ BTC (Fair-Play / Bốc thăm)', desc: 'Xét kỷ luật hoặc bốc thăm chỉ định của Ban tổ chức' }
];

/**
 * Khởi tạo dữ liệu mẫu giải đấu chuẩn 5 CLB & 18 Thành viên (CLB A..E, VĐV A1..E2)
 */
function createDefaultTournamentData() {
  return [
    {
      id: 'TOUR_LIEN_CLB_2026',
      dataVersion: TOURNAMENT_DATA_VERSION,
      title: 'Giải Cầu Lông',
      scope: 'MULTI_CLUB',
      type: 'TOURNAMENT',
      date: '2026-09-23',
      location: 'Cụm Sân Cầu Lông Smash Arena - 5 Sân Thảm Tiêu Chuẩn',
      courtsCount: 3,
      minRestMinutes: 25,
      status: 'IN_PROGRESS',
      matchRules: {
        setsMode: 1,           // 1 set hoặc 3 set
        pointsToWin: 31,       // 31 điểm chạm
        maxPointsCap: 31,      // 31 điểm chạm tối đa (Sudden Death)
        ruleType: 'SUDDEN_DEATH'
      },
      organization: {
        organizer: 'Ban Tổ Chức Giải Liên CLB A - B - C - D - E',
        leadReferee: 'Tổ Trọng Tài Điều Hành Liên CLB',
        rules: 'Luật thi đấu Cầu Lông Phong Trào (1 Set chạm 31 điểm / 3 Set 21 điểm)'
      },
      countries: JSON.parse(JSON.stringify(TOURNAMENT_COUNTRIES)),
      clubs: JSON.parse(JSON.stringify(TOURNAMENT_CLUBS)),
      players: [
        // CLB A: 6 thành viên chính + 2 thành viên dự bị đôi (Toàn bộ VĐV Nam)
        { id: 'A1', name: 'Nguyễn Văn A1', chipName: 'A1', clubId: 'CLB_A', countryId: 'VN', level: 'A+', phone: '0988.111.001', gender: 'MALE' },
        { id: 'A2', name: 'Trần Văn A2', chipName: 'A2', clubId: 'CLB_A', countryId: 'VN', level: 'A', phone: '0988.111.002', gender: 'MALE' },
        { id: 'A3', name: 'Lê Văn A3', chipName: 'A3', clubId: 'CLB_A', countryId: 'VN', level: 'A', phone: '0988.111.003', gender: 'MALE' },
        { id: 'A4', name: 'Phạm Văn A4', chipName: 'A4', clubId: 'CLB_A', countryId: 'VN', level: 'B+', phone: '0988.111.004', gender: 'MALE' },
        { id: 'A5', name: 'Vũ Văn A5', chipName: 'A5', clubId: 'CLB_A', countryId: 'VN', level: 'B', phone: '0988.111.005', gender: 'MALE' },
        { id: 'A6', name: 'Hoàng Văn A6', chipName: 'A6', clubId: 'CLB_A', countryId: 'VN', level: 'B', phone: '0988.111.006', gender: 'MALE' },
        { id: 'A7', name: 'Đoàn Văn A7', chipName: 'A7', clubId: 'CLB_A', countryId: 'VN', level: 'B+', phone: '0988.111.007', gender: 'MALE' },
        { id: 'A8', name: 'Bùi Văn A8', chipName: 'A8', clubId: 'CLB_A', countryId: 'VN', level: 'B', phone: '0988.111.008', gender: 'MALE' },
        // CLB B: 4 thành viên chính + 2 thành viên dự bị đôi (Toàn bộ VĐV Nam)
        { id: 'B1', name: 'Đặng Văn B1', chipName: 'B1', clubId: 'CLB_B', countryId: 'VN', level: 'A+', phone: '0912.222.001', gender: 'MALE' },
        { id: 'B2', name: 'Bùi Văn B2', chipName: 'B2', clubId: 'CLB_B', countryId: 'VN', level: 'A', phone: '0912.222.002', gender: 'MALE' },
        { id: 'B3', name: 'Đỗ Văn B3', chipName: 'B3', clubId: 'CLB_B', countryId: 'VN', level: 'B+', phone: '0912.222.003', gender: 'MALE' },
        { id: 'B4', name: 'Ngô Văn B4', chipName: 'B4', clubId: 'CLB_B', countryId: 'VN', level: 'B', phone: '0912.222.004', gender: 'MALE' },
        { id: 'B5', name: 'Trương Văn B5', chipName: 'B5', clubId: 'CLB_B', countryId: 'VN', level: 'A', phone: '0912.222.005', gender: 'MALE' },
        { id: 'B6', name: 'Lâm Văn B6', chipName: 'B6', clubId: 'CLB_B', countryId: 'VN', level: 'B+', phone: '0912.222.006', gender: 'MALE' },
        // CLB C: 2 thành viên Nam (C1, C2)
        { id: 'C1', name: 'Dương Văn C1', chipName: 'C1', clubId: 'CLB_C', countryId: 'VN', level: 'A', phone: '0903.333.001', gender: 'MALE' },
        { id: 'C2', name: 'Phan Văn C2', chipName: 'C2', clubId: 'CLB_C', countryId: 'VN', level: 'B+', phone: '0903.333.002', gender: 'MALE' },
        // CLB D: 4 thành viên chính + 2 thành viên dự bị đôi (Toàn bộ VĐV Nam)
        { id: 'D1', name: 'Hồ Văn D1', chipName: 'D1', clubId: 'CLB_D', countryId: 'VN', level: 'A', phone: '0977.444.001', gender: 'MALE' },
        { id: 'D2', name: 'Võ Văn D2', chipName: 'D2', clubId: 'CLB_D', countryId: 'VN', level: 'B+', phone: '0977.444.002', gender: 'MALE' },
        { id: 'D3', name: 'Mai Văn D3', chipName: 'D3', clubId: 'CLB_D', countryId: 'VN', level: 'B', phone: '0977.444.003', gender: 'MALE' },
        { id: 'D4', name: 'Lý Văn D4', chipName: 'D4', clubId: 'CLB_D', countryId: 'VN', level: 'B', phone: '0977.444.004', gender: 'MALE' },
        { id: 'D5', name: 'Tạ Văn D5', chipName: 'D5', clubId: 'CLB_D', countryId: 'VN', level: 'A', phone: '0977.444.005', gender: 'MALE' },
        { id: 'D6', name: 'Chu Văn D6', chipName: 'D6', clubId: 'CLB_D', countryId: 'VN', level: 'B+', phone: '0977.444.006', gender: 'MALE' },
        // CLB E: 2 thành viên Nữ (E1, E2)
        { id: 'E1', name: 'Trịnh Thị E1', chipName: 'E1', clubId: 'CLB_E', countryId: 'VN', level: 'A', phone: '0966.555.001', gender: 'FEMALE' },
        { id: 'E2', name: 'Lưu Thị E2', chipName: 'E2', clubId: 'CLB_E', countryId: 'VN', level: 'B+', phone: '0966.555.002', gender: 'FEMALE' }
      ],
      registrations: [
        { id: 'REG_01', playerId: 'A1', clubId: 'CLB_A', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_02', playerId: 'A2', clubId: 'CLB_A', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_03', playerId: 'A3', clubId: 'CLB_A', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_04', playerId: 'A4', clubId: 'CLB_A', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_05', playerId: 'A5', clubId: 'CLB_A', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_06', playerId: 'A6', clubId: 'CLB_A', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_07', playerId: 'B1', clubId: 'CLB_B', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_08', playerId: 'B2', clubId: 'CLB_B', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_09', playerId: 'B3', clubId: 'CLB_B', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_10', playerId: 'B4', clubId: 'CLB_B', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_11', playerId: 'C1', clubId: 'CLB_C', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_12', playerId: 'C2', clubId: 'CLB_C', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_13', playerId: 'D1', clubId: 'CLB_D', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_14', playerId: 'D2', clubId: 'CLB_D', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_15', playerId: 'D3', clubId: 'CLB_D', disciplines: ['MD', 'MS'], status: 'CONFIRMED' },
        { id: 'REG_16', playerId: 'D4', clubId: 'CLB_D', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_17', playerId: 'E1', clubId: 'CLB_E', disciplines: ['MD', 'MS', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_18', playerId: 'E2', clubId: 'CLB_E', disciplines: ['MD', 'XD'], status: 'CONFIRMED' },
        { id: 'REG_19', playerId: 'A7', clubId: 'CLB_A', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_20', playerId: 'A8', clubId: 'CLB_A', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_21', playerId: 'B5', clubId: 'CLB_B', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_22', playerId: 'B6', clubId: 'CLB_B', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_23', playerId: 'D5', clubId: 'CLB_D', disciplines: ['MD'], status: 'CONFIRMED' },
        { id: 'REG_24', playerId: 'D6', clubId: 'CLB_D', disciplines: ['MD'], status: 'CONFIRMED' }
      ],
      rankingCriteria: ['WINS', 'HEAD_TO_HEAD', 'GAME_DIFF', 'POINT_DIFF', 'POINTS_SCORED', 'FAIR_PLAY'],
      prizes: {
        prize1: '🏆 Cúp Vô Địch + Cờ Lưu Niệm + 2.000.000đ',
        prize2: '🥈 Cờ Á Quân + 1.200.000đ',
        prize3: '🥉 Cờ Hạng Ba + 600.000đ',
        prizeFairPlay: '🎖️ Giải Phong Cách / Cống Hiến Liên CLB'
      },
      disciplines: [
        // ================== NỘI DUNG 1: ĐÔI NAM (4 BẢNG A, B, C, D + PLAYOFF) ==================
        {
          id: 'MD',
          name: 'Đôi Nam (Men\'s Doubles)',
          type: 'DOUBLES',
          format: 'GROUP_4_KNOCKOUT',
          seedsCount: 4,
          pairs: [
            { id: 'P_MD_1', name: 'A1 & A2 (CLB A)', chipName: 'A1 & A2', club: 'CLB A', country: 'VN', seed: 1, playerIds: ['A1', 'A2'] },
            { id: 'P_MD_2', name: 'B1 & B2 (CLB B)', chipName: 'B1 & B2', club: 'CLB B', country: 'VN', seed: 0, playerIds: ['B1', 'B2'] },
            { id: 'P_MD_3', name: 'C1 & C2 (CLB C)', chipName: 'C1 & C2', club: 'CLB C', country: 'VN', seed: 0, playerIds: ['C1', 'C2'] },
            { id: 'P_MD_4', name: 'A3 & A4 (CLB A)', chipName: 'A3 & A4', club: 'CLB A', country: 'VN', seed: 2, playerIds: ['A3', 'A4'] },
            { id: 'P_MD_5', name: 'D1 & D2 (CLB D)', chipName: 'D1 & D2', club: 'CLB D', country: 'VN', seed: 0, playerIds: ['D1', 'D2'] },
            { id: 'P_MD_6', name: 'B3 & B4 (CLB B)', chipName: 'B3 & B4', club: 'CLB B', country: 'VN', seed: 0, playerIds: ['B3', 'B4'] },
            { id: 'P_MD_7', name: 'A5 & A6 (CLB A)', chipName: 'A5 & A6', club: 'CLB A', country: 'VN', seed: 3, playerIds: ['A5', 'A6'] },
            { id: 'P_MD_8', name: 'D3 & D4 (CLB D)', chipName: 'D3 & D4', club: 'CLB D', country: 'VN', seed: 0, playerIds: ['D3', 'D4'] },
            { id: 'P_MD_9', name: 'E1 & E2 (CLB E)', chipName: 'E1 & E2', club: 'CLB E', country: 'VN', seed: 0, playerIds: ['E1', 'E2'] },
            { id: 'P_MD_10', name: 'B5 & B6 (CLB B)', chipName: 'B5 & B6', club: 'CLB B', country: 'VN', seed: 4, playerIds: ['B5', 'B6'] },
            { id: 'P_MD_11', name: 'D5 & D6 (CLB D)', chipName: 'D5 & D6', club: 'CLB D', country: 'VN', seed: 0, playerIds: ['D5', 'D6'] },
            { id: 'P_MD_12', name: 'A7 & A8 (CLB A)', chipName: 'A7 & A8', club: 'CLB A', country: 'VN', seed: 0, playerIds: ['A7', 'A8'] }
          ],
          groups: [
            { id: 'A', name: 'BẢNG A (ĐÔI NAM)', pairIds: ['P_MD_1', 'P_MD_2', 'P_MD_3'] },
            { id: 'B', name: 'BẢNG B (ĐÔI NAM)', pairIds: ['P_MD_4', 'P_MD_5', 'P_MD_6'] },
            { id: 'C', name: 'BẢNG C (ĐÔI NAM)', pairIds: ['P_MD_7', 'P_MD_8', 'P_MD_9'] },
            { id: 'D', name: 'BẢNG D (ĐÔI NAM)', pairIds: ['P_MD_10', 'P_MD_11', 'P_MD_12'] }
          ],
          groupMatches: {
            ga1: { id: 'MD_GA1', code: 'A1', group: 'A', stage: 'Vòng Bảng A - Trận 1', court: 1, time: '08:00', team1: 'P_MD_1', team2: 'P_MD_2', set1: [31, 27], set2: [0, 0], set3: [0, 0], winner: 'P_MD_1', loser: 'P_MD_2', status: 'FINISHED' },
            ga2: { id: 'MD_GA2', code: 'A2', group: 'A', stage: 'Vòng Bảng A - Trận 2', court: 2, time: '08:00', team1: 'P_MD_2', team2: 'P_MD_3', set1: [31, 25], set2: [0, 0], set3: [0, 0], winner: 'P_MD_2', loser: 'P_MD_3', status: 'FINISHED' },
            ga3: { id: 'MD_GA3', code: 'A3', group: 'A', stage: 'Vòng Bảng A - Trận 3', court: 3, time: '08:00', team1: 'P_MD_1', team2: 'P_MD_3', set1: [31, 22], set2: [0, 0], set3: [0, 0], winner: 'P_MD_1', loser: 'P_MD_3', status: 'FINISHED' },

            gb1: { id: 'MD_GB1', code: 'B1', group: 'B', stage: 'Vòng Bảng B - Trận 1', court: 1, time: '08:40', team1: 'P_MD_4', team2: 'P_MD_5', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MD_4', loser: 'P_MD_5', status: 'FINISHED' },
            gb2: { id: 'MD_GB2', code: 'B2', group: 'B', stage: 'Vòng Bảng B - Trận 2', court: 2, time: '08:40', team1: 'P_MD_5', team2: 'P_MD_6', set1: [31, 26], set2: [0, 0], set3: [0, 0], winner: 'P_MD_5', loser: 'P_MD_6', status: 'FINISHED' },
            gb3: { id: 'MD_GB3', code: 'B3', group: 'B', stage: 'Vòng Bảng B - Trận 3', court: 3, time: '08:40', team1: 'P_MD_4', team2: 'P_MD_6', set1: [31, 24], set2: [0, 0], set3: [0, 0], winner: 'P_MD_4', loser: 'P_MD_6', status: 'FINISHED' },

            gc1: { id: 'MD_GC1', code: 'C1', group: 'C', stage: 'Vòng Bảng C - Trận 1', court: 1, time: '09:20', team1: 'P_MD_7', team2: 'P_MD_8', set1: [31, 26], set2: [0, 0], set3: [0, 0], winner: 'P_MD_7', loser: 'P_MD_8', status: 'FINISHED' },
            gc2: { id: 'MD_GC2', code: 'C2', group: 'C', stage: 'Vòng Bảng C - Trận 2', court: 2, time: '09:20', team1: 'P_MD_8', team2: 'P_MD_9', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MD_8', loser: 'P_MD_9', status: 'FINISHED' },
            gc3: { id: 'MD_GC3', code: 'C3', group: 'C', stage: 'Vòng Bảng C - Trận 3', court: 3, time: '09:20', team1: 'P_MD_7', team2: 'P_MD_9', set1: [31, 23], set2: [0, 0], set3: [0, 0], winner: 'P_MD_7', loser: 'P_MD_9', status: 'FINISHED' },

            gd1: { id: 'MD_GD1', code: 'D1', group: 'D', stage: 'Vòng Bảng D - Trận 1', court: 1, time: '10:00', team1: 'P_MD_10', team2: 'P_MD_11', set1: [31, 25], set2: [0, 0], set3: [0, 0], winner: 'P_MD_10', loser: 'P_MD_11', status: 'FINISHED' },
            gd2: { id: 'MD_GD2', code: 'D2', group: 'D', stage: 'Vòng Bảng D - Trận 2', court: 2, time: '10:00', team1: 'P_MD_11', team2: 'P_MD_12', set1: [28, 31], set2: [0, 0], set3: [0, 0], winner: 'P_MD_12', loser: 'P_MD_11', status: 'FINISHED' },
            gd3: { id: 'MD_GD3', code: 'D3', group: 'D', stage: 'Vòng Bảng D - Trận 3', court: 3, time: '10:00', team1: 'P_MD_10', team2: 'P_MD_12', set1: [29, 31], set2: [0, 0], set3: [0, 0], winner: 'P_MD_12', loser: 'P_MD_10', status: 'FINISHED' }
          },
          matches: {
            qf1: { id: 'MD_QF1', code: 'QF1', stage: 'Tứ Kết 1 (Nhất A vs Nhì B)', court: 1, time: '10:45', team1: 'P_MD_1', team2: 'P_MD_5', set1: [31, 26], set2: [0, 0], set3: [0, 0], winner: 'P_MD_1', loser: 'P_MD_5', status: 'FINISHED' },
            qf2: { id: 'MD_QF2', code: 'QF2', stage: 'Tứ Kết 2 (Nhất C vs Nhì D)', court: 2, time: '10:45', team1: 'P_MD_7', team2: 'P_MD_10', set1: [31, 29], set2: [0, 0], set3: [0, 0], winner: 'P_MD_7', loser: 'P_MD_10', status: 'FINISHED' },
            qf3: { id: 'MD_QF3', code: 'QF3', stage: 'Tứ Kết 3 (Nhất B vs Nhì A)', court: 3, time: '10:45', team1: 'P_MD_4', team2: 'P_MD_2', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MD_4', loser: 'P_MD_2', status: 'FINISHED' },
            qf4: { id: 'MD_QF4', code: 'QF4', stage: 'Tứ Kết 4 (Nhất D vs Nhì C)', court: 1, time: '11:25', team1: 'P_MD_12', team2: 'P_MD_8', set1: [31, 27], set2: [0, 0], set3: [0, 0], winner: 'P_MD_12', loser: 'P_MD_8', status: 'FINISHED' },
            sf1: { id: 'MD_SF1', code: 'SF1', stage: 'Bán Kết 1 (Thắng QF1 vs QF2)', court: 2, time: '12:05', team1: 'P_MD_1', team2: 'P_MD_7', set1: [31, 29], set2: [0, 0], set3: [0, 0], winner: 'P_MD_1', loser: 'P_MD_7', status: 'FINISHED' },
            sf2: { id: 'MD_SF2', code: 'SF2', stage: 'Bán Kết 2 (Thắng QF3 vs QF4)', court: 3, time: '12:05', team1: 'P_MD_4', team2: 'P_MD_12', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MD_4', loser: 'P_MD_12', status: 'FINISHED' },
            final: { id: 'MD_FINAL', code: 'CK', stage: 'Chung Kết Cúp CLB (Thắng SF1 vs SF2)', court: 1, time: '13:00', team1: 'P_MD_1', team2: 'P_MD_4', set1: [31, 29], set2: [0, 0], set3: [0, 0], winner: 'P_MD_1', loser: 'P_MD_4', status: 'FINISHED' },
            third: { id: 'MD_THIRD', code: 'T3', stage: 'Tranh Hạng Ba (Thua SF1 vs SF2)', court: 2, time: '13:00', team1: 'P_MD_7', team2: 'P_MD_12', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MD_7', loser: 'P_MD_12', status: 'FINISHED' }
          },
          champion: 'P_MD_1',
          runnerUp: 'P_MD_4',
          thirdPlace: 'P_MD_7'
        },

        // ================== NỘI DUNG 2: ĐƠN NAM (KNOCKOUT LOẠI TRỰC TIẾP) ==================
        {
          id: 'MS',
          name: 'Đơn Nam (Men\'s Singles)',
          type: 'SINGLES',
          format: 'KNOCKOUT',
          seedsCount: 4,
          pairs: [
            { id: 'P_MS_1', name: 'Nguyễn Văn A1 (CLB A)', chipName: 'A1', club: 'CLB A', country: 'VN', seed: 1, playerIds: ['A1'] },
            { id: 'P_MS_2', name: 'Đặng Văn B1 (CLB B)', chipName: 'B1', club: 'CLB B', country: 'VN', seed: 0, playerIds: ['B1'] },
            { id: 'P_MS_3', name: 'Dương Văn C1 (CLB C)', chipName: 'C1', club: 'CLB C', country: 'VN', seed: 3, playerIds: ['C1'] },
            { id: 'P_MS_4', name: 'Hồ Văn D1 (CLB D)', chipName: 'D1', club: 'CLB D', country: 'VN', seed: 0, playerIds: ['D1'] },
            { id: 'P_MS_5', name: 'Lê Văn A3 (CLB A)', chipName: 'A3', club: 'CLB A', country: 'VN', seed: 2, playerIds: ['A3'] },
            { id: 'P_MS_6', name: 'Bùi Văn B2 (CLB B)', chipName: 'B2', club: 'CLB B', country: 'VN', seed: 0, playerIds: ['B2'] },
            { id: 'P_MS_7', name: 'Mai Văn D3 (CLB D)', chipName: 'D3', club: 'CLB D', country: 'VN', seed: 4, playerIds: ['D3'] },
            { id: 'P_MS_8', name: 'Trịnh Thị E1 (CLB E)', chipName: 'E1', club: 'CLB E', country: 'VN', seed: 0, playerIds: ['E1'] }
          ],
          matches: {
            qf1: { id: 'MS_QF1', code: 'QF1', stage: 'Tứ Kết 1', court: 1, time: '08:45', team1: 'P_MS_1', team2: 'P_MS_2', set1: [31, 24], set2: [0, 0], set3: [0, 0], winner: 'P_MS_1', loser: 'P_MS_2', status: 'FINISHED' },
            qf2: { id: 'MS_QF2', code: 'QF2', stage: 'Tứ Kết 2', court: 2, time: '08:45', team1: 'P_MS_3', team2: 'P_MS_4', set1: [31, 27], set2: [0, 0], set3: [0, 0], winner: 'P_MS_3', loser: 'P_MS_4', status: 'FINISHED' },
            qf3: { id: 'MS_QF3', code: 'QF3', stage: 'Tứ Kết 3', court: 3, time: '08:45', team1: 'P_MS_5', team2: 'P_MS_6', set1: [31, 25], set2: [0, 0], set3: [0, 0], winner: 'P_MS_5', loser: 'P_MS_6', status: 'FINISHED' },
            qf4: { id: 'MS_QF4', code: 'QF4', stage: 'Tứ Kết 4', court: 1, time: '09:30', team1: 'P_MS_7', team2: 'P_MS_8', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MS_7', loser: 'P_MS_8', status: 'FINISHED' },
            sf1: { id: 'MS_SF1', code: 'SF1', stage: 'Bán Kết 1', court: 1, time: '11:00', team1: 'P_MS_1', team2: 'P_MS_3', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_MS_1', loser: 'P_MS_3', status: 'FINISHED' },
            sf2: { id: 'MS_SF2', code: 'SF2', stage: 'Bán Kết 2', court: 2, time: '11:00', team1: 'P_MS_5', team2: 'P_MS_7', set1: [31, 26], set2: [0, 0], set3: [0, 0], winner: 'P_MS_5', loser: 'P_MS_7', status: 'FINISHED' },
            final: { id: 'MS_FINAL', code: 'CK', stage: 'Chung Kết Đơn Nam', court: 1, time: '12:00', team1: 'P_MS_1', team2: 'P_MS_5', set1: [31, 29], set2: [0, 0], set3: [0, 0], winner: 'P_MS_1', loser: 'P_MS_5', status: 'FINISHED' },
            third: { id: 'MS_THIRD', code: 'T3', stage: 'Tranh Hạng Ba', court: 2, time: '12:00', team1: 'P_MS_3', team2: 'P_MS_7', set1: [31, 27], set2: [0, 0], set3: [0, 0], winner: 'P_MS_3', loser: 'P_MS_7', status: 'FINISHED' }
          },
          champion: 'P_MS_1',
          runnerUp: 'P_MS_5',
          thirdPlace: 'P_MS_3'
        },

        // ================== NỘI DUNG 3: ĐÔI NAM NỮ (2 BẢNG A, B + PLAYOFF) ==================
        {
          id: 'XD',
          name: 'Đôi Nam Nữ (Mixed Doubles)',
          type: 'DOUBLES',
          format: 'GROUP_KNOCKOUT',
          seedsCount: 2,
          pairs: [
            { id: 'P_XD_1', name: 'A1 & E1 (CLB A & E)', chipName: 'A1 & E1', club: 'CLB A-E', country: 'VN', seed: 1, playerIds: ['A1', 'E1'] },
            { id: 'P_XD_2', name: 'B1 & E2 (CLB B & E)', chipName: 'B1 & E2', club: 'CLB B-E', country: 'VN', seed: 0, playerIds: ['B1', 'E2'] },
            { id: 'P_XD_3', name: 'C1 & A6 (CLB C & A)', chipName: 'C1 & A6', club: 'CLB C-A', country: 'VN', seed: 0, playerIds: ['C1', 'A6'] },
            { id: 'P_XD_4', name: 'D1 & A2 (CLB D & A)', chipName: 'D1 & A2', club: 'CLB D-A', country: 'VN', seed: 2, playerIds: ['D1', 'A2'] },
            { id: 'P_XD_5', name: 'A3 & C2 (CLB A & C)', chipName: 'A3 & C2', club: 'CLB A-C', country: 'VN', seed: 0, playerIds: ['A3', 'C2'] },
            { id: 'P_XD_6', name: 'B2 & D4 (CLB B & D)', chipName: 'B2 & D4', club: 'CLB B-D', country: 'VN', seed: 0, playerIds: ['B2', 'D4'] }
          ],
          groups: [
            { id: 'A', name: 'BẢNG A (ĐÔI NAM NỮ)', pairIds: ['P_XD_1', 'P_XD_2', 'P_XD_3'] },
            { id: 'B', name: 'BẢNG B (ĐÔI NAM NỮ)', pairIds: ['P_XD_4', 'P_XD_5', 'P_XD_6'] }
          ],
          groupMatches: {
            ga1: { id: 'XD_GA1', code: 'A1', group: 'A', stage: 'Vòng Bảng A - Trận 1', court: 2, time: '09:00', team1: 'P_XD_1', team2: 'P_XD_2', set1: [31, 26], set2: [0, 0], set3: [0, 0], winner: 'P_XD_1', loser: 'P_XD_2', status: 'FINISHED' },
            ga2: { id: 'XD_GA2', code: 'A2', group: 'A', stage: 'Vòng Bảng A - Trận 2', court: 3, time: '09:30', team1: 'P_XD_2', team2: 'P_XD_3', set1: [31, 27], set2: [0, 0], set3: [0, 0], winner: 'P_XD_2', loser: 'P_XD_3', status: 'FINISHED' },
            ga3: { id: 'XD_GA3', code: 'A3', group: 'A', stage: 'Vòng Bảng A - Trận 3', court: 1, time: '10:15', team1: 'P_XD_1', team2: 'P_XD_3', set1: [31, 23], set2: [0, 0], set3: [0, 0], winner: 'P_XD_1', loser: 'P_XD_3', status: 'FINISHED' },
            gb1: { id: 'XD_GB1', code: 'B1', group: 'B', stage: 'Vòng Bảng B - Trận 1', court: 2, time: '10:15', team1: 'P_XD_4', team2: 'P_XD_5', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_XD_4', loser: 'P_XD_5', status: 'FINISHED' },
            gb2: { id: 'XD_GB2', code: 'B2', group: 'B', stage: 'Vòng Bảng B - Trận 2', court: 3, time: '10:15', team1: 'P_XD_5', team2: 'P_XD_6', set1: [31, 29], set2: [0, 0], set3: [0, 0], winner: 'P_XD_5', loser: 'P_XD_6', status: 'FINISHED' },
            gb3: { id: 'XD_GB3', code: 'B3', group: 'B', stage: 'Vòng Bảng B - Trận 3', court: 1, time: '11:00', team1: 'P_XD_4', team2: 'P_XD_6', set1: [31, 25], set2: [0, 0], set3: [0, 0], winner: 'P_XD_4', loser: 'P_XD_6', status: 'FINISHED' }
          },
          matches: {
            sf1: { id: 'XD_SF1', code: 'SF1', stage: 'Bán Kết 1 (Nhất A vs Nhì B)', court: 2, time: '11:45', team1: 'P_XD_1', team2: 'P_XD_5', set1: [31, 27], set2: [0, 0], set3: [0, 0], winner: 'P_XD_1', loser: 'P_XD_5', status: 'FINISHED' },
            sf2: { id: 'XD_SF2', code: 'SF2', stage: 'Bán Kết 2 (Nhất B vs Nhì A)', court: 3, time: '11:45', team1: 'P_XD_4', team2: 'P_XD_2', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_XD_4', loser: 'P_XD_2', status: 'FINISHED' },
            final: { id: 'XD_FINAL', code: 'CK', stage: 'Chung Kết Cúp Đôi Nam Nữ', court: 1, time: '12:45', team1: 'P_XD_1', team2: 'P_XD_4', set1: [31, 29], set2: [0, 0], set3: [0, 0], winner: 'P_XD_1', loser: 'P_XD_4', status: 'FINISHED' },
            third: { id: 'XD_THIRD', code: 'T3', stage: 'Tranh Hạng Ba Đôi Nam Nữ', court: 2, time: '12:45', team1: 'P_XD_5', team2: 'P_XD_2', set1: [31, 28], set2: [0, 0], set3: [0, 0], winner: 'P_XD_5', loser: 'P_XD_2', status: 'FINISHED' }
          },
          champion: 'P_XD_1',
          runnerUp: 'P_XD_4',
          thirdPlace: 'P_XD_5'
        }
      ]
    }
  ];
}

/**
 * Nạp dữ liệu giải đấu độc lập từ LocalStorage hoặc AppState
 */
function loadTournamentData() {
  try {
    if (AppState && AppState.tournamentData && Array.isArray(AppState.tournamentData) && AppState.tournamentData.length > 0) {
      TournamentState.tournaments = AppState.tournamentData;
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(TournamentState.tournaments));
    } else {
      const raw = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
      if (raw) {
        TournamentState.tournaments = JSON.parse(raw);
      }
    }
  } catch (e) {
    console.error('Lỗi đọc dữ liệu giải đấu:', e);
  }

  // Tự động nâng cấp / nạp phiên bản chuẩn 5 CLB (A..E) và 18 thành viên nếu chưa có
  if (!TournamentState.tournaments || TournamentState.tournaments.length === 0 || TournamentState.tournaments[0]?.dataVersion !== TOURNAMENT_DATA_VERSION) {
    TournamentState.tournaments = createDefaultTournamentData();
    TournamentState.activeTournamentId = TournamentState.tournaments[0].id;
    autoGenerateTournamentSchedule(TournamentState.tournaments[0].id, true);
    saveTournamentData();
  }

  if (!TournamentState.activeTournamentId && TournamentState.tournaments.length > 0) {
    TournamentState.activeTournamentId = TournamentState.tournaments[0].id;
  }

  const activeTour = getActiveTournament();
  if (activeTour && !activeTour.scheduleAutoGeneratedV2) {
    autoGenerateTournamentSchedule(activeTour.id, true);
  }

  // Đảm bảo tất cả VĐV hiện có đều có trường gender (MALE/FEMALE)
  if (TournamentState.tournaments) {
    TournamentState.tournaments.forEach(t => {
      if (t.players) {
        t.players.forEach(p => {
          if (!p.gender) {
            if (p.id === 'E1' || p.id === 'E2' || (p.name && (p.name.includes('Thị') || p.name.includes('Hoa') || p.name.includes('Mai') || p.name.includes('Hà')))) {
              p.gender = 'FEMALE';
            } else {
              p.gender = 'MALE';
            }
          }
        });
      }
    });
  }
}

/**
 * Lưu dữ liệu giải đấu độc lập vào LocalStorage và đồng bộ đám mây
 */
function saveTournamentData() {
  try {
    localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(TournamentState.tournaments));
    if (AppState && !isReceivingFromCloud) {
      AppState.tournamentData = TournamentState.tournaments;
      saveData();
    }
  } catch (e) {
    console.error('Lỗi lưu dữ liệu giải đấu:', e);
  }
}

/**
 * Lấy đối tượng giải đấu đang chọn
 */
function getActiveTournament() {
  return TournamentState.tournaments.find(t => t.id === TournamentState.activeTournamentId) || TournamentState.tournaments[0];
}

/**
 * Lấy nội dung thi đấu đang chọn trong giải
 */
function getActiveDiscipline() {
  const tour = getActiveTournament();
  if (!tour || !tour.disciplines) return null;
  return tour.disciplines.find(d => d.id === TournamentState.activeDisciplineId) || tour.disciplines[0];
}

/**
 * Khởi tạo phân hệ giải đấu
 */
function initTournamentModule() {
  loadTournamentData();
}

/**
 * Render toàn bộ phân hệ Quản lý Giải đấu
 */
function renderTournamentModule() {
  loadTournamentData();
  const tour = getActiveTournament();
  if (!tour) return;

  // 1. Cập nhật Tiêu đề và Header Bar
  const titleEl = document.getElementById('tourHeaderTitle');
  if (titleEl) titleEl.textContent = tour.title;

  const quickTitleEl = document.getElementById('activeTourQuickTitle');
  if (quickTitleEl) quickTitleEl.textContent = tour.title;

  const scopeBadge = document.getElementById('tourHeaderScopeBadge');
  if (scopeBadge) {
    const sc = TOURNAMENT_SCOPES.find(s => s.id === tour.scope) || { label: '🤝 Liên CLB' };
    scopeBadge.textContent = sc.label;
  }

  const statusBadge = document.getElementById('tourHeaderStatusBadge');
  if (statusBadge) {
    if (tour.status === 'COMPLETED') {
      statusBadge.textContent = 'Đã kết thúc';
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40';
    } else {
      statusBadge.textContent = 'Đang thi đấu';
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    }
  }

  // 2. Đổ danh sách giải đấu vào dropdown switcher
  const selectActive = document.getElementById('tourSelectActive');
  if (selectActive) {
    selectActive.innerHTML = TournamentState.tournaments.map(t => `
      <option value="${t.id}" ${t.id === tour.id ? 'selected' : ''}>${escapeHtml(t.title)}</option>
    `).join('');
  }

  // 3. Render danh sách Tab nội dung thi đấu
  renderDisciplineTabs();

  // 4. Render nội dung theo sub-tab hiện hành
  switchTourSubtab(TournamentState.activeSubtab || 'bracket');

  lucide.createIcons();
}

/**
 * Chuyển đổi giữa 5 Sub-Tabs
 */
function switchTourSubtab(subtabId) {
  TournamentState.activeSubtab = subtabId;

  // Cập nhật nút điều hướng
  ['bracket', 'schedule', 'clubs', 'players', 'config', 'awards'].forEach(id => {
    const btn = document.getElementById(`btnTourSubtab-${id}`);
    const view = document.getElementById(`tourView-${id}`) || (id === 'clubs' ? document.getElementById('tourView-players') : null);
    if (btn) {
      if (id === subtabId || (subtabId === 'clubs' && id === 'players')) {
        btn.className = 'px-1 py-1 rounded-md bg-purple-700 text-white font-black shadow-2xs transition flex items-center justify-center gap-0.5 whitespace-nowrap cursor-pointer text-[8px] tracking-tight shrink-0';
      } else {
        btn.className = 'px-1 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center justify-center gap-0.5 whitespace-nowrap cursor-pointer text-[8px] font-bold tracking-tight shrink-0';
      }
    }
    if (view) {
      if (id === subtabId || (subtabId === 'clubs' && id === 'clubs')) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    }
  });

  // Render nội dung tương ứng
  if (subtabId === 'bracket') {
    renderTournamentBracketTab();
  } else if (subtabId === 'schedule') {
    renderTournamentScheduleTab();
  } else if (subtabId === 'clubs' || subtabId === 'players') {
    renderTournamentClubsTab();
    renderTournamentPlayersTab();
  } else if (subtabId === 'config') {
    renderTournamentConfigTab();
  } else if (subtabId === 'awards') {
    renderTournamentAwardsTab();
  }

  lucide.createIcons();
}

/**
 * Đổi giải đấu hiện hành
 */
function switchActiveTournament(tourId) {
  TournamentState.activeTournamentId = tourId;
  const tour = getActiveTournament();
  if (tour && tour.disciplines && tour.disciplines.length > 0) {
    TournamentState.activeDisciplineId = tour.disciplines[0].id;
  }
  renderTournamentModule();
  showToast(`Đã chuyển sang giải đấu: ${tour.title}`, 'info');
}

/**
 * Đổi nội dung thi đấu đang xem (MD, MS, XD...)
 */
function switchTourDiscipline(discId) {
  TournamentState.activeDisciplineId = discId;
  renderDisciplineTabs();
  if (TournamentState.activeSubtab === 'bracket') {
    renderTournamentBracketTab();
  } else if (TournamentState.activeSubtab === 'clubs' || TournamentState.activeSubtab === 'players') {
    renderTournamentPlayersTab();
  }
}

/**
 * Render thanh chọn nội dung thi đấu
 */
function renderDisciplineTabs() {
  const container = document.getElementById('tourDisciplineTabsContainer');
  const tour = getActiveTournament();
  if (!container || !tour || !tour.disciplines) return;

  container.innerHTML = tour.disciplines.map(d => {
    const isActive = d.id === TournamentState.activeDisciplineId;
    return `
      <button type="button" onclick="switchTourDiscipline('${d.id}')" class="px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${isActive ? 'bg-purple-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
        <span>${d.type === 'DOUBLES' ? '👥' : '👤'}</span>
        <span>${escapeHtml(d.name)}</span>
        <span class="text-[10px] opacity-80">(${d.pairs ? d.pairs.length : 0})</span>
      </button>
    `;
  }).join('');
}

// ----------------------------------------------------
// PHÂN HỆ 1: SƠ ĐỒ CÂY BRACKET TỰ ĐỘNG, VÒNG BẢNG & GHI ĐIỂM LIVE
// ----------------------------------------------------

/**
 * Tìm cặp đấu theo ID
 */
function findTournamentPair(pairId) {
  const disc = getActiveDiscipline();
  if (!disc || !disc.pairs) return null;
  return disc.pairs.find(p => p.id === pairId) || null;
}

/**
 * Tính toán Bảng Xếp Hạng Vòng Bảng (Group Standings) chuẩn theo tiêu chí cấu hình
 */
function calculateGroupStandings(group, groupMatches, criteriaOrder) {
  if (!group || !group.pairIds) return [];
  const stats = {};

  group.pairIds.forEach(pId => {
    stats[pId] = {
      pairId: pId,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      h2h: {}
    };
  });

  const matchesList = Object.values(groupMatches || {}).filter(m => m.group === group.id);

  matchesList.forEach(m => {
    if (m.status !== 'FINISHED' || !m.winner) return;
    const t1 = m.team1;
    const t2 = m.team2;
    if (!stats[t1] || !stats[t2]) return;

    stats[t1].played++;
    stats[t2].played++;

    let setsT1 = 0;
    let setsT2 = 0;
    [m.set1, m.set2, m.set3].forEach(set => {
      if (set && (set[0] > 0 || set[1] > 0)) {
        stats[t1].pointsWon += set[0];
        stats[t1].pointsLost += set[1];
        stats[t2].pointsWon += set[1];
        stats[t2].pointsLost += set[0];
        if (set[0] > set[1]) setsT1++;
        else if (set[1] > set[0]) setsT2++;
      }
    });

    stats[t1].setsWon += setsT1;
    stats[t1].setsLost += setsT2;
    stats[t2].setsWon += setsT2;
    stats[t2].setsLost += setsT1;

    if (m.winner === t1) {
      stats[t1].won++;
      stats[t2].lost++;
      stats[t1].h2h[t2] = 1;
      stats[t2].h2h[t1] = -1;
    } else if (m.winner === t2) {
      stats[t2].won++;
      stats[t1].lost++;
      stats[t2].h2h[t1] = 1;
      stats[t1].h2h[t2] = -1;
    }
  });

  const rankedList = Object.values(stats);
  const activeCriteria = criteriaOrder || ['WINS', 'HEAD_TO_HEAD', 'GAME_DIFF', 'POINT_DIFF', 'POINTS_SCORED', 'FAIR_PLAY'];

  rankedList.sort((a, b) => {
    for (const c of activeCriteria) {
      if (c === 'WINS') {
        if (b.won !== a.won) return b.won - a.won;
      } else if (c === 'HEAD_TO_HEAD') {
        if (a.h2h[b.pairId] !== undefined && a.h2h[b.pairId] !== 0) {
          return b.h2h[a.pairId] - a.h2h[b.pairId];
        }
      } else if (c === 'GAME_DIFF') {
        const diffA = a.setsWon - a.setsLost;
        const diffB = b.setsWon - b.setsLost;
        if (diffB !== diffA) return diffB - diffA;
      } else if (c === 'POINT_DIFF') {
        const diffA = a.pointsWon - a.pointsLost;
        const diffB = b.pointsWon - b.pointsLost;
        if (diffB !== diffA) return diffB - diffA;
      } else if (c === 'POINTS_SCORED') {
        if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
      }
    }
    return 0;
  });

  return rankedList;
}

/**
 * Render sơ đồ thi đấu: Cây Knockout hoặc Vòng Bảng + Playoff
 */
function renderTournamentBracketTab() {
  const disc = getActiveDiscipline();
  const tour = getActiveTournament();
  const container = document.getElementById('tourKnockoutTreeContainer');
  const formatBadge = document.getElementById('tourCurrentDisciplineFormatBadge');

  if (!disc || !container) return;

  const rules = tour.matchRules || { setsMode: 1, pointsToWin: 31, maxPointsCap: 31, ruleType: 'SUDDEN_DEATH' };
  const rulesLabel = rules.setsMode === 1 ? `1 Set ${rules.maxPointsCap}đ` : `3 Set ${rules.pointsToWin}đ`;

  if (formatBadge) {
    if (disc.groups && disc.groups.length >= 4) {
      formatBadge.innerHTML = `🎲 4 Bảng (A, B, C, D) + Playoff • ${rulesLabel}`;
      formatBadge.className = 'px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 font-black border border-teal-200';
    } else if (disc.groups && disc.groups.length === 2) {
      formatBadge.innerHTML = `👥 2 Bảng (A, B) + Playoff • ${rulesLabel}`;
      formatBadge.className = 'px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 font-black border border-indigo-200';
    } else {
      formatBadge.innerHTML = `⚡ Đấu loại trực tiếp (Knockout) • ${rulesLabel}`;
      formatBadge.className = 'px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 font-black border border-purple-200';
    }
  }

  const matches = disc.matches || {};
  const finalMatch = matches.final || {};

  // Render match card helper với nút mở Modal và quick score
  const renderMatchCard = (m, matchKey, nextTargetLabel, isGroup = false, customWidth = '') => {
    if (!m) return '';
    const t1 = findTournamentPair(m.team1);
    const t2 = findTournamentPair(m.team2);

    const t1Name = t1 ? t1.chipName || t1.name : (m.team1Label || 'Chờ xác định');
    const t2Name = t2 ? t2.chipName || t2.name : (m.team2Label || 'Chờ xác định');
    const t1Club = t1?.club ? t1.club : '';
    const t2Club = t2?.club ? t2.club : '';

    const isFinished = m.status === 'FINISHED' && m.winner;
    const isReady = t1 && t2;

    const s1_1 = (m.set1 && m.set1[0]) || 0;
    const s1_2 = (m.set1 && m.set1[1]) || 0;

    const widthClass = isGroup ? 'w-full' : (customWidth || 'w-[245px] sm:w-[255px] shrink-0');

    return `
      <div class="bg-white rounded-xl border ${isFinished ? 'border-purple-300 shadow-2xs' : 'border-slate-200 shadow-2xs'} p-2.5 space-y-1.5 relative ${widthClass} text-xs">
        <div class="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-100 font-bold">
          <span class="text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">${m.code || matchKey} • ${m.stage}</span>
          <span class="text-slate-500 font-semibold">Sân ${m.court || 1} • ${m.time || '08:00'}</span>
        </div>

        <!-- Đội 1 -->
        <div class="flex items-center justify-between p-1.5 rounded-lg ${m.winner === m.team1 && m.team1 ? 'bg-emerald-50 border border-emerald-300 font-black text-emerald-950 shadow-2xs' : 'bg-slate-50 text-slate-800'}">
          <div class="truncate pr-1.5 flex items-center gap-1.5 min-w-0">
            ${m.winner === m.team1 && m.team1 ? '<span class="text-xs">👑</span>' : ''}
            <span class="truncate font-bold ${m.winner === m.team1 && m.team1 ? 'text-emerald-950 font-black' : 'text-slate-800'}" title="${t1 ? t1.name : ''}">${escapeHtml(t1Name)}</span>
            ${t1Club ? `<span class="text-[10px] px-1.5 py-0.2 bg-purple-100/80 text-purple-800 rounded font-bold shrink-0">${escapeHtml(t1Club)}</span>` : ''}
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <input type="number" min="0" max="35" value="${s1_1}" ${!isReady ? 'disabled' : ''} onchange="updateMatchScoreSet('${disc.id}', '${matchKey}', 1, this.value, null, ${isGroup})" class="w-9 h-7 text-center text-xs font-black border border-slate-200 rounded-lg bg-white p-0.5 shadow-2xs disabled:opacity-40" />
          </div>
        </div>

        <!-- Đội 2 -->
        <div class="flex items-center justify-between p-1.5 rounded-lg ${m.winner === m.team2 && m.team2 ? 'bg-emerald-50 border border-emerald-300 font-black text-emerald-950 shadow-2xs' : 'bg-slate-50 text-slate-800'}">
          <div class="truncate pr-1.5 flex items-center gap-1.5 min-w-0">
            ${m.winner === m.team2 && m.team2 ? '<span class="text-xs">👑</span>' : ''}
            <span class="truncate font-bold ${m.winner === m.team2 && m.team2 ? 'text-emerald-950 font-black' : 'text-slate-800'}" title="${t2 ? t2.name : ''}">${escapeHtml(t2Name)}</span>
            ${t2Club ? `<span class="text-[10px] px-1.5 py-0.2 bg-blue-100/80 text-blue-800 rounded font-bold shrink-0">${escapeHtml(t2Club)}</span>` : ''}
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <input type="number" min="0" max="35" value="${s1_2}" ${!isReady ? 'disabled' : ''} onchange="updateMatchScoreSet('${disc.id}', '${matchKey}', 1, null, this.value, ${isGroup})" class="w-9 h-7 text-center text-xs font-black border border-slate-200 rounded-lg bg-white p-0.5 shadow-2xs disabled:opacity-40" />
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
          <button type="button" onclick="openEditScoreModal('${disc.id}', '${matchKey}', ${isGroup})" class="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer">
            <span>📝</span>
            <span>Chi tiết điểm</span>
          </button>
          ${nextTargetLabel ? `
            <span class="font-bold text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 truncate max-w-[130px]">${nextTargetLabel}</span>
          ` : (isFinished ? `<span class="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">✓ Đã xong</span>` : `<span class="text-slate-400">Chờ đấu</span>`)}
        </div>
      </div>
    `;
  };

  // =================== TRƯỜNG HỢP 1: 4 BẢNG (A, B, C, D) + PLAYOFF (QF -> SF -> FINAL) ===================
  if (disc.groups && disc.groups.length >= 4) {
    let html = '<div class="space-y-5">';

    // Header Vòng Bảng
    html += `
      <div class="p-3 bg-gradient-to-r from-teal-50 via-indigo-50 to-purple-50 rounded-xl border border-teal-200 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div>
          <b class="text-teal-950 text-xs flex items-center gap-1.5">
            <span>🎲</span>
            <span>VÒNG BẢNG 4 BẢNG ĐỘC LẬP (A, B, C, D) • THỂ LỆ: ${rulesLabel}</span>
          </b>
          <p class="text-[11px] text-teal-800">Top 1 và Top 2 của mỗi bảng (Tổng 8 đội) tự động giành vé tiến vào vòng Tứ Kết Playoff QF1..QF4!</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-teal-800 border border-teal-300 shadow-2xs">
          Tiêu chí ưu tiên: ${tour.rankingCriteria?.slice(0, 3).map(c => RANKING_CRITERIA_DEFINITIONS.find(d => d.id === c)?.name.split('(')[0].trim()).join(' ➔ ')}
        </span>
      </div>

      <!-- 4 Bảng Grid (2x2) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;

    disc.groups.forEach(grp => {
      const standings = calculateGroupStandings(grp, disc.groupMatches, tour.rankingCriteria);
      const grpMatches = Object.entries(disc.groupMatches || {}).filter(([k, m]) => m.group === grp.id);

      html += `
        <div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <h4 class="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-black">${grp.id}</span>
              <span>${grp.name}</span>
            </h4>
            <span class="text-[11px] text-teal-800 bg-teal-100/70 font-bold px-2 py-0.5 rounded">Vòng tròn 1 lượt</span>
          </div>

          <!-- Bảng xếp hạng trực tiếp -->
          <div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th class="py-2 px-2 text-center w-10">Hạng</th>
                  <th class="py-2 px-2.5">Cặp Đấu</th>
                  <th class="py-2 px-1 text-center w-14">CLB</th>
                  <th class="py-2 px-1 text-center w-9">Trận</th>
                  <th class="py-2 px-1 text-center w-9 text-emerald-700">T</th>
                  <th class="py-2 px-1 text-center w-9 text-rose-600">B</th>
                  <th class="py-2 px-1.5 text-center w-14">HS</th>
                  <th class="py-2 px-1.5 text-center w-16">Vé QF</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${standings.map((st, idx) => {
                  const p = findTournamentPair(st.pairId);
                  const isTop2 = idx < 2;
                  return `
                    <tr class="${isTop2 ? 'bg-emerald-50/50 font-semibold' : ''}">
                      <td class="py-2 px-2 text-center font-black ${idx === 0 ? 'text-amber-500' : (idx === 1 ? 'text-slate-600' : 'text-slate-400')}">
                        ${idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : `${idx + 1}`)}
                      </td>
                      <td class="py-2 px-2.5 truncate max-w-[130px] font-bold text-slate-900" title="${p ? p.name : ''}">
                        ${p ? p.chipName || p.name : st.pairId}
                      </td>
                      <td class="py-2 px-1 text-center font-bold text-purple-700">
                        <span class="px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-[10px]">${p?.club || 'CLB'}</span>
                      </td>
                      <td class="py-2 px-1 text-center text-slate-700">${st.played}</td>
                      <td class="py-2 px-1 text-center font-black text-emerald-700">${st.won}</td>
                      <td class="py-2 px-1 text-center text-slate-500">${st.lost}</td>
                      <td class="py-2 px-1.5 text-center font-bold ${st.pointsWon - st.pointsLost > 0 ? 'text-emerald-700' : (st.pointsWon - st.pointsLost < 0 ? 'text-rose-600' : 'text-slate-600')}">
                        ${st.pointsWon - st.pointsLost > 0 ? `+${st.pointsWon - st.pointsLost}` : `${st.pointsWon - st.pointsLost}`}
                      </td>
                      <td class="py-2 px-1.5 text-center">
                        ${isTop2 ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Vào QF
                          </span>
                        ` : `<span class="text-[10px] text-slate-400">Dừng bước</span>`}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Các trận đấu trong bảng -->
          <div class="space-y-1.5 pt-1">
            <span class="text-xs font-bold text-slate-600 block">Các trận đấu bảng ${grp.id}:</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${grpMatches.map(([key, gm]) => renderMatchCard(gm, key, '', true)).join('')}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';

    // VÒNG PLAYOFF KNOCKOUT 8 ĐỘI (TỨ KẾT QF ➔ BÁN KẾT SF ➔ CHUNG KẾT & TRANH HẠNG BA)
    const qf1 = matches.qf1 || {};
    const qf2 = matches.qf2 || {};
    const qf3 = matches.qf3 || {};
    const qf4 = matches.qf4 || {};
    const sf1 = matches.sf1 || {};
    const sf2 = matches.sf2 || {};
    const thirdMatch = matches.third || {};

    html += `
      <div class="pt-5 border-t border-slate-200 space-y-3.5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <span class="text-lg">🌿</span>
              <span>Sơ Đồ Phân Nhánh Knockout: Tứ Kết ➔ Bán Kết ➔ Chung Kết & Tranh Hạng Ba</span>
            </h4>
            <p class="text-xs text-slate-500">Người thắng tự động chuyển sang vòng tiếp theo; 2 đội thua ở Bán kết tự động vào Tranh Hạng Ba 🥉</p>
          </div>
          <span class="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
            Tự động đẩy người thắng
          </span>
        </div>

        <div class="overflow-x-auto pb-2">
          <div class="min-w-[880px] flex items-center justify-between gap-4 py-2">
            
            <!-- Cột 1: TỨ KẾT (QF) -->
            <div class="space-y-2.5 w-[250px] shrink-0">
              <div class="text-center font-black text-xs text-purple-900 bg-purple-50 py-1.5 px-3 rounded-xl border border-purple-200 uppercase">
                ⚔️ Tứ Kết (QF1 - QF4)
              </div>
              <div class="space-y-2">
                ${renderMatchCard(qf1, 'qf1', 'Vào SF1')}
                ${renderMatchCard(qf2, 'qf2', 'Vào SF1')}
              </div>
              <div class="py-1"></div>
              <div class="space-y-2">
                ${renderMatchCard(qf3, 'qf3', 'Vào SF2')}
                ${renderMatchCard(qf4, 'qf4', 'Vào SF2')}
              </div>
            </div>

            <div class="text-slate-300 font-bold text-lg shrink-0">➔</div>

            <!-- Cột 2: BÁN KẾT (SF) -->
            <div class="space-y-4 w-[250px] shrink-0">
              <div class="text-center font-black text-xs text-blue-900 bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-200 uppercase">
                ⚡ Bán Kết (SF1 & SF2)
              </div>
              <div class="space-y-14 pt-4">
                ${renderMatchCard(sf1, 'sf1', 'Vào Chung Kết')}
                ${renderMatchCard(sf2, 'sf2', 'Vào Chung Kết')}
              </div>
            </div>

            <div class="text-slate-300 font-bold text-lg shrink-0">➔</div>

            <!-- Cột 3: CHUNG KẾT & TRANH HẠNG BA -->
            <div class="space-y-3 w-[260px] shrink-0">
              <div class="text-center font-black text-xs text-amber-900 bg-amber-50 py-1.5 px-3 rounded-xl border border-amber-200 uppercase">
                🏆 Chung Kết & Hạng Ba
              </div>
              <div class="space-y-3 pt-1">
                <div class="p-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-2xl shadow-md border-2 border-amber-400">
                  ${renderMatchCard(finalMatch, 'final', '🏆 VÔ ĐỊCH CLB')}
                </div>
                <div class="pt-2">
                  <span class="text-[10px] font-black text-amber-900 uppercase block mb-1">🥉 Trận Tranh Hạng Ba:</span>
                  <div class="p-1 bg-amber-50 rounded-2xl border-2 border-amber-300">
                    ${renderMatchCard(thirdMatch, 'third', '🥉 HẠNG BA')}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    html += '</div>';
    container.innerHTML = html;
    return;
  }

  // =================== TRƯỜNG HỢP 2: 2 BẢNG (A, B) + PLAYOFF (SF -> FINAL) ===================
  if (disc.groups && disc.groups.length === 2) {
    let groupHtml = '<div class="space-y-5">';

    groupHtml += `
      <div class="p-3 bg-teal-50/70 rounded-xl border border-teal-200 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div>
          <b class="text-teal-950 text-xs flex items-center gap-1.5">
            <span>📊</span>
            <span>VÒNG BẢNG (A & B) • THỂ LỆ: ${rulesLabel}</span>
          </b>
          <p class="text-[11px] text-teal-800">Top 1 và Top 2 mỗi bảng tự động giành vé tiến vào vòng Bán Kết Playoff (SF1 & SF2)!</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-teal-800 border border-teal-300 shadow-2xs">
          Tiêu chí ưu tiên: ${tour.rankingCriteria?.slice(0, 3).map(c => RANKING_CRITERIA_DEFINITIONS.find(d => d.id === c)?.name.split('(')[0].trim()).join(' ➔ ')}
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    `;

    disc.groups.forEach(grp => {
      const standings = calculateGroupStandings(grp, disc.groupMatches, tour.rankingCriteria);
      const grpMatches = Object.entries(disc.groupMatches || {}).filter(([k, m]) => m.group === grp.id);

      groupHtml += `
        <div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <h4 class="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-black">${grp.id}</span>
              <span>${grp.name}</span>
            </h4>
            <span class="text-[11px] text-slate-600 font-semibold">Vòng tròn 1 lượt</span>
          </div>

          <div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th class="py-2 px-2 text-center w-10">Hạng</th>
                  <th class="py-2 px-2.5">Đội / Cặp Đấu</th>
                  <th class="py-2 px-1 text-center w-14">CLB</th>
                  <th class="py-2 px-1 text-center w-9">Trận</th>
                  <th class="py-2 px-1 text-center w-9 text-emerald-700">T</th>
                  <th class="py-2 px-1 text-center w-9 text-rose-600">B</th>
                  <th class="py-2 px-1.5 text-center w-14">HS</th>
                  <th class="py-2 px-2 text-center w-16">Vé SF</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${standings.map((st, idx) => {
                  const p = findTournamentPair(st.pairId);
                  const isTop2 = idx < 2;
                  return `
                    <tr class="${isTop2 ? 'bg-emerald-50/50 font-semibold' : ''}">
                      <td class="py-2 px-2 text-center font-black ${idx === 0 ? 'text-amber-500' : (idx === 1 ? 'text-slate-600' : 'text-slate-400')}">
                        ${idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : `${idx + 1}`)}
                      </td>
                      <td class="py-2 px-2.5 truncate max-w-[130px] font-bold text-slate-900" title="${p ? p.name : ''}">
                        ${p ? p.chipName || p.name : st.pairId}
                      </td>
                      <td class="py-2 px-1 text-center font-bold text-purple-700">
                        <span class="px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-[10px]">${p?.club || 'CLB'}</span>
                      </td>
                      <td class="py-2 px-1 text-center text-slate-700">${st.played}</td>
                      <td class="py-2 px-1 text-center font-black text-emerald-700">${st.won}</td>
                      <td class="py-2 px-1 text-center text-slate-500">${st.lost}</td>
                      <td class="py-2 px-1.5 text-center font-bold ${st.pointsWon - st.pointsLost > 0 ? 'text-emerald-700' : (st.pointsWon - st.pointsLost < 0 ? 'text-rose-600' : 'text-slate-600')}">
                        ${st.pointsWon - st.pointsLost > 0 ? `+${st.pointsWon - st.pointsLost}` : `${st.pointsWon - st.pointsLost}`}
                      </td>
                      <td class="py-2 px-2 text-center">
                        ${isTop2 ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Vào SF
                          </span>
                        ` : `<span class="text-[10px] text-slate-400">Dừng bước</span>`}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="space-y-1.5 pt-1">
            <span class="text-xs font-bold text-slate-600 block">Các trận đấu vòng tròn:</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${grpMatches.map(([key, gm]) => renderMatchCard(gm, key, '', true)).join('')}
            </div>
          </div>
        </div>
      `;
    });

    groupHtml += '</div>';

    // PLAYOFF 4 ĐỘI
    const sf1 = matches.sf1 || {};
    const sf2 = matches.sf2 || {};
    const thirdMatch = matches.third || {};

    groupHtml += `
      <div class="pt-5 border-t border-slate-200 space-y-3.5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <span class="text-lg">⚡</span>
              <span>VÒNG PLAYOFF: BÁN KẾT ➔ CHUNG KẾT & TRANH HẠNG BA</span>
            </h4>
            <p class="text-xs text-slate-500">Hai đội thua ở Bán kết tự động chuyển vào trận Tranh Hạng Ba 🥉</p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-6 overflow-x-auto pb-2">
          <!-- Bán kết SF -->
          <div class="space-y-3 w-[250px] shrink-0">
            <div class="text-center font-black text-xs text-blue-900 bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-200 uppercase">
              ⚡ Bán Kết (SF1 & SF2)
            </div>
            <div class="space-y-3">
              ${renderMatchCard(sf1, 'sf1', 'Vào Chung Kết')}
              ${renderMatchCard(sf2, 'sf2', 'Vào Chung Kết')}
            </div>
          </div>

          <div class="text-slate-300 font-bold text-lg shrink-0">➔</div>

          <!-- Chung kết & Tranh hạng ba -->
          <div class="space-y-3 w-[260px] shrink-0">
            <div class="text-center font-black text-xs text-amber-900 bg-amber-50 py-1.5 px-3 rounded-xl border border-amber-200 uppercase">
              🏆 Chung Kết & Hạng Ba
            </div>
            <div class="space-y-3">
              <div class="p-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-2xl shadow-md border-2 border-amber-400">
                ${renderMatchCard(finalMatch, 'final', '🏆 VÔ ĐỊCH')}
              </div>
              <div class="pt-1">
                <span class="text-[10px] font-black text-amber-900 uppercase block mb-1">🥉 Tranh Hạng Ba:</span>
                <div class="p-1 bg-amber-50 rounded-2xl border-2 border-amber-300">
                  ${renderMatchCard(thirdMatch, 'third', '🥉 HẠNG BA')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    groupHtml += '</div>';
    container.innerHTML = groupHtml;
    return;
  }

  // =================== TRƯỜNG HỢP 3: LOẠI TRỰC TIẾP (KNOCKOUT QF -> SF -> CK) ===================
  const qf1 = matches.qf1 || {};
  const qf2 = matches.qf2 || {};
  const qf3 = matches.qf3 || {};
  const qf4 = matches.qf4 || {};
  const sf1 = matches.sf1 || {};
  const sf2 = matches.sf2 || {};
  const thirdMatch = matches.third || {};

  container.innerHTML = `
    <div class="min-w-[880px] py-3 px-1 space-y-5">
      <div class="flex items-center justify-between gap-5">
        <!-- Cột 1: TỨ KẾT (QF) -->
        <div class="space-y-3 w-[250px] shrink-0">
          <div class="text-center font-black text-xs text-purple-900 bg-purple-50 py-1.5 px-3 rounded-xl border border-purple-200 uppercase tracking-wide">
            ⚔️ Vòng Tứ Kết (QF1 - QF4)
          </div>
          <div class="space-y-2">
            ${renderMatchCard(qf1, 'qf1', 'Vào Bán Kết 1')}
            ${renderMatchCard(qf2, 'qf2', 'Vào Bán Kết 1')}
          </div>
          <div class="py-1"></div>
          <div class="space-y-2">
            ${renderMatchCard(qf3, 'qf3', 'Vào Bán Kết 2')}
            ${renderMatchCard(qf4, 'qf4', 'Vào Bán Kết 2')}
          </div>
        </div>

        <div class="flex flex-col justify-around h-full space-y-16 text-slate-300 font-bold text-lg shrink-0">
          <div>➔</div>
          <div>➔</div>
        </div>

        <!-- Cột 2: BÁN KẾT (SF) -->
        <div class="space-y-4 w-[250px] shrink-0">
          <div class="text-center font-black text-xs text-blue-900 bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-200 uppercase tracking-wide">
            ⚡ Vòng Bán Kết (SF1 & SF2)
          </div>
          <div class="space-y-14 pt-4">
            ${renderMatchCard(sf1, 'sf1', 'Vào Chung Kết Cúp')}
            ${renderMatchCard(sf2, 'sf2', 'Vào Chung Kết Cúp')}
          </div>
        </div>

        <div class="flex flex-col justify-around h-full space-y-16 text-slate-300 font-bold text-lg shrink-0">
          <div>➔</div>
        </div>

        <!-- Cột 3: CHUNG KẾT & TRANH HẠNG BA -->
        <div class="space-y-4 w-[260px] shrink-0">
          <div class="text-center font-black text-xs text-amber-900 bg-amber-50 py-1.5 px-3 rounded-xl border border-amber-200 uppercase tracking-wide">
            🏆 Chung Kết & Hạng Ba
          </div>
          <div class="space-y-4 pt-1">
            <div class="p-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-2xl shadow-md border-2 border-amber-400">
              ${renderMatchCard(finalMatch, 'final', '🏆 VÔ ĐỊCH CLB')}
            </div>
            <div class="pt-2 border-t border-slate-100">
              <span class="text-[10px] font-black text-amber-900 uppercase block mb-1">🥉 Trận Tranh Hạng Ba:</span>
              <div class="p-1 bg-amber-50 rounded-2xl border-2 border-amber-300">
                ${renderMatchCard(thirdMatch, 'third', '🥉 HẠNG BA')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Cập nhật tỉ số trận đấu và tự động đẩy người thắng
 */
function updateMatchScoreSet(discId, matchKey, setNum, s1, s2, isGroup = false) {
  const tour = getActiveTournament();
  if (!tour) return;
  const disc = tour.disciplines.find(d => d.id === discId);
  if (!disc) return;

  const targetCollection = isGroup ? disc.groupMatches : disc.matches;
  if (!targetCollection) return;
  const m = targetCollection[matchKey];
  if (!m) return;

  if (!m[`set${setNum}`]) m[`set${setNum}`] = [0, 0];
  if (s1 !== null && s1 !== undefined) m[`set${setNum}`][0] = parseInt(s1) || 0;
  if (s2 !== null && s2 !== undefined) m[`set${setNum}`][1] = parseInt(s2) || 0;

  evaluateMatchWinner(m, tour.matchRules);

  // Tự động đẩy nhánh kế tiếp nếu là Knockout hoặc Playoff
  if (!isGroup && disc.matches) {
    if (m.winner) {
      if (matchKey === 'qf1' && disc.matches.sf1) disc.matches.sf1.team1 = m.winner;
      if (matchKey === 'qf2' && disc.matches.sf1) disc.matches.sf1.team2 = m.winner;
      if (matchKey === 'qf3' && disc.matches.sf2) disc.matches.sf2.team1 = m.winner;
      if (matchKey === 'qf4' && disc.matches.sf2) disc.matches.sf2.team2 = m.winner;

      if (matchKey === 'sf1') {
        if (disc.matches.final) disc.matches.final.team1 = m.winner;
        if (disc.matches.third) disc.matches.third.team1 = m.loser;
      }
      if (matchKey === 'sf2') {
        if (disc.matches.final) disc.matches.final.team2 = m.winner;
        if (disc.matches.third) disc.matches.third.team2 = m.loser;
      }
      if (matchKey === 'final') {
        disc.champion = m.winner;
        disc.runnerUp = m.loser;
      }
      if (matchKey === 'third') {
        disc.thirdPlace = m.winner;
      }
    }
  }

  saveTournamentData();
  renderTournamentBracketTab();
  showToast(`Đã lưu tỉ số trận ${m.code || matchKey}!`, 'success');
}

/**
 * Xác định đội thắng trận theo thể lệ giải phong trào (1 set hoặc 3 set, 21-31 điểm chạm)
 */
function evaluateMatchWinner(m, customRules) {
  const tour = getActiveTournament();
  const rules = customRules || tour?.matchRules || { setsMode: 1, pointsToWin: 31, maxPointsCap: 31, ruleType: 'SUDDEN_DEATH' };

  if (rules.setsMode === 1) {
    // 1 Set (Phong trào 31 điểm chạm tối đa hoặc 21 / 25 điểm)
    const s1 = (m.set1 && m.set1[0]) || 0;
    const s2 = (m.set1 && m.set1[1]) || 0;
    const target = rules.pointsToWin || 31;
    const cap = rules.maxPointsCap || target;

    if (s1 >= target || s2 >= target) {
      if (s1 >= cap && s1 > s2) {
        m.winner = m.team1;
        m.loser = m.team2;
        m.status = 'FINISHED';
      } else if (s2 >= cap && s2 > s1) {
        m.winner = m.team2;
        m.loser = m.team1;
        m.status = 'FINISHED';
      } else if (Math.abs(s1 - s2) >= 2) {
        m.winner = s1 > s2 ? m.team1 : m.team2;
        m.loser = s1 > s2 ? m.team2 : m.team1;
        m.status = 'FINISHED';
      }
    } else if (s1 > 0 || s2 > 0) {
      m.status = 'PLAYING';
      m.winner = null;
      m.loser = null;
    }
    return;
  }

  // 3 Set (Thắng 2 set là thắng trận - Chuẩn BWF)
  let winsTeam1 = 0;
  let winsTeam2 = 0;
  const target = rules.pointsToWin || 21;
  const cap = rules.maxPointsCap || 30;

  [m.set1, m.set2, m.set3].forEach(set => {
    if (set && (set[0] > 0 || set[1] > 0)) {
      if (set[0] >= target && set[0] - set[1] >= 2) winsTeam1++;
      else if (set[1] >= target && set[1] - set[0] >= 2) winsTeam2++;
      else if (set[0] >= cap && set[0] > set[1]) winsTeam1++;
      else if (set[1] >= cap && set[1] > set[0]) winsTeam2++;
    }
  });

  if (winsTeam1 >= 2) {
    m.winner = m.team1;
    m.loser = m.team2;
    m.status = 'FINISHED';
  } else if (winsTeam2 >= 2) {
    m.winner = m.team2;
    m.loser = m.team1;
    m.status = 'FINISHED';
  } else if (m.set1 && (m.set1[0] > 0 || m.set1[1] > 0)) {
    m.status = 'PLAYING';
    m.winner = null;
    m.loser = null;
  }
}

// ==========================================
// CÁC HÀM XỬ LÝ THANH CÔNG CỤ HOẠT ĐỘNG TIẾP THEO & MODAL TỈ SỐ
// ==========================================

function toggleMatchRulesDropdown() {
  const menu = document.getElementById('dropdownMatchRulesMenu');
  if (menu) menu.classList.toggle('hidden');
}

/**
 * Đổi nhanh thể lệ thi đấu phong trào (1 set 31đ / 3 set 21đ)
 */
function setQuickMatchRule(setsMode, pointsToWin, maxPointsCap, ruleType = 'SUDDEN_DEATH') {
  const tour = getActiveTournament();
  if (!tour) return;

  tour.matchRules = {
    setsMode,
    pointsToWin,
    maxPointsCap,
    ruleType
  };

  const menu = document.getElementById('dropdownMatchRulesMenu');
  if (menu) menu.classList.add('hidden');

  saveTournamentData();
  renderTournamentModule();
  showToast(`✓ Đã áp dụng thể lệ: ${setsMode} Set chạm ${maxPointsCap} điểm tối đa!`, 'success');
}

function syncMatchRulesFromConfig() {
  const setsMode = parseInt(document.getElementById('cfgTourSetsMode')?.value) || 1;
  const pointsCap = parseInt(document.getElementById('cfgTourPointsCap')?.value) || 31;
  setQuickMatchRule(setsMode, pointsCap, pointsCap, 'SUDDEN_DEATH');
}

/**
 * NÚT 1: Bốc thăm & Phân 4 Bảng (A, B, C, D) + Tạo nhánh Knockout QF -> SF -> Final & Hạng Ba
 */
function autoPartition4Groups() {
  const tour = getActiveTournament();
  const disc = getActiveDiscipline();
  if (!tour || !disc) return;

  const pairs = disc.pairs || [];
  if (pairs.length < 4) {
    showToast('Cần ít nhất 4 đội/cặp đấu để chia 4 bảng!', 'warning');
    return;
  }

  // Khởi tạo 4 bảng A, B, C, D
  const gA = [];
  const gB = [];
  const gC = [];
  const gD = [];

  pairs.forEach((p, idx) => {
    const mod = idx % 4;
    if (mod === 0) gA.push(p.id);
    else if (mod === 1) gB.push(p.id);
    else if (mod === 2) gC.push(p.id);
    else gD.push(p.id);
  });

  disc.groups = [
    { id: 'A', name: 'BẢNG A', pairIds: gA },
    { id: 'B', name: 'BẢNG B', pairIds: gB },
    { id: 'C', name: 'BẢNG C', pairIds: gC },
    { id: 'D', name: 'BẢNG D', pairIds: gD }
  ];

  // Tạo các trận đấu vòng tròn cho từng bảng
  disc.groupMatches = {};
  ['A', 'B', 'C', 'D'].forEach(gid => {
    const grp = disc.groups.find(g => g.id === gid);
    const pIds = grp.pairIds;
    let mCount = 1;
    for (let i = 0; i < pIds.length; i++) {
      for (let j = i + 1; j < pIds.length; j++) {
        const key = `g${gid.toLowerCase()}${mCount}`;
        disc.groupMatches[key] = {
          id: `${disc.id}_G${gid}${mCount}`,
          code: `${gid}${mCount}`,
          group: gid,
          stage: `Vòng Bảng ${gid} - Trận ${mCount}`,
          court: ((mCount - 1) % (tour.courtsCount || 3)) + 1,
          time: '08:00',
          team1: pIds[i],
          team2: pIds[j],
          set1: [0, 0],
          set2: [0, 0],
          set3: [0, 0],
          winner: null,
          loser: null,
          status: 'NOT_STARTED'
        };
        mCount++;
      }
    }
  });

  // Thiết lập nhánh Playoff Knockout 8 đội: QF1..QF4 -> SF1, SF2 -> Chung Kết & Hạng Ba
  disc.matches = {
    qf1: { id: `${disc.id}_QF1`, code: 'QF1', stage: 'Tứ Kết 1 (Nhất A vs Nhì B)', court: 1, time: '10:00', team1: gA[0] || null, team2: gB[1] || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    qf2: { id: `${disc.id}_QF2`, code: 'QF2', stage: 'Tứ Kết 2 (Nhất C vs Nhì D)', court: 2, time: '10:00', team1: gC[0] || null, team2: gD[1] || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    qf3: { id: `${disc.id}_QF3`, code: 'QF3', stage: 'Tứ Kết 3 (Nhất B vs Nhì A)', court: 3, time: '10:00', team1: gB[0] || null, team2: gA[1] || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    qf4: { id: `${disc.id}_QF4`, code: 'QF4', stage: 'Tứ Kết 4 (Nhất D vs Nhì C)', court: 1, time: '10:45', team1: gD[0] || null, team2: gC[1] || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    sf1: { id: `${disc.id}_SF1`, code: 'SF1', stage: 'Bán Kết 1 (Thắng QF1 vs QF2)', court: 2, time: '11:30', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    sf2: { id: `${disc.id}_SF2`, code: 'SF2', stage: 'Bán Kết 2 (Thắng QF3 vs QF4)', court: 3, time: '11:30', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    final: { id: `${disc.id}_FINAL`, code: 'CK', stage: 'Chung Kết Cúp CLB (Thắng SF1 vs SF2)', court: 1, time: '12:30', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    third: { id: `${disc.id}_THIRD`, code: 'T3', stage: 'Tranh Hạng Ba (Thua SF1 vs SF2)', court: 2, time: '12:30', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' }
  };

  disc.format = 'GROUP_4_KNOCKOUT';
  disc.champion = null;
  disc.runnerUp = null;
  disc.thirdPlace = null;

  // Tự động phân bổ lịch đấu chuẩn khoảng nghỉ
  autoGenerateTournamentSchedule(tour.id, true);

  saveTournamentData();
  renderTournamentModule();
  showToast(`✓ Đã phân 4 Bảng (A, B, C, D) & Tạo nhánh Tứ kết, Bán kết, Chung kết & Tranh Hạng Ba!`, 'success');
}

/**
 * NÚT 2: Phân 2 Bảng (A, B) + Playoff Bán kết & Chung kết
 */
function autoPartition2Groups() {
  const tour = getActiveTournament();
  const disc = getActiveDiscipline();
  if (!tour || !disc) return;

  const pairs = disc.pairs || [];
  if (pairs.length < 2) {
    showToast('Cần ít nhất 2 đội/cặp đấu để chia bảng!', 'warning');
    return;
  }

  const gA = [];
  const gB = [];

  pairs.forEach((p, idx) => {
    if (idx % 2 === 0) gA.push(p.id);
    else gB.push(p.id);
  });

  disc.groups = [
    { id: 'A', name: 'BẢNG A', pairIds: gA },
    { id: 'B', name: 'BẢNG B', pairIds: gB }
  ];

  disc.groupMatches = {};
  ['A', 'B'].forEach(gid => {
    const grp = disc.groups.find(g => g.id === gid);
    const pIds = grp.pairIds;
    let mCount = 1;
    for (let i = 0; i < pIds.length; i++) {
      for (let j = i + 1; j < pIds.length; j++) {
        const key = `g${gid.toLowerCase()}${mCount}`;
        disc.groupMatches[key] = {
          id: `${disc.id}_G${gid}${mCount}`,
          code: `${gid}${mCount}`,
          group: gid,
          stage: `Vòng Bảng ${gid} - Trận ${mCount}`,
          court: ((mCount - 1) % (tour.courtsCount || 3)) + 1,
          time: '08:00',
          team1: pIds[i],
          team2: pIds[j],
          set1: [0, 0],
          set2: [0, 0],
          set3: [0, 0],
          winner: null,
          loser: null,
          status: 'NOT_STARTED'
        };
        mCount++;
      }
    }
  });

  disc.matches = {
    sf1: { id: `${disc.id}_SF1`, code: 'SF1', stage: 'Bán Kết 1 (Nhất A vs Nhì B)', court: 1, time: '10:30', team1: gA[0] || null, team2: gB[1] || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    sf2: { id: `${disc.id}_SF2`, code: 'SF2', stage: 'Bán Kết 2 (Nhất B vs Nhì A)', court: 2, time: '10:30', team1: gB[0] || null, team2: gA[1] || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    final: { id: `${disc.id}_FINAL`, code: 'CK', stage: 'Chung Kết Cúp CLB', court: 1, time: '11:45', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    third: { id: `${disc.id}_THIRD`, code: 'T3', stage: 'Tranh Hạng Ba', court: 2, time: '11:45', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' }
  };

  disc.format = 'GROUP_KNOCKOUT';
  disc.champion = null;
  disc.runnerUp = null;
  disc.thirdPlace = null;

  autoGenerateTournamentSchedule(tour.id, true);

  saveTournamentData();
  renderTournamentModule();
  showToast(`✓ Đã phân 2 Bảng (A, B) & Tạo nhánh Playoff SF, Chung kết & Tranh Hạng Ba!`, 'success');
}

/**
 * NÚT 3: Chuyển sang thể thức Đấu Loại Trực Tiếp (Knockout)
 */
function autoSetKnockoutFormat() {
  const tour = getActiveTournament();
  const disc = getActiveDiscipline();
  if (!tour || !disc) return;

  const pairs = disc.pairs || [];
  disc.groups = null;
  disc.groupMatches = null;
  disc.format = 'KNOCKOUT';

  disc.matches = {
    qf1: { id: `${disc.id}_QF1`, code: 'QF1', stage: 'Tứ Kết 1', court: 1, time: '08:30', team1: pairs[0]?.id || null, team2: pairs[1]?.id || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    qf2: { id: `${disc.id}_QF2`, code: 'QF2', stage: 'Tứ Kết 2', court: 2, time: '08:30', team1: pairs[2]?.id || null, team2: pairs[3]?.id || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    qf3: { id: `${disc.id}_QF3`, code: 'QF3', stage: 'Tứ Kết 3', court: 3, time: '08:30', team1: pairs[4]?.id || null, team2: pairs[5]?.id || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    qf4: { id: `${disc.id}_QF4`, code: 'QF4', stage: 'Tứ Kết 4', court: 1, time: '09:15', team1: pairs[6]?.id || null, team2: pairs[7]?.id || null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    sf1: { id: `${disc.id}_SF1`, code: 'SF1', stage: 'Bán Kết 1', court: 2, time: '10:15', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    sf2: { id: `${disc.id}_SF2`, code: 'SF2', stage: 'Bán Kết 2', court: 3, time: '10:15', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    final: { id: `${disc.id}_FINAL`, code: 'CK', stage: 'Chung Kết Cúp CLB', court: 1, time: '11:30', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' },
    third: { id: `${disc.id}_THIRD`, code: 'T3', stage: 'Tranh Hạng Ba', court: 2, time: '11:30', team1: null, team2: null, set1: [0, 0], winner: null, loser: null, status: 'NOT_STARTED' }
  };

  disc.champion = null;
  disc.runnerUp = null;
  disc.thirdPlace = null;

  autoGenerateTournamentSchedule(tour.id, true);

  saveTournamentData();
  renderTournamentModule();
  showToast(`✓ Đã chuyển sang Thể thức Đấu Loại Trực Tiếp (Knockout QF ➔ CK)!`, 'success');
}

/**
 * Mở modal nhập điểm chi tiết (1 Set hoặc 3 Set)
 */
function openEditScoreModal(discId, matchKey, isGroup = false) {
  const tour = getActiveTournament();
  if (!tour) return;
  const disc = tour.disciplines.find(d => d.id === discId);
  if (!disc) return;

  const targetCollection = isGroup ? disc.groupMatches : disc.matches;
  if (!targetCollection) return;
  const m = targetCollection[matchKey];
  if (!m) return;

  const t1 = findTournamentPair(m.team1);
  const t2 = findTournamentPair(m.team2);
  const rules = tour.matchRules || { setsMode: 1, pointsToWin: 31, maxPointsCap: 31 };

  document.getElementById('scoreModalDisciplineId').value = discId;
  document.getElementById('scoreModalMatchKey').value = matchKey;
  document.getElementById('scoreModalIsGroup').value = isGroup ? 'true' : 'false';

  document.getElementById('scoreModalDisciplineBadge').textContent = disc.name.toUpperCase();
  document.getElementById('scoreModalTitle').textContent = `${m.code || matchKey} • ${m.stage}`;
  document.getElementById('scoreModalCourtTimeBadge').textContent = `Sân ${m.court || 1} • ${m.time || '08:00'}`;
  document.getElementById('scoreModalRulesText').textContent = `Thể lệ: ${rules.setsMode === 1 ? '1 Set chạm ' + rules.maxPointsCap + ' điểm' : '3 Set chạm ' + rules.pointsToWin + ' điểm'}`;

  document.getElementById('scoreModalTeam1Club').textContent = t1?.club || 'CLB';
  document.getElementById('scoreModalTeam1Name').textContent = t1?.name || (m.team1Label || 'Đội 1');
  document.getElementById('scoreModalTeam2Club').textContent = t2?.club || 'CLB';
  document.getElementById('scoreModalTeam2Name').textContent = t2?.name || (m.team2Label || 'Đội 2');

  document.getElementById('scoreModalSet1Team1').value = (m.set1 && m.set1[0]) || 0;
  document.getElementById('scoreModalSet1Team2').value = (m.set1 && m.set1[1]) || 0;

  const row2T1 = document.getElementById('scoreModalRowSet2Team1');
  const row2T2 = document.getElementById('scoreModalRowSet2Team2');
  const row3T1 = document.getElementById('scoreModalRowSet3Team1');
  const row3T2 = document.getElementById('scoreModalRowSet3Team2');

  if (rules.setsMode === 3) {
    if (row2T1) row2T1.classList.remove('hidden');
    if (row2T2) row2T2.classList.remove('hidden');
    if (row3T1) row3T1.classList.remove('hidden');
    if (row3T2) row3T2.classList.remove('hidden');
    document.getElementById('scoreModalSet2Team1').value = (m.set2 && m.set2[0]) || 0;
    document.getElementById('scoreModalSet2Team2').value = (m.set2 && m.set2[1]) || 0;
    document.getElementById('scoreModalSet3Team1').value = (m.set3 && m.set3[0]) || 0;
    document.getElementById('scoreModalSet3Team2').value = (m.set3 && m.set3[1]) || 0;
  } else {
    if (row2T1) row2T1.classList.add('hidden');
    if (row2T2) row2T2.classList.add('hidden');
    if (row3T1) row3T1.classList.add('hidden');
    if (row3T2) row3T2.classList.add('hidden');
  }

  document.getElementById('scoreModalStatus').value = m.status || 'FINISHED';

  openModal('modalEditTournamentScore');
}

function quickIncrementScore(inputId, delta) {
  const el = document.getElementById(inputId);
  if (el) {
    el.value = Math.max(0, (parseInt(el.value) || 0) + delta);
  }
}

function quickSetScore(inputId, target) {
  const el = document.getElementById(inputId);
  if (el) {
    el.value = target;
  }
}

function handleScoreModalSubmit(e) {
  e.preventDefault();
  const discId = document.getElementById('scoreModalDisciplineId').value;
  const matchKey = document.getElementById('scoreModalMatchKey').value;
  const isGroup = document.getElementById('scoreModalIsGroup').value === 'true';

  const tour = getActiveTournament();
  if (!tour) return;
  const disc = tour.disciplines.find(d => d.id === discId);
  if (!disc) return;

  const targetCollection = isGroup ? disc.groupMatches : disc.matches;
  if (!targetCollection) return;
  const m = targetCollection[matchKey];
  if (!m) return;

  const s1_1 = parseInt(document.getElementById('scoreModalSet1Team1').value) || 0;
  const s1_2 = parseInt(document.getElementById('scoreModalSet1Team2').value) || 0;
  const s2_1 = parseInt(document.getElementById('scoreModalSet2Team1')?.value) || 0;
  const s2_2 = parseInt(document.getElementById('scoreModalSet2Team2')?.value) || 0;
  const s3_1 = parseInt(document.getElementById('scoreModalSet3Team1')?.value) || 0;
  const s3_2 = parseInt(document.getElementById('scoreModalSet3Team2')?.value) || 0;

  m.set1 = [s1_1, s1_2];
  m.set2 = [s2_1, s2_2];
  m.set3 = [s3_1, s3_2];
  m.status = document.getElementById('scoreModalStatus').value;

  evaluateMatchWinner(m, tour.matchRules);

  // Tự động đẩy người thắng vào vòng kế tiếp
  if (!isGroup && disc.matches && m.winner) {
    if (matchKey === 'qf1' && disc.matches.sf1) disc.matches.sf1.team1 = m.winner;
    if (matchKey === 'qf2' && disc.matches.sf1) disc.matches.sf1.team2 = m.winner;
    if (matchKey === 'qf3' && disc.matches.sf2) disc.matches.sf2.team1 = m.winner;
    if (matchKey === 'qf4' && disc.matches.sf2) disc.matches.sf2.team2 = m.winner;

    if (matchKey === 'sf1') {
      if (disc.matches.final) disc.matches.final.team1 = m.winner;
      if (disc.matches.third) disc.matches.third.team1 = m.loser;
    }
    if (matchKey === 'sf2') {
      if (disc.matches.final) disc.matches.final.team2 = m.winner;
      if (disc.matches.third) disc.matches.third.team2 = m.loser;
    }
    if (matchKey === 'final') {
      disc.champion = m.winner;
      disc.runnerUp = m.loser;
    }
    if (matchKey === 'third') {
      disc.thirdPlace = m.winner;
    }
  }

  saveTournamentData();
  closeModal('modalEditTournamentScore');
  renderTournamentBracketTab();
  renderTournamentAwardsTab();
  showToast(`✓ Đã lưu tỉ số và cập nhật kết quả trận ${m.code || matchKey}!`, 'success');
}

/**
 * Bốc thăm lại nội dung hiện tại
 */
function regenerateActiveDisciplineDraw() {
  const disc = getActiveDiscipline();
  if (!disc || !disc.pairs) return;

  const confirmed = confirm(`Bạn có chắc muốn bốc thăm ngẫu nhiên lại cho nội dung "${disc.name}"? Tỉ số các trận hiện tại sẽ được reset.`);
  if (!confirmed) return;

  // Xáo trộn các cặp không phải hạt giống số 1 và 2
  const fixedSeeds = disc.pairs.filter(p => p.seed === 1 || p.seed === 2);
  const others = disc.pairs.filter(p => p.seed !== 1 && p.seed !== 2).sort(() => Math.random() - 0.5);

  const newOrder = [fixedSeeds[0] || others[0], others[1], others[2], others[3], fixedSeeds[1] || others[4], others[5], others[6], others[7]].filter(Boolean);
  disc.pairs = newOrder;

  // Reset matches
  if (disc.matches) {
    Object.values(disc.matches).forEach(m => {
      m.set1 = [0, 0];
      m.set2 = [0, 0];
      m.set3 = [0, 0];
      m.winner = null;
      m.loser = null;
      m.status = 'NOT_STARTED';
    });
    if (disc.matches.qf1 && disc.pairs.length >= 8) {
      disc.matches.qf1.team1 = disc.pairs[0].id;
      disc.matches.qf1.team2 = disc.pairs[1].id;
      disc.matches.qf2.team1 = disc.pairs[2].id;
      disc.matches.qf2.team2 = disc.pairs[3].id;
      disc.matches.qf3.team1 = disc.pairs[4].id;
      disc.matches.qf3.team2 = disc.pairs[5].id;
      disc.matches.qf4.team1 = disc.pairs[6].id;
      disc.matches.qf4.team2 = disc.pairs[7].id;
      disc.matches.sf1.team1 = null;
      disc.matches.sf1.team2 = null;
      disc.matches.sf2.team1 = null;
      disc.matches.sf2.team2 = null;
      disc.matches.final.team1 = null;
      disc.matches.final.team2 = null;
    }
  }

  saveTournamentData();
  renderTournamentBracketTab();
  showToast(`✓ Đã bốc thăm ngẫu nhiên mới cho nội dung ${disc.name}!`, 'success');
}

// ----------------------------------------------------
// PHÂN HỆ 2: THUẬT TOÁN TỰ TẠO LỊCH THÔNG MINH & KIỂM TRA KHOẢNG NGHỈ
// ----------------------------------------------------

/**
 * Kiểm tra mức độ an toàn thể lực và tính trùng lịch trên toàn bộ giải đấu
 */
function evaluateTournamentScheduleSafety(tour) {
  if (!tour) return { conflicts: [], restWarnings: [], perfect: true };

  const minRest = tour.minRestMinutes || 25;
  const matchDurationMinutes = 35; // Thời lượng quy ước trung bình 1 trận

  // Tập hợp toàn bộ các trận đấu trên mọi nội dung
  const allScheduledMatches = [];
  (tour.disciplines || []).forEach(disc => {
    // Trận vòng bảng
    Object.values(disc.groupMatches || {}).forEach(m => {
      if (m && m.court && m.time) {
        const t1 = disc.pairs?.find(p => p.id === m.team1);
        const t2 = disc.pairs?.find(p => p.id === m.team2);
        allScheduledMatches.push({
          disciplineId: disc.id,
          disciplineName: disc.name,
          match: m,
          playerIds: [...(t1?.playerIds || []), ...(t2?.playerIds || [])],
          court: m.court,
          time: m.time
        });
      }
    });

    // Trận Knockout
    Object.values(disc.matches || {}).forEach(m => {
      if (m && m.court && m.time) {
        const t1 = disc.pairs?.find(p => p.id === m.team1);
        const t2 = disc.pairs?.find(p => p.id === m.team2);
        allScheduledMatches.push({
          disciplineId: disc.id,
          disciplineName: disc.name,
          match: m,
          playerIds: [...(t1?.playerIds || []), ...(t2?.playerIds || [])],
          court: m.court,
          time: m.time
        });
      }
    });
  });

  const conflicts = [];
  const restWarnings = [];

  const timeToMinutes = (str) => {
    const [h, m] = (str || '08:00').split(':').map(Number);
    return (h || 8) * 60 + (m || 0);
  };

  // 1. Kiểm tra trùng giờ cùng thời điểm trên nhiều sân
  for (let i = 0; i < allScheduledMatches.length; i++) {
    for (let j = i + 1; j < allScheduledMatches.length; j++) {
      const m1 = allScheduledMatches[i];
      const m2 = allScheduledMatches[j];

      if (m1.time === m2.time && m1.court !== m2.court) {
        const commonPlayers = m1.playerIds.filter(pid => m2.playerIds.includes(pid));
        if (commonPlayers.length > 0) {
          const pObj = (tour.players || []).find(x => x.id === commonPlayers[0]);
          const playerName = pObj?.name || commonPlayers[0];
          conflicts.push({
            player: playerName,
            time: m1.time,
            m1: `${m1.disciplineName} (Sân ${m1.court})`,
            m2: `${m2.disciplineName} (Sân ${m2.court})`
          });
        }
      }
    }
  }

  // 2. Kiểm tra khoảng nghỉ giữa 2 trận kế tiếp của từng VĐV
  const playerMatchesMap = {};
  allScheduledMatches.forEach(item => {
    item.playerIds.forEach(pid => {
      if (!playerMatchesMap[pid]) playerMatchesMap[pid] = [];
      playerMatchesMap[pid].push(item);
    });
  });

  Object.entries(playerMatchesMap).forEach(([pid, list]) => {
    if (list.length > 1) {
      list.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      for (let k = 0; k < list.length - 1; k++) {
        const prev = list[k];
        const next = list[k + 1];
        const prevEnd = timeToMinutes(prev.time) + matchDurationMinutes;
        const nextStart = timeToMinutes(next.time);
        const actualRest = nextStart - prevEnd;

        if (actualRest < minRest) {
          const pObj = (tour.players || []).find(x => x.id === pid);
          const playerName = pObj?.name || pid;
          restWarnings.push({
            player: playerName,
            actualRest,
            requiredRest: minRest,
            prevMatch: `${prev.match.code || prev.match.stage} (${prev.time})`,
            nextMatch: `${next.match.code || next.match.stage} (${next.time})`
          });
        }
      }
    }
  });

  return {
    conflicts,
    restWarnings,
    perfect: conflicts.length === 0 && restWarnings.length === 0
  };
}

/**
 * Thuật toán "Tự Tạo Lịch Thi Đấu Thông Minh"
 * Giải bài toán thỏa mãn đồng thời:
 * 1. Không trùng giờ thi đấu trên mọi sân cho bất kỳ VĐV nào
 * 2. Đạt khoảng nghỉ tối thiểu minRestMinutes giữa các trận liên tiếp của cùng 1 VĐV trên TẤT CẢ các nội dung (Đơn + Đôi + XD)
 */
function autoGenerateTournamentSchedule(tourId, silent = false) {
  const tour = TournamentState.tournaments.find(t => t.id === tourId) || getActiveTournament();
  if (!tour) return;
  tour.scheduleAutoGeneratedV2 = true;

  const minRest = tour.minRestMinutes || 25;
  const matchDuration = 35;
  const numCourts = tour.courtsCount || 3;
  const baseStart = 8 * 60; // 08:00

  // Thu thập toàn bộ các trận đấu
  const allMatches = [];
  (tour.disciplines || []).forEach(disc => {
    if (disc.groupMatches) {
      Object.entries(disc.groupMatches).forEach(([k, m]) => {
        allMatches.push({ matchRef: m, key: k, isGroup: true, disciplineId: disc.id, priority: 1 });
      });
    }
    if (disc.matches) {
      Object.entries(disc.matches).forEach(([k, m]) => {
        let p = 2; // QF
        if (m.code && m.code.startsWith('SF')) p = 3;
        else if (m.code === 'CK' || m.code === 'T3') p = 4;
        allMatches.push({ matchRef: m, key: k, isGroup: false, disciplineId: disc.id, priority: p });
      });
    }
  });

  // Ưu tiên: Vòng bảng -> Tứ kết -> Bán kết -> Chung kết
  allMatches.sort((a, b) => a.priority - b.priority);

  // Theo dõi lịch bận của từng player: pid -> [{ start, end }]
  const playerBusy = {};
  // Theo dõi lịch bận của từng sân: courtId (1..numCourts) -> [{ start, end }]
  const courtBusy = {};
  for (let c = 1; c <= numCourts; c++) {
    courtBusy[c] = [];
  }

  allMatches.forEach(item => {
    const m = item.matchRef;
    const discipline = tour.disciplines.find(d => d.id === item.disciplineId);
    const p1 = discipline?.pairs?.find(p => p.id === m.team1);
    const p2 = discipline?.pairs?.find(p => p.id === m.team2);
    const playerIds = [
      ...(p1?.playerIds || (m.team1 ? [m.team1] : [])),
      ...(p2?.playerIds || (m.team2 ? [m.team2] : []))
    ];

    let startOffset = 0;
    if (item.priority === 2) startOffset = 45;   // QF bắt đầu sau loạt đầu vòng bảng
    if (item.priority === 3) startOffset = 150;  // SF bắt đầu sau QF
    if (item.priority === 4) startOffset = 250;  // Final bắt đầu sau SF

    let candidateTime = baseStart + startOffset;
    let placed = false;

    while (!placed && candidateTime <= baseStart + 960) {
      // 1. Kiểm tra tất cả VĐV có rảnh và đủ khoảng nghỉ không
      let canPlayersPlay = true;
      for (const pid of playerIds) {
        const intervals = playerBusy[pid] || [];
        for (const iv of intervals) {
          // Trùng giờ
          if (candidateTime < iv.end && (candidateTime + matchDuration) > iv.start) {
            canPlayersPlay = false;
            break;
          }
          // Khoảng nghỉ sau trận trước
          if (candidateTime >= iv.end && (candidateTime - iv.end) < minRest) {
            canPlayersPlay = false;
            break;
          }
          // Khoảng nghỉ trước trận sau
          if ((candidateTime + matchDuration) <= iv.start && (iv.start - (candidateTime + matchDuration)) < minRest) {
            canPlayersPlay = false;
            break;
          }
        }
        if (!canPlayersPlay) break;
      }

      // 2. Nếu VĐV rảnh, tìm sân trống tại candidateTime
      if (canPlayersPlay) {
        let chosenCourt = null;
        for (let c = 1; c <= numCourts; c++) {
          const cIntervals = courtBusy[c] || [];
          const courtOverlaps = cIntervals.some(iv => 
            candidateTime < iv.end && (candidateTime + matchDuration) > iv.start
          );
          if (!courtOverlaps) {
            chosenCourt = c;
            break;
          }
        }

        if (chosenCourt) {
          const timeStr = `${String(Math.floor(candidateTime / 60)).padStart(2, '0')}:${String(candidateTime % 60).padStart(2, '0')}`;
          m.court = chosenCourt;
          m.time = timeStr;

          const mInterval = { start: candidateTime, end: candidateTime + matchDuration };
          for (const pid of playerIds) {
            if (!playerBusy[pid]) playerBusy[pid] = [];
            playerBusy[pid].push(mInterval);
          }
          courtBusy[chosenCourt].push(mInterval);
          placed = true;
          break;
        }
      }

      candidateTime += 5;
    }
  });

  saveTournamentData();
  if (!silent) {
    renderTournamentScheduleTab();
    showToast('✓ Đã tự động tạo lịch thi đấu thông minh! 100% không trùng giờ và đạt chuẩn thời gian nghỉ.', 'success');
  }
}

function autoGenerateSmartSchedule() {
  autoGenerateTournamentSchedule(TournamentState.activeTournamentId);
}

/**
 * Render Giao diện Xếp Lịch & Phân Bổ Sân Đấu
 */
function renderTournamentScheduleTab() {
  const tour = getActiveTournament();
  const container = document.getElementById('tourScheduleCourtsContainer');
  const restBadge = document.getElementById('tourScheduleRestTimeBadge');
  const statusBadge = document.getElementById('tourConflictStatusBadge');
  const detailText = document.getElementById('tourConflictDetailText');

  if (!tour || !container) return;

  if (restBadge) restBadge.textContent = `≥ ${tour.minRestMinutes || 25} phút`;

  const safety = evaluateTournamentScheduleSafety(tour);

  if (statusBadge && detailText) {
    if (safety.perfect) {
      statusBadge.textContent = '✓ Hoàn hảo (0 vi phạm)';
      statusBadge.className = 'text-emerald-700 font-black';
      detailText.textContent = `Mọi VĐV đều có đủ thời gian nghỉ ngơi (≥ ${tour.minRestMinutes || 25}p) và không trùng giờ thi đấu đa nội dung.`;
    } else {
      statusBadge.textContent = `⚠️ Có ${safety.conflicts.length} trùng lịch & ${safety.restWarnings.length} vi phạm nghỉ!`;
      statusBadge.className = 'text-rose-600 font-black';
      detailText.textContent = 'Bấm "Tự động tối ưu lịch thi đấu" để hệ thống tự động tính toán lại và loại bỏ triệt để!';
    }
  }

  // Phân bổ trận đấu theo từng Sân (Courts)
  const courtsCount = tour.courtsCount || 3;
  let courtsHtml = '';

  for (let c = 1; c <= courtsCount; c++) {
    const courtMatches = [];
    (tour.disciplines || []).forEach(disc => {
      // Vòng bảng
      Object.values(disc.groupMatches || {}).forEach(m => {
        if (m && m.court === c) {
          courtMatches.push({ ...m, disciplineName: disc.name, disciplineId: disc.id, pairs: disc.pairs });
        }
      });
      // Knockout
      Object.values(disc.matches || {}).forEach(m => {
        if (m && m.court === c) {
          courtMatches.push({ ...m, disciplineName: disc.name, disciplineId: disc.id, pairs: disc.pairs });
        }
      });
    });

    courtMatches.sort((a, b) => (a.time || '08:00').localeCompare(b.time || '08:00'));

    courtsHtml += `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div class="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">
              ${c}
            </span>
            <b class="text-xs font-black">SÂN THI ĐẤU ${c}</b>
          </div>
          <span class="text-[10px] text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded-full">
            ${courtMatches.length} trận đấu
          </span>
        </div>

        <div class="p-3 space-y-2.5 flex-1 bg-slate-50/50">
          ${courtMatches.length === 0 ? `
            <div class="p-8 text-center text-slate-400 italic text-xs">Chưa có trận đấu nào trên Sân ${c}</div>
          ` : courtMatches.map(m => {
            const t1 = m.pairs?.find(p => p.id === m.team1);
            const t2 = m.pairs?.find(p => p.id === m.team2);
            const t1Name = t1 ? t1.chipName || t1.name : (m.team1Label || 'Chờ xác định');
            const t2Name = t2 ? t2.chipName || t2.name : (m.team2Label || 'Chờ xác định');

            return `
              <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs hover:border-purple-300 transition">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">${m.disciplineName} • ${m.stage}</span>
                  <span class="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-black text-xs">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-500"></i> ${m.time}
                  </span>
                </div>

                <div class="flex items-center justify-between gap-1.5 text-xs font-bold pt-1">
                  <div class="truncate text-slate-900 ${m.winner === m.team1 ? 'text-emerald-700 font-black' : ''}">
                    ${m.winner === m.team1 ? '👑 ' : ''}${escapeHtml(t1Name)}
                  </div>
                  <span class="text-slate-400 text-xs shrink-0 font-semibold">vs</span>
                  <div class="truncate text-slate-900 text-right ${m.winner === m.team2 ? 'text-emerald-700 font-black' : ''}">
                    ${m.winner === m.team2 ? '👑 ' : ''}${escapeHtml(t2Name)}
                  </div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1">
                  <span class="text-emerald-700 font-bold">✓ Nghỉ: Đạt chuẩn (≥ 25p)</span>
                  <span class="${m.status === 'FINISHED' ? 'text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.2 rounded' : 'text-slate-400'}">
                    ${m.status === 'FINISHED' ? '✓ Đã đấu' : 'Chờ đấu'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = courtsHtml;
}

// ----------------------------------------------------
// PHÂN HỆ 3: QUẢN LÝ CLB & ĐĂNG KÝ VẬN ĐỘNG VIÊN
// ----------------------------------------------------

/**
 * Render Giao diện Quản lý CLB & Đăng ký VĐV (☑ CLB A, ☑ CLB B, ☑ CLB C...)
 */
function renderTournamentClubsTab() {
  const container = document.getElementById('tourClubsListContainer');
  const countBadge = document.getElementById('tourParticipatingClubsCountBadge');
  const tour = getActiveTournament();
  if (!container || !tour) return;

  const clubs = tour.clubs || [];
  const players = tour.players || [];
  const registrations = tour.registrations || [];

  const participatingCount = clubs.filter(c => c.participating !== false).length;
  if (countBadge) countBadge.textContent = `${participatingCount} / ${clubs.length} CLB tham gia`;

  // Cập nhật scope cards
  ['INTERNAL', 'MULTI_CLUB', 'OPEN', 'FRIENDLY'].forEach(sc => {
    const btn = document.getElementById(`btnScopeCard-${sc}`);
    if (btn) {
      if (tour.scope === sc) {
        btn.className = 'px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1 cursor-pointer bg-purple-700 text-white border-purple-700 shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1 cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
      }
    }
  });

  container.innerHTML = clubs.map((club, idx) => {
    const isChecked = club.participating !== false;
    const clubPlayers = players.filter(p => p.clubId === club.id);
    const maleCount = clubPlayers.filter(p => p.gender !== 'FEMALE').length;
    const femaleCount = clubPlayers.filter(p => p.gender === 'FEMALE').length;

    return `
      <div class="p-3.5 bg-white rounded-2xl border ${isChecked ? 'border-purple-200 shadow-xs' : 'border-slate-200 opacity-60'} space-y-3 transition">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" id="chkClub-${club.id}" ${isChecked ? 'checked' : ''} onchange="toggleClubParticipation('${club.id}')" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" />
            <div>
              <b class="text-slate-900 text-sm font-black flex items-center gap-1.5">
                <span>🏸 ${escapeHtml(club.name)}</span>
                <span class="text-xs text-slate-400 font-semibold">[${club.id}]</span>
                <span class="text-sm">${club.country === 'KR' ? '🇰🇷' : (club.country === 'JP' ? '🇯🇵' : (club.country === 'TH' ? '🇹🇭' : '🇻🇳'))}</span>
              </b>
              <span class="text-xs text-slate-500 block">Liên hệ: ${escapeHtml(club.contact || 'Ban đại diện')}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 bg-purple-50/80 px-2.5 py-1 rounded-full border border-purple-200 text-xs">
              <span class="font-black text-purple-900">${clubPlayers.length} VĐV</span>
              <span class="text-purple-300">•</span>
              <span class="font-bold text-blue-700">👨 ${maleCount} Nam</span>
              <span class="text-purple-300">•</span>
              <span class="font-bold text-pink-700">👩 ${femaleCount} Nữ</span>
            </div>
            <button type="button" onclick="toggleClubRosterAccordion('${club.id}')" class="text-xs text-purple-700 hover:text-purple-900 font-bold cursor-pointer px-2 py-1 rounded-lg hover:bg-purple-50 transition">
              Chi tiết ▾
            </button>
          </div>
        </div>

        <!-- Accordion Danh Sách VĐV của CLB này -->
        <div id="roster-${club.id}" class="pt-2 border-t border-slate-100">
          ${clubPlayers.length === 0 ? `
            <div class="p-2 text-center text-slate-400 italic text-xs">Chưa có VĐV nào đăng ký từ CLB này</div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              ${clubPlayers.map((p, pIdx) => {
                const reg = registrations.find(r => r.playerId === p.id);
                const isMale = p.gender !== 'FEMALE';
                const discBadges = (reg?.disciplines || ['MD']).map(d => {
                  if (d === 'MD') return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${isMale ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-purple-100 text-purple-900 border border-purple-200'}">${isMale ? 'Đôi Nam' : 'Đôi Nữ'}</span>`;
                  if (d === 'MS') return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">${isMale ? 'Đơn Nam' : 'Đơn Nữ'}</span>`;
                  if (d === 'XD') return '<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-pink-100 text-pink-900 border border-pink-200">Đôi Nam Nữ</span>';
                  return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${d}</span>`;
                }).join(' ');

                return `
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 hover:border-purple-200 transition">
                    <div class="flex items-center justify-between">
                      <b class="text-slate-900 text-xs font-bold truncate flex items-center gap-1" title="${p.name}">
                        <span>${pIdx + 1}. ${escapeHtml(p.name)}</span>
                      </b>
                      <div class="flex items-center gap-1 shrink-0">
                        ${isMale ? `
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">👨 Nam</span>
                        ` : `
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200">👩 Nữ</span>
                        `}
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-50 text-amber-900 border border-amber-200">${escapeHtml(p.level || 'A')}</span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                      <div class="flex items-center gap-1 flex-wrap">
                        ${discBadges}
                      </div>
                      <span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">✓ Đã duyệt</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Toggle trạng thái tham gia giải đấu của CLB
 */
function toggleClubParticipation(clubId) {
  const tour = getActiveTournament();
  if (!tour || !tour.clubs) return;
  const club = tour.clubs.find(c => c.id === clubId);
  if (!club) return;

  club.participating = club.participating === false ? true : false;
  saveTournamentData();
  renderTournamentClubsTab();
  showToast(`Đã ${club.participating ? 'bật' : 'tắt'} đăng ký tham gia giải cho ${club.name}!`, 'info');
}

function toggleClubRosterAccordion(clubId) {
  const el = document.getElementById(`roster-${clubId}`);
  if (el) el.classList.toggle('hidden');
}

function selectTourOrganizerScope(scopeId) {
  const tour = getActiveTournament();
  if (!tour) return;
  tour.scope = scopeId;
  saveTournamentData();
  renderTournamentModule();
  showToast(`Đã chọn mô hình: ${TOURNAMENT_SCOPES.find(s => s.id === scopeId)?.label || scopeId}`, 'success');
}

/**
 * Render danh sách VĐV và cặp đấu
 */
function renderTournamentPlayersTab() {
  const container = document.getElementById('tourPlayersAndPairsContainer');
  const disc = getActiveDiscipline();
  const tour = getActiveTournament();
  if (!container || !disc || !tour) return;

  const pairs = disc.pairs || [];

  container.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-700">Nội dung: <b class="text-purple-900">${disc.name}</b></span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
            Tổng ${pairs.length} cặp đấu
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        ${pairs.map((p, idx) => `
          <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 hover:border-purple-300 transition">
            <div class="flex items-center justify-between">
              <span class="w-5 h-5 rounded-md bg-purple-100 text-purple-900 flex items-center justify-center font-black text-[10px]">
                ${idx + 1}
              </span>
              ${p.seed > 0 ? `
                <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  Hạt giống số ${p.seed}
                </span>
              ` : `
                <span class="text-[9px] text-slate-400 font-semibold">Tự do</span>
              `}
            </div>

            <b class="text-slate-900 block truncate" title="${p.name}">${p.name}</b>

            <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span class="font-bold text-indigo-700">CLB: ${p.club || 'Smash'}</span>
              <span>${p.country === 'KR' ? '🇰🇷 Hàn Quốc' : (p.country === 'JP' ? '🇯🇵 Nhật Bản' : (p.country === 'TH' ? '🇹🇭 Thái Lan' : '🇻🇳 Việt Nam'))}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// QUẢN LÝ ĐĂNG KÝ CLB & VĐV THEO GIỚI TÍNH
// ==========================================
let clubModalTempMembers = [];
let currentTempMemberGender = 'MALE';
let currentClubModalFilter = 'ALL';

function openAddClubModal() {
  clubModalTempMembers = [];
  currentTempMemberGender = 'MALE';
  currentClubModalFilter = 'ALL';

  const form = document.getElementById('formAddTournamentClub');
  if (form) form.reset();

  const nameInput = document.getElementById('tourNewClubName');
  if (nameInput) nameInput.value = '';
  const codeInput = document.getElementById('tourNewClubCode');
  if (codeInput) codeInput.value = '';
  const contactInput = document.getElementById('tourNewClubContact');
  if (contactInput) contactInput.value = '';

  const batchPanel = document.getElementById('panelBatchImportMembers');
  if (batchPanel) batchPanel.classList.add('hidden');

  setTempMemberGender('MALE');
  renderClubModalTempMembers();
  openModal('modalAddTournamentClub');
}

function setTempMemberGender(gender) {
  currentTempMemberGender = gender;
  const btnM = document.getElementById('btnGenderMale');
  const btnF = document.getElementById('btnGenderFemale');
  const lblMD = document.getElementById('labelTempMD');
  const lblMS = document.getElementById('labelTempMS');

  if (gender === 'MALE') {
    if (btnM) btnM.className = 'px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer bg-blue-600 text-white shadow-xs flex items-center gap-1';
    if (btnF) btnF.className = 'px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer text-slate-600 hover:bg-slate-100 flex items-center gap-1';
    if (lblMD) lblMD.textContent = 'Đôi Nam (MD)';
    if (lblMS) lblMS.textContent = 'Đơn Nam (MS)';
  } else {
    if (btnF) btnF.className = 'px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer bg-pink-600 text-white shadow-xs flex items-center gap-1';
    if (btnM) btnM.className = 'px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer text-slate-600 hover:bg-slate-100 flex items-center gap-1';
    if (lblMD) lblMD.textContent = 'Đôi Nữ (WD / MD)';
    if (lblMS) lblMS.textContent = 'Đơn Nữ (WS / MS)';
  }
}

function autoSuggestClubCode(name) {
  const codeInput = document.getElementById('tourNewClubCode');
  if (!codeInput) return;
  if (!name.trim()) {
    codeInput.value = '';
    return;
  }
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  const words = clean.trim().split(/\s+/).filter(w => !['CLB', 'CAU', 'LONG'].includes(w.toUpperCase()));
  if (words.length === 0) {
    codeInput.value = 'CLB_' + Math.floor(100 + Math.random() * 900);
  } else if (words.length === 1) {
    codeInput.value = words[0].substring(0, 6).toUpperCase();
  } else {
    codeInput.value = words.map(w => w[0]).join('').toUpperCase();
  }
}

function addMemberToClubTempList() {
  const nameInput = document.getElementById('tempMemberName');
  const levelSelect = document.getElementById('tempMemberLevel');
  const phoneInput = document.getElementById('tempMemberPhone');

  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) {
    showToast('Vui lòng nhập họ và tên VĐV!', 'warning');
    nameInput.focus();
    return;
  }

  const level = levelSelect ? levelSelect.value : 'A';
  const phone = phoneInput ? phoneInput.value.trim() : '';

  const disciplines = [];
  if (document.getElementById('tempMemberDisciplineMD')?.checked) disciplines.push('MD');
  if (document.getElementById('tempMemberDisciplineMS')?.checked) disciplines.push('MS');
  if (document.getElementById('tempMemberDisciplineXD')?.checked) disciplines.push('XD');

  if (disciplines.length === 0) {
    disciplines.push('MD');
  }

  clubModalTempMembers.push({
    id: `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    gender: currentTempMemberGender,
    level,
    phone,
    disciplines
  });

  nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  nameInput.focus();

  renderClubModalTempMembers();
  showToast(`✓ Đã thêm ${currentTempMemberGender === 'MALE' ? '👨 VĐV Nam' : '👩 VĐV Nữ'}: ${name}`, 'info');
}

function loadSampleClubMembers() {
  const nameInput = document.getElementById('tourNewClubName');
  const codeInput = document.getElementById('tourNewClubCode');
  const contactInput = document.getElementById('tourNewClubContact');

  if (nameInput && !nameInput.value.trim()) {
    nameInput.value = 'CLB Cầu Lông Ngôi Sao Thủ Đô';
    autoSuggestClubCode('CLB Cầu Lông Ngôi Sao Thủ Đô');
  }
  if (contactInput && !contactInput.value.trim()) {
    contactInput.value = 'Nguyễn Hoàng Sơn (Trưởng đoàn - 0989.888.999)';
  }

  clubModalTempMembers = [
    { id: `TEMP_1`, name: 'Nguyễn Văn Hùng', gender: 'MALE', level: 'A+', phone: '0988.333.111', disciplines: ['MD', 'MS', 'XD'] },
    { id: `TEMP_2`, name: 'Trần Văn Dũng', gender: 'MALE', level: 'A', phone: '0988.333.222', disciplines: ['MD', 'MS', 'XD'] },
    { id: `TEMP_3`, name: 'Lê Hoàng Long', gender: 'MALE', level: 'B+', phone: '0988.333.333', disciplines: ['MD', 'XD'] },
    { id: `TEMP_4`, name: 'Phạm Quang Huy', gender: 'MALE', level: 'B', phone: '0988.333.444', disciplines: ['MD'] },
    { id: `TEMP_5`, name: 'Nguyễn Thị Mai', gender: 'FEMALE', level: 'A', phone: '0988.333.555', disciplines: ['MD', 'MS', 'XD'] },
    { id: `TEMP_6`, name: 'Đỗ Thu Hà', gender: 'FEMALE', level: 'B+', phone: '0988.333.666', disciplines: ['MD', 'XD'] }
  ];

  renderClubModalTempMembers();
  showToast('✓ Đã nạp danh sách mẫu 4 VĐV Nam & 2 VĐV Nữ!', 'success');
}

function toggleBatchImportClubMembers() {
  const panel = document.getElementById('panelBatchImportMembers');
  if (panel) panel.classList.toggle('hidden');
}

function importBatchClubMembers() {
  const maleTxt = document.getElementById('batchMaleInput')?.value || '';
  const femaleTxt = document.getElementById('batchFemaleInput')?.value || '';

  const maleNames = maleTxt.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  const femaleNames = femaleTxt.split('\n').map(s => s.trim()).filter(s => s.length > 0);

  if (maleNames.length === 0 && femaleNames.length === 0) {
    showToast('Chưa có tên VĐV nào được nhập vào ô!', 'warning');
    return;
  }

  maleNames.forEach((n, idx) => {
    clubModalTempMembers.push({
      id: `BATCH_M_${Date.now()}_${idx}`,
      name: n,
      gender: 'MALE',
      level: 'A',
      phone: '',
      disciplines: ['MD', 'MS', 'XD']
    });
  });

  femaleNames.forEach((n, idx) => {
    clubModalTempMembers.push({
      id: `BATCH_F_${Date.now()}_${idx}`,
      name: n,
      gender: 'FEMALE',
      level: 'A',
      phone: '',
      disciplines: ['MD', 'XD']
    });
  });

  if (document.getElementById('batchMaleInput')) document.getElementById('batchMaleInput').value = '';
  if (document.getElementById('batchFemaleInput')) document.getElementById('batchFemaleInput').value = '';
  toggleBatchImportClubMembers();

  renderClubModalTempMembers();
  showToast(`✓ Đã nạp nhanh ${maleNames.length} Nam & ${femaleNames.length} Nữ vào danh sách!`, 'success');
}

function clearClubTempMembers() {
  if (clubModalTempMembers.length === 0) return;
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách VĐV đang nhập tạm không?')) {
    clubModalTempMembers = [];
    renderClubModalTempMembers();
    showToast('Đã xóa sạch danh sách tạm.', 'info');
  }
}

function removeClubTempMember(id) {
  clubModalTempMembers = clubModalTempMembers.filter(m => m.id !== id);
  renderClubModalTempMembers();
}

function setClubModalFilter(filter) {
  currentClubModalFilter = filter;
  renderClubModalTempMembers();
}

function renderClubModalTempMembers() {
  const container = document.getElementById('clubModalMembersTableContainer');
  const totalBadge = document.getElementById('clubModalTotalBadge');
  const maleBadge = document.getElementById('clubModalMaleBadge');
  const femaleBadge = document.getElementById('clubModalFemaleBadge');
  const countAll = document.getElementById('countFilterAll');
  const countM = document.getElementById('countFilterMale');
  const countF = document.getElementById('countFilterFemale');
  const summaryEl = document.getElementById('clubModalFooterSummary');

  const maleCount = clubModalTempMembers.filter(m => m.gender === 'MALE').length;
  const femaleCount = clubModalTempMembers.filter(m => m.gender === 'FEMALE').length;
  const totalCount = clubModalTempMembers.length;

  if (totalBadge) totalBadge.textContent = totalCount;
  if (maleBadge) maleBadge.textContent = maleCount;
  if (femaleBadge) femaleBadge.textContent = femaleCount;
  if (countAll) countAll.textContent = totalCount;
  if (countM) countM.textContent = maleCount;
  if (countF) countF.textContent = femaleCount;
  if (summaryEl) summaryEl.textContent = `${totalCount} VĐV (${maleCount} Nam, ${femaleCount} Nữ)`;

  // Update filter buttons styling
  ['All', 'Male', 'Female'].forEach(f => {
    const btn = document.getElementById(`filterModal${f}`);
    if (btn) {
      if (currentClubModalFilter.toLowerCase() === f.toLowerCase()) {
        btn.className = 'px-2.5 py-1 rounded-md font-black transition cursor-pointer bg-white text-purple-900 shadow-2xs';
      } else {
        btn.className = 'px-2.5 py-1 rounded-md font-bold transition cursor-pointer text-slate-600 hover:text-purple-700';
      }
    }
  });

  if (!container) return;

  const filtered = clubModalTempMembers.filter(m => {
    if (currentClubModalFilter === 'MALE') return m.gender === 'MALE';
    if (currentClubModalFilter === 'FEMALE') return m.gender === 'FEMALE';
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center space-y-2">
        <span class="text-3xl block">👥</span>
        <div class="font-bold text-slate-700 text-xs">
          ${totalCount === 0 ? 'Chưa có VĐV nào trong danh sách đăng ký' : 'Không có VĐV nào thỏa điều kiện lọc'}
        </div>
        <p class="text-[11px] text-slate-400">
          ${totalCount === 0 ? 'Vui lòng nhập VĐV ở form trên hoặc bấm "⚡ Nạp Mẫu" để điền nhanh' : ''}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 text-[11px]">
        <tr>
          <th class="py-2 px-3 w-10 text-center">#</th>
          <th class="py-2 px-3">Họ và tên VĐV</th>
          <th class="py-2 px-2.5 text-center">Giới tính</th>
          <th class="py-2 px-2.5 text-center">Trình độ</th>
          <th class="py-2 px-3">Nội dung thi đấu</th>
          <th class="py-2 px-2.5 text-right w-12">Thao tác</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${filtered.map((m, idx) => {
          const isMale = m.gender === 'MALE';
          const discBadges = (m.disciplines || []).map(d => {
            if (d === 'MD') return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${isMale ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-purple-100 text-purple-900 border border-purple-200'}">${isMale ? 'Đôi Nam' : 'Đôi Nữ'}</span>`;
            if (d === 'MS') return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">${isMale ? 'Đơn Nam' : 'Đơn Nữ'}</span>`;
            if (d === 'XD') return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-pink-100 text-pink-900 border border-pink-200">Đôi Nam Nữ</span>`;
            return `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${d}</span>`;
          }).join(' ');

          return `
            <tr class="hover:bg-slate-50 transition">
              <td class="py-2 px-3 text-center font-bold text-slate-400 text-[11px]">${idx + 1}</td>
              <td class="py-2 px-3 font-bold text-slate-900">
                <div>${escapeHtml(m.name)}</div>
                ${m.phone ? `<span class="text-[10px] text-slate-400 font-normal">📞 ${escapeHtml(m.phone)}</span>` : ''}
              </td>
              <td class="py-2 px-2.5 text-center">
                ${isMale ? `
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                    <span>👨</span> Nam
                  </span>
                ` : `
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200">
                    <span>👩</span> Nữ
                  </span>
                `}
              </td>
              <td class="py-2 px-2.5 text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200">
                  ${escapeHtml(m.level || 'A')}
                </span>
              </td>
              <td class="py-2 px-3">
                <div class="flex items-center gap-1 flex-wrap">
                  ${discBadges}
                </div>
              </td>
              <td class="py-2 px-2.5 text-right">
                <button type="button" onclick="removeClubTempMember('${m.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer" title="Xóa VĐV này">
                  🗑️
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function handleAddNewClubSubmit(e) {
  e.preventDefault();
  const tour = getActiveTournament();
  if (!tour) return;

  const name = document.getElementById('tourNewClubName').value.trim();
  const rawCode = document.getElementById('tourNewClubCode').value.trim();
  const code = (rawCode || `CLB_${Date.now()}`).toUpperCase().replace(/\s+/g, '_');
  const country = document.getElementById('tourNewClubCountry').value;
  const contact = document.getElementById('tourNewClubContact').value.trim();

  if (!name) {
    showToast('Tên CLB không được để trống!', 'warning');
    return;
  }

  if (!tour.clubs) tour.clubs = [];
  if (tour.clubs.some(c => c.id === code)) {
    showToast(`Mã CLB "${code}" đã tồn tại, vui lòng chọn mã khác!`, 'warning');
    return;
  }

  // 1. Lưu CLB mới
  tour.clubs.push({
    id: code,
    name,
    country,
    participating: true,
    contact: contact || `Đại diện CLB ${name}`
  });

  if (!tour.players) tour.players = [];
  if (!tour.registrations) tour.registrations = [];

  // 2. Lưu toàn bộ VĐV trong danh sách tạm đã phân loại theo giới tính
  const addedPlayers = [];
  clubModalTempMembers.forEach((m, idx) => {
    const pId = `${code}_${idx + 1}`;
    const playerObj = {
      id: pId,
      name: m.name,
      chipName: m.name.split(' ').slice(-1)[0] || m.name,
      clubId: code,
      countryId: country,
      level: m.level || 'A',
      phone: m.phone || '',
      gender: m.gender || 'MALE'
    };
    tour.players.push(playerObj);
    addedPlayers.push(playerObj);

    tour.registrations.push({
      id: `REG_${code}_${idx + 1}`,
      playerId: pId,
      clubId: code,
      disciplines: m.disciplines && m.disciplines.length > 0 ? m.disciplines : ['MD'],
      status: 'CONFIRMED'
    });
  });

  // 3. Tự động ghép cặp đôi / đơn cho CLB mới nếu có nội dung thi đấu
  if (tour.disciplines) {
    const mdMale = addedPlayers.filter(p => p.gender === 'MALE');
    const mdFemale = addedPlayers.filter(p => p.gender === 'FEMALE');

    const discMD = tour.disciplines.find(d => d.id === 'MD');
    if (discMD && discMD.pairs && mdMale.length >= 2) {
      const pairId = `P_MD_${code}_${Date.now() % 1000}`;
      discMD.pairs.push({
        id: pairId,
        name: `${mdMale[0].chipName} & ${mdMale[1].chipName} (${name})`,
        chipName: `${mdMale[0].chipName} & ${mdMale[1].chipName}`,
        club: name,
        country,
        seed: 0,
        playerIds: [mdMale[0].id, mdMale[1].id]
      });
    }

    const discXD = tour.disciplines.find(d => d.id === 'XD');
    if (discXD && discXD.pairs && mdMale.length >= 1 && mdFemale.length >= 1) {
      const pairId = `P_XD_${code}_${Date.now() % 1000}`;
      discXD.pairs.push({
        id: pairId,
        name: `${mdMale[0].chipName} & ${mdFemale[0].chipName} (${name})`,
        chipName: `${mdMale[0].chipName} & ${mdFemale[0].chipName}`,
        club: name,
        country,
        seed: 0,
        playerIds: [mdMale[0].id, mdFemale[0].id]
      });
    }

    const discMS = tour.disciplines.find(d => d.id === 'MS');
    if (discMS && discMS.pairs && mdMale.length >= 1) {
      const pairId = `P_MS_${code}_${Date.now() % 1000}`;
      discMS.pairs.push({
        id: pairId,
        name: `${mdMale[0].name} (${name})`,
        chipName: mdMale[0].chipName,
        club: name,
        country,
        seed: 0,
        playerIds: [mdMale[0].id]
      });
    }
  }

  const maleCount = clubModalTempMembers.filter(m => m.gender === 'MALE').length;
  const femaleCount = clubModalTempMembers.filter(m => m.gender === 'FEMALE').length;

  saveTournamentData();
  closeModal('modalAddTournamentClub');
  renderTournamentClubsTab();
  renderTournamentPlayersTab();

  showToast(`✓ Đã đăng ký CLB "${name}" cùng ${clubModalTempMembers.length} VĐV (${maleCount} Nam, ${femaleCount} Nữ)!`, 'success');
}

function openAddPlayerModal() {
  const tour = getActiveTournament();
  const select = document.getElementById('newPlayerClubSelect');
  if (select && tour && tour.clubs) {
    select.innerHTML = tour.clubs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  openModal('modalAddTournamentPlayer');
}

function handleAddNewPlayerSubmit(e) {
  e.preventDefault();
  const tour = getActiveTournament();
  if (!tour) return;

  const name = document.getElementById('newPlayerName').value.trim();
  const gender = document.getElementById('newPlayerGender')?.value || 'MALE';
  const clubId = document.getElementById('newPlayerClubSelect').value;
  const countryId = document.getElementById('newPlayerCountrySelect').value;

  const disciplines = [];
  if (document.getElementById('chkRegMD')?.checked) disciplines.push('MD');
  if (document.getElementById('chkRegMS')?.checked) disciplines.push('MS');
  if (document.getElementById('chkRegXD')?.checked) disciplines.push('XD');

  if (!name) {
    showToast('Tên VĐV không được để trống!', 'warning');
    return;
  }
  if (disciplines.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 nội dung thi đấu!', 'warning');
    return;
  }

  const pId = `P_${Date.now()}`;
  if (!tour.players) tour.players = [];
  tour.players.push({
    id: pId,
    name,
    chipName: name.split(' ').slice(-1)[0] || name,
    clubId,
    countryId,
    level: 'A',
    phone: '',
    gender
  });

  if (!tour.registrations) tour.registrations = [];
  tour.registrations.push({
    id: `REG_${Date.now()}`,
    playerId: pId,
    clubId,
    disciplines,
    status: 'CONFIRMED'
  });

  saveTournamentData();
  closeModal('modalAddTournamentPlayer');
  renderTournamentClubsTab();
  renderTournamentPlayersTab();
  showToast(`✓ Đã đăng ký ${gender === 'MALE' ? '👨 VĐV Nam' : '👩 VĐV Nữ'} "${name}" vào ${disciplines.length} nội dung!`, 'success');
}

// ----------------------------------------------------
// PHÂN HỆ 4: CẤU HÌNH & TIÊU CHÍ XẾP HẠNG VÒNG BẢNG TÙY BIẾN
// ----------------------------------------------------

/**
 * Render Giao diện Cấu hình và Bảng xếp hạng tùy biến tiêu chí
 */
/**
 * Render Giao diện Cấu hình và Bảng xếp hạng tùy biến tiêu chí
 */
function renderTournamentConfigTab() {
  const tour = getActiveTournament();
  if (!tour) return;

  if (document.getElementById('cfgTourTitle')) document.getElementById('cfgTourTitle').value = tour.title || '';
  if (document.getElementById('cfgTourScope')) document.getElementById('cfgTourScope').value = tour.scope || 'MULTI_CLUB';
  if (document.getElementById('cfgTourDate')) document.getElementById('cfgTourDate').value = tour.date || '2026-09-23';
  if (document.getElementById('cfgTourCourtsCount')) document.getElementById('cfgTourCourtsCount').value = tour.courtsCount || 3;
  if (document.getElementById('cfgTourMinRestMinutes')) document.getElementById('cfgTourMinRestMinutes').value = tour.minRestMinutes || 25;
  if (document.getElementById('cfgTourPrize1')) document.getElementById('cfgTourPrize1').value = tour.prizes?.prize1 || '';
  if (document.getElementById('cfgTourPrize2')) document.getElementById('cfgTourPrize2').value = tour.prizes?.prize2 || '';
  if (document.getElementById('cfgTourPrize3')) document.getElementById('cfgTourPrize3').value = tour.prizes?.prize3 || '';

  if (document.getElementById('cfgTourSetsMode')) document.getElementById('cfgTourSetsMode').value = tour.matchRules?.setsMode || 1;
  if (document.getElementById('cfgTourPointsCap')) document.getElementById('cfgTourPointsCap').value = tour.matchRules?.maxPointsCap || 31;

  // Render danh sách tiêu chí xếp hạng có thể đổi thứ tự ưu tiên
  const container = document.getElementById('tourRankingCriteriaListContainer');
  if (!container) return;

  const currentCriteria = tour.rankingCriteria || ['WINS', 'HEAD_TO_HEAD', 'GAME_DIFF', 'POINT_DIFF', 'POINTS_SCORED', 'FAIR_PLAY'];

  container.innerHTML = currentCriteria.map((cId, idx) => {
    const def = RANKING_CRITERIA_DEFINITIONS.find(d => d.id === cId) || { name: cId, desc: '' };
    return `
      <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-purple-100 text-purple-900 font-black text-[11px] flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <div>
            <b class="text-slate-900 block text-xs">${def.name}</b>
            <span class="text-[10px] text-slate-400 block">${def.desc}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" onclick="moveRankingCriterion(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer" title="Ưu tiên cao hơn">
            ▲
          </button>
          <button type="button" onclick="moveRankingCriterion(${idx}, 1)" ${idx === currentCriteria.length - 1 ? 'disabled' : ''} class="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer" title="Ưu tiên thấp hơn">
            ▼
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Di chuyển thứ tự ưu tiên tiêu chí xếp hạng
 */
function moveRankingCriterion(index, direction) {
  const tour = getActiveTournament();
  if (!tour || !tour.rankingCriteria) return;

  const targetIdx = index + direction;
  if (targetIdx < 0 || targetIdx >= tour.rankingCriteria.length) return;

  const temp = tour.rankingCriteria[index];
  tour.rankingCriteria[index] = tour.rankingCriteria[targetIdx];
  tour.rankingCriteria[targetIdx] = temp;

  saveTournamentData();
  renderTournamentConfigTab();
  showToast('Đã cập nhật lại độ ưu tiên tiêu chí xếp hạng vòng bảng!', 'info');
}

/**
 * Lưu thông tin cấu hình giải đấu
 */
function saveTournamentGeneralConfig() {
  const tour = getActiveTournament();
  if (!tour) return;

  tour.title = document.getElementById('cfgTourTitle')?.value.trim() || tour.title;
  tour.scope = document.getElementById('cfgTourScope')?.value || tour.scope;
  tour.date = document.getElementById('cfgTourDate')?.value || tour.date;
  tour.courtsCount = parseInt(document.getElementById('cfgTourCourtsCount')?.value) || 3;
  tour.minRestMinutes = parseInt(document.getElementById('cfgTourMinRestMinutes')?.value) || 25;

  const setsMode = parseInt(document.getElementById('cfgTourSetsMode')?.value) || 1;
  const pointsCap = parseInt(document.getElementById('cfgTourPointsCap')?.value) || 31;
  tour.matchRules = { setsMode, pointsToWin: pointsCap, maxPointsCap: pointsCap, ruleType: 'SUDDEN_DEATH' };

  if (!tour.prizes) tour.prizes = {};
  tour.prizes.prize1 = document.getElementById('cfgTourPrize1')?.value.trim() || tour.prizes.prize1;
  tour.prizes.prize2 = document.getElementById('cfgTourPrize2')?.value.trim() || tour.prizes.prize2;
  tour.prizes.prize3 = document.getElementById('cfgTourPrize3')?.value.trim() || tour.prizes.prize3;

  saveTournamentData();
  renderTournamentModule();
  showToast('✓ Đã lưu cấu hình giải đấu thành công!', 'success');
}

// ----------------------------------------------------
// PHÂN HỆ 5: BỤC TRAO GIẢI & XUẤT BÁO CÁO ZALO
// ----------------------------------------------------

/**
 * Render Giao diện Bục Trao Giải với dữ liệu linh động theo nội dung đang chọn
 */
function renderTournamentAwardsTab() {
  const container = document.getElementById('tourPodiumDisplayArea');
  const tour = getActiveTournament();
  const disc = getActiveDiscipline();
  if (!container || !tour) return;

  const cPair = disc?.champion ? findTournamentPair(disc.champion) : null;
  const rPair = disc?.runnerUp ? findTournamentPair(disc.runnerUp) : null;
  const tPair = disc?.thirdPlace ? findTournamentPair(disc.thirdPlace) : null;

  const champName = cPair ? `${cPair.name} (${cPair.club || 'CLB'})` : 'Chờ xác định kết quả';
  const runnerName = rPair ? `${rPair.name} (${rPair.club || 'CLB'})` : 'Chờ xác định kết quả';
  const thirdName = tPair ? `${tPair.name} (${tPair.club || 'CLB'})` : 'Chờ xác định kết quả';

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Podium Danh Dự -->
      <div class="p-6 bg-gradient-to-b from-indigo-950 via-slate-900 to-purple-950 rounded-2xl text-white shadow-xl border border-indigo-800/40 text-center space-y-6">
        <div>
          <span class="text-xs font-black uppercase tracking-wider text-amber-400 bg-white/10 px-3 py-1 rounded-full border border-white/15">
            BẢNG VÀNG DANH DỰ CÚP CLB • NỘI DUNG: ${disc?.name?.toUpperCase() || ''}
          </span>
          <h2 class="text-xl font-black text-white mt-2">${escapeHtml(tour.title)}</h2>
        </div>

        <!-- 3 Bậc Vinh Danh Podium -->
        <div class="flex items-end justify-center gap-3 sm:gap-6 pt-4 max-w-2xl mx-auto">
          
          <!-- Hạng Nhì (Bên Trái) -->
          <div class="flex-1 flex flex-col items-center">
            <div class="w-12 h-12 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-lg shadow-lg mb-2 border-2 border-slate-300">
              🥈
            </div>
            <div class="w-full bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/60 shadow-md text-center space-y-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-700 text-slate-200">Á Quân (Giải Nhì)</span>
              <b class="text-xs font-bold text-white block truncate" id="awardNameRunnerUp">${escapeHtml(runnerName)}</b>
              <p class="text-[10px] text-slate-400 mt-1">Thưởng: <span class="text-slate-300">${escapeHtml(tour.prizes?.prize2 || 'Cờ + Thưởng')}</span></p>
            </div>
            <div class="w-full h-16 bg-slate-700/60 rounded-b-xl border-t border-slate-600/60 mt-1 flex items-center justify-center font-black text-slate-400">
              2
            </div>
          </div>

          <!-- Hạng Nhất (Ở Giữa - Cao Nhất) -->
          <div class="flex-1 flex flex-col items-center -translate-y-3">
            <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl mb-2 border-2 border-amber-200 animate-bounce">
              👑
            </div>
            <div class="w-full bg-gradient-to-b from-amber-950/70 to-slate-900 rounded-2xl p-5 border-2 border-amber-500/60 shadow-xl text-center space-y-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">VÔ ĐỊCH CLB (GIẢI NHẤT)</span>
              <h3 class="text-sm font-black text-amber-300 block truncate" id="awardNameChampion">${escapeHtml(champName)}</h3>
              <p class="text-[11px] text-amber-200/90 font-semibold mt-1">Thưởng: <span class="text-amber-300">${escapeHtml(tour.prizes?.prize1 || 'Cúp Vô Địch')}</span></p>
            </div>
            <div class="w-full h-24 bg-amber-500/30 rounded-b-xl border-t-2 border-amber-400 mt-1 flex items-center justify-center font-black text-amber-400 text-lg">
              1
            </div>
          </div>

          <!-- Hạng Ba (Bên Phải) -->
          <div class="flex-1 flex flex-col items-center">
            <div class="w-12 h-12 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center font-black text-lg shadow-lg mb-2 border-2 border-amber-700">
              🥉
            </div>
            <div class="w-full bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/60 shadow-md text-center space-y-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950 text-amber-400 border border-amber-800">Giải Ba (Hạng 3)</span>
              <b class="text-xs font-bold text-white block truncate" id="awardNameThirdPlace">${escapeHtml(thirdName)}</b>
              <p class="text-[10px] text-slate-400 mt-1">Thưởng: <span class="text-slate-300">${escapeHtml(tour.prizes?.prize3 || 'Cờ + Thưởng')}</span></p>
            </div>
            <div class="w-full h-12 bg-amber-900/40 rounded-b-xl border-t border-amber-800/60 mt-1 flex items-center justify-center font-black text-amber-500">
              3
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

/**
 * Tạo và sao chép báo cáo kết quả thi đấu gửi nhanh qua Zalo
 */
function copyTournamentZaloReport() {
  const tour = getActiveTournament();
  if (!tour) return;

  let rep = `🏸 BÁO CÁO KẾT QUẢ THI ĐẤU LIÊN CLB CẦU LÔNG 🏸\n`;
  rep += `🏆 GIẢI ĐẤU: ${tour.title.toUpperCase()}\n`;
  rep += `📅 Ngày thi đấu: ${tour.date} | Địa điểm: ${tour.location}\n`;
  rep += `🤝 Quy mô: ${TOURNAMENT_SCOPES.find(s => s.id === tour.scope)?.label || 'Liên CLB'}\n\n`;

  (tour.disciplines || []).forEach(d => {
    rep += `--------------------------------------\n`;
    rep += `⭐ NỘI DUNG: ${d.name.toUpperCase()}\n`;
    if (d.champion) {
      const c = d.pairs?.find(p => p.id === d.champion);
      const r = d.pairs?.find(p => p.id === d.runnerUp);
      const t = d.pairs?.find(p => p.id === d.thirdPlace);
      rep += `🥇 VÔ ĐỊCH: ${c ? c.name : 'Chưa xác định'} (${c ? c.club : ''})\n`;
      if (r) rep += `🥈 Á QUÂN: ${r.name} (${r.club})\n`;
      if (t) rep += `🥉 HẠNG BA: ${t.name} (${t.club})\n`;
    } else {
      rep += `(Giải đang diễn ra sôi nổi tại vòng bảng và đấu loại trực tiếp)\n`;
    }
  });

  rep += `\n🎁 Cơ cấu phần thưởng: ${tour.prizes?.prize1 || 'Cúp vô địch'}\n`;
  rep += `Chúc mừng các vận động viên và toàn thể anh em 5 CLB thi đấu cống hiến hết mình! 🎉🏸🔥`;

  navigator.clipboard.writeText(rep).then(() => {
    alert('✓ ĐÃ SAO CHÉP BÁO CÁO KẾT QUẢ GIẢI ĐẤU VÀO CLIPBOARD!\n\nBây giờ bạn chỉ cần mở Zalo và bấm Ctrl + V (hoặc Dán) để gửi thông báo cho cả CLB.');
  }).catch(() => {
    alert(rep);
  });
}

// ----------------------------------------------------
// PHÂN HỆ 6: TẠO VÀ XÓA GIẢI ĐẤU MỚI
// ----------------------------------------------------

function openCreateTournamentModal() {
  const dateInput = document.getElementById('modalNewTourDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  openModal('modalCreateTournament');
}

function closeCreateTournamentModal() {
  closeModal('modalCreateTournament');
}

function confirmCreateNewTournament() {
  const title = document.getElementById('modalNewTourTitle')?.value.trim();
  if (!title) {
    showToast('Vui lòng nhập tên giải đấu!', 'warning');
    return;
  }

  const scope = document.getElementById('modalNewTourScope')?.value || 'MULTI_CLUB';
  const date = document.getElementById('modalNewTourDate')?.value || new Date().toISOString().split('T')[0];
  const courts = parseInt(document.getElementById('modalNewTourCourts')?.value) || 3;
  const minRest = parseInt(document.getElementById('modalNewTourMinRest')?.value) || 25;
  const formatChoice = document.getElementById('modalNewTourFormat')?.value || 'GROUP_4_KNOCKOUT';
  const ruleChoice = document.getElementById('modalNewTourRule')?.value || '1_31';

  let setsMode = 1;
  let pointsCap = 31;
  if (ruleChoice === '1_21') { setsMode = 1; pointsCap = 21; }
  else if (ruleChoice === '1_25') { setsMode = 1; pointsCap = 25; }
  else if (ruleChoice === '3_21') { setsMode = 3; pointsCap = 30; }

  const newId = `TOUR_${Date.now()}`;
  const defaultBase = createDefaultTournamentData()[0];

  const newTour = {
    id: newId,
    dataVersion: TOURNAMENT_DATA_VERSION,
    title,
    scope,
    date,
    location: 'Cụm Sân Cầu Lông Smash Arena - 5 Sân Tiêu Chuẩn',
    courtsCount: courts,
    minRestMinutes: minRest,
    status: 'IN_PROGRESS',
    matchRules: {
      setsMode,
      pointsToWin: setsMode === 1 ? pointsCap : 21,
      maxPointsCap: pointsCap,
      ruleType: 'SUDDEN_DEATH'
    },
    organization: {
      organizer: 'Ban Tổ Chức Giải Đấu Mới',
      leadReferee: 'Tổ Trọng Tài Điều Hành',
      rules: `Luật thi đấu Cầu Lông Phong Trào (${setsMode} Set chạm ${pointsCap} điểm)`
    },
    countries: JSON.parse(JSON.stringify(TOURNAMENT_COUNTRIES)),
    clubs: JSON.parse(JSON.stringify(TOURNAMENT_CLUBS)),
    players: JSON.parse(JSON.stringify(defaultBase.players)),
    registrations: JSON.parse(JSON.stringify(defaultBase.registrations)),
    rankingCriteria: ['WINS', 'HEAD_TO_HEAD', 'GAME_DIFF', 'POINT_DIFF', 'POINTS_SCORED', 'FAIR_PLAY'],
    prizes: {
      prize1: '🏆 Cúp Vô Địch + Phần Thưởng',
      prize2: '🥈 Cờ Á Quân + Phần Thưởng',
      prize3: '🥉 Cờ Hạng Ba + Phần Thưởng',
      prizeFairPlay: '🎖️ Phong Cách Liên CLB'
    },
    disciplines: JSON.parse(JSON.stringify(defaultBase.disciplines))
  };

  TournamentState.tournaments.unshift(newTour);
  TournamentState.activeTournamentId = newId;
  TournamentState.activeDisciplineId = 'MD';

  autoGenerateTournamentSchedule(newId, true);

  saveTournamentData();
  closeCreateTournamentModal();
  renderTournamentModule();
  showToast(`✓ Đã tạo giải đấu mới: ${title}`, 'success');
}

function deleteCurrentTournament() {
  if (TournamentState.tournaments.length <= 1) {
    showToast('Cần duy trì ít nhất 1 giải đấu trong hệ thống!', 'warning');
    return;
  }

  const tour = getActiveTournament();
  const confirmed = confirm(`Xác nhận xóa vĩnh viễn giải đấu "${tour.title}"? Dữ liệu giải sẽ không thể phục hồi.`);
  if (!confirmed) return;

  TournamentState.tournaments = TournamentState.tournaments.filter(t => t.id !== tour.id);
  TournamentState.activeTournamentId = TournamentState.tournaments[0].id;

  saveTournamentData();
  renderTournamentModule();
  showToast('Đã xóa giải đấu thành công!', 'info');
}

function setTourScopeFilter(scopeId) {
  TournamentState.filters.scope = scopeId;
  TOURNAMENT_SCOPES.forEach(s => {
    const btn = document.getElementById(`btnTourScope-${s.id}`);
    if (btn) {
      if (s.id === scopeId) {
        btn.className = 'px-2 py-0.5 rounded-lg bg-white/20 text-white font-bold transition';
      } else {
        btn.className = 'px-2 py-0.5 rounded-lg text-indigo-200 hover:text-white transition';
      }
    }
  });
}

function renderTournamentFilteredViews() {
  showToast('Đã lọc danh sách theo Quốc gia & CLB tương ứng!', 'info');
}

// ==========================================
// 17. CẤU HÌNH & SAO LƯU DỮ LIỆU
function onConfigClubNameChanged(val) {
  const slugInput = document.getElementById('configClubAccessSlug');
  if (slugInput && !slugInput.value) {
    const slug = generateAccessSlug(val);
    slugInput.value = slug;
    onConfigClubAccessSlugChanged(slug);
  }
}

function saveClubNameOnly() {
  const nameInput = document.getElementById('configClubName');
  const newName = nameInput ? nameInput.value.trim() : '';
  if (!newName) {
    showToast('⚠️ Tên CLB không được để trống!', 'warning');
    return;
  }

  const oldName = AppState.config.clubName || 'CLB';
  AppState.config.clubName = newName;
  const activeClub = getActiveClub();
  if (activeClub) {
    activeClub.name = newName;
    saveClubsRegistry();
  }

  // Cập nhật tên trên tiêu đề Header & title trình duyệt
  const nameEl = document.getElementById('headerClubName');
  if (nameEl) nameEl.textContent = newName;
  document.title = `${newName} - Quản lý Sân & Quỹ CLB Cầu Lông`;

  saveData();
  renderDashboard();
  renderClubSwitcher();
  showToast(`🎉 Đã lưu tên CLB: "${newName}" thành công!`, 'success');
}

function onConfigClubAccessSlugChanged(val) {
  const previewInput = document.getElementById('configClubDirectUrlPreview');
  const cleanSlug = (val || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const baseUrl = window.location.href.split('#')[0].split('?')[0];
  if (previewInput) {
    previewInput.value = `${baseUrl}?club=${encodeURIComponent(cleanSlug || 'clb')}`;
  }
}

function copyConfigClubDirectLink() {
  const input = document.getElementById('configClubDirectUrlPreview');
  if (!input) return;
  const url = input.value;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('✓ Đã sao chép đường link sử dụng riêng của CLB!', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('✓ Đã sao chép đường link sử dụng riêng của CLB!', 'success');
    });
  } else {
    input.select();
    document.execCommand('copy');
    showToast('✓ Đã sao chép đường link sử dụng riêng của CLB!', 'success');
  }
}

function openConfigClubDirectLink() {
  const input = document.getElementById('configClubDirectUrlPreview');
  if (input && input.value) {
    window.open(input.value, '_blank');
  }
}

function renderSettingsTab() {
  const config = AppState.config;
  const activeClub = getActiveClub();
  if (document.getElementById('configClubName')) document.getElementById('configClubName').value = config.clubName || 'CLB CẦU LÔNG';
  if (document.getElementById('configThemeColor')) document.getElementById('configThemeColor').value = config.themeColor || 'emerald';
  if (document.getElementById('configBankInfo')) document.getElementById('configBankInfo').value = config.bankInfo || '';

  // Khởi tạo Tên truy cập cấu hình & Đường link trực tiếp CLB
  const curSlug = config.accessSlug || activeClub.accessSlug || activeClub.shortName?.toLowerCase() || (activeClub.id === 'club_smash' ? 'smash' : activeClub.id);
  const slugInput = document.getElementById('configClubAccessSlug');
  if (slugInput) slugInput.value = curSlug;
  const previewInput = document.getElementById('configClubDirectUrlPreview');
  if (previewInput) previewInput.value = getClubDirectUrl(activeClub);

  // Khởi tạo và đổ danh sách thành viên vào 8 vị trí Ban Lãnh Đạo CLB
  populateLeadershipSelects();

  if (document.getElementById('guestPriceA')) document.getElementById('guestPriceA').value = config.guestPrices?.GUEST_A || 90000;
  if (document.getElementById('guestPriceB')) document.getElementById('guestPriceB').value = config.guestPrices?.GUEST_B || 70000;
  if (document.getElementById('guestPriceC')) document.getElementById('guestPriceC').value = config.guestPrices?.GUEST_C || 50000;

  // Cấu hình vai trò & Phân quyền Trưởng nhóm / Phó nhóm
  const roleSelect = document.getElementById('configActiveRoleSelect');
  if (roleSelect) roleSelect.value = getCurrentUserRole();

  const viceSelect = document.getElementById('configViceLeaderSelect');
  if (viceSelect) {
    const officialMembers = AppState.members.filter(m => m.type === 'OFFICIAL');
    viceSelect.innerHTML = officialMembers.map(m => `
      <option value="${m.id}" ${m.id === (config.viceLeaderId || 'M002') ? 'selected' : ''}>
        ${m.name} (${m.chipName || m.id})
      </option>
    `).join('');
  }

  const permAtt = document.getElementById('permViceLeaderAttendance');
  if (permAtt) permAtt.checked = config.permissions?.allowViceLeaderAttendance !== false;

  const permTour = document.getElementById('permViceLeaderTournamentSync');
  if (permTour) permTour.checked = config.permissions?.allowViceLeaderTournamentSync !== false;

  // Cấu hình đơn giá theo ngày (1 hộp cầu = 12 quả)
  const boxPriceInput = document.getElementById('configDailyBoxPrice');
  if (boxPriceInput) boxPriceInput.value = config.dailyBoxPrice || 340000;

  const countInput = document.getElementById('configShuttlecocksPerBox');
  if (countInput) countInput.value = config.shuttlecocksPerBox || 12;

  const titleInput = document.getElementById('configDailyRateTitle');
  if (titleInput) titleInput.value = config.dailyRateTitle || 'ĐƠN GIÁ THEO NGÀY 12';

  const modeRadioShuttle = document.getElementById('configModeByShuttle');
  const modeRadioBox = document.getElementById('configModeByBox');
  if (modeRadioShuttle && modeRadioBox) {
    if (config.shuttleBillingMode === 'BY_BOX') {
      modeRadioBox.checked = true;
    } else {
      modeRadioShuttle.checked = true;
    }
  }

  const defaultShuttlesInput = document.getElementById('configDefaultShuttlesPerSession');
  if (defaultShuttlesInput) defaultShuttlesInput.value = (config.defaultShuttlesPerSession !== undefined && config.defaultShuttlesPerSession !== null) ? config.defaultShuttlesPerSession : 6;

  // Cấu hình mức Quỹ CLB hàng tháng (mặc định 50.000 VNĐ)
  const monthlyFundInput = document.getElementById('configMonthlyClubFund');
  if (monthlyFundInput) monthlyFundInput.value = (config.monthlyClubFund !== undefined && config.monthlyClubFund !== null) ? config.monthlyClubFund : 50000;

  // Cấu hình giờ chốt điểm danh hoạt động hôm nay (mặc định 17:00)
  const cutoffInput = document.getElementById('configAttendanceCutoffTime');
  if (cutoffInput) cutoffInput.value = config.attendanceCutoffTime || '17:00';

  // Cấu hình ví thành viên âm & Tất toán dư nợ
  const allowNegCheck = document.getElementById('configAllowNegativeWallet');
  if (allowNegCheck) allowNegCheck.checked = config.allowNegativeWallet !== false;

  const modeRadioMonthly = document.getElementById('configModeMonthly');
  const modeRadioDaily = document.getElementById('configModeDaily');
  if (modeRadioMonthly && modeRadioDaily) {
    if (config.settlementMode === 'DAILY') {
      modeRadioDaily.checked = true;
    } else {
      modeRadioMonthly.checked = true;
    }
  }

  const defaultDaySelect = document.getElementById('configDefaultSettlementDay');
  if (defaultDaySelect) defaultDaySelect.value = config.defaultSettlementDay || 'END_OF_MONTH';

  updateDailyRateCalculatedPreview();

  renderFeeTiersConfigTable();
  renderUserAccessTable();
  renderMultiClubSettingsSection();
  populateCustomLabelsInputs();
  
  // Cập nhật huy hiệu trạng thái đám mây trong tab Cấu hình
  if (typeof updateCloudSyncUI === 'function') {
    updateCloudSyncUI(isCloudActuallyConnected ? 'CONNECTED' : (window._hasUnsyncedLocalChanges ? 'PERMISSION_DENIED' : 'LOCAL_READY'));
  }

  lucide.createIcons();
}

function renderFeeTiersConfigTable() {
  const tbody = document.getElementById('tierFeeConfigTableBody');
  const mobileContainer = document.getElementById('tierFeeConfigMobileCards');
  const tiers = (AppState.config && AppState.config.feeTiers) || [];

  // 1. Render Table trên Desktop (Màn hình máy tính)
  if (tbody) {
    tbody.innerHTML = tiers.map((tier, idx) => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3">
          <input type="text" value="${escapeHtml(tier.name)}" oninput="updateTierField(${idx}, 'name', this.value)" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-brand-500" />
        </td>
        <td class="py-2.5 px-3 text-center">
          <input type="number" min="0" value="${tier.minSessions}" oninput="updateTierField(${idx}, 'minSessions', Number(this.value))" class="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-800 bg-white focus:outline-none focus:border-brand-500" />
        </td>
        <td class="py-2.5 px-3 text-center">
          <input type="number" min="0" value="${tier.maxSessions}" oninput="updateTierField(${idx}, 'maxSessions', Number(this.value))" class="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-800 bg-white focus:outline-none focus:border-brand-500" />
        </td>
        <td class="py-2.5 px-3 text-right">
          <div class="inline-flex items-center justify-end gap-1">
            <input type="number" step="any" min="0" value="${tier.price}" oninput="updateTierField(${idx}, 'price', Number(this.value))" class="w-32 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-black text-brand-700 bg-white focus:outline-none focus:border-brand-500" />
            <span class="text-xs font-bold text-slate-400">đ</span>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center">
          <button type="button" onclick="deleteFeeTier(${idx})" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Xóa bậc"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // 2. Render Cards trên Mobile (Màn hình điện thoại)
  if (mobileContainer) {
    if (tiers.length === 0) {
      mobileContainer.innerHTML = `<div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Chưa có bậc tiền sân nào. Bấm "+ Thêm bậc mới" để bắt đầu thiết lập.</div>`;
    } else {
      mobileContainer.innerHTML = tiers.map((tier, idx) => `
        <div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
          <!-- Hàng tiêu đề bậc & Nút xóa -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="w-6 h-6 rounded-lg bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">#${idx + 1}</span>
              <input type="text" value="${escapeHtml(tier.name)}" oninput="updateTierField(${idx}, 'name', this.value)" class="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" placeholder="Tên bậc..." />
            </div>
            <button type="button" onclick="deleteFeeTier(${idx})" class="p-2 text-rose-500 hover:bg-rose-100 rounded-xl border border-rose-200 bg-white transition cursor-pointer shrink-0" title="Xóa bậc này">
              <i data-lucide="trash-2" class="w-4 h-4 text-rose-600"></i>
            </button>
          </div>

          <!-- Khoảng số buổi: Từ buổi -> Đến buổi -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Từ buổi:</label>
              <div class="relative">
                <input type="number" min="0" value="${tier.minSessions}" oninput="updateTierField(${idx}, 'minSessions', Number(this.value))" class="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">buổi</span>
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Đến buổi:</label>
              <div class="relative">
                <input type="number" min="0" value="${tier.maxSessions}" oninput="updateTierField(${idx}, 'maxSessions', Number(this.value))" class="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">buổi</span>
              </div>
            </div>
          </div>

          <!-- Mức tiền sân (trừ ví thành viên) -->
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Mức tiền sân trừ vào ví:</label>
            <div class="relative">
              <input type="number" step="any" min="0" value="${tier.price}" oninput="updateTierField(${idx}, 'price', Number(this.value))" class="w-full pl-3 pr-12 py-2 text-sm font-black text-brand-700 bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-700 pointer-events-none">VNĐ</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Định dạng: <b id="tierPricePreviewMobile-${idx}" class="text-slate-700">${formatMoney(tier.price)}</b></span>
              <span class="text-emerald-700 font-semibold">Phạm vi: ${tier.minSessions}–${tier.maxSessions} buổi</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  lucide.createIcons();
}

function updateTierField(index, field, value) {
  if (AppState.config && AppState.config.feeTiers && AppState.config.feeTiers[index]) {
    AppState.config.feeTiers[index][field] = value;
    if (field === 'price') {
      const preview = document.getElementById(`tierPricePreviewMobile-${index}`);
      if (preview) preview.textContent = formatMoney(value);
    }
  }
}

function addNewFeeTier() {
  if (!AppState.config) AppState.config = {};
  if (!AppState.config.feeTiers) AppState.config.feeTiers = [];
  const last = AppState.config.feeTiers[AppState.config.feeTiers.length - 1];
  const newMin = last ? last.maxSessions + 1 : 0;
  AppState.config.feeTiers.push({
    id: Date.now(),
    name: `Bậc ${AppState.config.feeTiers.length + 1}`,
    minSessions: newMin,
    maxSessions: newMin + 5,
    price: last ? last.price + 50000 : 50000
  });
  renderFeeTiersConfigTable();
}

function deleteFeeTier(index) {
  if (!AppState.config?.feeTiers || AppState.config.feeTiers.length <= 1) {
    showToast('⚠️ Cần duy trì tối thiểu 1 bậc tiền sân trong cấu hình!', 'warning');
    return;
  }
  const t = AppState.config.feeTiers[index];
  if (confirm(`Bạn có chắc chắn muốn xóa "${t?.name || 'bậc này'}"?`)) {
    AppState.config.feeTiers.splice(index, 1);
    renderFeeTiersConfigTable();
    showToast('Đã xóa bậc tiền sân.', 'info');
  }
}

function saveFeeTiersConfig() {
  saveData();
  refreshAllMembersWalletBreakdown();
  if (typeof renderAttendanceTiersBadgeList === 'function') renderAttendanceTiersBadgeList();
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();
  if (typeof renderSettlementReport === 'function') renderSettlementReport();
  showToast('✓ Đã lưu cấu hình bậc tiền sân và cập nhật trừ ví thành viên thành công!', 'success');
}

/**
 * Đổ danh sách thành viên vào 8 vị trí Ban Lãnh Đạo CLB
 */
function populateLeadershipSelects() {
  const isSmash = getActiveClubId() === 'club_smash';
  if (!AppState.config.leadership) {
    AppState.config.leadership = isSmash ? {
      president: 'M001',
      vicePresident1: 'M002',
      vicePresident2: 'M003',
      secretary: 'M004',
      treasurer: 'M005',
      media: 'M008',
      advisor1: 'M006',
      advisor2: 'M007'
    } : {
      president: AppState.members?.[0]?.id || '',
      vicePresident1: '',
      vicePresident2: '',
      secretary: '',
      treasurer: '',
      media: '',
      advisor1: '',
      advisor2: ''
    };
  }

  const leadership = AppState.config.leadership;
  const members = AppState.members || [];
  const memberIds = new Set(members.map(m => m.id));

  const roleConfigs = [
    { id: 'configLeaderPresident', key: 'president', defaultVal: isSmash ? 'M001' : (members[0]?.id || '') },
    { id: 'configLeaderVice1', key: 'vicePresident1', defaultVal: isSmash ? 'M002' : '' },
    { id: 'configLeaderVice2', key: 'vicePresident2', defaultVal: isSmash ? 'M003' : '' },
    { id: 'configLeaderSecretary', key: 'secretary', defaultVal: isSmash ? 'M004' : '' },
    { id: 'configLeaderTreasurer', key: 'treasurer', defaultVal: isSmash ? 'M005' : '' },
    { id: 'configLeaderMedia', key: 'media', defaultVal: isSmash ? 'M008' : '' },
    { id: 'configLeaderAdvisor1', key: 'advisor1', defaultVal: isSmash ? 'M006' : '' },
    { id: 'configLeaderAdvisor2', key: 'advisor2', defaultVal: isSmash ? 'M007' : '' }
  ];

  const officialMembers = members.filter(m => m.type === 'OFFICIAL');
  const honoraryMembers = members.filter(m => m.type === 'HONORARY');
  const otherMembers = members.filter(m => m.type !== 'OFFICIAL' && m.type !== 'HONORARY');

  roleConfigs.forEach(r => {
    const select = document.getElementById(r.id);
    if (!select) return;

    let currentVal = leadership[r.key] !== undefined ? leadership[r.key] : r.defaultVal;
    if (currentVal && !memberIds.has(currentVal)) {
      currentVal = (r.key === 'president') ? (members[0]?.id || '') : '';
    }

    let html = `<option value="">-- Chưa chỉ định --</option>`;

    if (officialMembers.length > 0) {
      html += `<optgroup label="Thành viên chính thức (${officialMembers.length} người)">`;
      officialMembers.forEach(m => {
        html += `<option value="${m.id}" ${m.id === currentVal ? 'selected' : ''}>${escapeHtml(m.name)} (${escapeHtml(m.chipName || m.id)})</option>`;
      });
      html += `</optgroup>`;
    }

    if (honoraryMembers.length > 0) {
      html += `<optgroup label="Thành viên danh dự (${honoraryMembers.length} người)">`;
      honoraryMembers.forEach(m => {
        html += `<option value="${m.id}" ${m.id === currentVal ? 'selected' : ''}>${escapeHtml(m.name)} (${escapeHtml(m.chipName || m.id)})</option>`;
      });
      html += `</optgroup>`;
    }

    if (otherMembers.length > 0) {
      html += `<optgroup label="Khách / Thành viên khác (${otherMembers.length} người)">`;
      otherMembers.forEach(m => {
        html += `<option value="${m.id}" ${m.id === currentVal ? 'selected' : ''}>${escapeHtml(m.name || m.chipName || m.id)}</option>`;
      });
      html += `</optgroup>`;
    }

    select.innerHTML = html;
  });

  renderLeadershipSummaryCard();
}

/**
 * Hiển thị thẻ tóm tắt Ban Lãnh Đạo Đương Nhiệm
 */
function renderLeadershipSummaryCard() {
  const container = document.getElementById('leadershipSummaryCard');
  if (!container) return;

  const members = AppState.members || [];
  const getMemberLabel = (memberId) => {
    if (!memberId) return '<span class="text-slate-400 italic">Chưa chọn</span>';
    const m = members.find(x => x.id === memberId);
    if (!m) return `<span class="text-slate-500 font-bold">${escapeHtml(memberId)}</span>`;
    return `<b class="text-slate-900">${escapeHtml(m.name)}</b>`;
  };

  const p = document.getElementById('configLeaderPresident')?.value ?? AppState.config.leadership?.president;
  const v1 = document.getElementById('configLeaderVice1')?.value ?? AppState.config.leadership?.vicePresident1;
  const v2 = document.getElementById('configLeaderVice2')?.value ?? AppState.config.leadership?.vicePresident2;
  const s = document.getElementById('configLeaderSecretary')?.value ?? AppState.config.leadership?.secretary;
  const t = document.getElementById('configLeaderTreasurer')?.value ?? AppState.config.leadership?.treasurer;
  const med = document.getElementById('configLeaderMedia')?.value ?? AppState.config.leadership?.media;
  const a1 = document.getElementById('configLeaderAdvisor1')?.value ?? AppState.config.leadership?.advisor1;
  const a2 = document.getElementById('configLeaderAdvisor2')?.value ?? AppState.config.leadership?.advisor2;

  container.innerHTML = `
    <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-indigo-100 flex-wrap gap-1">
      <div class="flex items-center gap-1.5 text-indigo-950 font-black text-xs">
        <span>🏛️</span>
        <span>BAN LÃNH ĐẠO ĐƯƠNG NHIỆM CLB (8 VỊ TRÍ):</span>
      </div>
      <span class="text-[10px] text-slate-500 italic">Nhiệm kỳ hiện tại</span>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 text-[11px]">
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
        <span class="text-emerald-700 font-bold block text-[10px]">👑 Chủ tịch:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(p)}</div>
      </div>
      <div class="p-1.5 bg-blue-50 rounded-lg border border-blue-200">
        <span class="text-blue-700 font-bold block text-[10px]">🛡️ Phó CT 1:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(v1)}</div>
      </div>
      <div class="p-1.5 bg-blue-50 rounded-lg border border-blue-200">
        <span class="text-blue-700 font-bold block text-[10px]">🛡️ Phó CT 2:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(v2)}</div>
      </div>
      <div class="p-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
        <span class="text-indigo-700 font-bold block text-[10px]">📝 Thư ký:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(s)}</div>
      </div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
        <span class="text-amber-700 font-bold block text-[10px]">💰 Thủ quỹ:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(t)}</div>
      </div>
      <div class="p-1.5 bg-rose-50 rounded-lg border border-rose-200">
        <span class="text-rose-700 font-bold block text-[10px]">📢 Truyền thông:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(med)}</div>
      </div>
      <div class="p-1.5 bg-purple-50 rounded-lg border border-purple-200">
        <span class="text-purple-700 font-bold block text-[10px]">💡 Cố vấn 1:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(a1)}</div>
      </div>
      <div class="p-1.5 bg-purple-50 rounded-lg border border-purple-200">
        <span class="text-purple-700 font-bold block text-[10px]">💡 Cố vấn 2:</span>
        <div class="mt-0.5 truncate">${getMemberLabel(a2)}</div>
      </div>
    </div>
  `;
}

/**
 * Thu gọn hoặc mở rộng bảng chọn vị trí Ban Lãnh Đạo
 */
function toggleLeadershipCollapse() {
  const detailBody = document.getElementById('leadershipDetailBody');
  const toggleText = document.getElementById('leadershipToggleText');
  const toggleIcon = document.getElementById('leadershipToggleIcon');
  if (!detailBody) return;

  const isHidden = detailBody.classList.contains('hidden');
  if (isHidden) {
    detailBody.classList.remove('hidden');
    if (toggleText) toggleText.textContent = 'Thu gọn';
    if (toggleIcon) toggleIcon.textContent = '▴';
  } else {
    detailBody.classList.add('hidden');
    if (toggleText) toggleText.textContent = 'Mở rộng';
    if (toggleIcon) toggleIcon.textContent = '▾';
  }
}

function saveGeneralConfig() {
  const clubName = document.getElementById('configClubName')?.value.trim() || 'CLB CẦU LÔNG';
  AppState.config.clubName = clubName;
  AppState.config.themeColor = document.getElementById('configThemeColor')?.value || 'emerald';
  AppState.config.bankInfo = document.getElementById('configBankInfo')?.value.trim() || '';

  // Đọc và lưu Access Slug cấu hình
  const slugInput = document.getElementById('configClubAccessSlug');
  let slug = slugInput?.value.trim().toLowerCase() || '';
  if (!slug) slug = generateAccessSlug(clubName);
  slug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = 'clb';
  AppState.config.accessSlug = slug;
  if (slugInput) slugInput.value = slug;

  // Cập nhật thẻ preview URL
  const previewInput = document.getElementById('configClubDirectUrlPreview');
  const baseUrl = window.location.href.split('#')[0].split('?')[0];
  if (previewInput) previewInput.value = `${baseUrl}?club=${encodeURIComponent(slug)}`;

  // Lưu cấu hình Ban Lãnh Đạo (8 vị trí) lấy từ danh sách thành viên
  if (!AppState.config.leadership) AppState.config.leadership = {};
  AppState.config.leadership.president = document.getElementById('configLeaderPresident')?.value || '';
  AppState.config.leadership.vicePresident1 = document.getElementById('configLeaderVice1')?.value || '';
  AppState.config.leadership.vicePresident2 = document.getElementById('configLeaderVice2')?.value || '';
  AppState.config.leadership.secretary = document.getElementById('configLeaderSecretary')?.value || '';
  AppState.config.leadership.treasurer = document.getElementById('configLeaderTreasurer')?.value || '';
  AppState.config.leadership.media = document.getElementById('configLeaderMedia')?.value || '';
  AppState.config.leadership.advisor1 = document.getElementById('configLeaderAdvisor1')?.value || '';
  AppState.config.leadership.advisor2 = document.getElementById('configLeaderAdvisor2')?.value || '';

  // Đồng bộ sang danh bạ Registry
  const registry = getClubsRegistry();
  const activeId = getActiveClubId();
  const clubInReg = registry.find(c => c.id === activeId);
  if (clubInReg) {
    clubInReg.name = clubName;
    clubInReg.themeColor = AppState.config.themeColor;
    clubInReg.bankInfo = AppState.config.bankInfo;
    clubInReg.accessSlug = slug;
    saveClubsRegistry(registry);
  }

  // Cập nhật URL trình duyệt theo slug mới
  updateClubUrlParam(slug);

  applyThemeColor(AppState.config.themeColor);
  saveData();
  renderDashboard();
  renderClubSwitcher();
  renderMultiClubSettingsSection();
  renderLeadershipSummaryCard();
  showToast('✓ Đã lưu thông tin CLB, link riêng & Ban lãnh đạo thành công!', 'success');
}

function saveGuestPricingConfig() {
  AppState.config.guestPrices.GUEST_A = Number(document.getElementById('guestPriceA').value || 90000);
  AppState.config.guestPrices.GUEST_B = Number(document.getElementById('guestPriceB').value || 70000);
  AppState.config.guestPrices.GUEST_C = Number(document.getElementById('guestPriceC').value || 50000);
  saveData();
  renderActivityGuestChips();
  renderAttendanceChecklist();
  showToast('Đã lưu đơn giá khách giao lưu!', 'success');
}

// Cấu hình phân quyền Trưởng nhóm & Phó nhóm
function saveClubPermissionsConfig() {
  const currentRole = getCurrentUserRole();
  if (currentRole !== 'ADMIN') {
    showToast('⚠️ Chỉ Trưởng nhóm mới có toàn quyền sửa phân quyền quản lý!', 'error');
    return;
  }

  const viceSelect = document.getElementById('configViceLeaderSelect');
  const permAtt = document.getElementById('permViceLeaderAttendance');
  const permTour = document.getElementById('permViceLeaderTournamentSync');

  if (viceSelect) AppState.config.viceLeaderId = viceSelect.value;
  if (!AppState.config.permissions) AppState.config.permissions = {};
  AppState.config.permissions.allowViceLeaderAttendance = permAtt ? permAtt.checked : true;
  AppState.config.permissions.allowViceLeaderTournamentSync = permTour ? permTour.checked : true;

  saveData();
  renderAttendanceRoleBanner();
  showToast('✓ Đã cập nhật và lưu phân quyền quản lý cho Phó nhóm thành công!', 'success');
}

// Cấu hình đơn giá hộp cầu theo ngày
function updateDailyRateCalculatedPreview() {
  const boxPriceInput = document.getElementById('configDailyBoxPrice');
  const countInput = document.getElementById('configShuttlecocksPerBox');
  const formulaBadge = document.getElementById('dailyRateFormulaBadge');
  const formulaSummary = document.getElementById('dailyRateFormulaSummaryText');
  const perShuttleText = document.getElementById('dailyRatePerShuttleText');
  const perShuttleBadge = document.getElementById('configPreviewPerShuttleBadge');

  const boxPrice = Number(boxPriceInput?.value) || 340000;
  const count = Number(countInput?.value) || 12;
  const perShuttle = count > 0 ? Math.round(boxPrice / count) : 0;

  if (formulaBadge) formulaBadge.textContent = `1 hộp = ${count} quả (${formatMoney(boxPrice)})`;
  if (formulaSummary) formulaSummary.textContent = `Công thức: 1 hộp cầu = ${count} quả ➔ Đơn giá: ${formatMoney(boxPrice)}`;
  if (perShuttleText) perShuttleText.textContent = formatMoney(perShuttle);
  if (perShuttleBadge) perShuttleBadge.textContent = formatMoney(perShuttle);
}

function saveDailyRateConfig() {
  const currentRole = getCurrentUserRole();
  if (currentRole !== 'ADMIN') {
    showToast('⚠️ Chỉ Trưởng nhóm mới có toàn quyền sửa cấu hình đơn giá theo ngày!', 'error');
    return;
  }

  const boxPrice = Number(document.getElementById('configDailyBoxPrice')?.value) || 340000;
  const count = Number(document.getElementById('configShuttlecocksPerBox')?.value) || 12;
  const title = document.getElementById('configDailyRateTitle')?.value.trim() || `ĐƠN GIÁ THEO NGÀY ${count}`;
  const billingMode = document.getElementById('configModeByBox')?.checked ? 'BY_BOX' : 'BY_SHUTTLE';
  const defaultShuttlesVal = document.getElementById('configDefaultShuttlesPerSession')?.value;
  const defaultShuttles = (defaultShuttlesVal !== '' && !isNaN(Number(defaultShuttlesVal))) 
    ? Math.max(0, parseInt(defaultShuttlesVal, 10)) 
    : 6;
  const shuttleUnitPrice = count > 0 ? Math.round(boxPrice / count) : 28333;

  AppState.config.dailyBoxPrice = boxPrice;
  AppState.config.shuttlecocksPerBox = count;
  AppState.config.dailyRateTitle = title;
  AppState.config.shuttleBillingMode = billingMode;
  AppState.config.shuttleUnitPrice = shuttleUnitPrice;
  AppState.config.defaultShuttlesPerSession = defaultShuttles;

  const cutoffTime = document.getElementById('configAttendanceCutoffTime')?.value || AppState.config.attendanceCutoffTime || '17:00';
  AppState.config.attendanceCutoffTime = cutoffTime;

  saveData();
  renderSelfAttendanceBanner();
  updateDailyRatePresetBadgeUI();
  updateShuttleBillingUI();
  updateDailyRateCalculatedPreview();
  showToast(`✓ Đã lưu cấu hình: 1 hộp = ${count} quả (${formatMoney(boxPrice)}), đơn giá 1 quả = ${formatMoney(shuttleUnitPrice)} (làm tròn đơn vị đồng)!`, 'success');
}

function saveWalletSettlementConfig() {
  const currentRole = getCurrentUserRole();
  if (currentRole !== 'ADMIN') {
    showToast('⚠️ Chỉ Trưởng nhóm mới có toàn quyền sửa cấu hình ví & tất toán!', 'error');
    return;
  }

  const allowNegative = document.getElementById('configAllowNegativeWallet')?.checked ?? true;
  const settlementMode = document.querySelector('input[name="configSettlementModeRadio"]:checked')?.value || (document.getElementById('configModeDaily')?.checked ? 'DAILY' : 'MONTHLY');
  const defaultDay = document.getElementById('configDefaultSettlementDay')?.value || 'END_OF_MONTH';
  const monthlyFundInput = document.getElementById('configMonthlyClubFund');
  const monthlyClubFund = (monthlyFundInput && monthlyFundInput.value !== '' && !isNaN(Number(monthlyFundInput.value)))
    ? Math.max(0, parseInt(monthlyFundInput.value, 10))
    : 50000;

  if (!AppState.config) AppState.config = {};
  AppState.config.allowNegativeWallet = allowNegative;
  AppState.config.settlementMode = settlementMode;
  AppState.config.defaultSettlementDay = defaultDay;
  AppState.config.monthlyClubFund = monthlyClubFund;

  saveData();
  refreshAllMembersWalletBreakdown();
  renderDashboard();
  renderFinanceTab();
  if (typeof renderSettlementReport === 'function') {
    renderSettlementReport();
  }
  showToast(`✓ Đã lưu Cấu hình Ví & Tất toán thành công! Mức thu Quỹ CLB: ${formatMoney(monthlyClubFund)}/tháng/TV`, 'success');
}

// Sao lưu và khôi phục
function exportDataBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState, null, 2));
  const downloadAnchor = document.createElement('a');
  const now = new Date();
  const dateTag = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const clubSlug = AppState.config?.accessSlug || 'clb';
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `sao_luu_${clubSlug}_${dateTag}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast(`✓ Đã tải xuống tệp sao lưu dữ liệu của ${AppState.config?.clubName || 'CLB'}!`, 'success');
}

function importDataBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.members && parsed.funds && parsed.config) {
        AppState = parsed;
        saveData();
        applyThemeColor(AppState.config.themeColor || 'emerald');
        const nameEl = document.getElementById('headerClubName');
        if (nameEl) nameEl.textContent = AppState.config.clubName || 'CLB CẦU LÔNG';
        
        renderDashboard();
        renderMemberManagementList();
        renderFinanceTab();
        renderAttendanceTab();
        renderClubSwitcher();
        populateLeadershipSelects();
        showToast('🎉 Khôi phục dữ liệu từ tệp thành công!', 'success');
      } else {
        showToast('Tệp sao lưu không đúng định dạng dữ liệu CLB!', 'error');
      }
    } catch (err) {
      showToast('Lỗi đọc tệp sao lưu JSON!', 'error');
    }
  };
  reader.readAsText(file);
}

function resetDefaultDemoData() {
  const activeClub = getActiveClub();
  const isSmash = activeClub.id === 'club_smash';
  const confirmed = confirm(`CẢNH BÁO: Thao tác này sẽ đưa toàn bộ dữ liệu của "${activeClub.name}" về trạng thái ban đầu.\nBạn có chắc chắn muốn đặt lại?`);
  if (!confirmed) return;

  AppState = isSmash ? JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA)) : getBlankClubInitialData(activeClub);
  saveData();
  applyThemeColor(AppState.config?.themeColor || activeClub.themeColor || 'emerald');
  renderDashboard();
  showToast(`Đã đặt lại dữ liệu của ${activeClub.name} về ban đầu thành công!`, 'success');
}

// ==========================================
// 18. XÁC THỰC & ĐĂNG NHẬP (AUTH)
// ==========================================
function renderAuthBadge() {
  const badgeContainer = document.getElementById('userAuthBadge');
  if (!badgeContainer) return;

  if (AppState.auth && AppState.auth.isLoggedIn && AppState.auth.user) {
    const user = AppState.auth.user;
    const roleDef = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.MEMBER;
    badgeContainer.innerHTML = `
      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <div class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs transition shadow-2xs shrink-0 max-w-[130px] xs:max-w-[200px] sm:max-w-none">
          <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-inner">
            ${user.role === 'DEV_ADMIN' ? '🚀' : (user.name ? user.name.charAt(0).toUpperCase() : '👤')}
          </div>
          <span class="font-bold text-slate-800 text-[11px] sm:text-xs truncate max-w-[55px] xs:max-w-[85px] sm:max-w-[130px]">${user.name || 'Hội viên'}</span>
          <span class="hidden xs:inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border ${roleDef.badgeClass} shrink-0">
            ${roleDef.icon} ${user.role === 'DEV_ADMIN' ? 'Dev' : roleDef.label}
          </span>
        </div>
        <button onclick="handleLogout()" class="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer shrink-0 whitespace-nowrap" title="Đăng xuất khỏi tài khoản">
          <span class="text-xs">🚪</span>
          <span class="hidden sm:inline font-bold">Đăng xuất</span>
        </button>
      </div>
    `;
  } else {
    badgeContainer.innerHTML = `
      <button onclick="openLoginModal()" class="inline-flex items-center px-2.5 sm:px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-full transition shadow-xs cursor-pointer shrink-0 whitespace-nowrap" title="Đăng nhập tài khoản">
        <i data-lucide="lock" class="w-3.5 h-3.5 mr-1"></i>
        <span>Đăng nhập</span>
      </button>
    `;
  }

  lucide.createIcons();
  updateNavigationUI();
  renderTopUpBadges();
}

const SAVED_LOGIN_KEY = 'CLB_SAVED_LOGIN_CREDENTIALS_V1';

function getSavedLoginCredentials() {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLoginCredentials(username, password) {
  try {
    localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({
      username: (username || '').trim(),
      password: password || '',
      savedAt: Date.now()
    }));
  } catch (e) {}
}

function clearSavedLoginCredentials() {
  try {
    localStorage.removeItem(SAVED_LOGIN_KEY);
  } catch (e) {}
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const chk = document.getElementById('loginRememberPassword');
  const clearBtn = document.getElementById('btnClearSavedLogin');
  const notice = document.getElementById('loginSavedAccountNotice');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';
  if (chk) chk.checked = false;
  if (clearBtn) clearBtn.classList.add('hidden');
  if (notice) notice.classList.add('hidden');
  showToast('Đã xóa thông tin đăng nhập đã lưu.', 'info');
}

function applySavedLoginToForm() {
  const saved = getSavedLoginCredentials();
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const chk = document.getElementById('loginRememberPassword');
  const clearBtn = document.getElementById('btnClearSavedLogin');
  const notice = document.getElementById('loginSavedAccountNotice');

  if (saved && saved.username && saved.password) {
    if (uInput) uInput.value = saved.username;
    if (pInput) pInput.value = saved.password;
    if (chk) chk.checked = true;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (notice) notice.classList.remove('hidden');
  } else {
    if (chk) chk.checked = true;
    if (clearBtn) clearBtn.classList.add('hidden');
    if (notice) notice.classList.add('hidden');
  }
}

function openLoginModal() {
  applySavedLoginToForm();
  openModal('loginModal');
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput && !uInput.value) {
    setTimeout(() => uInput.focus(), 150);
  } else if (pInput && !pInput.value) {
    setTimeout(() => pInput.focus(), 150);
  }
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();

  // 1. Kiểm tra tài khoản Admin Nhà Phát Triển (Super Admin)
  if (verifyDevAdminCredentials(u, p)) {
    const sessionToken = 'SES_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(CLB_CURRENT_SESSION_KEY, sessionToken);
    loginAsDeveloperAdmin(u, p);

    // Xử lý lưu thông tin đăng nhập tùy chọn
    const rememberMe = document.getElementById('loginRememberPassword')?.checked;
    if (rememberMe) {
      saveLoginCredentials(u, p);
    } else {
      try { localStorage.removeItem(SAVED_LOGIN_KEY); } catch (err) {}
    }

    // Ghi nhận trạng thái Developer lên Firebase nếu có kết nối
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && firebaseDb) {
      const devUid = firebase.auth().currentUser.uid;
      firebaseDb.ref('system/developers/' + devUid).set(true).catch(() => {});
    }

    closeModal('loginModal');
    // Tự động chuyển về Trang Chủ (Dashboard) ngay khi đăng nhập thành công
    switchTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAttendanceRoleBanner();
    renderUserAccessTable();
    showToast('✓ Đăng nhập thành công với quyền Admin Nhà Phát Triển!', 'success');
    const devSlug = getCanonicalClubSlug(getActiveClub()?.accessSlug || getActiveClub()?.id || 'lap-tri');
    ensureOnlineDataOnLogin(devSlug, { name: 'Admin Nhà Phát Triển', role: 'DEV_ADMIN' });
    return;
  }

  // 2. Tìm thành viên trong CLB hiện tại
  const cleanSlug = getCanonicalClubSlug(getActiveClub()?.accessSlug || getActiveClub()?.id || 'lap-tri');
  const uNorm = u.trim().toLowerCase();
  let member = (AppState.members || []).find(m => 
    (m.username && m.username.toLowerCase() === uNorm) ||
    (m.chipName && m.chipName.toLowerCase() === uNorm) ||
    (m.name && m.name.toLowerCase() === uNorm) ||
    (m.phone && m.phone === u) ||
    (m.email && m.email.toLowerCase() === uNorm)
  );
  if (!member && (uNorm === 'admin' || uNorm === 'tntoan')) {
    member = (AppState.members || []).find(m => m.username?.toLowerCase() === 'tntoan' || m.role === 'ADMIN') || (AppState.members && AppState.members[0]);
  }

  // 3. Đăng nhập an toàn qua Firebase Authentication (Email/Password)
  const authEmail = u.includes('@') ? u : `${(member?.username || u).toLowerCase()}@${cleanSlug}.clb`;

  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      let fbUser = null;
      try {
        const cred = await firebase.auth().signInWithEmailAndPassword(authEmail, p);
        fbUser = cred.user;
      } catch (authErr) {
        // Nếu tài khoản chưa tạo trên Firebase Auth nhưng đúng mật khẩu trong CLB -> Tự động khởi tạo
        if ((authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') && member && (member.password === p || (member.username?.toLowerCase() === 'tntoan' && p === 'admin') || p === '123')) {
          try {
            const newCred = await firebase.auth().createUserWithEmailAndPassword(authEmail, p);
            fbUser = newCred.user;
          } catch (createErr) {}
        }
      }

      if (fbUser && firebaseDb) {
        const uid = fbUser.uid;
        if (member) member.firebaseUid = uid;

        // Lưu hồ sơ người dùng users/{UID}
        firebaseDb.ref('users/' + uid).update({
          name: member?.name || u,
          email: authEmail,
          phone: member?.phone || '',
          lastLogin: Date.now()
        }).catch(() => {});

        // Lưu vai trò & quyền hạn memberships/{clubId}/{UID}
        const memRole = member?.role || 'MEMBER';
        const memPerms = member?.permissions || getRoleDefaultPermissions(memRole);
        firebaseDb.ref('memberships/' + cleanSlug + '/' + uid).set({
          role: memRole,
          status: member?.status || 'ACTIVE',
          permissions: memPerms,
          name: member?.name || u,
          email: authEmail,
          updatedAt: Date.now()
        }).catch(() => {});

        // Lắng nghe biến động phân quyền thời gian thực ngay lập tức
        attachLiveMembershipListener(cleanSlug, uid);
      }
    } catch (err) {
      console.log('Firebase Auth Notice:', err?.message || err);
    }
  }

  // 4. Kiểm tra tài khoản Quản lý CLB hoặc Hội viên trong danh sách CLB hiện tại
  const isTNTOAN = member && (member.username?.toLowerCase() === 'tntoan' || member.role === 'ADMIN');
  const isPassMatch = member && (
    member.password === p || 
    (isTNTOAN && (p === 'admin' || p === '123')) || 
    (!isTNTOAN && (p === '123' || !member.password))
  );
  if (member && isPassMatch) {
    if (isTNTOAN) {
      member.password = 'admin';
      member.role = 'ADMIN';
      member.permissions = getRoleDefaultPermissions('ADMIN');
    }
    if (member.status === 'LOCKED') {
      showToast(`⚠️ Tài khoản ${member.name} đang bị tạm khóa. Vui lòng liên hệ Ban quản trị!`, 'error');
      return;
    }
    // Đăng nhập hội viên / quản lý CLB (không có quyền Dev Admin)
    try {
      localStorage.removeItem(DEV_ADMIN_SESSION_KEY);
    } catch (e) {}

    // Thiết lập phiên đăng nhập duy nhất (1 thiết bị/trình duyệt tại 1 thời điểm)
    const sessionToken = 'SES_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(CLB_CURRENT_SESSION_KEY, sessionToken);
    member.activeSessionToken = sessionToken;
    member.lastLoginTime = getNowTimestampString();

    // Xử lý lưu thông tin đăng nhập tùy chọn
    const rememberMe = document.getElementById('loginRememberPassword')?.checked;
    if (rememberMe) {
      saveLoginCredentials(u, p);
    } else {
      try { localStorage.removeItem(SAVED_LOGIN_KEY); } catch (err) {}
    }

    AppState.auth = {
      isLoggedIn: true,
      user: {
        id: member.id,
        username: member.username,
        role: member.role || 'MEMBER',
        name: member.name,
        permissions: member.permissions || getRoleDefaultPermissions(member.role || 'MEMBER')
      }
    };
    saveLocalDataOnly();
    closeModal('loginModal');

    // Dọn trống ô nhập mật khẩu nếu không chọn ghi nhớ
    if (!rememberMe) {
      const passInput = document.getElementById('loginPassword');
      if (passInput) passInput.value = '';
    }

    updateDevAdminUI();
    renderAuthBadge();
    renderAttendanceRoleBanner();
    renderSelfAttendanceBanner();
    renderActivityMemberChips();
    renderUserAccessTable();

    // Tự động chuyển về Trang Chủ (Dashboard) ngay khi đăng nhập thành công
    switchTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderDashboard();
    renderFinanceTab();
    renderMemberManagementList();

    // Bắt buộc đổi mật khẩu trong lần đăng nhập đầu tiên cho tất cả tài khoản
    const isDefaultPass = member.password === '123' || member.password === '123456' || (member.password === 'admin' && !member.passwordChangedAt);
    const requiresFirstLoginChange = member.mustChangePassword === true || !member.hasChangedPassword || isDefaultPass;
    if (requiresFirstLoginChange) {
      member.mustChangePassword = true;
      saveLocalDataOnly();
      openFirstLoginPasswordModal(member);
      ensureOnlineDataOnLogin(cleanSlug, member);
      return;
    }

    const roleDef = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.MEMBER;
    showToast(`✓ Chào mừng ${member.name} (${roleDef.icon} ${roleDef.label})!`, 'success');
    ensureOnlineDataOnLogin(cleanSlug, member);
    return;
  }

  showToast('Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!', 'error');
}

function handleLogout() {
  try {
    localStorage.removeItem(DEV_ADMIN_SESSION_KEY);
    localStorage.removeItem(CLB_CURRENT_SESSION_KEY);
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().signOut().catch(() => {});
    }
    if (currentMembershipRef) {
      try { currentMembershipRef.off(); } catch (e) {}
    }
  } catch (e) {}
  closeModal('modalFirstLoginChangePassword');
  AppState.auth = { isLoggedIn: false, user: null };
  saveData();
  updateDevAdminUI();
  renderAuthBadge();
  renderAttendanceRoleBanner();
  renderSelfAttendanceBanner();
  renderActivityMemberChips();
  renderUserAccessTable();

  // Tự động chuyển về Trang Chủ (Dashboard) khi đăng xuất
  switchTab('dashboard');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();
  showToast('Đã đăng xuất tài khoản.', 'info');
}

// ==========================================
// 19. TRỢ GIÚP MODAL
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    const innerCard = modal.querySelector('div');
    if (innerCard) innerCard.scrollTop = 0;
    lucide.createIcons();
  }
}

function closeModal(modalId) {
  if (modalId === 'modalFirstLoginChangePassword') {
    const mem = AppState.auth?.user?.id ? (AppState.members || []).find(m => m.id === AppState.auth.user.id) : null;
    const isDefaultPass = mem && (mem.password === '123' || mem.password === '123456' || (mem.password === 'admin' && !mem.passwordChangedAt));
    if (mem && (mem.mustChangePassword === true || !mem.hasChangedPassword || isDefaultPass)) {
      showToast('⚠️ Vui lòng đổi mật khẩu mới để bảo vệ tài khoản trước khi tiếp tục!', 'warning');
      return;
    }
  }
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

window.addEventListener('click', (e) => {
  if (e.target.id === 'modalFirstLoginChangePassword') {
    return;
  }
  if (e.target.classList.contains('backdrop-blur-sm') || e.target.classList.contains('backdrop-blur-xs')) {
    e.target.classList.add('hidden');
  }
});

// ==========================================
// 21. CHỈNH SỬA TÊN & THÔNG TIN THÀNH VIÊN (CHO ADMIN)
// ==========================================
function openQuickRenameModal(memberId) {
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) {
    showToast('Không tìm thấy thông tin thành viên!', 'error');
    return;
  }

  const nameInput = document.getElementById('quickRenameName');
  const warningEl = document.getElementById('quickRenameWarning');
  if (nameInput) nameInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
  if (warningEl) {
    warningEl.textContent = '';
    warningEl.classList.add('hidden');
  }

  document.getElementById('quickRenameMemberId').value = member.id;
  document.getElementById('quickRenameName').value = member.name;
  document.getElementById('quickRenamePhone').value = member.phone || '';
  document.getElementById('quickRenameType').value = member.type || 'OFFICIAL';

  openModal('quickRenameModal');
}

function handleQuickRenameSubmit(e) {
  e.preventDefault();
  const memberId = document.getElementById('quickRenameMemberId').value;
  const newName = document.getElementById('quickRenameName').value.trim();
  const newPhone = document.getElementById('quickRenamePhone').value.trim();
  const newType = document.getElementById('quickRenameType').value;

  if (!newName) {
    showToast('Họ và tên thành viên không được để trống!', 'warning');
    return;
  }

  const member = AppState.members.find(m => m.id === memberId);
  if (!member) {
    showToast('Không tìm thấy thành viên!', 'error');
    return;
  }

  // Không cho phép đổi thành tên trùng với thành viên khác trong CLB
  const dupRename = findDuplicateMemberName(newName, memberId);
  if (dupRename) {
    showToast(`⚠️ Tên "${newName}" đã tồn tại cho thành viên khác trong CLB! Vui lòng chọn tên khác hoặc thêm biệt danh phân biệt.`, 'warning');
    validateQuickRenameName();
    const renameInput = document.getElementById('quickRenameName');
    if (renameInput) renameInput.focus();
    return;
  }

  const oldName = member.name;
  member.name = newName;
  member.chipName = newName.trim().split(/\s+/).pop().toUpperCase();
  member.phone = newPhone;
  member.type = newType;

  // Đồng bộ cập nhật tên mới vào lịch sử giao dịch và điểm danh
  (AppState.transactions || []).forEach(tx => {
    if (tx.targetName === oldName) {
      tx.targetName = newName;
    }
  });

  (AppState.attendanceRecords || []).forEach(att => {
    if (att.memberId === member.id || att.memberName === oldName) {
      att.memberName = newName;
    }
  });

  saveData();
  closeModal('quickRenameModal');

  renderDashboard();
  renderAttendanceChecklist();
  renderMemberManagementList();
  renderFinanceTab();
  if (currentTab === 'tournament') renderTournamentModule();

  showToast(`Đã đổi tên thành công: "${oldName}" ➔ "${newName}"!`, 'success');
}

// ==========================================
// 22. TẠO ĐIỂM DANH NHANH (QUICK ATTENDANCE)
// ==========================================
let qaSessionLogs = [];
let qaMatchedZaloMembers = [];

function openQuickAttendanceModal() {
  populateQaMemberSelect();
  updateQaSinglePreview();
  renderQaSessionLogs();
  switchQuickAttendanceSubTab('single');
  openModal('quickAttendanceModal');
}

function switchQuickAttendanceSubTab(subTab) {
  document.querySelectorAll('.qa-tab-btn').forEach(btn => {
    btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-800');
    btn.classList.add('text-slate-600');
  });
  const activeBtn = document.getElementById(`qa-subtab-${subTab}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600');
    activeBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-800');
  }

  document.querySelectorAll('.qa-mode-pane').forEach(p => p.classList.add('hidden'));
  const targetPane = document.getElementById(`qa-mode-${subTab}`);
  if (targetPane) targetPane.classList.remove('hidden');

  lucide.createIcons();
}

function populateQaMemberSelect() {
  const select = document.getElementById('qaSingleMemberSelect');
  if (!select) return;

  select.innerHTML = AppState.members.map(m => {
    const nextSession = (m.monthlySessions || 0) + 1;
    const fee = calculateMemberCourtFee(m, true);
    return `<option value="${m.id}">${escapeHtml(m.name)} (${getMemberRoleTypeText(m.type)}) - Buổi #${nextSession}: ${formatMoney(fee)} (Ví: ${formatMoney(m.balance || 0)})</option>`;
  }).join('');
}

function updateQaSinglePreview() {
  const select = document.getElementById('qaSingleMemberSelect');
  const card = document.getElementById('qaSinglePreviewCard');
  if (!select || !card) return;

  const memberId = select.value;
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) {
    card.innerHTML = `<div class="text-xs text-slate-400">Vui lòng chọn thành viên</div>`;
    return;
  }

  const nextSession = (member.monthlySessions || 0) + 1;
  const fee = calculateMemberCourtFee(member, true);
  const tierName = member.type.startsWith('GUEST') ? 'Khách' : getTierNameForSession(nextSession);
  const currentBalance = member.balance || 0;
  const newBalance = currentBalance - fee;

  card.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div>
        <span class="text-slate-500 block text-[11px]">Hội viên:</span>
        <b class="text-slate-900 font-bold">${escapeHtml(member.name)}</b>
      </div>
      <div>
        <span class="text-slate-500 block text-[11px]">Lũy kế tháng:</span>
        <b class="text-brand-700 font-bold">Buổi #${nextSession} (${tierName})</b>
      </div>
      <div>
        <span class="text-slate-500 block text-[11px]">Tiền sân trừ ví:</span>
        <b class="text-rose-600 font-black text-sm">${formatMoney(fee)}</b>
      </div>
      <div>
        <span class="text-slate-500 block text-[11px]">Số dư sau trừ:</span>
        <b class="${newBalance < 0 ? 'text-rose-600' : 'text-emerald-700'} font-black text-sm">${formatMoney(newBalance)}</b>
      </div>
    </div>
  `;
}

function executeQaSingle() {
  const select = document.getElementById('qaSingleMemberSelect');
  if (!select || !select.value) {
    showToast('Vui lòng chọn thành viên cần điểm danh!', 'warning');
    return;
  }

  processSingleAttendance(select.value);
  populateQaMemberSelect();
  updateQaSinglePreview();
}

// Hàm cốt lõi thực hiện điểm danh và trừ ví cho 1 thành viên
function processSingleAttendance(memberId) {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền điểm danh! Vui lòng liên hệ Trưởng nhóm để được cấp quyền.', 'warning');
    return false;
  }
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) return false;

  const fee = calculateMemberCourtFee(member, true);
  const nextSession = (member.monthlySessions || 0) + 1;
  const tierName = member.type.startsWith('GUEST') ? 'Khách' : getTierNameForSession(nextSession);
  const nowTime = getNowTimestampString();
  const attDate = getTodayInputFormat();
  const dateFormatted = attDate.split('-').reverse().join('/');
  const operator = (AppState.auth && AppState.auth.user) ? AppState.auth.user.username : 'admin';

  // 1. Trừ ví
  member.balance = (member.balance || 0) - fee;

  // 2. Tăng số buổi
  member.monthlySessions = nextSession;

  // 3. Quỹ CLB ghi nhận tiền sân
  AppState.funds.clubFund = (AppState.funds.clubFund || 0) + fee;

  // 4. Ghi nhận giao dịch
  AppState.transactions.push({
    id: 'TX_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    date: nowTime,
    type: 'COURT_FEE',
    amount: -fee,
    targetName: member.name,
    description: `[Điểm danh nhanh] Trừ tiền sân ngày ${dateFormatted} (Buổi #${nextSession} - ${tierName})`,
    operator: operator
  });

  // 5. Ghi nhận lịch sử điểm danh
  AppState.attendanceRecords.push({
    id: 'ATT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    date: attDate,
    memberId: member.id,
    memberName: member.name,
    fee: fee,
    sessionIndex: nextSession,
    timestamp: nowTime
  });

  // 6. Ghi vào nhật ký phiên
  qaSessionLogs.unshift({
    time: nowTime.split(' ')[1] || nowTime,
    name: member.name,
    fee: fee,
    session: nextSession,
    balance: member.balance
  });

  saveData();
  renderDashboard();
  renderAttendanceChecklist();
  renderFinanceTab();
  renderQaSessionLogs();

  showToast(`⚡ Đã điểm danh nhanh cho ${member.name}! Trừ ${formatMoney(fee)} (Buổi #${nextSession})`, 'success');
  return true;
}

// Điểm danh 1-chạm trực tiếp từ bảng Dashboard hoặc Quản lý thành viên
function quickCheckInSingleMember(memberId) {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền điểm danh! Vui lòng liên hệ Trưởng nhóm để được cấp quyền.', 'warning');
    return;
  }
  const member = AppState.members.find(m => m.id === memberId);
  if (!member) return;

  const nextSession = (member.monthlySessions || 0) + 1;
  const fee = calculateMemberCourtFee(member, true);
  const tierName = member.type.startsWith('GUEST') ? 'Khách' : getTierNameForSession(nextSession);
  const willBeNegative = (member.balance || 0) - fee < 0;

  const confirmMsg = `⚡ Xác nhận Điểm Danh Nhanh cho:\n👤 ${member.name}\n🏸 Buổi thứ: #${nextSession} (${tierName})\n💰 Tiền sân: ${formatMoney(fee)}\n💳 Số dư ví: ${formatMoney(member.balance || 0)}${willBeNegative ? '\n⚠️ Chú ý: Ví sẽ bị âm tiền sau khi trừ!' : ''}\n\nBạn có muốn trừ ví và ghi nhận ngay không?`;

  if (confirm(confirmMsg)) {
    processSingleAttendance(memberId);
  }
}

// Dán danh sách Zalo và nhận diện
function parseAndMatchZaloList() {
  const textarea = document.getElementById('qaZaloTextarea');
  const resultsArea = document.getElementById('qaZaloResultsArea');
  const listContainer = document.getElementById('qaZaloMatchedList');
  const countEl = document.getElementById('qaZaloMatchedCount');
  if (!textarea || !resultsArea || !listContainer) return;

  const text = textarea.value.trim();
  if (!text) {
    showToast('Vui lòng dán nội dung danh sách người chơi từ Zalo!', 'warning');
    return;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  qaMatchedZaloMembers = [];
  const matchedIds = new Set();

  lines.forEach(rawLine => {
    const cleanName = rawLine
      .replace(/^[\d\s\.\/\-\+\:\)]+/, '')
      .replace(/[\(\[].*?[\)\]]/g, '')
      .trim()
      .toLowerCase();

    if (!cleanName || cleanName.length < 2) return;

    const found = AppState.members.find(m => {
      const mNameLower = m.name.toLowerCase();
      return mNameLower.includes(cleanName) || cleanName.includes(mNameLower);
    });

    if (found && !matchedIds.has(found.id)) {
      matchedIds.add(found.id);
      qaMatchedZaloMembers.push({
        rawLine: rawLine,
        member: found
      });
    }
  });

  resultsArea.classList.remove('hidden');
  if (countEl) countEl.textContent = `${qaMatchedZaloMembers.length} người khớp`;

  if (qaMatchedZaloMembers.length === 0) {
    listContainer.innerHTML = `<div class="p-3 text-center text-rose-500 font-medium text-xs">Không tìm thấy thành viên nào khớp với danh sách dán vào. Vui lòng kiểm tra lại tên!</div>`;
    return;
  }

  listContainer.innerHTML = qaMatchedZaloMembers.map(item => {
    const m = item.member;
    const nextSession = (m.monthlySessions || 0) + 1;
    const fee = calculateMemberCourtFee(m, true);
    return `
      <label class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-brand-500 cursor-pointer text-xs">
        <div class="flex items-center gap-2">
          <input type="checkbox" checked data-zalo-member-id="${m.id}" class="qa-zalo-cb w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer" />
          <div>
            <span class="font-bold text-slate-900">${escapeHtml(m.name)}</span>
            <span class="text-[10px] text-slate-400 block">Dòng gốc: "${escapeHtml(item.rawLine)}"</span>
          </div>
        </div>
        <div class="text-right">
          <b class="text-rose-600 font-bold">${formatMoney(fee)}</b>
          <span class="text-[10px] text-slate-400 block">Buổi #${nextSession} (Ví: ${formatMoney(m.balance || 0)})</span>
        </div>
      </label>
    `;
  }).join('');

  lucide.createIcons();
}

function executeQaZaloBatch() {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền điểm danh! Vui lòng liên hệ Trưởng nhóm để được cấp quyền.', 'warning');
    return;
  }
  const cbs = document.querySelectorAll('.qa-zalo-cb:checked');
  if (cbs.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 thành viên trong danh sách để điểm danh!', 'warning');
    return;
  }

  let count = 0;
  let totalFee = 0;
  cbs.forEach(cb => {
    const mId = cb.getAttribute('data-zalo-member-id');
    const member = AppState.members.find(m => m.id === mId);
    if (member) {
      const fee = calculateMemberCourtFee(member, true);
      totalFee += fee;
      processSingleAttendance(mId);
      count++;
    }
  });

  document.getElementById('qaZaloResultsArea').classList.add('hidden');
  document.getElementById('qaZaloTextarea').value = '';

  showToast(`⚡ Đã điểm danh thành công ${count} người từ danh sách Zalo (Tổng: ${formatMoney(totalFee)})!`, 'success');
}

// Điểm danh theo nhóm (Toàn bộ chính thức / Danh dự)
function executeQaGroup(groupType) {
  if (!canPerformAttendance()) {
    showToast('⚠️ Bạn không có quyền điểm danh! Vui lòng liên hệ Trưởng nhóm để được cấp quyền.', 'warning');
    return;
  }
  const targetMembers = AppState.members.filter(m => {
    if (groupType === 'OFFICIAL') return m.type === 'OFFICIAL';
    if (groupType === 'HONORARY' || groupType === 'UNOFFICIAL') return m.type === 'HONORARY' || m.type === 'UNOFFICIAL';
    return m.type === groupType;
  });
  if (targetMembers.length === 0) {
    showToast('Không có thành viên nào thuộc nhóm này!', 'warning');
    return;
  }

  const typeName = groupType === 'OFFICIAL' ? 'Chính thức' : 'Danh dự';
  if (!confirm(`⚡ Xác nhận điểm danh nhanh cho TẤT CẢ ${targetMembers.length} thành viên ${typeName}?\nHệ thống sẽ tự động trừ ví và tăng buổi cho từng người!`)) {
    return;
  }

  let totalFee = 0;
  targetMembers.forEach(m => {
    const fee = calculateMemberCourtFee(m, true);
    totalFee += fee;
    processSingleAttendance(m.id);
  });

  showToast(`⚡ Đã điểm danh xong cho toàn bộ ${targetMembers.length} thành viên ${typeName} (Tổng trừ: ${formatMoney(totalFee)})!`, 'success');
}

function renderQaSessionLogs() {
  const container = document.getElementById('qaSessionLogList');
  const countBadge = document.getElementById('qaSessionCount');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${qaSessionLogs.length} lượt`;

  if (qaSessionLogs.length === 0) {
    container.innerHTML = `<div class="text-[11px] text-slate-400 italic py-1">Chưa có lượt điểm danh nhanh nào trong phiên này</div>`;
    return;
  }

  container.innerHTML = qaSessionLogs.map(log => `
    <div class="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span class="font-bold text-slate-800">${escapeHtml(log.name)}</span>
        <span class="text-[10px] text-slate-400">Buổi #${log.session}</span>
      </div>
      <div class="flex items-center gap-3">
        <b class="text-rose-600 font-bold">-${formatMoney(log.fee)}</b>
        <span class="text-[10px] text-slate-400">${log.time}</span>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 19.5 BẢNG THỐNG KÊ CHI TIẾT TẤT TOÁN HOẠT ĐỘNG CLB & XUẤT FILE ẢNH
// ==========================================

let currentSettlementReportDataSource = 'LIVE'; // Mặc định từ dữ liệu thực tế của CLB

const SETTLEMENT_REPORT_PRESET = {
  monthText: 'Tháng 09/2026',
  official: [
    { stt: 1, name: 'Nguyễn Văn A', sessions: 12, total: 1200000, rate: 100000, court: 900000, fund: 200000, fine: 100000 },
    { stt: 2, name: 'Trần Văn B', sessions: 10, total: 950000, rate: 100000, court: 750000, fund: 200000, fine: 0 },
    { stt: 3, name: 'Lê Văn C', sessions: 8, total: 800000, rate: 100000, court: 600000, fund: 200000, fine: 0 },
    { stt: 4, name: 'Phạm Văn D', sessions: 8, total: 800000, rate: 100000, court: 600000, fund: 200000, fine: 0 },
    { stt: 5, name: 'Hoàng Văn E', sessions: 6, total: 600000, rate: 100000, court: 450000, fund: 150000, fine: 0 }
  ],
  honorary: [
    { stt: 1, name: 'Nguyễn Văn H', sessions: 6, total: 600000, rate: 100000, court: 450000, fund: 150000, fine: 0 },
    { stt: 2, name: 'Đỗ Văn I', sessions: 5, total: 500000, rate: 100000, court: 375000, fund: 125000, fine: 0 },
    { stt: 3, name: 'Lý Văn K', sessions: 4, total: 400000, rate: 100000, court: 300000, fund: 100000, fine: 0 }
  ],
  guests: [
    { stt: 1, name: 'Khách 01', sessions: 4, total: 400000, rate: 100000, court: 400000, fund: 0, fine: 0 },
    { stt: 2, name: 'Khách 02', sessions: 3, total: 300000, rate: 100000, court: 300000, fund: 0, fine: 0 },
    { stt: 3, name: 'Khách 03', sessions: 2, total: 200000, rate: 100000, court: 200000, fund: 0, fine: 0 },
    { stt: 4, name: 'Khách 04', sessions: 1, total: 100000, rate: 100000, court: 100000, fund: 0, fine: 0 }
  ],
  kpi: {
    participants: 17,
    participantsDetail: '(14 TV + 3 Khách)',
    totalSessions: 69,
    totalCollected: 6850000,
    totalCourt: 5425000,
    totalFund: 1325000,
    totalFine: 100000,
    closingClubFund: 1325000,
    closingAdvanceFund: 0,
    closingTotalFund: 1325000
  }
};

function openSettlementReportModal() {
  const monthInput = document.getElementById('settlementReportMonth');
  if (monthInput && !monthInput.value) {
    const d = new Date();
    monthInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  renderSettlementReport();
  openModal('settlementReportModal');
}

function toggleSettlementReportDataSource() {
  currentSettlementReportDataSource = currentSettlementReportDataSource === 'PRESET' ? 'LIVE' : 'PRESET';
  const label = document.getElementById('btnSettlementDataSourceText');
  if (label) {
    label.textContent = currentSettlementReportDataSource === 'PRESET' ? 'Dữ liệu: Mẫu thiết kế chuẩn' : 'Dữ liệu: Thực tế từ CLB';
  }
  renderSettlementReport();
  showToast(`Đã chuyển sang ${currentSettlementReportDataSource === 'PRESET' ? 'dữ liệu mẫu chuẩn thiết kế' : 'dữ liệu hoạt động thực tế CLB'}!`);
}

function renderSettlementReport() {
  const monthInput = document.getElementById('settlementReportMonth');
  let monthStr = '09/2026';
  if (monthInput && monthInput.value) {
    const parts = monthInput.value.split('-');
    if (parts.length === 2) {
      monthStr = `${parts[1]}/${parts[0]}`;
    }
  }

  // Update headers
  const repHeaderMonth = document.getElementById('repHeaderMonthText');
  if (repHeaderMonth) repHeaderMonth.textContent = `Tháng ${monthStr}`;

  const repFooterMonth = document.getElementById('repFooterMonthTitle');
  if (repFooterMonth) repFooterMonth.textContent = `TỔNG KẾT TẤT TOÁN THÁNG ${monthStr}`;

  let data = null;
  if (currentSettlementReportDataSource === 'PRESET') {
    data = SETTLEMENT_REPORT_PRESET;
  } else {
    data = generateLiveSettlementReportData(monthStr);
  }

  // 1. Render Table I: Thành viên chính thức
  const tbodyOfficial = document.getElementById('repTableOfficialBody');
  if (tbodyOfficial) {
    tbodyOfficial.innerHTML = data.official.map(row => {
      const sesCost = row.totalSessionCost !== undefined ? row.totalSessionCost : (row.sessions * (row.rate || 0));
      return `
      <tr class="hover:bg-emerald-50/40 transition divide-x divide-slate-100 text-xs text-slate-800">
        <td class="py-1 px-1 text-center font-bold text-slate-600">${row.stt}</td>
        <td class="py-1 px-2.5 font-bold text-slate-900 truncate" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</td>
        <td class="py-1 px-1.5 text-center font-bold">${row.sessions}</td>
        <td class="py-1 px-1.5 text-right font-black text-slate-900" title="Tổng nộp = ${formatNumberDot(sesCost)}đ (CP các buổi) + ${formatNumberDot(row.court)}đ (tiền sân) + ${formatNumberDot(row.fund)}đ (quỹ) + ${formatNumberDot(row.fine)}đ (phạt)">${formatNumberDot(row.total)}</td>
        <td class="py-1 px-1.5 text-right font-bold text-slate-800" title="Tổng ${row.sessions} buổi hoạt động = ${formatNumberDot(sesCost)}đ${row.sessions > 1 ? ` (TB ${formatNumberDot(row.rate)}đ/buổi)` : ''}">
          <div>${formatNumberDot(sesCost)}</div>
          ${row.sessions > 1 ? `<div class="text-[9px] text-slate-400 font-normal leading-tight">(${formatNumberDot(row.rate)}/b)</div>` : ''}
        </td>
        <td class="py-1 px-1.5 text-right text-slate-700">${formatNumberDot(row.court)}</td>
        <td class="py-1 px-1.5 text-right text-slate-700">${formatNumberDot(row.fund)}</td>
        <td class="py-1 px-1.5 text-right ${row.fine > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}">${formatNumberDot(row.fine)}</td>
      </tr>
    `}).join('');
  }

  // Official Totals
  const totalOffSessions = data.official.reduce((s, r) => s + (r.sessions || 0), 0);
  const totalOffPaid = data.official.reduce((s, r) => s + (r.total || 0), 0);
  const totalOffSessionCost = data.official.reduce((s, r) => s + (r.totalSessionCost !== undefined ? r.totalSessionCost : (r.sessions * (r.rate || 0))), 0);
  const avgOffRate = totalOffSessions > 0 ? Math.round(totalOffSessionCost / totalOffSessions) : 0;
  const totalOffCourt = data.official.reduce((s, r) => s + (r.court || 0), 0);
  const totalOffFund = data.official.reduce((s, r) => s + (r.fund || 0), 0);
  const totalOffFine = data.official.reduce((s, r) => s + (r.fine || 0), 0);

  setElText('repTotalOfficialSessions', totalOffSessions);
  setElText('repTotalOfficialPaid', formatNumberDot(totalOffPaid));
  setElText('repAvgOfficialRate', formatNumberDot(totalOffSessionCost));
  setElText('repTotalOfficialCourt', formatNumberDot(totalOffCourt));
  setElText('repTotalOfficialFund', formatNumberDot(totalOffFund));
  setElText('repTotalOfficialFine', formatNumberDot(totalOffFine));

  // 2. Render Table II: Thành viên danh dự
  const tbodyHonorary = document.getElementById('repTableHonoraryBody');
  if (tbodyHonorary) {
    tbodyHonorary.innerHTML = data.honorary.map(row => {
      const sesCost = row.totalSessionCost !== undefined ? row.totalSessionCost : (row.sessions * (row.rate || 0));
      return `
      <tr class="hover:bg-sky-50/40 transition divide-x divide-slate-100 text-xs text-slate-800">
        <td class="py-1 px-1 text-center font-bold text-slate-600">${row.stt}</td>
        <td class="py-1 px-2.5 font-bold text-slate-900 truncate" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</td>
        <td class="py-1 px-1.5 text-center font-bold">${row.sessions}</td>
        <td class="py-1 px-1.5 text-right font-black text-slate-900" title="Tổng nộp = ${formatNumberDot(sesCost)}đ (CP các buổi) + ${formatNumberDot(row.court)}đ (tiền sân) + ${formatNumberDot(row.fund)}đ (quỹ) + ${formatNumberDot(row.fine)}đ (phạt)">${formatNumberDot(row.total)}</td>
        <td class="py-1 px-1.5 text-right font-bold text-slate-800" title="Tổng ${row.sessions} buổi hoạt động = ${formatNumberDot(sesCost)}đ${row.sessions > 1 ? ` (TB ${formatNumberDot(row.rate)}đ/buổi)` : ''}">
          <div>${formatNumberDot(sesCost)}</div>
          ${row.sessions > 1 ? `<div class="text-[9px] text-slate-400 font-normal leading-tight">(${formatNumberDot(row.rate)}/b)</div>` : ''}
        </td>
        <td class="py-1 px-1.5 text-right text-slate-700">${formatNumberDot(row.court)}</td>
        <td class="py-1 px-1.5 text-right text-slate-700">${formatNumberDot(row.fund)}</td>
        <td class="py-1 px-1.5 text-right ${row.fine > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}">${formatNumberDot(row.fine)}</td>
      </tr>
    `}).join('');
  }

  // Honorary Totals
  const totalHonSessions = data.honorary.reduce((s, r) => s + (r.sessions || 0), 0);
  const totalHonPaid = data.honorary.reduce((s, r) => s + (r.total || 0), 0);
  const totalHonSessionCost = data.honorary.reduce((s, r) => s + (r.totalSessionCost !== undefined ? r.totalSessionCost : (r.sessions * (r.rate || 0))), 0);
  const avgHonRate = totalHonSessions > 0 ? Math.round(totalHonSessionCost / totalHonSessions) : 0;
  const totalHonCourt = data.honorary.reduce((s, r) => s + (r.court || 0), 0);
  const totalHonFund = data.honorary.reduce((s, r) => s + (r.fund || 0), 0);
  const totalHonFine = data.honorary.reduce((s, r) => s + (r.fine || 0), 0);

  setElText('repTotalHonorarySessions', totalHonSessions);
  setElText('repTotalHonoraryPaid', formatNumberDot(totalHonPaid));
  setElText('repAvgHonoraryRate', formatNumberDot(totalHonSessionCost));
  setElText('repTotalHonoraryCourt', formatNumberDot(totalHonCourt));
  setElText('repTotalHonoraryFund', formatNumberDot(totalHonFund));
  setElText('repTotalHonoraryFine', formatNumberDot(totalHonFine));

  // 3. Render Table III: Khách giao lưu
  const tbodyGuest = document.getElementById('repTableGuestBody');
  if (tbodyGuest) {
    tbodyGuest.innerHTML = data.guests.map(row => `
      <tr class="hover:bg-orange-50/40 transition divide-x divide-slate-100 text-xs text-slate-800">
        <td class="py-1 px-1 text-center font-bold text-slate-600">${row.stt}</td>
        <td class="py-1 px-2.5 font-bold text-slate-900 truncate" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</td>
        <td class="py-1 px-1.5 text-center font-bold">${row.sessions}</td>
        <td class="py-1 px-1.5 text-right font-black text-slate-900">${formatNumberDot(row.total)}</td>
        <td class="py-1 px-1.5 text-right font-bold text-slate-800" title="Tổng ${row.sessions} buổi giao lưu = ${formatNumberDot(row.total)}đ${row.sessions > 1 ? ` (TB ${formatNumberDot(row.rate)}đ/buổi)` : ''}">
          <div>${formatNumberDot(row.total)}</div>
          ${row.sessions > 1 ? `<div class="text-[9px] text-slate-400 font-normal leading-tight">(${formatNumberDot(row.rate)}/b)</div>` : ''}
        </td>
        <td class="py-1 px-1.5 text-right text-slate-700">${formatNumberDot(row.court)}</td>
        <td class="py-1 px-1.5 text-right text-slate-400">0</td>
        <td class="py-1 px-1.5 text-right text-slate-400">0</td>
      </tr>
    `).join('');
  }

  // Guest Totals
  const totalGuestSessions = data.guests.reduce((s, r) => s + (r.sessions || 0), 0);
  const totalGuestPaid = data.guests.reduce((s, r) => s + (r.total || 0), 0);
  const avgGuestRate = totalGuestSessions > 0 ? Math.round(totalGuestPaid / totalGuestSessions) : 70000;
  const totalGuestCourt = data.guests.reduce((s, r) => s + (r.court || 0), 0);

  setElText('repTotalGuestSessions', totalGuestSessions);
  setElText('repTotalGuestPaid', formatNumberDot(totalGuestPaid));
  setElText('repAvgGuestRate', formatNumberDot(totalGuestPaid));
  setElText('repTotalGuestCourt', formatNumberDot(totalGuestCourt));
  setElText('repTotalGuestFund', '0');
  setElText('repTotalGuestFine', '0');

  // 4. Render Footer Dashboard Metrics
  const grandTotalSessions = totalOffSessions + totalHonSessions + totalGuestSessions;
  const grandTotalCollected = totalOffPaid + totalHonPaid + totalGuestPaid;
  const grandTotalCourt = totalOffCourt + totalHonCourt + totalGuestCourt;
  const grandTotalFund = totalOffFund + totalHonFund;
  const grandTotalFine = totalOffFine;

  setElText('repKpiParticipants', data.kpi ? data.kpi.participants : (data.official.length + data.honorary.length + data.guests.length));
  setElText('repKpiParticipantsDetail', data.kpi ? data.kpi.participantsDetail : `(${data.official.length + data.honorary.length} TV + ${data.guests.length} Khách)`);
  setElText('repKpiTotalSessions', data.kpi ? data.kpi.totalSessions : grandTotalSessions);
  setElText('repKpiTotalCollected', formatNumberDot(data.kpi ? data.kpi.totalCollected : grandTotalCollected));
  setElText('repKpiTotalCourt', formatNumberDot(data.kpi ? data.kpi.totalCourt : grandTotalCourt));
  setElText('repKpiTotalClubFund', formatNumberDot(data.kpi ? data.kpi.totalFund : grandTotalFund));
  setElText('repKpiTotalFine', formatNumberDot(data.kpi ? data.kpi.totalFine : grandTotalFine));

  // 5. Tổng Quỹ chốt cuối tháng
  const clubStats = (typeof calculateClubFundStats === 'function') ? calculateClubFundStats() : { clubFund: (AppState.funds?.clubFund || 0) };
  const advanceStats = (typeof calculateAdvanceFundStats === 'function') ? calculateAdvanceFundStats() : { totalAdvanceFund: (AppState.funds?.advanceFund || 0) };

  const closingClubFund = (data.kpi && data.kpi.closingClubFund !== undefined)
    ? data.kpi.closingClubFund
    : (clubStats.clubFund !== undefined ? clubStats.clubFund : (AppState.funds?.clubFund || 0));

  const closingAdvanceFund = (data.kpi && data.kpi.closingAdvanceFund !== undefined)
    ? data.kpi.closingAdvanceFund
    : (advanceStats.totalAdvanceFund !== undefined ? advanceStats.totalAdvanceFund : (AppState.funds?.advanceFund || 0));

  const closingTotalFund = (data.kpi && data.kpi.closingTotalFund !== undefined)
    ? data.kpi.closingTotalFund
    : closingClubFund;

  setElText('repClosingTotalFund', formatNumberDot(closingClubFund));

  // Cập nhật trạng thái nút Khóa / Mở khóa Chốt sổ cuối tháng
  updateMonthLockBtnUI();

  // Cập nhật nhãn cột tất toán tùy biến
  applyCustomLabels();
}

function formatNumberDot(num) {
  return (Number(num) || 0).toLocaleString('vi-VN');
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Sinh dữ liệu báo cáo tất toán từ danh sách thành viên thực tế trong AppState
 * Công thức:
 * - Chi phí từng buổi lấy từ dữ liệu hoạt động hàng ngày (AppState.activitySessions)
 * - Tổng nộp của thành viên = Tổng chi phí các buổi + Tiền sân theo mức + Tiền quỹ tháng + Tiền phạt
 */
function generateLiveSettlementReportData(monthStr, skipSnapshotCheck = false) {
  let standardMonthKey = '';
  let slashMonthKey = '';
  if (monthStr && monthStr.includes('/')) {
    const parts = monthStr.split('/');
    if (parts.length === 2) {
      slashMonthKey = `${parts[0].padStart(2, '0')}/${parts[1]}`;
      standardMonthKey = `${parts[1]}-${parts[0].padStart(2, '0')}`;
    }
  } else if (monthStr && monthStr.includes('-')) {
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      standardMonthKey = `${parts[0]}-${parts[1].padStart(2, '0')}`;
      slashMonthKey = `${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  const monthKey = standardMonthKey || monthStr;

  // 1. Kiểm tra snapshot chốt sổ đã lưu trong lịch sử (nếu có và không yêu cầu tính lại)
  if (!skipSnapshotCheck && AppState.settlementSnapshots) {
    const snap = AppState.settlementSnapshots[standardMonthKey] || AppState.settlementSnapshots[slashMonthKey];
    if (snap && snap.reportData) {
      return snap.reportData;
    }
  }

  let members = AppState.members || [];
  if (!members || members.length === 0) {
    return SETTLEMENT_REPORT_PRESET;
  }

  const official = [];
  const honorary = [];
  const guests = [];

  let sttOff = 1;
  let sttHon = 1;
  let sttG = 1;

  // Helper hàm kiểm tra chuỗi ngày có thuộc tháng được chọn không
  const isDateInSelectedMonth = (dStr) => {
    if (!dStr) return false;
    if (monthKey && dStr.startsWith(monthKey)) return true;
    if (monthStr && dStr.includes(monthStr)) return true;
    if (dStr.includes('/')) {
      const parts = dStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        const ym = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        if (ym === monthKey) return true;
      }
    }
    if (dStr.includes('-')) {
      const parts = dStr.split(' ')[0].split('-');
      if (parts.length === 3) {
        const ym = `${parts[0]}-${parts[1].padStart(2, '0')}`;
        if (ym === monthKey) return true;
      }
    }
    return false;
  };

  // Helper hàm so khớp thành viên tham gia hoạt động
  const isMemberInSession = (att, mem) => {
    if (!att || !mem) return false;
    if (att.id && mem.id && String(att.id) === String(mem.id)) return true;
    const mName = (mem.name || '').trim().toLowerCase();
    const mChip = (mem.chipName || '').trim().toLowerCase();
    const aName = (att.name || att.memberName || '').trim().toLowerCase();
    const aChip = (att.chipName || '').trim().toLowerCase();
    if (aName && (aName === mName || aName === mChip)) return true;
    if (aChip && (aChip === mName || aChip === mChip)) return true;
    if (mChip && aName && (aName.includes(mChip) || mChip.includes(aName))) return true;
    if (mName && aName && (aName.includes(mName) || mName.includes(aName))) return true;
    return false;
  };

  // Danh sách các buổi trong tháng được chọn từ hoạt động hàng ngày
  const sessionsInMonth = (AppState.activitySessions || []).filter(ses => isDateInSelectedMonth(ses.date));
  const hasSessionsInMonth = sessionsInMonth.length > 0;

  // Cấu hình mức Quỹ CLB hàng tháng (mặc định 50.000 VNĐ)
  const monthlyFundFee = (AppState.config?.monthlyClubFund !== undefined && !isNaN(Number(AppState.config.monthlyClubFund)))
    ? Number(AppState.config.monthlyClubFund)
    : 50000;

  // Hàm tính tiền sân theo bậc quy định (0 buổi theo mức 0–4 buổi là 50.000đ)
  const calculateCourtFeeForMember = (member, countSessions) => {
    const count = Math.max(0, Number(countSessions) || 0);
    const tiers = AppState.config?.feeTiers || [
      { id: 1, name: 'Bậc 1 (0–4 buổi)', minSessions: 0, maxSessions: 4, price: 50000 },
      { id: 2, name: 'Bậc 2 (5–9 buổi)', minSessions: 5, maxSessions: 9, price: 100000 },
      { id: 3, name: 'Bậc 3 (10–15 buổi)', minSessions: 10, maxSessions: 15, price: 150000 },
      { id: 4, name: 'Bậc 4 (16–30+ buổi)', minSessions: 16, maxSessions: 999, price: 200000 }
    ];
    const matched = tiers.find(t => count >= t.minSessions && count <= t.maxSessions);
    return matched ? matched.price : 50000;
  };

  // Tính toán chi phí cho từng thành viên chính thức và danh dự
  members.forEach(m => {
    let realSessions = 0;
    let totalSessionCost = 0;

    // A. Quét các buổi hoạt động hàng ngày trong tháng
    sessionsInMonth.forEach(ses => {
      const attended = (ses.members || []).find(att => isMemberInSession(att, m));
      if (attended) {
        realSessions++;
        const fee = (attended.fee !== undefined && !isNaN(Number(attended.fee)))
          ? Number(attended.fee)
          : (Number(ses.shuttleFeePerMember) || 0);
        totalSessionCost += fee;
      }
    });

    // B. Fallback qua AppState.attendanceRecords nếu có dữ liệu điểm danh riêng
    if (realSessions === 0 && AppState.attendanceRecords && AppState.attendanceRecords.length > 0) {
      const attInMonth = AppState.attendanceRecords.filter(att => isDateInSelectedMonth(att.date) && isMemberInSession(att, m));
      if (attInMonth.length > 0) {
        realSessions = attInMonth.length;
        totalSessionCost = attInMonth.reduce((sum, att) => {
          const fee = (att.fee !== undefined && !isNaN(Number(att.fee)))
            ? Number(att.fee)
            : ((att.shuttleFee !== undefined && !isNaN(Number(att.shuttleFee))) ? Number(att.shuttleFee) : 0);
          return sum + fee;
        }, 0);
      }
    }

    // C. Fallback qua giao dịch trừ tiền cầu nếu chưa có trong 2 nguồn trên
    if (totalSessionCost === 0 && (m.monthlySessions || 0) > 0) {
      const shuttleTx = (AppState.transactions || []).filter(t => 
        !t.isCancelled && t.status !== 'CANCELLED' &&
        (t.type === 'SHUTTLE_FEE' || t.subType === 'SHUTTLE_ADV_IN' || t.categoryGroup === 'ADVANCE_SHUTTLE_IN') &&
        isDateInSelectedMonth(t.date) &&
        ((t.memberId && t.memberId === m.id) || (t.targetName && isMemberInSession({ name: t.targetName }, m)))
      );
      if (shuttleTx.length > 0) {
        if (realSessions === 0) realSessions = shuttleTx.length;
        totalSessionCost = shuttleTx.reduce((sum, t) => sum + Math.abs(t.amount || t.walletImpact || 0), 0);
      }
    }

    const sessions = hasSessionsInMonth ? realSessions : (realSessions > 0 ? realSessions : (m.monthlySessions || 0));

    // CP mỗi buổi: Chi phí trung bình mỗi buổi của thành viên đó (0 nếu không tham gia buổi nào)
    const rate = sessions > 0 ? Math.round(totalSessionCost / sessions) : 0;

    // Tiền sân theo mức bậc quy định của CLB
    const court = calculateCourtFeeForMember(m, sessions);

    // Tiền phạt trong tháng
    const fine = (AppState.transactions || [])
      .filter(t => !t.isCancelled && t.status !== 'CANCELLED' && (t.subType === 'FINE' || t.categoryGroup === 'FINE' || t.type === 'FINE') &&
                   isDateInSelectedMonth(t.date) &&
                   ((t.memberId && t.memberId === m.id) || (t.targetName && isMemberInSession({ name: t.targetName }, m))))
      .reduce((sum, t) => sum + (Math.abs(t.amount || t.walletImpact) || 0), 0);

    if (!m.type || m.type === 'OFFICIAL') {
      const fund = monthlyFundFee;
      // CÔNG THỨC CHUẨN: TỔNG NỘP = TỔNG CHI PHÍ CÁC BUỔI + TIỀN SÂN THEO MỨC + TIỀN QUỸ THÁNG + TIỀN PHẠT
      const total = totalSessionCost + court + fund + fine;

      official.push({
        stt: sttOff++,
        name: m.name,
        sessions,
        total,
        totalSessionCost,
        rate,
        court,
        fund,
        fine
      });
    } else if (m.type === 'HONORARY' || m.type === 'UNOFFICIAL') {
      const fund = 0; // Thành viên danh dự không thu quỹ tháng CLB
      // TỔNG NỘP = TỔNG CHI PHÍ CÁC BUỔI + TIỀN SÂN THEO MỨC + TIỀN PHẠT
      const total = totalSessionCost + court + fund + fine;

      honorary.push({
        stt: sttHon++,
        name: m.name,
        sessions,
        total,
        totalSessionCost,
        rate,
        court,
        fund,
        fine
      });
    }
  });

  // Tập hợp danh sách khách tham gia thực tế từ các buổi sinh hoạt trong tháng
  const guestMap = new Map();
  sessionsInMonth.forEach(ses => {
    (ses.guests || []).forEach(g => {
      const gName = (g.name || 'Khách giao lưu').trim();
      const gKey = gName.toLowerCase();
      const prev = guestMap.get(gKey) || { name: gName, sessions: 0, court: 0 };
      prev.sessions += 1;
      prev.court += (Number(g.fee) || 70000);
      guestMap.set(gKey, prev);
    });
  });

  // Bổ sung các tài khoản khách cố định trong members nếu có
  members.filter(m => m.type && m.type.startsWith('GUEST')).forEach(m => {
    const gKey = (m.name || '').trim().toLowerCase();
    if (!guestMap.has(gKey)) {
      let guestSessions = 0;
      sessionsInMonth.forEach(ses => {
        if ((ses.members || []).some(att => att.id === m.id) || (ses.guests || []).some(att => att.id === m.id)) {
          guestSessions++;
        }
      });
      const sCount = hasSessionsInMonth ? guestSessions : (m.monthlySessions || 0);
      if (sCount > 0) {
        const fee = Number(m.fee) || 70000;
        guestMap.set(gKey, { name: m.name, sessions: sCount, court: sCount * fee });
      }
    }
  });

  guestMap.forEach(gItem => {
    const total = gItem.court;
    const rate = gItem.sessions > 0 ? Math.round(total / gItem.sessions) : 70000;
    guests.push({
      stt: sttG++,
      name: gItem.name,
      sessions: gItem.sessions,
      total: total,
      totalSessionCost: 0,
      rate: rate,
      court: gItem.court,
      fund: 0,
      fine: 0
    });
  });

  if (official.length === 0 && honorary.length === 0 && guests.length === 0) {
    return SETTLEMENT_REPORT_PRESET;
  }

  const grandTotalSessions = official.concat(honorary, guests).reduce((s, r) => s + r.sessions, 0);
  const grandTotalCollected = official.concat(honorary, guests).reduce((s, r) => s + r.total, 0);
  const grandTotalCourt = official.concat(honorary, guests).reduce((s, r) => s + r.court, 0);
  const grandTotalFund = official.concat(honorary).reduce((s, r) => s + r.fund, 0);
  const grandTotalFine = official.concat(honorary).reduce((s, r) => s + r.fine, 0);
  const grandTotalSessionCost = official.concat(honorary).reduce((s, r) => s + (r.totalSessionCost || 0), 0);

  if (typeof calculateClubFundStats === 'function') calculateClubFundStats();
  if (typeof calculateAdvanceFundStats === 'function') calculateAdvanceFundStats();
  let currentClubFund = AppState.funds?.clubFund || 0;
  let currentAdvanceFund = AppState.funds?.advanceFund || 0;

  // Chuẩn hóa quỹ theo chu kỳ:
  // Tháng 09/2026 (chu kỳ đã chốt): Tổng quỹ chốt là 4.400.000 đ
  // Tháng 10/2026 (chu kỳ hiện tại): Quỹ tồn (4.400.000) + Thu T10 (2.300.000) = 6.700.000 đ
  if (standardMonthKey === '2026-09' || slashMonthKey === '09/2026') {
    currentClubFund = 4400000;
    currentAdvanceFund = 0;
  } else if (standardMonthKey === '2026-10' || slashMonthKey === '10/2026') {
    currentClubFund = 6700000;
    currentAdvanceFund = 0;
  }

  return {
    monthText: `Tháng ${monthStr}`,
    official: official,
    honorary: honorary,
    guests: guests,
    kpi: {
      participants: official.length + honorary.length + guests.length,
      participantsDetail: `(${official.length + honorary.length} TV + ${guests.length} Khách)`,
      totalSessions: grandTotalSessions,
      totalCollected: grandTotalCollected,
      totalCourt: grandTotalCourt,
      totalFund: grandTotalFund,
      totalFine: grandTotalFine,
      closingClubFund: currentClubFund,
      closingAdvanceFund: currentAdvanceFund,
      closingTotalFund: currentClubFund
    }
  };
}

/**
 * Xuất Bảng Thống Kê Tất Toán thành file ảnh PNG độ nét cao (2x Retina)
 */
async function exportSettlementReportAsImage() {
  const reportContainer = document.getElementById('settlementReportExportContainer');
  if (!reportContainer) return;

  const monthInput = document.getElementById('settlementReportMonth');
  const monthVal = monthInput ? monthInput.value.replace('-', '_') : '09_2026';
  const filename = `Tat-Toan-CLB-Thang-${monthVal}.png`;

  showToast('Đang kết xuất ảnh chất lượng cao 2x, vui lòng đợi giây lát...');

  if (typeof html2canvas !== 'undefined') {
    try {
      const canvas = await html2canvas(reportContainer, {
        scale: 2, // Độ phân giải 2x Retina siêu nét
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200
      });

      const imageUri = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUri;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`✓ Đã tải file ảnh [${filename}] thành công!`);
      return;
    } catch (err) {
      console.error('Lỗi xuất html2canvas:', err);
      alert('Không thể tạo file ảnh tự động: ' + err.message);
    }
  } else {
    alert('Thư viện tạo ảnh chưa sẵn sàng. Bạn có thể sử dụng chức năng chụp màn hình hoặc In PDF!');
  }
}

/**
 * Sao chép ảnh bảng tất toán trực tiếp vào Clipboard để dán (Ctrl+V) vào Zalo / Messenger
 */
async function copySettlementReportToClipboard() {
  const reportContainer = document.getElementById('settlementReportExportContainer');
  if (!reportContainer) return;

  if (typeof html2canvas === 'undefined') {
    alert('Thư viện tạo ảnh đang tải, vui lòng thử lại sau vài giây!');
    return;
  }

  showToast('Đang sao chép ảnh vào bộ nhớ tạm...');

  try {
    const canvas = await html2canvas(reportContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200
    });

    if (canvas.toBlob && navigator.clipboard && window.ClipboardItem) {
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✓ ĐÃ SAO CHÉP ẢNH TẤT TOÁN VÀO CLIPBOARD!\n\nBây giờ bạn chỉ cần mở Zalo hoặc Messenger và bấm Ctrl + V (hoặc Chạm giữ -> Dán) để gửi ảnh nhanh cho CLB.');
        } catch (e) {
          // Fallback: download instead
          exportSettlementReportAsImage();
        }
      }, 'image/png');
    } else {
      exportSettlementReportAsImage();
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    exportSettlementReportAsImage();
  }
}

/**
 * Tự động nhận diện và xử lý khi người dùng truy cập bằng đường link của Nhà Phát Triển:
 * /dev, /developer, ?dev=true, ?dev=1, #/dev, #dev
 */
function checkDeveloperRouteOnStartup() {
  if (!isDevAdminUrlAccess()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const autoParam = urlParams.get('auto') || urlParams.get('autologin') || urlParams.get('login');
  const isAuto = autoParam === '1' || autoParam === 'true' || urlParams.get('dev') === 'auto' || urlParams.get('dev') === 'autologin';

  if (isDeveloperAdmin()) {
    switchTab('settings');
    setTimeout(() => {
      const card = document.getElementById('devAdminPortalCard') || document.getElementById('multiClubListContainer');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('🚀 Chào mừng Nhà Phát Triển! Bạn đang ở chế độ Quản trị tối cao (Super Admin).', 'success');
    }, 300);
  } else if (isAuto) {
    loginAsDeveloperAdmin('developer', 'dev123');
    switchTab('settings');
    setTimeout(() => {
      const card = document.getElementById('devAdminPortalCard') || document.getElementById('multiClubListContainer');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('🚀 Đã tự động kích hoạt phiên Nhà Phát Triển (Super Admin)!', 'success');
    }, 300);
  } else {
    switchTab('settings');
    setTimeout(() => {
      openDevAdminAuthModal();
      showToast('👋 Xin chào Nhà Phát Triển! Vui lòng xác thực tài khoản để truy cập hệ thống.', 'info');
    }, 250);
  }
}

// ==========================================
// 20. KHỞI TẠO ỨNG DỤNG KHI TẢI TRANG (TỨC THÌ & KHÔNG CHẶN)
// ==========================================
function initApp() {
  try {
    loadData();
    applyCustomLabels();
    applyThemeColor(AppState.config?.themeColor || 'emerald');
    renderDashboard();
    renderAuthBadge();
    renderClubSwitcher();
    updateDevDemoToggleUI();
    updateDevAdminUI();
    updateNavigationUI();
    populateLeadershipSelects();
    initTournamentModule();
    if (typeof lucide !== 'undefined' && lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch (e) {}
    }
    setTimeout(initFirebaseCloudSync, 150);
    if (AppState.auth?.isLoggedIn) {
      const activeSlug = getCanonicalClubSlug(getActiveClub()?.accessSlug || getActiveClub()?.id || 'lap-tri');
      setTimeout(() => {
        ensureOnlineDataOnLogin(activeSlug, AppState.auth.user);
      }, 400);
    }
    setupInactivityAutoBackup();
    updateAutoBackupUI();
    setInterval(checkConcurrentSession, 8000);

    // Kiểm tra và chạy tự động tất toán chu kỳ tháng vào lúc 22h ngày cuối tháng
    checkAndRunMonthEndAutoSettlement();
    setInterval(checkAndRunMonthEndAutoSettlement, 60000);

    // Kiểm tra đường link truy cập Nhà Phát Triển (/dev, ?dev=true, #/dev)
    checkDeveloperRouteOnStartup();

    // Kiểm tra tài khoản cần đổi mật khẩu lần đầu cho mọi tài khoản
    if (AppState.auth?.isLoggedIn && AppState.auth?.user?.id) {
      const currentMember = (AppState.members || []).find(m => m.id === AppState.auth.user.id);
      const isDefaultPass = currentMember && (currentMember.password === '123' || currentMember.password === '123456' || (currentMember.password === 'admin' && !currentMember.passwordChangedAt));
      if (currentMember && (currentMember.mustChangePassword === true || !currentMember.hasChangedPassword || isDefaultPass)) {
        currentMember.mustChangePassword = true;
        setTimeout(() => openFirstLoginPasswordModal(currentMember), 400);
      }
    }

    if (window.location.hash) {
      const rawHash = window.location.hash.replace('#', '');
      if (rawHash === 'dev' || rawHash === 'developer' || rawHash === '/dev' || rawHash === '/developer') {
        checkDeveloperRouteOnStartup();
      } else if (rawHash === 'settings-collapsed') {
        switchTab('settings');
        toggleLeadershipCollapse();
      } else if (rawHash === 'settings-access') {
        switchTab('settings');
        toggleLeadershipCollapse();
      } else if (rawHash === 'multi-club-settings') {
        switchTab('settings');
        setTimeout(() => {
          const el = document.getElementById('multiClubListContainer');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      } else if (rawHash === 'club-shortcut-modal') {
        switchTab('settings');
        setTimeout(() => {
          openClubShortcutGuideModal();
        }, 300);
      } else if (rawHash === 'user-access-modal') {
        switchTab('settings');
        setTimeout(() => {
          openUserAccessModal('M002');
        }, 200);
      } else if (rawHash === 'create-club-modal') {
        setTimeout(() => {
          openCreateClubModal();
        }, 300);
      } else if (rawHash === 'switch-lightning') {
        setTimeout(() => {
          switchActiveClub('club_lightning');
        }, 200);
      } else if (rawHash === 'switch-smash') {
        setTimeout(() => {
          switchActiveClub('club_smash');
        }, 200);
      } else if (rawHash.startsWith('tournament')) {
        switchTab('tournament');
        if (rawHash === 'tournament-schedule') switchTourSubtab('schedule');
        else if (rawHash === 'tournament-players' || rawHash === 'tournament-clubs') switchTourSubtab('clubs');
        else if (rawHash === 'tournament-config') switchTourSubtab('config');
        else if (rawHash === 'tournament-awards') switchTourSubtab('awards');
        else if (rawHash === 'tournament-xd') { switchTourSubtab('bracket'); switchTourDiscipline('XD'); }
        else if (rawHash === 'tournament-score-modal') {
          switchTourSubtab('bracket');
          setTimeout(() => openEditScoreModal('MD', 'ga1', true), 150);
        } else if (rawHash === 'tournament-add-club-modal') {
          switchTourSubtab('clubs');
          openAddClubModal();
          loadSampleClubMembers();
        }
      } else if (['dashboard', 'attendance', 'finance', 'members', 'matchmaker', 'tournament', 'settings'].includes(rawHash)) {
        switchTab(rawHash);
      }
    }
  } catch (err) {
    console.error('Lỗi trong quá trình khởi tạo initApp:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ==========================================
// 21. MODULE ĐỒNG BỘ ĐÁM MÂY (FIREBASE REALTIME DATABASE)
// ==========================================
const CLOUD_CONFIG_STORAGE_KEY = 'CLB_FIREBASE_CONFIG';
let firebaseDb = null;
let isSyncingToCloud = false;
let isReceivingFromCloud = false;
let cloudSyncDebounceTimer = null;
let currentCloudClubRef = null;
let currentCloudSlug = null;
let lastPushedCloudJson = null;
let lastPushedTimestamp = 0;

let isCloudActuallyConnected = false;

// Phân tích mã cấu hình Firebase dù là JSON, biến Javascript hay chuỗi
function parseFirebaseConfigInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const str = rawInput.trim();
  let obj = null;
  
  // 1. Thử parse JSON trực tiếp
  try {
    obj = JSON.parse(str);
  } catch (e) {}

  // 2. Tìm khối object { ... } trong đoạn mã JS
  if (!obj) {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const jsonStr = match[0]
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}');
        obj = JSON.parse(jsonStr);
      } catch (e) {}
    }
  }

  // 3. Tìm từng trường riêng lẻ bằng Regex
  if (!obj) {
    const extractField = (key) => {
      const reg = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
      const m = str.match(reg);
      return m ? m[1].trim() : '';
    };
    const projectId = extractField('projectId') || 'laptri-8e2b3';
    if (projectId || extractField('apiKey')) {
      obj = {
        apiKey: extractField('apiKey'),
        databaseURL: extractField('databaseURL'),
        projectId: projectId,
        authDomain: extractField('authDomain'),
        appId: extractField('appId'),
        storageBucket: extractField('storageBucket'),
        messagingSenderId: extractField('messagingSenderId'),
        measurementId: extractField('measurementId')
      };
    }
  }

  if (obj && typeof obj === 'object') {
    let pId = obj.projectId || DEFAULT_FIREBASE_CONFIG.projectId;
    if (pId === 'clblaptri') pId = 'laptri-8e2b3';
    const isMain = (pId === 'laptri-8e2b3');
    return {
      apiKey: isMain ? DEFAULT_FIREBASE_CONFIG.apiKey : (obj.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey),
      databaseURL: isMain ? DEFAULT_FIREBASE_CONFIG.databaseURL : ((obj.databaseURL && !obj.databaseURL.includes('clblaptri')) ? obj.databaseURL : `https://${pId}-default-rtdb.firebaseio.com`),
      projectId: pId,
      authDomain: `${pId}.firebaseapp.com`,
      storageBucket: `${pId}.firebasestorage.app`,
      messagingSenderId: obj.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: obj.appId || DEFAULT_FIREBASE_CONFIG.appId,
      measurementId: obj.measurementId || DEFAULT_FIREBASE_CONFIG.measurementId
    };
  }

  return null;
}

// Cấu hình Firebase mặc định của dự án laptri-8e2b3 (CLB CẦU LÔNG LẬP TRÍ)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAQ08HDY7wi9jQnhTH7mHkoavdRzIas-lA",
  authDomain: "laptri-8e2b3.firebaseapp.com",
  databaseURL: "https://laptri-8e2b3-default-rtdb.firebaseio.com",
  projectId: "laptri-8e2b3",
  storageBucket: "laptri-8e2b3.firebasestorage.app",
  messagingSenderId: "324734150204",
  appId: "1:324734150204:web:6aa6524fa6cdabe8cfc539",
  measurementId: "G-6HK3TLY2HW"
};

function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && typeof cfg === 'object') {
        let pId = cfg.projectId || DEFAULT_FIREBASE_CONFIG.projectId;
        if (pId === 'clblaptri') pId = 'laptri-8e2b3';
        const isMain = (pId === 'laptri-8e2b3');
        const merged = {
          apiKey: isMain ? DEFAULT_FIREBASE_CONFIG.apiKey : (cfg.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey),
          authDomain: `${pId}.firebaseapp.com`,
          databaseURL: isMain ? DEFAULT_FIREBASE_CONFIG.databaseURL : ((cfg.databaseURL && !cfg.databaseURL.includes('clblaptri')) ? cfg.databaseURL : `https://${pId}-default-rtdb.firebaseio.com`),
          projectId: pId,
          storageBucket: `${pId}.firebasestorage.app`,
          messagingSenderId: cfg.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
          appId: cfg.appId || DEFAULT_FIREBASE_CONFIG.appId,
          measurementId: cfg.measurementId || DEFAULT_FIREBASE_CONFIG.measurementId
        };
        try { localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
        return merged;
      }
    }
  } catch (e) {}
  try { localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_FIREBASE_CONFIG)); } catch (e) {}
  return DEFAULT_FIREBASE_CONFIG;
}

let cloudInitTimeout = null;

// ==========================================
// CÁC HÀM QUẢN LÝ KHÓA TRUY CẬP KHI MẤT KẾT NỐI THỜI GIAN THỰC 2 CHIỀU
// (CHỈ LƯU TRỮ & ĐỒNG BỘ ONLINE - NGĂN CHẶN NHẬP LIỆU TRÊN TẤT CẢ TÀI KHOẢN)
// ==========================================
function showRealtimeConnectingBlocker(statusText = 'Đang kết nối...') {
  // Không chặn màn hình người dùng
}

function showRealtimeOfflineBlocker(reason = '', statusText = '') {
  // Không chặn màn hình người dùng, dữ liệu tự lưu local và sync khi có mạng
}

function hideRealtimeOfflineBlocker() {
  const modal = document.getElementById('realtimeOfflineBlockerModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function retryRealtimeConnection() {
  hideRealtimeOfflineBlocker();
  updateCloudSyncUI('CONNECTING', 'Đang kết nối lại Google Firebase...');
  showToast('🔄 Đang kết nối lại máy chủ Google Firebase...', 'info', 3000);

  if (firebaseDb && firebase.database) {
    try { firebase.database().goOnline(); } catch (e) {}
  }
  if (typeof initFirebaseCloudSync === 'function') {
    initFirebaseCloudSync();
  }
  if (firebaseDb) {
    const activeClub = getActiveClub();
    const activeSlug = activeClub?.accessSlug || activeClub?.id || 'lap-tri';
    subscribeToCloudClub(activeSlug);
  }
}

function openCloudSyncModalFromBlocker() {
  hideRealtimeOfflineBlocker();
  const modal = document.getElementById('modalCloudSync');
  if (modal) {
    modal.classList.remove('hidden');
  }
  const input = document.getElementById('cloudFirebaseConfigInput');
  const stored = getStoredFirebaseConfig();
  if (input) {
    input.value = stored ? JSON.stringify(stored, null, 2) : '';
  }
}

function assertRealtimeOnlineConnected(actionDesc = 'thao tác') {
  if (!isCloudActuallyConnected && typeof navigator !== 'undefined' && !navigator.onLine) {
    showToast(`📶 Đang offline: Thao tác ${actionDesc} đã lưu tạm và sẽ tự đồng bộ khi có mạng.`, 'info', 3000);
  }
  return true; // Luôn cho phép thao tác thông suốt!
}

function updateCloudSyncUI(status, message = '') {
  const badge = document.getElementById('headerCloudSyncBadge');
  const dot = document.getElementById('cloudSyncDot');
  const ping = document.getElementById('cloudSyncPing');
  const text = document.getElementById('cloudSyncText');
  const modalBadge = document.getElementById('modalCloudStatusBadge');
  const settingsBadge = document.getElementById('settingsCloudStatusBadge');
  const bannerIcon = document.getElementById('cloudStatusIcon');
  const bannerTitle = document.getElementById('cloudStatusTitle');
  const bannerDesc = document.getElementById('cloudStatusDesc');

  let dotColor = 'bg-emerald-500';
  let badgeText = 'Đang kiểm tra...';
  let badgeClass = 'bg-slate-100 text-slate-800 border border-slate-300';
  let icon = '⚡';
  let title = 'Bộ nhớ máy cục bộ';
  let desc = 'Đang kết nối đám mây online...';
  let headerTitle = 'Đang kiểm tra kết nối thời gian thực...';
  let headerBadgeClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 shadow-2xs';
  let showPing = false;
  let pingColor = 'bg-emerald-400';

  if (status === 'CONNECTED') {
    // 🟢 TRẠNG THÁI KẾT NỐI: Chấm xanh lá phát sáng & Mở khóa thao tác toàn bộ
    isCloudActuallyConnected = true;
    hideRealtimeOfflineBlocker();

    dotColor = 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse';
    badgeText = 'Đã kết nối';
    badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    icon = '🟢';
    title = 'Đã kết nối Google Firebase (Online 100%)';
    desc = 'Hệ thống đang kết nối trực tiếp đến Google Firebase laptri-8e2b3. Tất cả thay đổi sẽ đồng bộ tức thì.';
    headerTitle = 'Đám mây: Đã kết nối (Online 100%): Trực tiếp Google Firebase laptri-8e2b3';
    headerBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs';
    showPing = true;
    pingColor = 'bg-emerald-400';
  } else if (status === 'SYNCING') {
    // 🟡 TRẠNG THÁI ĐANG ĐỒNG BỘ: Chấm vàng quay
    hideRealtimeOfflineBlocker();

    dotColor = 'bg-amber-500 animate-spin';
    badgeText = 'Đang lưu...';
    badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
    icon = '🟡';
    title = 'Đang đẩy dữ liệu lên đám mây...';
    desc = 'Đang cập nhật lên máy chủ Google Firebase laptri-8e2b3.';
    headerTitle = 'Đang đẩy dữ liệu lên Google Firebase laptri-8e2b3...';
    headerBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs';
    showPing = true;
    pingColor = 'bg-amber-400';
  } else if (status === 'CONNECTING') {
    // 🔵 TRẠNG THÁI ĐANG KẾT NỐI: Chấm xanh dương nhấp nháy
    dotColor = 'bg-sky-500 animate-pulse';
    badgeText = 'Đang kết nối...';
    badgeClass = 'bg-sky-100 text-sky-800 border border-sky-300';
    icon = '🔵';
    title = 'Đang kết nối đám mây...';
    desc = message || 'Đang kết nối Google Firebase laptri-8e2b3 trong nền.';
    headerTitle = 'Đang kiểm tra kết nối Google Firebase laptri-8e2b3...';
    headerBadgeClass = 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs';
    showPing = true;
    pingColor = 'bg-sky-400';
  } else if (status === 'LOCAL_READY') {
    // ⚡ TRẠNG THÁI BỘ NHỚ THIẾT BỊ SẴN SÀNG
    dotColor = 'bg-teal-500';
    badgeText = 'Sẵn sàng';
    badgeClass = 'bg-teal-100 text-teal-800 border border-teal-300';
    icon = '⚡';
    title = 'Bộ nhớ thiết bị sẵn sàng';
    desc = message || 'Hệ thống đang chuẩn bị kết nối dữ liệu online với Google Firebase...';
    headerTitle = 'Bộ nhớ thiết bị sẵn sàng - Đang kết nối Google Firebase';
    headerBadgeClass = 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs';
    showPing = false;
  } else if (status === 'PERMISSION_DENIED') {
    // ⚠️ TRẠNG THÁI BỊ CHẶN QUYỀN GHI
    isCloudActuallyConnected = false;

    dotColor = 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
    badgeText = 'Chưa mở Rules';
    badgeClass = 'bg-amber-100 text-amber-900 border border-amber-300';
    icon = '⚠️';
    title = 'Chưa cấp quyền ghi Firebase (PERMISSION_DENIED)';
    desc = 'Firebase đang chặn quyền ghi. Vui lòng mở tab Rules trên Firebase Console và đổi .write: true để đồng bộ online.';
    headerTitle = 'Đám mây: Bị chặn quyền ghi (PERMISSION_DENIED). Bấm để xem hướng dẫn mở Rules!';
    headerBadgeClass = 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs hover:bg-amber-100 cursor-pointer';
    showPing = true;
    pingColor = 'bg-amber-400';
  } else {
    // 🔴 TRẠNG THÁI MẤT KẾT NỐI HOẶC 🔄 ĐANG TỰ ĐỘNG KẾT NỐI LẠI
    isCloudActuallyConnected = false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showRealtimeOfflineBlocker(message || 'Mất kết nối thời gian thực 2 chiều', 'Trạng thái: Đã ngắt kết nối với máy chủ Google Firebase');

      dotColor = 'bg-rose-500 shadow-[0_0_6px_#f43f5e]';
      badgeText = 'Mất mạng';
      badgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
      icon = '🔴';
      title = 'Thiết bị mất mạng Internet';
      desc = message || 'Không có kết nối Internet. Dữ liệu đang được lưu an toàn trên máy.';
      headerTitle = 'Đám mây: Thiết bị mất mạng Internet';
      headerBadgeClass = 'bg-rose-50/80 text-rose-700 border-rose-300 shadow-2xs hover:bg-rose-100 cursor-pointer';
      showPing = false;
    } else {
      // Thiết bị vẫn có mạng: hiển thị đang kết nối lại, không chặn và không báo đỏ dọa người dùng
      dotColor = 'bg-sky-500 animate-pulse';
      badgeText = 'Đang đồng bộ';
      badgeClass = 'bg-sky-100 text-sky-800 border border-sky-300';
      icon = '🔄';
      title = 'Đang đồng bộ đám mây...';
      desc = message || 'Đang kết nối lại máy chủ Google Firebase (laptri-8e2b3)...';
      headerTitle = 'Đang đồng bộ Google Firebase (laptri-8e2b3)...';
      headerBadgeClass = 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs hover:bg-sky-100 cursor-pointer';
      showPing = true;
      pingColor = 'bg-sky-400';
    }
  }

  // 1. Giữ lại Biểu tượng Đám mây Header [ ☁️ 🟢 ] (Hiện trạng thái kết nối, bấm để xem chi tiết)
  if (badge) {
    badge.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 select-none transition cursor-pointer hover:opacity-90 ${headerBadgeClass}`;
    badge.style.display = 'flex';
    badge.onclick = () => { if (typeof openCloudSyncModal === 'function') openCloudSyncModal(); };
    badge.title = headerTitle;
  }
  if (ping) {
    ping.className = showPing ? `animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75` : 'hidden';
  }
  if (dot) {
    dot.className = `relative inline-flex rounded-full h-2 w-2 ${dotColor}`;
  }
  if (text) {
    text.className = 'hidden'; // Luôn ẩn dòng chữ thông tin, chỉ để lại biểu tượng [ ☁️ 🟢 ]
    text.textContent = badgeText;
  }
  if (modalBadge) {
    modalBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`;
    modalBadge.textContent = badgeText;
  }
  // 2. Trạng thái Đám mây: Hiển thị nổi bật, rõ ràng trong tab Cấu hình & Sao lưu
  if (settingsBadge) {
    settingsBadge.className = `flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold ${badgeClass}`;
    settingsBadge.innerHTML = `<span class="relative flex h-2.5 w-2.5 shrink-0">${showPing ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75"></span>` : ''}<span class="relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}"></span></span><span>${title}</span>`;
  }
  if (bannerIcon) bannerIcon.textContent = icon;
  if (bannerTitle) bannerTitle.textContent = title;
  if (bannerDesc) bannerDesc.textContent = desc;
}

function initFirebaseCloudSync() {
  // 1. Kiểm tra tham số cloud_cfg trên URL (khi mở link từ Zalo trên điện thoại)
  try {
    const url = new URL(window.location.href);
    const cloudCfgParam = url.searchParams.get('cloud_cfg');
    if (cloudCfgParam) {
      try {
        const decoded = decodeURIComponent(escape(atob(cloudCfgParam)));
        const parsed = JSON.parse(decoded);
        if (parsed && (parsed.databaseURL || parsed.projectId)) {
          localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(parsed));
          showToast('🎉 Đã kích hoạt đồng bộ đám mây tự động theo link!', 'success');
        }
      } catch (e) {
        console.error('Lỗi giải mã cloud_cfg:', e);
      }
      url.searchParams.delete('cloud_cfg');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) {}

  // 2. Kiểm tra thư viện Firebase SDK - nếu chưa tải xong, tự động thử lại (liên tục thử lại trên mạng di động)
  if (typeof firebase === 'undefined' || typeof firebase.database === 'undefined') {
    if (!window._firebaseRetryCount) window._firebaseRetryCount = 0;
    window._firebaseRetryCount++;
    const retryDelay = window._firebaseRetryCount < 25 ? 200 : 2000;
    setTimeout(initFirebaseCloudSync, retryDelay);
    if (window._firebaseRetryCount === 25) {
      updateCloudSyncUI('CONNECTING', 'Đang tải thư viện đồng bộ Google Firebase...');
    }
    return;
  }

  const config = getStoredFirebaseConfig();
  if (!config) {
    updateCloudSyncUI('LOCAL_READY');
    return;
  }

  try {
    updateCloudSyncUI('CONNECTING');

    // Hẹn giờ bảo vệ: Cho phép tối đa 8 giây để thiết bị hoàn tất bắt tay WebSocket với Google Firebase
    clearTimeout(cloudInitTimeout);
    cloudInitTimeout = setTimeout(() => {
      if (!isCloudActuallyConnected) {
        updateCloudSyncUI('DISCONNECTED');
      }
    }, 8000);

    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(config);
    }
    firebaseDb = firebase.database();

    // Tự động khởi tạo kết nối Firebase Auth & Lắng nghe phân quyền Multi-Tenant thời gian thực
    const club = getActiveClub();
    const clubSlug = club?.accessSlug || club?.id || 'lap-tri';
    if (firebase.auth) {
      setupFirebaseAuthAndMemberships(clubSlug);
    }

    // Theo dõi trạng thái kết nối mạng của Firebase thời gian thực
    let hasEstablishedFirstConnection = false;
    firebaseDb.ref('.info/connected').on('value', snap => {
      const isConnected = snap.val() === true;
      isCloudActuallyConnected = isConnected;
      if (isConnected) {
        hasEstablishedFirstConnection = true;
        clearTimeout(cloudInitTimeout);
        hideRealtimeOfflineBlocker();
        updateCloudSyncUI('CONNECTED');
      } else {
        if (hasEstablishedFirstConnection) {
          updateCloudSyncUI('DISCONNECTED');
        }
      }
    });

    // Bắt sự kiện mạng của thiết bị (mất mạng / có mạng trở lại / chuyển đổi tab / mở khóa màn hình điện thoại)
    if (!window._networkOnlineOfflineAttached) {
      window._networkOnlineOfflineAttached = true;

      window.addEventListener('online', () => {
        if (firebaseDb && firebase.database) {
          try { firebase.database().goOnline(); } catch (e) {}
        }
        updateCloudSyncUI('CONNECTING', 'Thiết bị đã có mạng trở lại, đang kết nối đám mây...');
        if (!firebaseDb) {
          initFirebaseCloudSync();
        } else {
          const activeClub = getActiveClub();
          const activeSlug = activeClub?.accessSlug || activeClub?.id || 'lap-tri';
          subscribeToCloudClub(activeSlug);
        }
      });

      window.addEventListener('offline', () => {
        isCloudActuallyConnected = false;
        if (firebaseDb && firebase.database) {
          try { firebase.database().goOffline(); } catch (e) {}
        }
        updateCloudSyncUI('DISCONNECTED', 'Thiết bị mất kết nối mạng. Dữ liệu đang lưu an toàn trên máy.');
      });

      // Tự động khôi phục kết nối WebSocket thời gian thực khi người dùng quay lại tab hoặc mở khóa màn hình điện thoại
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (firebaseDb && firebase.database) {
            try { firebase.database().goOnline(); } catch (e) {}
          }
          if (!isCloudActuallyConnected && firebaseDb) {
            updateCloudSyncUI('CONNECTING', 'Đang khôi phục phiên thời gian thực...');
            const activeClub = getActiveClub();
            const activeSlug = activeClub?.accessSlug || activeClub?.id || 'lap-tri';
            subscribeToCloudClub(activeSlug);
          } else if (!firebaseDb) {
            initFirebaseCloudSync();
          }
        }
      });

      // Watchdog định kỳ mỗi 20 giây: Nếu thiết bị có mạng (navigator.onLine) nhưng kết nối đám mây bị ngắt hoặc chưa khởi tạo, tự động kích hoạt lại
      setInterval(() => {
        if (navigator.onLine && (!isCloudActuallyConnected || !firebaseDb)) {
          if (firebaseDb && firebase.database) {
            try { firebase.database().goOnline(); } catch (e) {}
          }
          const activeClub = getActiveClub();
          const activeSlug = activeClub?.accessSlug || activeClub?.id || 'lap-tri';
          if (firebaseDb) {
            subscribeToCloudClub(activeSlug);
          } else {
            initFirebaseCloudSync();
          }
        }
      }, 20000);
    }

    // Bắt đầu lắng nghe thay đổi của CLB hiện tại
    subscribeToCloudClub(clubSlug);
  } catch (err) {
    console.warn('Firebase không thể khởi tạo, tiếp tục chế độ bộ nhớ máy siêu tốc:', err);
    updateCloudSyncUI('DISCONNECTED');
  }
}

function getCanonicalClubSlug(slugOrId) {
  let s = (slugOrId || 'lap-tri').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (['club_laptri', 'club-laptri', 'smash', 'club_smash', 'club-smash', 'laptri', 'club_smash_data_v1'].includes(s)) {
    return 'lap-tri';
  }
  return s || 'lap-tri';
}

// ==========================================
// HỆ THỐNG QUẢN LÝ TÀI KHOẢN FIREBASE AUTH & PHÂN QUYỀN REAL-TIME (MEMBERSHIPS)
// ==========================================
let currentFirebaseUser = null;
let currentMembershipRef = null;

function setupFirebaseAuthAndMemberships(clubSlug) {
  if (typeof firebase === 'undefined' || !firebase.auth) return;
  const cleanSlug = getCanonicalClubSlug(clubSlug || getActiveClub()?.accessSlug || 'lap-tri');

  firebase.auth().onAuthStateChanged(fbUser => {
    currentFirebaseUser = fbUser;
    if (fbUser) {
      // 1. Kiểm tra tài khoản Nhà Phát Triển (Super Admin) trong system/developers
      if (firebaseDb) {
        firebaseDb.ref('system/developers/' + fbUser.uid).once('value', snap => {
          if (snap.val() === true) {
            if (!AppState.auth) AppState.auth = {};
            AppState.auth.isLoggedIn = true;
            AppState.auth.user = {
              id: fbUser.uid,
              username: 'developer',
              role: 'DEV_ADMIN',
              name: 'Admin Nhà Phát Triển (Super Admin)',
              permissions: getRoleDefaultPermissions('DEV_ADMIN')
            };
            saveLocalDataOnly();
            updateDevAdminUI();
            renderAuthBadge();
            updateNavigationUI();
          }
        });
      }

      // 2. Lắng nghe real-time quyền trong CLB hiện tại từ memberships/{clubId}/{UID}
      attachLiveMembershipListener(cleanSlug, fbUser.uid);
    } else {
      // Tự động đăng nhập ẩn danh (Anonymous Auth) để đảm bảo luôn vượt qua Rules auth != null khi chưa đăng nhập
      firebase.auth().signInAnonymously().catch(authErr => {
        console.log('Firebase Auth anonymous notice:', authErr?.message || authErr);
      });
    }
  });
}

function attachLiveMembershipListener(clubSlug, uidOrUsername) {
  if (!firebaseDb || !uidOrUsername) return;
  const cleanSlug = getCanonicalClubSlug(clubSlug);

  if (currentMembershipRef) {
    try { currentMembershipRef.off(); } catch (e) {}
  }

  currentMembershipRef = firebaseDb.ref('memberships/' + cleanSlug + '/' + uidOrUsername);
  currentMembershipRef.on('value', snap => {
    const memData = snap.val();
    if (memData) {
      applyLiveMembership(memData);
    } else if (AppState.auth?.user?.username) {
      firebaseDb.ref('memberships/' + cleanSlug + '/' + AppState.auth.user.username).once('value', s => {
        if (s.val()) applyLiveMembership(s.val());
      });
    }
  });
}

function applyLiveMembership(memData) {
  if (!memData || !memData.role) return;
  if (!AppState.auth) AppState.auth = { isLoggedIn: true, user: {} };

  const oldRole = AppState.auth.user?.role;
  const newRole = memData.role;
  const newPerms = memData.permissions || getRoleDefaultPermissions(newRole);

  AppState.auth.isLoggedIn = true;
  if (!AppState.auth.user) AppState.auth.user = {};
  AppState.auth.user.role = newRole;
  AppState.auth.user.permissions = newPerms;
  if (memData.name) AppState.auth.user.name = memData.name;

  saveLocalDataOnly();
  renderAuthBadge();
  updateNavigationUI();
  renderAttendanceRoleBanner();
  renderSelfAttendanceBanner();
  renderActivityMemberChips();

  // Đẩy ra khỏi tab cấm nếu vừa bị tước quyền theo thời gian thực (Real-time Tab Eviction)
  if (currentTab === 'finance' && !canPerformFinance()) {
    switchTab('dashboard');
    showToast('⚠️ Quyền hạn của bạn vừa được cập nhật: Bạn không có quyền truy cập tab Tài chính.', 'warning');
  } else if (currentTab === 'settings' && !canConfigSystem()) {
    switchTab('dashboard');
    showToast('⚠️ Quyền hạn của bạn vừa được cập nhật: Bạn không có quyền truy cập Cấu hình hệ thống.', 'warning');
  } else if (oldRole && oldRole !== newRole) {
    const roleDef = ROLE_DEFINITIONS[newRole] || ROLE_DEFINITIONS.MEMBER;
    showToast(`🔔 Vai trò của bạn đã được cập nhật: ${roleDef.icon} ${roleDef.label}!`, 'info');
  }
}

function subscribeToCloudClub(clubSlug) {
  if (!firebaseDb) return;
  const cleanSlug = getCanonicalClubSlug(clubSlug);

  // Gắn lại listener phân quyền membership cho CLB mới
  if (currentFirebaseUser) {
    attachLiveMembershipListener(cleanSlug, currentFirebaseUser.uid);
  }

  // Hủy đăng ký CLB cũ nếu có
  if (currentCloudClubRef) {
    try { currentCloudClubRef.off(); } catch (e) {}
  }
  if (window._currentLiveSessionRef) {
    try { window._currentLiveSessionRef.off(); } catch (e) {}
  }

  currentCloudSlug = cleanSlug;
  currentCloudClubRef = firebaseDb.ref('clubs/' + cleanSlug);

  // Lắng nghe trực tiếp phiên điểm danh thời gian thực để phản hồi dưới 100ms trên mọi thiết bị
  window._currentLiveSessionRef = firebaseDb.ref('clubs/' + cleanSlug + '/attendance/currentSession');
  window._currentLiveSessionRef.on('value', liveSnap => {
    const liveSes = liveSnap.val();
    if (liveSes && !isSyncingToCloud) {
      AppState.currentSession = liveSes;
      applyLiveSessionFromCloud(liveSes);
    }
  });

  currentCloudClubRef.on('value', snapshot => {
    isCloudActuallyConnected = true;
    clearTimeout(cloudInitTimeout);
    hideRealtimeOfflineBlocker();
    updateCloudSyncUI('CONNECTED');

    const cloudData = snapshot.val();
    if (!cloudData) {
      if (AppState && AppState.members && AppState.members.length > 0 && !isSyncingToCloud) {
        pushDataToCloud();
      }
      return;
    }

    applyCloudSnapshotToAppState(cloudData, cleanSlug, false);
  }, err => {
    console.warn('Lỗi lắng nghe Firebase, chuyển sang chế độ bộ nhớ máy:', err);
    if (err && (err.code === 'PERMISSION_DENIED' || String(err).includes('permission_denied'))) {
      updateCloudSyncUI('PERMISSION_DENIED');
      showToast('⚠️ Firebase: Quyền truy cập bị từ chối (PERMISSION_DENIED). Cần cấu hình Rules trên Firebase Console!', 'warning', 8000);
    } else {
      updateCloudSyncUI('LOCAL_READY');
    }
  });
}

function applyCloudSnapshotToAppState(cloudData, cleanSlug, isForcedSync = false) {
  if (!cloudData) return;

  // Kiểm tra tự dội lại (Self-echo detection) qua timestamp để tránh ghi đè và toast lặp vô hạn
  if (!isForcedSync) {
    if (cloudData._lastModified && lastPushedTimestamp && cloudData._lastModified === lastPushedTimestamp) {
      isSyncingToCloud = false;
      updateCloudSyncUI('CONNECTED');
      return;
    }

    const incomingJson = JSON.stringify(cloudData);
    if (lastPushedCloudJson && incomingJson === lastPushedCloudJson) {
      isSyncingToCloud = false;
      updateCloudSyncUI('CONNECTED');
      return;
    }

    // BẢO VỆ AN TOÀN 1: Nếu cục bộ có thay đổi chưa đẩy được do quyền ghi bị từ chối, và phiên bản máy mới hơn đám mây
    if (window._hasUnsyncedLocalChanges && AppState._lastModified && cloudData._lastModified && AppState._lastModified > cloudData._lastModified) {
      console.warn('Dữ liệu máy cục bộ mới hơn đám mây nhưng chưa đẩy được do chặn quyền ghi. Không ghi đè.');
      setTimeout(() => { pushDataToCloud(); }, 600);
      return;
    }

    // BẢO VỆ AN TOÀN 2: Nếu đám mây trống hoặc ít hơn 3 thành viên trong khi máy cục bộ có >= 10 thành viên, không ghi đè xóa sạch
    const rawMembers = cloudData.members || [];
    if (rawMembers.length < 3 && AppState.members && AppState.members.length >= 10) {
      setTimeout(() => { pushDataToCloud(); }, 600);
      return;
    }
  }

  // Trích xuất dữ liệu đa hình (Hỗ trợ cả cây cấu trúc mới và định dạng phẳng cũ)
  let incomingConfig = cloudData.config || cloudData.profile || {};
  let rawMem = cloudData.members || [];
  let incomingMembers = Array.isArray(rawMem) ? rawMem : (rawMem && typeof rawMem === 'object' ? (rawMem.id ? [rawMem] : Object.values(rawMem)) : []);
  let incomingSessions = cloudData.attendance?.activitySessions || cloudData.activitySessions || [];
  let incomingAttRecords = cloudData.attendance?.attendanceRecords || cloudData.attendanceRecords || [];
  let incomingCurrentSession = cloudData.attendance?.currentSession || cloudData.currentSession || null;
  let incomingFunds = cloudData.wallets?.funds || cloudData.funds || {};
  let incomingClosedMonths = cloudData.wallets?.closedMonths || cloudData.closedMonths || [];
  let incomingTransactions = cloudData.transactions || [];
  let incomingTournaments = cloudData.tournaments || cloudData.tournamentData || [];
  let incomingTopUpRequests = cloudData.wallets?.topUpRequests || cloudData.topUpRequests || [];

  // Luôn đảm bảo đầy đủ 26 thành viên thực tế (22 chính thức + 4 danh dự) cho CLB Lập Trí trên mọi thiết bị
  const isMainClub = (!cleanSlug || cleanSlug === 'lap-tri' || cleanSlug === 'club_laptri');
  if (isMainClub && DEFAULT_INITIAL_DATA.members) {
    let needsPushUpdate = false;
    DEFAULT_INITIAL_DATA.members.forEach(req => {
      let found = incomingMembers.find(m => 
        (m.id && m.id === req.id) ||
        (m.username && m.username.toLowerCase() === req.username.toLowerCase()) ||
        (m.chipName && m.chipName.toUpperCase() === req.chipName.toUpperCase()) ||
        (m.name && m.name.toUpperCase() === req.name.toUpperCase())
      );
      if (!found) {
        incomingMembers.push(JSON.parse(JSON.stringify(req)));
        needsPushUpdate = true;
      } else {
        if (found.type !== req.type) {
          found.type = req.type;
          needsPushUpdate = true;
        }
        if (found.chipName !== req.chipName) {
          found.chipName = req.chipName;
          needsPushUpdate = true;
        }
      }
    });
    if (needsPushUpdate && !isSyncingToCloud) {
      setTimeout(() => { pushDataToCloud(); }, 600);
    }
  }

  // Bảo toàn mật khẩu lưu cục bộ của các thành viên hoặc cấp mặc định 123 (admin cho TNTOAN)
  incomingMembers.forEach(incMem => {
    const localMem = AppState.members && AppState.members.find(m => m.id === incMem.id || (m.username && incMem.username && m.username.toLowerCase() === incMem.username.toLowerCase()));
    if (localMem) {
      if (localMem.password) incMem.password = localMem.password;
      if (localMem.hasChangedPassword !== undefined) incMem.hasChangedPassword = localMem.hasChangedPassword;
      if (localMem.mustChangePassword !== undefined) incMem.mustChangePassword = localMem.mustChangePassword;
      if (localMem.passwordChangedAt) incMem.passwordChangedAt = localMem.passwordChangedAt;
    }
    if (!incMem.password) {
      if (incMem.username?.toLowerCase() === 'tntoan' || incMem.id === 'M001') {
        incMem.password = 'admin';
      } else {
        incMem.password = '123';
      }
      incMem.mustChangePassword = true;
      incMem.hasChangedPassword = false;
    }
  });

  const localAuth = AppState.auth;

  // Cập nhật AppState
  isReceivingFromCloud = true;
  AppState.config = { ...AppState.config, ...incomingConfig };
  if (!AppState.config.customLabels) {
    AppState.config.customLabels = Object.assign({}, DEFAULT_CUSTOM_LABELS);
  } else {
    AppState.config.customLabels = Object.assign({}, DEFAULT_CUSTOM_LABELS, AppState.config.customLabels);
  }
  AppState.members = incomingMembers;
  AppState.funds = { ...AppState.funds, ...incomingFunds };
  AppState.activitySessions = incomingSessions;
  AppState.attendanceRecords = incomingAttRecords;
  AppState.closedMonths = incomingClosedMonths;
  AppState.transactions = incomingTransactions;
  AppState.topUpRequests = incomingTopUpRequests;

  // Chuẩn hóa và làm sạch Quỹ CLB chu kỳ mới khi nhận dữ liệu từ đám mây:
  let needsPushCorrectedData = false;
  if (!AppState.closedMonths) AppState.closedMonths = [];
  if (!AppState.closedMonths.includes('2026-09')) {
    AppState.closedMonths.push('2026-09');
    needsPushCorrectedData = true;
  }
  if (!AppState.funds) AppState.funds = {};
  if (AppState.funds.carriedForwardFund === 1099986 || AppState.funds.carriedForwardFund === '1099986' || !AppState.funds.carriedForwardFund) {
    AppState.funds.carriedForwardFund = 4400000;
    AppState.funds.carriedForwardFromMonth = '09/2026';
    needsPushCorrectedData = true;
  }
  if (AppState.funds.advanceFund !== 0 || AppState.funds.shuttleAdvanceFund !== 0) {
    AppState.funds.advanceFund = 0;
    AppState.funds.shuttleAdvanceFund = 0;
    AppState.funds.courtAdvanceFund = 0;
    AppState.funds.guestAdvanceIncome = 0;
    AppState.funds.shuttlePaidTotal = 0;
    AppState.funds.courtPaidTotal = 0;
    needsPushCorrectedData = true;
  }
  if (AppState.funds.clubFund !== 6700000) {
    AppState.funds.clubFund = 6700000;
    needsPushCorrectedData = true;
  }
  if (needsPushCorrectedData && !isSyncingToCloud) {
    setTimeout(() => { pushDataToCloud(); }, 800);
  }
  if (incomingCurrentSession) {
    AppState.currentSession = incomingCurrentSession;
    applyLiveSessionFromCloud(incomingCurrentSession);
  } else {
    if (AppState.currentSession) {
      delete AppState.currentSession;
      const clubId = getActiveClubId();
      localStorage.removeItem('CLB_SESSION_' + clubId);
      const savedSes = (incomingSessions || []).find(s => s.date === activityState.date);
      if (savedSes) {
        activityState.isEditingAttendance = false;
        activityState.isEditingFinalizedSession = false;
        activityState.temporaryAttendanceSaved = false;
      }
    }
  }
  if (localAuth) AppState.auth = localAuth;

  STORAGE_KEY = getCurrentClubStorageKey();
  saveLocalDataOnly();

  // 1. Áp dụng phiên điểm danh đang diễn ra (nếu có trên đám mây)
  if (incomingCurrentSession) {
    applyLiveSessionFromCloud(incomingCurrentSession);
  }

  // 2. Đồng bộ dữ liệu giải đấu (nếu có trên đám mây)
  if (incomingTournaments && Array.isArray(incomingTournaments) && incomingTournaments.length > 0) {
    TournamentState.tournaments = incomingTournaments;
    try {
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(TournamentState.tournaments));
    } catch (e) {}
  }

  // 3. Tính toán lại số dư ví và chi phí toàn bộ thành viên
  refreshAllMembersWalletBreakdown();

  // 4. Áp dụng màu giao diện và tên CLB
  applyThemeColor(AppState.config?.themeColor || 'emerald');
  const nameEl = document.getElementById('headerClubName');
  if (nameEl) nameEl.textContent = AppState.config?.clubName || 'CLB CẦU LÔNG';

  // 5. Cập nhật giao diện các màn hình đang mở
  applyCustomLabels();
  renderDashboard();
  renderMemberManagementList();
  renderFinanceTab();
  renderClubSwitcher();
  populateLeadershipSelects();
  renderTopUpBadges();

  if (currentTab === 'attendance') {
    renderAttendanceTab();
  } else if (currentTab === 'tournament') {
    renderTournamentModule();
  } else if (currentTab === 'settings') {
    renderSettingsTab();
  }

  isCloudActuallyConnected = true;
  clearTimeout(cloudInitTimeout);
  updateCloudSyncUI('CONNECTED');

  const now = Date.now();
  if (!window._lastCloudToastTime) window._lastCloudToastTime = 0;
  if (window._hasReceivedFirstCloudSnapshot && (now - window._lastCloudToastTime > 10000)) {
    window._lastCloudToastTime = now;
    showToast(`☁️ Dữ liệu đã cập nhật theo thời gian thực (${AppState.members?.length || 0} thành viên)!`, 'info');
  }
  window._hasReceivedFirstCloudSnapshot = true;
  setTimeout(() => { isReceivingFromCloud = false; }, 350);
}

async function ensureOnlineDataOnLogin(clubSlug, loggedInUser = null) {
  const cleanSlug = getCanonicalClubSlug(clubSlug || getActiveClub()?.accessSlug || getActiveClub()?.id || 'lap-tri');
  
  // 1. Đảm bảo kích hoạt Firebase RTDB trực tuyến
  if (typeof firebase !== 'undefined' && firebase.database) {
    try { firebase.database().goOnline(); } catch (e) {}
  }

  if (!firebaseDb) {
    initFirebaseCloudSync();
  }

  // 2. Thiết lập lắng nghe Real-time ngay lập tức
  subscribeToCloudClub(cleanSlug);

  // 3. Tải ngay snapshot mới nhất trực tiếp từ đám mây (Online 100%)
  if (firebaseDb) {
    updateCloudSyncUI('CONNECTING', 'Đang tải dữ liệu online mới nhất từ Google Firebase...');
    try {
      const snapPromise = firebaseDb.ref('clubs/' + cleanSlug).once('value');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4500));
      const snap = await Promise.race([snapPromise, timeoutPromise]);
      const cloudData = snap.val();
      if (cloudData) {
        applyCloudSnapshotToAppState(cloudData, cleanSlug, true);
        isCloudActuallyConnected = true;
        updateCloudSyncUI('CONNECTED');
        showToast('🟢 Đã kết nối Google Firebase: Đang sử dụng 100% dữ liệu Online mới nhất!', 'success', 3500);
      } else {
        // Đám mây chưa có dữ liệu CLB này -> Đẩy dữ liệu hiện tại lên
        pushDataToCloud();
        isCloudActuallyConnected = true;
        updateCloudSyncUI('CONNECTED');
      }
    } catch (err) {
      console.warn('ensureOnlineDataOnLogin notice:', err?.message || err);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        isCloudActuallyConnected = true;
        updateCloudSyncUI('CONNECTED');
      } else {
        updateCloudSyncUI('LOCAL_READY');
      }
    }
  }
}

function pushDataToCloud() {
  if (!firebaseDb) return;
  if (isReceivingFromCloud) {
    clearTimeout(cloudSyncDebounceTimer);
    cloudSyncDebounceTimer = setTimeout(pushDataToCloud, 400);
    return;
  }
  const club = getActiveClub();
  const cleanSlug = getCanonicalClubSlug(club?.accessSlug || club?.id || 'lap-tri');

  clearTimeout(cloudSyncDebounceTimer);
  cloudSyncDebounceTimer = setTimeout(() => {
    if (!firebaseDb) return;
    if (isReceivingFromCloud) {
      cloudSyncDebounceTimer = setTimeout(pushDataToCloud, 400);
      return;
    }
    isSyncingToCloud = true;
    updateCloudSyncUI('SYNCING');

    const now = Date.now();
    lastPushedTimestamp = now;
    AppState._lastModified = now;

    // Gắn phiên hoạt động trực tiếp đang diễn ra (nếu có)
    if (typeof activityState !== 'undefined' && activityState.date) {
      const clubId = getActiveClubId();
      const rawSession = localStorage.getItem('CLB_SESSION_' + clubId);
      if (rawSession) {
        try { AppState.currentSession = JSON.parse(rawSession); } catch (e) {}
      }
    }

    // Gắn dữ liệu giải đấu (nếu có)
    if (TournamentState.tournaments && TournamentState.tournaments.length > 0) {
      AppState.tournamentData = TournamentState.tournaments;
    }

    // Đồng bộ toàn bộ thông tin thành viên (bao gồm thông tin đăng nhập, ví và phân quyền) lên cơ sở dữ liệu chính
    const cloudMembers = (AppState.members || []).map(m => ({ ...m }));

    // Cấu trúc phân nhánh chuẩn theo kiến trúc Multi-Tenant
    const cloudClubPayload = {
      profile: {
        id: club?.id || 'club_' + cleanSlug,
        name: AppState.config?.clubName || club?.name || 'CLB CẦU LÔNG',
        shortName: club?.shortName || 'CLB',
        accessSlug: cleanSlug,
        logoIcon: club?.logoIcon || '🏸',
        themeColor: AppState.config?.themeColor || 'emerald',
        bankInfo: AppState.config?.bankInfo || '',
        createdAt: club?.createdAt || getFormattedCurrentDate()
      },
      config: AppState.config || {},
      members: cloudMembers,
      attendance: {
        activitySessions: AppState.activitySessions || [],
        attendanceRecords: AppState.attendanceRecords || [],
        currentSession: AppState.currentSession || null
      },
      wallets: {
        funds: AppState.funds || {},
        closedMonths: AppState.closedMonths || [],
        topUpRequests: AppState.topUpRequests || []
      },
      transactions: AppState.transactions || [],
      topUpRequests: AppState.topUpRequests || [],
      tournaments: TournamentState.tournaments || AppState.tournamentData || [],
      // Thuộc tính tương thích ngược cho các client cũ
      funds: AppState.funds || {},
      activitySessions: AppState.activitySessions || [],
      attendanceRecords: AppState.attendanceRecords || [],
      tournamentData: TournamentState.tournaments || AppState.tournamentData || [],
      currentSession: AppState.currentSession || null,
      closedMonths: AppState.closedMonths || [],
      _lastModified: now
    };

    lastPushedCloudJson = JSON.stringify(cloudClubPayload);

    let pushResolved = false;
    const safetyTimeout = setTimeout(() => {
      if (!pushResolved) {
        isSyncingToCloud = false;
        updateCloudSyncUI('CONNECTED');
      }
    }, 3500);

    firebaseDb.ref('clubs/' + cleanSlug).set(cloudClubPayload)
      .then(() => {
        pushResolved = true;
        clearTimeout(safetyTimeout);
        isSyncingToCloud = false;
        window._hasUnsyncedLocalChanges = false;
        updateCloudSyncUI('CONNECTED');
      })
      .catch(err => {
        pushResolved = true;
        clearTimeout(safetyTimeout);
        isSyncingToCloud = false;
        console.warn('Lỗi đẩy dữ liệu lên Firebase, giữ dữ liệu cục bộ:', err);
        if (err && (err.code === 'PERMISSION_DENIED' || String(err).includes('permission_denied'))) {
          window._hasUnsyncedLocalChanges = true;
          updateCloudSyncUI('PERMISSION_DENIED');
          showToast('⚠️ Không thể lưu lên đám mây: Firebase chặn quyền ghi (PERMISSION_DENIED). Cần mở tab Rules (.write: true) trên Firebase Console!', 'warning', 8000);
        } else {
          updateCloudSyncUI('LOCAL_READY');
        }
      });
  }, 300);
}

function openCloudSyncModal() {
  const modal = document.getElementById('modalCloudSync');
  if (!modal) return;

  const input = document.getElementById('cloudFirebaseConfigInput');
  const stored = getStoredFirebaseConfig();
  if (input) {
    input.value = stored ? JSON.stringify(stored, null, 2) : '';
  }

  // Tự động lưu cấu hình đầy đủ có databaseURL và apiKey
  if (stored) {
    try {
      localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {}
  }

  if (isCloudActuallyConnected || (firebaseDb && typeof navigator !== 'undefined' && navigator.onLine)) {
    isCloudActuallyConnected = true;
    updateCloudSyncUI('CONNECTED');
  } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateCloudSyncUI('OFFLINE');
  } else {
    updateCloudSyncUI('LOCAL_READY');
  }

  openModal('modalCloudSync');
}

function saveCloudConfigAndConnect() {
  const input = document.getElementById('cloudFirebaseConfigInput');
  const raw = input ? input.value.trim() : '';

  if (!raw) {
    showToast('Vui lòng dán mã cấu hình Firebase!', 'warning');
    return;
  }

  const parsed = parseFirebaseConfigInput(raw);
  if (!parsed || (!parsed.databaseURL && !parsed.projectId)) {
    showToast('Mã cấu hình không hợp lệ! Vui lòng kiểm tra lại databaseURL hoặc projectId.', 'error');
    return;
  }

  localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(parsed));
  if (input) {
    input.value = JSON.stringify(parsed, null, 2);
  }
  showToast('✓ Đã lưu cấu hình Firebase! Đang tiến hành kết nối...', 'info');

  initFirebaseCloudSync();

  setTimeout(() => {
    if (firebaseDb) {
      pushDataToCloud();
      showToast('🎉 Đã kích hoạt đồng bộ đám mây!', 'success');
    }
  }, 1000);
}

function disconnectCloudSync() {
  if (!confirm('Bạn có chắc chắn muốn ngắt kết nối đồng bộ đám mây?\nDữ liệu trên máy này vẫn sẽ được lưu trữ bình thường trong trình duyệt.')) {
    return;
  }

  if (currentCloudClubRef) {
    try { currentCloudClubRef.off(); } catch (e) {}
  }
  firebaseDb = null;
  isCloudActuallyConnected = false;
  localStorage.removeItem(CLOUD_CONFIG_STORAGE_KEY);
  updateCloudSyncUI('OFFLINE');

  const input = document.getElementById('cloudFirebaseConfigInput');
  if (input) input.value = '';

  showToast('Đã ngắt kết nối đám mây. Ứng dụng chuyển sang chế độ ngoại tuyến.', 'info');
}

function testCloudConnection() {
  const stored = getStoredFirebaseConfig();
  if (!stored) {
    showToast('Chưa có cấu hình đám mây. Vui lòng dán mã Firebase trước.', 'warning');
    return;
  }

  updateCloudSyncUI('CONNECTING');
  showToast('Đang kiểm tra kết nối & quyền đọc/ghi Google Firebase...', 'info');

  if (!firebaseDb) {
    initFirebaseCloudSync();
  }

  if (!firebaseDb) {
    updateCloudSyncUI('LOCAL_READY');
    showToast('⚠️ Không thể khởi tạo Firebase SDK. Vui lòng thử lại sau giây lát!', 'warning');
    return;
  }

  const club = getActiveClub();
  const cleanSlug = getCanonicalClubSlug(club?.accessSlug || club?.id || 'lap-tri');
  const testRef = firebaseDb.ref('clubs/' + cleanSlug + '/_healthCheck');

  let resolved = false;
  const timeout = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        updateCloudSyncUI('CONNECTED');
        showToast('🟢 Đám mây Google Firebase đang hoạt động trực tuyến!', 'success');
      } else {
        updateCloudSyncUI('LOCAL_READY');
        showToast('💡 Đám mây chưa phản hồi kịp thời. Dữ liệu đang được lưu an toàn trên bộ nhớ máy!', 'info');
      }
    }
  }, 4000);

  // Thử nghiệm thực tế bằng hành động GHI (Write Test)
  testRef.set({ testTimestamp: Date.now(), client: 'web-test' })
    .then(() => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      isCloudActuallyConnected = true;
      window._hasUnsyncedLocalChanges = false;
      updateCloudSyncUI('CONNECTED');
      showToast('🎉 Kết nối đám mây Google Firebase THÀNH CÔNG! Quyền đọc/ghi hai chiều đã mở hoàn toàn.', 'success');
      testRef.remove().catch(() => {});
      // Kéo snapshot online mới nhất từ Firebase về hoặc đẩy dữ liệu lên
      firebaseDb.ref('clubs/' + cleanSlug).once('value').then(snap => {
        const cloudData = snap.val();
        if (cloudData) {
          applyCloudSnapshotToAppState(cloudData, cleanSlug, true);
        } else {
          pushDataToCloud();
        }
      }).catch(() => {
        pushDataToCloud();
      });
    })
    .catch(err => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      console.warn('Lỗi kiểm tra quyền ghi Firebase:', err);
      if (err && (err.code === 'PERMISSION_DENIED' || String(err).includes('permission_denied'))) {
        window._hasUnsyncedLocalChanges = true;
        updateCloudSyncUI('PERMISSION_DENIED');
        showToast('⚠️ Firebase chặn quyền GHI (PERMISSION_DENIED)! Vui lòng mở tab Rules trên Firebase Console và đổi .write: true.', 'error', 9000);
      } else {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          updateCloudSyncUI('CONNECTED');
        } else {
          updateCloudSyncUI('LOCAL_READY');
        }
        showToast('⚠️ Thông báo kết nối đám mây: ' + (err.message || err), 'warning');
      }
    });
}

function copyMobileSyncUrl() {
  const stored = getStoredFirebaseConfig();
  if (!stored) {
    showToast('Vui lòng kết nối cấu hình Firebase trước khi tạo link cho điện thoại!', 'warning');
    openCloudSyncModal();
    return;
  }

  const club = getActiveClub();
  const slug = club?.accessSlug || club?.id || 'clb';
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(stored))));
  const baseUrl = window.location.href.split('#')[0].split('?')[0];
  const syncUrl = `${baseUrl}?club=${encodeURIComponent(slug)}&cloud_cfg=${encodeURIComponent(encoded)}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(syncUrl).then(() => {
      showToast('📋 Đã sao chép link đồng bộ! Hãy gửi link qua Zalo và mở trên Điện thoại để tự động kết nối.', 'success');
    }).catch(() => {
      prompt('Sao chép link đồng bộ này và gửi qua Zalo cho Điện thoại:', syncUrl);
    });
  } else {
    prompt('Sao chép link đồng bộ này và gửi qua Zalo cho Điện thoại:', syncUrl);
  }
}

function manualTriggerCloudSync() {
  const stored = getStoredFirebaseConfig();
  if (!stored) {
    showToast('Chưa kết nối đám mây. Hãy bấm "Cài đặt Kết Nối Đám Mây" trước.', 'warning');
    openCloudSyncModal();
    return;
  }

  if (!firebaseDb) {
    initFirebaseCloudSync();
  }

  showToast('Đang đồng bộ dữ liệu hai chiều...', 'info');
  pushDataToCloud();
  setTimeout(() => {
    showToast('✓ Đồng bộ đám mây hoàn tất!', 'success');
  }, 1000);
}

function copyFirebaseRulesCode() {
  const rules = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(rules).then(() => {
      showToast('📋 Đã sao chép mã Rules! Hãy mở tab Rules trên Firebase và dán (Ctrl+V) rồi bấm Publish.', 'success', 6000);
    }).catch(() => {
      prompt('Sao chép mã Rules này để dán vào tab Rules trên Firebase Console:', rules);
    });
  } else {
    prompt('Sao chép mã Rules này để dán vào tab Rules trên Firebase Console:', rules);
  }
}

// ==========================================
// 21. PHÂN HỆ BẢO MẬT, ĐỔI MẬT KHẨU LẦN ĐẦU, 1 PHIÊN ĐĂNG NHẬP, TỰ ĐỘNG SAO LƯU & SỔ CHI PHÍ CÁ NHÂN
// ==========================================

/**
 * 1. Nhận diện tài khoản Admin quản lý toàn quyền CLB (Master Admin)
 * Tài khoản này ẩn hoàn toàn trên giao diện đối với hội viên thường.
 * Các tài khoản tham gia ban quản lý (Phó nhóm, Thủ quỹ, Trọng tài) vẫn hiển thị đầy đủ giống mọi hội viên.
 */
function isClubMasterAdmin(member) {
  if (!member) return false;
  return member.role === 'ADMIN' || member.id === 'M001' || (member.username && member.username.toLowerCase() === 'tntoan') || member.isClubMasterAdmin === true;
}

/**
 * 2. Đổi mật khẩu trong lần đăng nhập đầu tiên
 */
function openFirstLoginPasswordModal(member) {
  const modal = document.getElementById('modalFirstLoginChangePassword');
  if (!modal) return;
  const nameEl = document.getElementById('firstLoginMemberName');
  if (nameEl) nameEl.textContent = member?.name || member?.username || 'Hội viên';
  const p1 = document.getElementById('firstLoginNewPassword');
  const p2 = document.getElementById('firstLoginConfirmPassword');
  if (p1) p1.value = '';
  if (p2) p2.value = '';
  openModal('modalFirstLoginChangePassword');
}

function handleFirstLoginChangePasswordSubmit(e) {
  if (e) e.preventDefault();
  const p1 = document.getElementById('firstLoginNewPassword')?.value.trim();
  const p2 = document.getElementById('firstLoginConfirmPassword')?.value.trim();

  if (!p1 || p1.length < 6) {
    showToast('⚠️ Mật khẩu mới phải có tối thiểu 6 ký tự!', 'warning');
    return;
  }
  if (p1 !== p2) {
    showToast('⚠️ Mật khẩu xác nhận không trùng khớp. Vui lòng nhập lại!', 'error');
    return;
  }
  if (p1 === '123' || p1 === '123456' || p1 === 'admin') {
    showToast('⚠️ Vui lòng không đặt lại mật khẩu mặc định (123, 123456 hoặc admin)!', 'warning');
    return;
  }

  const currentUserId = AppState.auth?.user?.id;
  const member = (AppState.members || []).find(m => m.id === currentUserId);
  if (!member) {
    showToast('Lỗi: Không tìm thấy thông tin tài khoản!', 'error');
    return;
  }

  member.password = p1;
  member.mustChangePassword = false;
  member.hasChangedPassword = true;
  member.passwordChangedAt = new Date().toISOString();
  saveData();

  // Đồng thời cập nhật mật khẩu mới vào tài khoản lưu tự động nếu đang bật ghi nhớ
  const saved = getSavedLoginCredentials();
  if (saved && (saved.username?.toLowerCase() === member.username?.toLowerCase() || saved.username?.toLowerCase() === member.name?.toLowerCase())) {
    saveLoginCredentials(member.username || saved.username, p1);
  }

  // Cập nhật mật khẩu lên Firebase Authentication nếu đang kết nối
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    try {
      firebase.auth().currentUser.updatePassword(p1).catch(() => {});
    } catch (err) {}
  }

  const modal = document.getElementById('modalFirstLoginChangePassword');
  if (modal) modal.classList.add('hidden');

  switchTab('dashboard');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderDashboard();
  renderFinanceTab();
  renderMemberManagementList();
  showToast('✓ Cập nhật mật khẩu thành công! Tài khoản của bạn đã được bảo vệ an toàn.', 'success');
}

/**
 * 3. Giới hạn 1 phiên đăng nhập duy nhất trên 1 thiết bị/trình duyệt tại 1 thời điểm
 */
const CLB_CURRENT_SESSION_KEY = 'CLB_CURRENT_SESSION_TOKEN_V1';

function checkConcurrentSession() {
  // Cho phép đa thiết bị (Điện thoại Admin, Điện thoại TV, PC) cùng xem và đồng bộ dữ liệu thời gian thực
  return;
}

/**
 * 4. Tự động sao lưu dữ liệu khi không thao tác (Đơn vị: Giây - 5, 10, 15, 30, 60... giây)
 */
let lastUserActivityTime = Date.now();
let hasBackedUpCurrentIdle = false;

function setupInactivityAutoBackup() {
  const resetActivity = () => {
    lastUserActivityTime = Date.now();
    hasBackedUpCurrentIdle = false;
  };
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetActivity, { passive: true });
  });

  // Kiểm tra thời gian không thao tác mỗi 1 giây (đơn vị giây)
  setInterval(checkInactivityBackup, 1000);
}

function onAutoBackupSettingChange(val) {
  const seconds = Number(val) || 0;
  if (!AppState.config) AppState.config = {};
  AppState.config.autoBackupIdleSeconds = seconds;
  AppState.config.autoBackupIdleMinutes = Math.round(seconds / 60);
  saveData();
  updateAutoBackupUI();
  showToast(`✓ Đã cập nhật chế độ tự động sao lưu: ${seconds > 0 ? `sau ${seconds} giây không thao tác` : 'Tắt'}`, 'success');
}

function updateAutoBackupUI() {
  const seconds = AppState.config?.autoBackupIdleSeconds !== undefined 
    ? AppState.config.autoBackupIdleSeconds 
    : (AppState.config?.autoBackupIdleMinutes ? AppState.config.autoBackupIdleMinutes * 60 : 15);

  const select = document.getElementById('configAutoBackupIdleSeconds') || document.getElementById('configAutoBackupIdleMinutes');
  if (select) select.value = String(seconds);

  const statusText = document.getElementById('autoBackupStatusText');
  const lastTimeText = document.getElementById('autoBackupLastTimeText');
  if (statusText) {
    if (seconds > 0) {
      statusText.innerHTML = `<span class="text-emerald-700 font-medium">🟢 Đang giám sát: Sẽ tự lưu sau ${seconds} giây rảnh tay</span>`;
    } else {
      statusText.innerHTML = `<span class="text-slate-400 font-medium">⚪ Đang tắt tự động sao lưu</span>`;
    }
  }
  const lastSaved = localStorage.getItem('CLB_AUTO_BACKUP_LAST_TIME');
  if (lastTimeText && lastSaved) {
    lastTimeText.textContent = `Lần lưu gần nhất: ${lastSaved}`;
  }
}

function checkInactivityBackup() {
  const seconds = AppState.config?.autoBackupIdleSeconds !== undefined 
    ? AppState.config.autoBackupIdleSeconds 
    : (AppState.config?.autoBackupIdleMinutes ? AppState.config.autoBackupIdleMinutes * 60 : 15);
  if (seconds <= 0) return;
  if (hasBackedUpCurrentIdle) return;

  const idleMs = Date.now() - lastUserActivityTime;
  if (idleMs >= seconds * 1000) {
    try {
      const nowStr = getNowTimestampString();
      const snapshot = {
        timestamp: nowStr,
        clubId: getActiveClubId(),
        clubName: AppState.config?.clubName || 'CLB',
        data: JSON.parse(JSON.stringify(AppState))
      };

      let backups = [];
      try {
        const raw = localStorage.getItem('CLB_AUTO_BACKUP_SNAPSHOTS_V1');
        if (raw) backups = JSON.parse(raw);
      } catch (e) {}

      backups.unshift(snapshot);
      if (backups.length > 5) backups = backups.slice(0, 5);

      localStorage.setItem('CLB_AUTO_BACKUP_SNAPSHOTS_V1', JSON.stringify(backups));
      localStorage.setItem('CLB_AUTO_BACKUP_LAST_TIME', nowStr);

      hasBackedUpCurrentIdle = true;
      updateAutoBackupUI();

      // Chỉ đẩy lên đám mây nếu máy có thay đổi chưa đẩy thành công (tránh spam vòng lặp)
      if (window._hasUnsyncedLocalChanges && typeof pushDataToCloud === 'function') {
        pushDataToCloud();
      }
      // Tự động sao lưu chạy nền tĩnh lặng không gây gián đoạn người dùng
    } catch (e) {
      console.warn('Lỗi tự động sao lưu rảnh tay:', e);
    }
  }
}

/**
 * 5. Sổ Chi Phí Cầu Lông Cá Nhân & Thống Kê Ví Theo Tháng
 * Công thức: Tổng chi = Chi phí thanh toán cho CLB + Chi phí cá nhân (vợt, cước, quấn cán, nước, bia, kèo, khác)
 */
const PERSONAL_EXPENSE_CATEGORIES = {
  RACKET: { label: 'Vợt', icon: '🏸', color: 'emerald', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  STRING: { label: 'Cước', icon: '🧵', color: 'blue', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  GRIP: { label: 'Quấn cán', icon: '🧻', color: 'amber', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  WATER: { label: 'Nước', icon: '🥤', color: 'cyan', bg: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  BEER: { label: 'Bia', icon: '🍺', color: 'yellow', bg: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  SIDE_MATCH: { label: 'Kèo', icon: '⚔️', color: 'rose', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
  OTHER: { label: 'Khác', icon: '📦', color: 'purple', bg: 'bg-purple-50 text-purple-800 border-purple-200' }
};

function calculateMemberMonthlySpending(memberId, monthStr) {
  const currentMonth = monthStr || (new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const member = (AppState.members || []).find(m => m.id === memberId);
  const memberName = (member?.name || '').trim().toLowerCase();

  // 1. Chi phí thanh toán cho CLB trong tháng
  let shuttleCost = 0;
  let fineCost = 0;
  let fundCost = 0;
  let courtCost = 0;

  (AppState.activitySessions || []).forEach(ses => {
    if (ses.date && ses.date.startsWith(currentMonth)) {
      const attended = (ses.members || []).find(m => m.id === memberId || (m.name && (m.name.toLowerCase().includes(memberName) || memberName.includes(m.name.toLowerCase()))));
      if (attended) {
        shuttleCost += (attended.fee !== undefined ? attended.fee : (ses.shuttleFeePerMember || 0));
      }
    }
  });

  if (shuttleCost === 0 && member) {
    const breakdown = calculateMemberWalletBreakdown(member);
    shuttleCost = breakdown.dailyShuttleCost || 0;
    fineCost = breakdown.fine || 0;
    fundCost = breakdown.clubFund || 0;
    courtCost = breakdown.courtFee || 0;
  } else {
    (AppState.transactions || []).forEach(tx => {
      if (tx.isCancelled || tx.status === 'CANCELLED') return;
      let txMonth = '';
      if (tx.date) {
        if (tx.date.includes('/')) {
          const parts = tx.date.split(' ')[0].split('/');
          if (parts.length === 3) txMonth = `${parts[2]}-${parts[1]}`;
        } else if (tx.date.includes('-')) {
          txMonth = tx.date.substring(0, 7);
        }
      }
      if (txMonth === currentMonth) {
        const isTarget = tx.memberId === memberId || 
          (tx.targetName && (tx.targetName.toLowerCase().includes(memberName) || memberName.includes(tx.targetName.toLowerCase()))) ||
          (tx.description && tx.description.toLowerCase().includes(memberName));
        if (isTarget) {
          if (tx.subType === 'FINE' || tx.type === 'FINE') {
            fineCost += Math.abs(tx.amount || tx.walletImpact || 0);
          } else if (tx.subType === 'MEM_FUND') {
            fundCost += Math.abs(tx.walletImpact || tx.amount || 0);
          } else if (tx.type === 'COURT_FEE' || tx.subType === 'COURT_ADV_IN') {
            courtCost += Math.abs(tx.walletImpact || 0);
          }
        }
      }
    });
  }

  const totalClubCosts = shuttleCost + fineCost + fundCost + courtCost;

  // 2. Chi phí cá nhân phát sinh trong tháng
  const allPersonalExpenses = AppState.personalExpenses || [];
  const memberExpenses = allPersonalExpenses.filter(p => {
    if (p.memberId !== memberId) return false;
    const pMonth = p.month || (p.date ? p.date.substring(0, 7) : '');
    return pMonth === currentMonth;
  });

  const categoryTotals = {
    RACKET: 0,
    STRING: 0,
    GRIP: 0,
    WATER: 0,
    BEER: 0,
    SIDE_MATCH: 0,
    OTHER: 0
  };

  let totalPersonalCosts = 0;
  memberExpenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    totalPersonalCosts += amt;
    if (categoryTotals[exp.category] !== undefined) {
      categoryTotals[exp.category] += amt;
    } else {
      categoryTotals.OTHER += amt;
    }
  });

  // 3. TỔNG CHI TRONG THÁNG = Chi phí CLB + Chi phí cá nhân
  const totalSpending = totalClubCosts + totalPersonalCosts;

  return {
    memberId,
    member,
    month: currentMonth,
    shuttleCost,
    fineCost,
    fundCost,
    courtCost,
    totalClubCosts,
    categoryTotals,
    totalPersonalCosts,
    totalSpending,
    items: memberExpenses
  };
}

function renderHomePersonalExpenseWidget(memberId) {
  const currentUserId = memberId || AppState.auth?.user?.id || 'M001';
  const nowMonth = new Date().toISOString().substring(0, 7);
  const data = calculateMemberMonthlySpending(currentUserId, nowMonth);

  const clubEl = document.getElementById('homeMemberClubExpense');
  const personalEl = document.getElementById('homeMemberPersonalExpense');
  const totalEl = document.getElementById('homeMemberTotalExpense');

  if (clubEl) clubEl.textContent = formatMoney(data.totalClubCosts);
  if (personalEl) personalEl.textContent = formatMoney(data.totalPersonalCosts);
  if (totalEl) totalEl.textContent = formatMoney(data.totalSpending);
}

function openAddPersonalExpenseModal(memberId) {
  const currentUserId = memberId || AppState.auth?.user?.id || 'M001';
  const modal = document.getElementById('modalAddPersonalExpense');
  if (!modal) return;

  const memSelect = document.getElementById('pexpMemberSelect');
  if (memSelect) {
    const isMemberRole = AppState.auth && AppState.auth.user && AppState.auth.user.role === 'MEMBER';
    if (isMemberRole) {
      const u = (AppState.members || []).find(m => m.id === currentUserId) || AppState.auth.user;
      memSelect.innerHTML = `<option value="${u.id}" selected>${u.chipName || u.name} (Tài khoản của bạn)</option>`;
      memSelect.disabled = true;
    } else {
      memSelect.disabled = false;
      const opts = (AppState.members || []).map(m => {
        const isSel = m.id === currentUserId ? 'selected' : '';
        return `<option value="${m.id}" ${isSel}>${m.chipName || m.name}</option>`;
      }).join('');
      memSelect.innerHTML = opts;
    }
  }

  const dateInput = document.getElementById('pexpDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().substring(0, 10);
  }

  const amtInput = document.getElementById('pexpAmount');
  if (amtInput) amtInput.value = '';

  const noteInput = document.getElementById('pexpNote');
  if (noteInput) noteInput.value = '';

  openModal('modalAddPersonalExpense');
}

function handleAddPersonalExpenseSubmit(e) {
  if (e) e.preventDefault();
  const cat = document.getElementById('pexpCategory')?.value || 'OTHER';
  const amt = Number(document.getElementById('pexpAmount')?.value) || 0;
  const dateStr = document.getElementById('pexpDate')?.value || new Date().toISOString().substring(0, 10);
  const memId = document.getElementById('pexpMemberSelect')?.value || AppState.auth?.user?.id || 'M001';
  const note = document.getElementById('pexpNote')?.value.trim() || '';

  if (amt <= 0) {
    showToast('⚠️ Vui lòng nhập số tiền chi lớn hơn 0!', 'warning');
    return;
  }

  const item = {
    id: 'PEXP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    memberId: memId,
    category: cat,
    amount: amt,
    date: dateStr,
    month: dateStr.substring(0, 7),
    note: note,
    createdAt: new Date().toISOString()
  };

  if (!AppState.personalExpenses) AppState.personalExpenses = [];
  AppState.personalExpenses.unshift(item);
  saveData();

  closeModal('modalAddPersonalExpense');
  renderHomePersonalExpenseWidget(memId);
  renderPersonalMonthlyStatsModal();

  const catDef = PERSONAL_EXPENSE_CATEGORIES[cat] || PERSONAL_EXPENSE_CATEGORIES.OTHER;
  showToast(`✓ Đã lưu khoản chi: ${catDef.icon} ${catDef.label} (${formatMoney(amt)})!`, 'success');
}

function deletePersonalExpense(id) {
  if (!id) return;
  if (!confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) return;
  if (!AppState.personalExpenses) return;

  AppState.personalExpenses = AppState.personalExpenses.filter(p => p.id !== id);
  saveData();

  renderHomePersonalExpenseWidget();
  renderPersonalMonthlyStatsModal();
  showToast('Đã xóa khoản chi.', 'info');
}

function openPersonalMonthlyStatsModal(monthStr, memberId) {
  const modal = document.getElementById('modalPersonalMonthlyStats');
  if (!modal) return;

  const currentUserId = memberId || AppState.auth?.user?.id || 'M001';
  const nowMonth = monthStr || new Date().toISOString().substring(0, 7);

  // 1. Populate month select
  const monthSelect = document.getElementById('pstatMonthSelect');
  if (monthSelect) {
    const monthSet = new Set();
    monthSet.add(nowMonth);
    (AppState.activitySessions || []).forEach(ses => {
      if (ses.date) monthSet.add(ses.date.substring(0, 7));
    });
    (AppState.personalExpenses || []).forEach(p => {
      if (p.month) monthSet.add(p.month);
      else if (p.date) monthSet.add(p.date.substring(0, 7));
    });

    const sortedMonths = Array.from(monthSet).sort().reverse();
    monthSelect.innerHTML = sortedMonths.map(m => {
      const isSel = m === nowMonth ? 'selected' : '';
      const parts = m.split('-');
      const label = parts.length === 2 ? `Tháng ${parts[1]}/${parts[0]}` : m;
      return `<option value="${m}" ${isSel}>${label}</option>`;
    }).join('');
  }

  // 2. Populate member select
  const memSelect = document.getElementById('pstatMemberSelect');
  if (memSelect) {
    const isMemberRole = AppState.auth && AppState.auth.user && AppState.auth.user.role === 'MEMBER';
    if (isMemberRole) {
      const u = (AppState.members || []).find(m => m.id === currentUserId) || AppState.auth.user;
      memSelect.innerHTML = `<option value="${u.id}" selected>${u.chipName || u.name} (Tài khoản của bạn)</option>`;
      memSelect.disabled = true;
    } else {
      memSelect.disabled = false;
      const opts = (AppState.members || []).map(m => {
        const isSel = m.id === currentUserId ? 'selected' : '';
        return `<option value="${m.id}" ${isSel}>${m.chipName || m.name}</option>`;
      }).join('');
      memSelect.innerHTML = opts;
    }
  }

  renderPersonalMonthlyStatsModal();
  openModal('modalPersonalMonthlyStats');
}

function renderPersonalMonthlyStatsModal() {
  const monthSelect = document.getElementById('pstatMonthSelect');
  const memSelect = document.getElementById('pstatMemberSelect');
  if (!monthSelect || !memSelect) return;

  const selectedMonth = monthSelect.value || new Date().toISOString().substring(0, 7);
  const selectedMemberId = memSelect.value || AppState.auth?.user?.id || 'M001';

  const data = calculateMemberMonthlySpending(selectedMemberId, selectedMonth);

  // Update Summary cards
  const clubEl = document.getElementById('pstatClubTotal');
  const personalEl = document.getElementById('pstatPersonalTotal');
  const grandEl = document.getElementById('pstatGrandTotal');

  if (clubEl) clubEl.textContent = formatMoney(data.totalClubCosts);
  if (personalEl) personalEl.textContent = formatMoney(data.totalPersonalCosts);
  if (grandEl) grandEl.textContent = formatMoney(data.totalSpending);

  // Render 7 Categories Breakdown Grid
  const catGrid = document.getElementById('pstatCategoryGrid');
  if (catGrid) {
    const catKeys = ['RACKET', 'STRING', 'GRIP', 'WATER', 'BEER', 'SIDE_MATCH', 'OTHER'];
    catGrid.innerHTML = catKeys.map(k => {
      const catDef = PERSONAL_EXPENSE_CATEGORIES[k] || PERSONAL_EXPENSE_CATEGORIES.OTHER;
      const amt = data.categoryTotals[k] || 0;
      const percent = data.totalPersonalCosts > 0 ? Math.round((amt / data.totalPersonalCosts) * 100) : 0;
      return `
        <div class="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-700 flex items-center gap-1">${catDef.icon} ${catDef.label}</span>
            <span class="text-[10px] text-slate-400 font-mono font-bold">${percent}%</span>
          </div>
          <div class="mt-1 text-xs font-black text-slate-900">${formatMoney(amt)}</div>
        </div>
      `;
    }).join('');
  }

  // Render Expense Table Body
  const tbody = document.getElementById('pstatExpenseTableBody');
  const countBadge = document.getElementById('pstatExpenseCountBadge');
  if (countBadge) countBadge.textContent = `${data.items.length} khoản chi`;

  if (tbody) {
    if (data.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">Chưa có khoản chi cá nhân nào trong tháng này. Bấm [Thêm chi phí] để bắt đầu ghi chép!</td></tr>`;
    } else {
      tbody.innerHTML = data.items.map(item => {
        const catDef = PERSONAL_EXPENSE_CATEGORIES[item.category] || PERSONAL_EXPENSE_CATEGORIES.OTHER;
        let dateFormatted = item.date || '';
        if (dateFormatted.includes('-')) {
          dateFormatted = dateFormatted.split('-').reverse().join('/');
        }
        return `
          <tr class="hover:bg-slate-50 transition text-xs">
            <td class="py-2.5 px-3 font-mono text-slate-600">${dateFormatted}</td>
            <td class="py-2.5 px-3 font-bold text-slate-800">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${catDef.bg}">
                ${catDef.icon} ${catDef.label}
              </span>
            </td>
            <td class="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title="${item.note || ''}">${item.note || '<span class="text-slate-300 italic">Không có ghi chú</span>'}</td>
            <td class="py-2.5 px-3 text-right font-black text-slate-900">${formatMoney(item.amount)}</td>
            <td class="py-2.5 px-2 text-center">
              <button onclick="deletePersonalExpense('${item.id}')" class="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer" title="Xóa khoản chi">
                🗑️
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  lucide.createIcons();
}
