<script setup>
import { ref, shallowRef, reactive, computed, onMounted, watch, nextTick } from 'vue';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

// ==========================================================================
// 1. LOYIHA DAVLAT STANDARTLAR KESHI (FALLBACK CONSTANTS)
// ==========================================================================
const DEFAULT_LOCATIONS = [
  {
    id: "org_default_1",
    name: "Bosh Ofis",
    floors: [
      {
        id: "floor_default_1",
        name: "1-qavat",
        rooms: ["101-xona", "102-xona", "Qabulxona"]
      },
      {
        id: "floor_default_2",
        name: "2-qavat",
        rooms: ["Majlislar Zali", "Direktor xonasi", "IT bo'limi"]
      }
    ]
  },
  {
    id: "org_default_2",
    name: "Chilonzor Filiali",
    floors: [
      {
        id: "floor_default_3",
        name: "1-qavat",
        rooms: ["Kassa", "Omborxona"]
      }
    ]
  }
];

const DEFAULT_ASSETS = [
  {
    id: "INV-26-0001",
    name: "MacBook Pro 16\" (M3 Max)",
    category: "Kompyuter va Texnika",
    status: "Ishlatilmoqda",
    org: "Bosh Ofis",
    floor: "2-qavat",
    room: "IT bo'limi",
    owner: "Aliyev Ali",
    price: 32000000,
    date: "2026-01-15",
    notes: "Asosiy dasturchi noutbuki, ideal holatda."
  },
  {
    id: "INV-26-0002",
    name: "Epson L3250 Rangli Printer",
    category: "Orgtexnika",
    status: "Ishlatilmoqda",
    org: "Bosh Ofis",
    floor: "1-qavat",
    room: "102-xona",
    owner: "Karimova Zilola",
    price: 3800000,
    date: "2026-02-10",
    notes: "Kadrlar bo'limi uchun rangli printer."
  },
  {
    id: "INV-26-0003",
    name: "Ergonomik Ofis Kreslosi (Premium)",
    category: "Mebel va Jihozlar",
    status: "Ishlatilmoqda",
    org: "Bosh Ofis",
    floor: "2-qavat",
    room: "Direktor xonasi",
    owner: "Hasanov Sardor",
    price: 2500000,
    date: "2026-03-01",
    notes: "Mesh matoli, bel tayanchiga ega premium kreslo."
  },
  {
    id: "INV-26-0004",
    name: "Hoffmann Konditsioner 18000 BTU",
    category: "Konditsioner va Maishiy",
    status: "Zaxirada / Omborda",
    org: "Chilonzor Filiali",
    floor: "1-qavat",
    room: "Omborxona",
    owner: "—",
    price: 6400000,
    date: "2026-04-20",
    notes: "Yozgi mavsum uchun zaxirada saqlanmoqda."
  }
];

// ==========================================================================
// 2. TIZIMNING REAKTIV HOLATLARI (GLOBAL STATE)
// ==========================================================================
const assets = ref([]);
const locations = ref([]);
const isOnlineMode = ref(false);
const db = shallowRef(null);
const currentUser = shallowRef(null);
const currentUserRole = ref("admin");

// Sidebar va Mavzu holatlari
const theme = ref("dark");
const isSidebarCollapsed = ref(false);
const expandedNodes = reactive({
  orgs: {},
  floors: {}
});

// Hozirda tanlangan hudud ierarxiyasi
const selectedLocation = reactive({
  type: "GLOBAL",
  org: "",
  floor: "",
  room: ""
});

// Qidiruv, saralash va filtrlash ko'rsatkichlari
const searchQuery = ref("");
const selectedCategory = ref("ALL");
const selectedStatus = ref("ALL");
const currentSortColumn = ref("id");
const currentSortDirection = ref("asc");

// ==========================================================================
// 3. MODALLARNING OCHILISH HOLATLARI (MODALS STATE)
// ==========================================================================
const isAssetModalOpen = ref(false);
const isLocationModalOpen = ref(false);
const isCloudSettingsOpen = ref(false);
const isQrPrintModalOpen = ref(false);
const isAuthOverlayOpen = ref(false);
const isForgotPasswordModalOpen = ref(false);
const isPrivacyModalOpen = ref(false);
const isAdminUsersModalOpen = ref(false);

const privacyModalTitle = ref("Maxfiylik Siyosati");

// ==========================================================================
// 4. FORMA MODEL VA QIYMATLARI (FORMS STATE)
// ==========================================================================
const assetForm = reactive({
  action: "ADD",
  originalId: "",
  id: "",
  name: "",
  category: "Kompyuter va Texnika",
  status: "Ishlatilmoqda",
  org: "",
  floor: "",
  room: "",
  owner: "",
  price: null,
  date: "",
  notes: ""
});

const locationForm = reactive({
  type: "ORG",
  parentOrg: "",
  parentFloor: "",
  name: ""
});

const cloudConfig = reactive({
  apiKey: "",
  projectId: "",
  appId: "",
  authDomain: ""
});

const authForm = reactive({
  mode: "LOGIN",
  email: "",
  password: "",
  confirmPassword: ""
});

const forgotEmail = ref("");
const adminUsers = ref([]);
const usersUnsubscribe = ref(null);
let unsubscribeAssets = null;

// QR Stiker chop etish preview ma'lumotlari
const stickerAsset = ref(null);
const stickerQrCanvas = ref(null);

// ==========================================================================
// 5. CASCADING SELECT DROPDOWNS (IERARXIK FORM SELECTION)
// ==========================================================================
const availableFloors = computed(() => {
  if (!assetForm.org) return [];
  const org = locations.value.find(o => o.name === assetForm.org);
  return org ? org.floors : [];
});

const availableRooms = computed(() => {
  if (!assetForm.floor) return [];
  const floor = availableFloors.value.find(f => f.name === assetForm.floor);
  return floor ? floor.rooms : [];
});

watch(() => assetForm.org, (newOrg) => {
  if (newOrg) {
    const floors = availableFloors.value;
    if (floors.length > 0) {
      assetForm.floor = floors[0].name;
    } else {
      assetForm.floor = "";
      assetForm.room = "";
    }
  }
});

watch(() => assetForm.floor, (newFloor) => {
  if (newFloor) {
    const rooms = availableRooms.value;
    if (rooms.length > 0) {
      assetForm.room = rooms[0];
    } else {
      assetForm.room = "";
    }
  }
});

// ==========================================================================
// 6. TIZIMDA MA'LUMOTLARNI HISOB-KITOB QILISH (COMPUTED DATA)
// ==========================================================================
const activeLocationAssets = computed(() => {
  return assets.value.filter(a => {
    if (selectedLocation.type === "GLOBAL") return true;
    if (selectedLocation.type === "ORG") return a.org === selectedLocation.org;
    if (selectedLocation.type === "FLOOR") return a.org === selectedLocation.org && a.floor === selectedLocation.floor;
    if (selectedLocation.type === "ROOM") return a.org === selectedLocation.org && a.floor === selectedLocation.floor && a.room === selectedLocation.room;
    return true;
  });
});

const filteredAssets = computed(() => {
  return activeLocationAssets.value.filter(a => {
    // 1. Kategoriya bo'yicha filtrlash
    if (selectedCategory.value !== "ALL" && a.category !== selectedCategory.value) return false;
    
    // 2. Holat bo'yicha filtrlash
    if (selectedStatus.value !== "ALL" && a.status !== selectedStatus.value) return false;
    
    // 3. Qidiruv kalit so'zi bo'yicha filtrlash
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase().trim();
      const idMatch = a.id && a.id.toLowerCase().includes(q);
      const nameMatch = a.name && a.name.toLowerCase().includes(q);
      const ownerMatch = a.owner && a.owner.toLowerCase().includes(q);
      const notesMatch = a.notes && a.notes.toLowerCase().includes(q);
      return idMatch || nameMatch || ownerMatch || notesMatch;
    }
    return true;
  }).sort((a, b) => {
    let valA = a[currentSortColumn.value] || "";
    let valB = b[currentSortColumn.value] || "";

    if (currentSortColumn.value === "price") {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
    }

    if (valA < valB) return currentSortDirection.value === "asc" ? -1 : 1;
    if (valA > valB) return currentSortDirection.value === "asc" ? 1 : -1;
    return 0;
  });
});

// Dashboard statistik computed ko'rsatkichlari
const totalCount = computed(() => activeLocationAssets.value.length);
const totalValue = computed(() => {
  return activeLocationAssets.value.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
});
const activeCount = computed(() => activeLocationAssets.value.filter(a => a.status === "Ishlatilmoqda").length);
const repairCount = computed(() => activeLocationAssets.value.filter(a => a.status === "Ta'mirlashda").length);

const formattedTotalValue = computed(() => {
  return new Intl.NumberFormat('uz-UZ').format(totalValue.value) + " UZS";
});

// ==========================================================================
// 7. INTERFEYS VA DIZAYN ELEMENTLARI (UI CONTROL FUNCTIONS)
// ==========================================================================
const toggleTheme = () => {
  const newTheme = theme.value === "light" ? "dark" : "light";
  theme.value = newTheme;
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("inv_theme", newTheme);
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem("inv_sidebar_collapsed", isSidebarCollapsed.value.toString());
};

const selectLoc = (type, org = "", floor = "", room = "") => {
  selectedLocation.type = type;
  selectedLocation.org = org;
  selectedLocation.floor = floor;
  selectedLocation.room = room;

  // Tashkilot yoki qavat bosilganda avtomatik ravishda uni yoyib ko'rsatish (expand)
  if (type === "ORG") {
    const orgObj = locations.value.find(o => o.name === org);
    if (orgObj) {
      expandedNodes.orgs[orgObj.id] = true;
    }
  } else if (type === "FLOOR") {
    const orgObj = locations.value.find(o => o.name === org);
    if (orgObj) {
      const floorObj = orgObj.floors.find(f => f.name === floor);
      if (floorObj) {
        expandedNodes.floors[floorObj.id] = true;
      }
    }
  }
};

const toggleOrgCollapse = (orgId) => {
  expandedNodes.orgs[orgId] = !expandedNodes.orgs[orgId];
};

const toggleFloorCollapse = (floorId) => {
  expandedNodes.floors[floorId] = !expandedNodes.floors[floorId];
};

const sortBy = (col) => {
  if (currentSortColumn.value === col) {
    currentSortDirection.value = currentSortDirection.value === "asc" ? "desc" : "asc";
  } else {
    currentSortColumn.value = col;
    currentSortDirection.value = "asc";
  }
};

// ==========================================================================
// 8. MA'LUMOTLAR BAZASI BILAN ISHLASH (CRUD OPERATIONS)
// ==========================================================================
const ensureLocationsStructureAndIds = (data) => {
  if (!Array.isArray(data)) return [];
  data.forEach(org => {
    if (!org.id) org.id = "org_" + Math.random().toString(36).substr(2, 9);
    if (!org.floors) org.floors = [];
    org.floors.forEach(floor => {
      if (!floor.id) floor.id = "floor_" + Math.random().toString(36).substr(2, 9);
      if (!floor.rooms) floor.rooms = [];
    });
  });
  return data;
};

const loadDatabase = () => {
  if (isOnlineMode.value && db.value) {
    // 1. Joylashuvlarni onlayn yuklaymiz
    db.value.collection("locations").doc("tree").onSnapshot((doc) => {
      if (doc.exists) {
        locations.value = ensureLocationsStructureAndIds(doc.data().data || []);
      } else {
        locations.value = [...DEFAULT_LOCATIONS];
        db.value.collection("locations").doc("tree").set({ data: DEFAULT_LOCATIONS });
      }
    }, err => console.error("Firestore locations sync error:", err));

    // 2. Aktivlarni onlayn tinglaymiz
    if (unsubscribeAssets) unsubscribeAssets();
    unsubscribeAssets = db.value.collection("assets").onSnapshot((snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      assets.value = list;
    }, err => console.error("Firestore assets sync error:", err));
  } else {
    // Oflayn LocalStorage rejimi:
    const localLocs = localStorage.getItem("inv_locations");
    const localAssets = localStorage.getItem("inv_assets");

    if (localLocs) {
      try {
        const raw = JSON.parse(localLocs) || [];
        locations.value = ensureLocationsStructureAndIds(raw);
      } catch(e) {
        locations.value = [...DEFAULT_LOCATIONS];
      }
    } else {
      locations.value = [...DEFAULT_LOCATIONS];
      localStorage.setItem("inv_locations", JSON.stringify(locations.value));
    }

    if (localAssets) {
      try { assets.value = JSON.parse(localAssets) || []; } catch(e) { assets.value = [...DEFAULT_ASSETS]; }
    } else {
      assets.value = [...DEFAULT_ASSETS];
      localStorage.setItem("inv_assets", JSON.stringify(assets.value));
    }
  }
};

const saveAssetsToLocal = () => {
  if (!isOnlineMode.value) {
    localStorage.setItem("inv_assets", JSON.stringify(assets.value));
  }
};

const saveLocationsToLocal = () => {
  if (isOnlineMode.value && db.value) {
    db.value.collection("locations").doc("tree").set({ data: JSON.parse(JSON.stringify(locations.value)) })
      .catch(err => {
        console.error("Firestore locations write error:", err);
        alert("Xatolik: Joylashuvlarni saqlab bo'lmadi! Ruxsat yetarli emas yoki tarmoq xatosi. Batafsil: " + err.message);
      });
  } else {
    localStorage.setItem("inv_locations", JSON.stringify(locations.value));
  }
};

// Yangi jihoz modalini ochish
const openAddAssetModal = () => {
  if (currentUserRole.value === "viewer") return;
  assetForm.action = "ADD";
  assetForm.originalId = "";
  assetForm.id = "INV-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
  assetForm.name = "";
  assetForm.category = "Kompyuter va Texnika";
  assetForm.status = "Ishlatilmoqda";
  
  // Pre-fill joylashuvni tanlangan joylashuvga moslab tanlash
  assetForm.org = selectedLocation.org || (locations.value[0] ? locations.value[0].name : "");
  assetForm.floor = selectedLocation.floor || (availableFloors.value[0] ? availableFloors.value[0].name : "");
  assetForm.room = selectedLocation.room || (availableRooms.value[0] ? availableRooms.value[0] : "");
  
  assetForm.owner = "";
  assetForm.price = null;
  assetForm.date = new Date().toISOString().split("T")[0];
  assetForm.notes = "";
  
  isAssetModalOpen.value = true;
};

// Jihozni tahrirlash
const openEditAssetModal = (asset) => {
  if (currentUserRole.value === "viewer") return;
  assetForm.action = "EDIT";
  assetForm.originalId = asset.id;
  assetForm.id = asset.id;
  assetForm.name = asset.name;
  assetForm.category = asset.category;
  assetForm.status = asset.status;
  assetForm.org = asset.org;
  
  // nextTick orqali cascading selects yuklanishini kutamiz
  nextTick(() => {
    assetForm.floor = asset.floor;
    nextTick(() => {
      assetForm.room = asset.room;
    });
  });

  assetForm.owner = asset.owner;
  assetForm.price = asset.price;
  assetForm.date = asset.date;
  assetForm.notes = asset.notes;
  
  isAssetModalOpen.value = true;
};

// Jihozni saqlash form topshirilganda
const saveAsset = () => {
  if (currentUserRole.value === "viewer") return;
  const newAsset = {
    id: assetForm.id.trim(),
    name: assetForm.name.trim(),
    category: assetForm.category,
    status: assetForm.status,
    org: assetForm.org,
    floor: assetForm.floor,
    room: assetForm.room,
    owner: assetForm.owner.trim() || "—",
    price: assetForm.price ? Number(assetForm.price) : 0,
    date: assetForm.date,
    notes: assetForm.notes.trim() || ""
  };

  // Inventar raqami takrorlanmasligi tekshiruvi (faqat qo'shish rejimida)
  if (assetForm.action === "ADD") {
    const exists = assets.value.some(a => a.id.toLowerCase() === newAsset.id.toLowerCase());
    if (exists) {
      alert(`Xato: "${newAsset.id}" inventar raqamli jihoz allaqachon mavjud!`);
      return;
    }
  }

  if (isOnlineMode.value && db.value) {
    // ONLAYN CRUD:
    if (assetForm.action === "EDIT" && assetForm.originalId !== newAsset.id) {
      // Agar inventar raqami o'zgartirilgan bo'lsa, eskisini o'chirib yangisini yozamiz
      db.value.collection("assets").doc(assetForm.originalId).delete();
    }
    db.value.collection("assets").doc(newAsset.id).set(newAsset)
      .then(() => {
        isAssetModalOpen.value = false;
      })
      .catch(err => alert("Firestore xatoligi: " + err.message));
  } else {
    // OFLAYN LocalStorage CRUD:
    if (assetForm.action === "ADD") {
      assets.value.push(newAsset);
    } else {
      const idx = assets.value.findIndex(a => a.id === assetForm.originalId);
      if (idx !== -1) {
        assets.value[idx] = newAsset;
      }
    }
    saveAssetsToLocal();
    isAssetModalOpen.value = false;
  }
};

// Jihozni o'chirish
const deleteAsset = (assetId) => {
  if (currentUserRole.value === "viewer") return;
  const confirmDelete = confirm(`Haqiqatan ham "${assetId}" inventarli jihozni bazadan o'chirmoqchisiz?`);
  if (!confirmDelete) return;

  if (isOnlineMode.value && db.value) {
    db.value.collection("assets").doc(assetId).delete()
      .catch(err => alert("O'chirishda xatolik yuz berdi: " + err.message));
  } else {
    assets.value = assets.value.filter(a => a.id !== assetId);
    saveAssetsToLocal();
  }
};

// Yangi joylashuv qo'shish modalini ochish
const openAddLocationModal = (type, parentOrg = "", parentFloor = "") => {
  if (currentUserRole.value !== "admin") return;
  locationForm.type = type;
  locationForm.parentOrg = parentOrg;
  locationForm.parentFloor = parentFloor;
  locationForm.name = "";
  isLocationModalOpen.value = true;
};

// Joylashuvni saqlash
const saveLocation = () => {
  if (currentUserRole.value !== "admin") return;
  const name = locationForm.name.trim();
  if (!name) return;

  if (locationForm.type === "ORG") {
    const exists = locations.value.some(o => o.name.toLowerCase() === name.toLowerCase());
    if (exists) { return alert("Ushbu tashkilot allaqachon mavjud!"); }
    
    locations.value.push({
      id: "org_" + Math.random().toString(36).substr(2, 9),
      name: name,
      floors: []
    });
  } else if (locationForm.type === "FLOOR") {
    const org = locations.value.find(o => o.name === locationForm.parentOrg);
    if (!org) return;
    if (!org.floors) org.floors = [];
    const exists = org.floors.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (exists) { return alert("Ushby qavat allaqachon mavjud!"); }
    
    org.floors.push({
      id: "floor_" + Math.random().toString(36).substr(2, 9),
      name: name,
      rooms: []
    });
    
    // Yangi qavat qo'shilganda tashkilot panelini avtomatik yoyib ko'rsatish
    expandedNodes.orgs[org.id] = true;
  } else if (locationForm.type === "ROOM") {
    const org = locations.value.find(o => o.name === locationForm.parentOrg);
    if (!org) return;
    if (!org.floors) org.floors = [];
    const floor = org.floors.find(f => f.name === locationForm.parentFloor);
    if (!floor) return;
    if (!floor.rooms) floor.rooms = [];
    const exists = floor.rooms.some(r => r.toLowerCase() === name.toLowerCase());
    if (exists) { return alert("Ushbu xona allaqachon mavjud!"); }

    floor.rooms.push(name);
    
    // Yangi xona qo'shilganda qavat panelini avtomatik yoyib ko'rsatish
    expandedNodes.floors[floor.id] = true;
  }

  saveLocationsToLocal();
  isLocationModalOpen.value = false;
};

// ==========================================================================
// 9. EXCEL IMPORT VA EKSPORT INTEGRATSIYASI
// ==========================================================================
const exportExcel = () => {
  const listToExport = activeLocationAssets.value;
  if (listToExport.length === 0) {
    alert("Hozirgi joylashuvda eksport qilish uchun hech qanday jihoz yo'q!");
    return;
  }

  const excelRows = listToExport.map(a => ({
    "Inventar Raqami": a.id,
    "Jihoz Nomi": a.name,
    "Kategoriya": a.category,
    "Holati": a.status,
    "Tashkilot / Filial": a.org,
    "Qavat": a.floor,
    "Joylashgan Xonasi": a.room,
    "Mas'ul Xodim": a.owner || "",
    "Sotib Olingan Narxi (UZS)": a.price || 0,
    "Sotib Olingan Sana": a.date || "",
    "Izoh va Tafsilotlar": a.notes || ""
  }));

  const ws = XLSX.utils.json_to_sheet(excelRows);
  
  ws["!cols"] = [
    { wch: 18 }, { wch: 32 }, { wch: 22 }, { wch: 16 }, { wch: 22 },
    { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 38 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Moddiy Boyliklar");

  let fileName = "Moddiy_Boyliklar_Barchasi";
  if (selectedLocation.type === "ORG") fileName = `Moddiy_Boyliklar_${selectedLocation.org}`;
  else if (selectedLocation.type === "FLOOR") fileName = `Moddiy_Boyliklar_${selectedLocation.org}_${selectedLocation.floor}`;
  else if (selectedLocation.type === "ROOM") fileName = `Moddiy_Boyliklar_${selectedLocation.org}_${selectedLocation.room}`;

  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
};

const handleExcelImport = (e) => {
  if (currentUserRole.value !== "admin") return;
  const file = e.target.files[0];
  if (file) handleExcelImportFile(file);
};

const handleDrop = (e) => {
  if (currentUserRole.value !== "admin") return;
  const file = e.dataTransfer.files[0];
  if (file) handleExcelImportFile(file);
};

const handleExcelImportFile = (file) => {
  const validExtensions = [".xlsx", ".xls", ".csv"];
  const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  
  if (!validExtensions.includes(fileExt)) {
    alert("Xato format: Faqat Excel (.xlsx, .xls) yoki .csv fayl yuklang!");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet);

      if (rawRows.length === 0) {
        alert("Excel jadvalida ma'lumotlar topilmadi!");
        return;
      }

      const confirmRestore = confirm(`Exceldan jami ${rawRows.length} ta aktiv aniqlandi. Ular joriy ma'lumotlar bazangiz o'rniga yoziladi. Tasdiqlaysizmi?`);
      if (!confirmRestore) return;

      const importedAssets = [];
      const importedLocations = [];

      rawRows.forEach(row => {
        const id = row["Inventar Raqami"] || row["Inventar No"] || row["Inventar №"] || row["ID"];
        const name = row["Jihoz Nomi"] || row["Nomi"] || row["Name"];
        
        if (!id || !name) return;

        const orgName = (row["Tashkilot / Filial"] || row["Tashkilot"] || row["Filial"] || "Bosh Ofis").toString().trim();
        const floorName = (row["Qavat"] || row["Qavat Nomi"] || "1-qavat").toString().trim();
        const roomName = (row["Joylashgan Xonasi"] || row["Xona"] || row["Xona Nomi"] || "Umumiy xona").toString().trim();

        // Ierarxik Locations Tree yig'amiz
        let org = importedLocations.find(o => o.name.toLowerCase() === orgName.toLowerCase());
        if (!org) {
          org = { id: "org_" + Math.random().toString(36).substr(2, 9), name: orgName, floors: [] };
          importedLocations.push(org);
        }

        let floor = org.floors.find(f => f.name.toLowerCase() === floorName.toLowerCase());
        if (!floor) {
          floor = { id: "floor_" + Math.random().toString(36).substr(2, 9), name: floorName, rooms: [] };
          org.floors.push(floor);
        }

        let roomExists = floor.rooms.some(r => r.toLowerCase() === roomName.toLowerCase());
        if (!roomExists) {
          floor.rooms.push(roomName);
        }

        let category = row["Kategoriya"] || "Boshqa";
        const validCategories = ["Kompyuter va Texnika", "Mebel va Jihozlar", "Orgtexnika", "Konditsioner va Maishiy", "Boshqa"];
        if (!validCategories.includes(category)) category = "Boshqa";

        let status = row["Holati"] || "Zaxirada / Omborda";
        const validStatuses = ["Ishlatilmoqda", "Zaxirada / Omborda", "Ta'mirlashda", "Hisobdan chiqarilgan"];
        if (!validStatuses.includes(status)) status = "Zaxirada / Omborda";

        const owner = row["Mas'ul Xodim"] || "";
        let price = row["Sotib Olingan Narxi (UZS)"] || row["Narxi"] || 0;
        if (typeof price === "string") {
          price = Number(price.replace(/[^0-9]/g, "")) || 0;
        } else {
          price = Number(price) || 0;
        }

        const date = row["Sotib Olingan Sana"] || "";
        const notes = row["Izoh va Tafsilotlar"] || row["Izoh"] || "";

        importedAssets.push({
          id: id.toString().trim(),
          name: name.toString().trim(),
          category,
          status,
          org: orgName,
          floor: floorName,
          room: roomName,
          owner: owner.toString().trim(),
          price,
          date: date.toString().trim(),
          notes: notes.toString().trim()
        });
      });

      // Joylashuvlarni yangilash
      locations.value = importedLocations;
      saveLocationsToLocal();

      if (isOnlineMode.value && db.value) {
        // ONLAYN Firestore parallel o'chiramiz va yozamiz
        const deletePromises = assets.value.map(a => db.value.collection("assets").doc(a.id).delete());
        Promise.all(deletePromises)
          .then(() => {
            const writePromises = importedAssets.map(a => db.value.collection("assets").doc(a.id).set(a));
            return Promise.all(writePromises);
          })
          .then(() => {
            alert(`Muvaffaqiyatli bulutga yuklandi!\nJami ${importedAssets.length} ta jihoz Firestore-ga tiklandi.`);
          })
          .catch(err => alert("Bulutga yozishda xatolik: " + err.message));
      } else {
        // Oflayn
        assets.value = importedAssets;
        saveAssetsToLocal();
        selectLoc("GLOBAL");
        alert(`Muvaffaqiyatli tiklandi!\nJami ${importedAssets.length} ta jihoz yuklandi.`);
      }

    } catch (err) {
      console.error(err);
      alert("Xatolik: Excel faylini tahlil qilishda xatolik yuz berdi.");
    }
  };
  reader.readAsArrayBuffer(file);
};

// ==========================================================================
// 10. QR-KOD GENERATSIYASI VA MONOXROM CHOP ETISH (STIKERLAR)
// ==========================================================================
const openQrModal = (asset) => {
  stickerAsset.value = asset;
  isQrPrintModalOpen.value = true;
  
  nextTick(() => {
    const canvas = document.getElementById("stickerQrCanvas");
    if (canvas) {
      const qrData = `AKTIV: ${asset.id}\nNOMI: ${asset.name}\nHUDUD: ${asset.org} -> ${asset.floor} -> ${asset.room}\nMAS'UL: ${asset.owner || "Yo'q"}\nHOLAT: ${asset.status}`;
      QRCode.toCanvas(canvas, qrData, {
        width: 110,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, err => {
        if (err) console.error("QR Code generation error:", err);
      });
    }
  });
};

const executePrint = () => {
  window.print();
};

// ==========================================================================
// 11. FIREBASE AUTHENTICATION (USER ACCESS) VA ROLLAR
// ==========================================================================
const initFirebase = () => {
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyAGWchAmnKk_-m0EPCJJWVI_ciFtkMyCjg",
    authDomain: "inven-8588f.firebaseapp.com",
    projectId: "inven-8588f",
    storageBucket: "inven-8588f.firebasestorage.app",
    messagingSenderId: "186511543097",
    appId: "1:186511543097:web:27cce312bacb03fd7576e8"
  };

  let saved = localStorage.getItem("inv_firebase_config");
  if (!saved) {
    saved = JSON.stringify(DEFAULT_FIREBASE_CONFIG);
    localStorage.setItem("inv_firebase_config", saved);
  }

  try {
    const config = JSON.parse(saved);
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    db.value = firebase.firestore();
    isOnlineMode.value = true;
    
    // Oflayn Firestore keshini yoqamiz
    db.value.enablePersistence({ synchronizeTabs: true }).catch(err => console.warn("Firestore Persistence error:", err));

    // Form settings pre-fill
    cloudConfig.apiKey = config.apiKey || "";
    cloudConfig.projectId = config.projectId || "";
    cloudConfig.appId = config.appId || "";
    cloudConfig.authDomain = config.authDomain || "";

  } catch(e) {
    console.error("Firebase ulanish xatoligi:", e);
    isOnlineMode.value = false;
  }
};

const setupAuth = () => {
  if (isOnlineMode.value) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        currentUser.value = user;
        isAuthOverlayOpen.value = false;
        
        db.value.collection("users").doc(user.uid).onSnapshot((doc) => {
          if (doc.exists) {
            currentUserRole.value = doc.data().role || "admin";
          } else {
            currentUserRole.value = "admin";
          }
        }, err => {
          console.warn("User role sync error (falling back to admin):", err);
          currentUserRole.value = "admin";
        });
      } else {
        currentUser.value = null;
        currentUserRole.value = "admin";
        isAuthOverlayOpen.value = true;
      }
    });
  } else {
    currentUserRole.value = "admin"; // Oflaynda admin barcha huquqlarga ega
    isAuthOverlayOpen.value = false;
  }
};

const submitAuth = () => {
  if (!isOnlineMode.value) return;

  const email = authForm.email.trim();
  const password = authForm.password;

  if (authForm.mode === "LOGIN") {
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(err => alert("Kirishda xatolik: " + err.message));
  } else {
    if (password !== authForm.confirmPassword) {
       return alert("Xato: Parollar mos kelmadi!");
    }
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((cred) => {
        db.value.collection("users").doc(cred.user.uid).set({
          uid: cred.user.uid,
          email: cred.user.email,
          role: "admin"
        }).then(() => alert(`Muvaffaqiyatli ro'yxatdan o'tdingiz!\nRolingiz: ADMIN`));
      })
      .catch(err => alert("Ro'yxatdan o'tishda xatolik: " + err.message));
  }
};

const handleLogout = () => {
  if (isOnlineMode.value) {
    firebase.auth().signOut().then(() => alert("Tizimdan chiqdingiz!"));
  }
};

const submitForgotPassword = () => {
  if (!forgotEmail.value.trim()) return;
  firebase.auth().sendPasswordResetEmail(forgotEmail.value.trim())
    .then(() => {
      alert("Elektron pochtangizga maxfiy parolni tiklash havolasi yuborildi!");
      isForgotPasswordModalOpen.value = false;
    })
    .catch(err => alert("Xatolik: " + err.message));
};

const openAdminUsersModal = () => {
  if (currentUserRole.value !== "admin" || !isOnlineMode.value) return;
  isAdminUsersModalOpen.value = true;
  
  if (usersUnsubscribe.value) usersUnsubscribe.value();
  usersUnsubscribe.value = db.value.collection("users").orderBy("email").onSnapshot((snapshot) => {
    const list = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    adminUsers.value = list;
  });
};

const changeUserRole = (userId, newRole) => {
  if (currentUser.value.uid === userId) return;
  db.value.collection("users").doc(userId).update({ role: newRole })
    .catch(err => alert("Rolni yangilashda xato: " + err.message));
};

const deleteUser = (userId, email) => {
  if (currentUser.value.uid === userId) return;
  const proceed = confirm(`Haqiqatan ham "${email}" foydalanuvchisini o'chirishni istaysizmi?`);
  if (proceed) {
    db.value.collection("users").doc(userId).delete()
      .catch(err => alert("O'chirishda xatolik: " + err.message));
  }
};

const disconnectCloud = () => {
  const proceed = confirm("Haqiqatan ham bulut sozlamalarini o'chirib, oflayn rejimga o'tmoqchisiz?");
  if (proceed) {
    localStorage.removeItem("inv_firebase_config");
    alert("Bulut sozlamalari o'chirildi. Tizim oflaynga qaytadi.");
    window.location.reload();
  }
};

const saveCloudSettings = () => {
  const config = {
    apiKey: cloudConfig.apiKey.trim(),
    projectId: cloudConfig.projectId.trim(),
    appId: cloudConfig.appId.trim(),
    authDomain: cloudConfig.authDomain.trim()
  };
  localStorage.setItem("inv_firebase_config", JSON.stringify(config));
  alert("Bulut sozlamalari saqlandi! Loyiha qayta yuklanadi.");
  window.location.reload();
};

const openPrivacyModalWithTitle = (title) => {
  privacyModalTitle.value = title;
  isPrivacyModalOpen.value = true;
};

// Lifecycle Hooks
onMounted(() => {
  // Mavzuni tiklash
  const savedTheme = localStorage.getItem("inv_theme") || "dark";
  theme.value = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);

  // Sidebar holatini tiklash
  const savedSidebar = localStorage.getItem("inv_sidebar_collapsed");
  isSidebarCollapsed.value = savedSidebar === "true";

  initFirebase();
  loadDatabase();
  setupAuth();
});
</script>

<template>
  <div class="full-screen-app" id="fullScreenApp">
    
    <!-- CHAP PANEL: SIDEBAR (NAVIGATION TREE) -->
    <aside class="location-sidebar" :class="{ collapsed: isSidebarCollapsed }" id="locationSidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg class="sidebar-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          <span class="logo-text">Joylashuvlar</span>
        </div>
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <button v-if="currentUserRole === 'admin'" @click="openAddLocationModal('ORG')" class="add-btn-small" title="Yangi Tashkilot (Filial) Qo'shish">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button @click="toggleSidebar" class="add-btn-small" title="Chap panelni yopish">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>
      </div>

      <!-- Locations daraxti -->
      <div class="location-tree-container">
        <!-- Global ko'rinish -->
        <div class="location-tree-item global-item" :class="{ active: selectedLocation.type === 'GLOBAL' }" @click="selectLoc('GLOBAL')" id="globalLocationItem">
          <svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span class="tree-text">Barcha Aktivlar</span>
        </div>

        <!-- Dinamik tashkilotlar ierarxik daraxti (Vue nested structure) -->
        <div class="orgs-tree-wrapper" id="orgsTreeWrapper">
          <div v-for="org in locations" :key="org.id" class="org-node" style="margin-bottom: 0.35rem;">
            <!-- Tashkilot (Filial) qatori -->
            <div class="location-tree-item org-item" :class="{ active: selectedLocation.type === 'ORG' && selectedLocation.org === org.name }" @click="selectLoc('ORG', org.name)">
              <span class="tree-toggle-arrow" @click.stop="toggleOrgCollapse(org.id)" style="margin-right: 4px; font-size: 0.65rem; color: var(--text-secondary); cursor: pointer;">
                {{ expandedNodes.orgs[org.id] ? '▼' : '▶' }}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="tree-icon" style="color: var(--accent);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span class="tree-text" style="font-weight: 600;">{{ org.name }}</span>
              <button v-if="currentUserRole === 'admin'" @click.stop="openAddLocationModal('FLOOR', org.name)" class="add-sub-btn" title="Qavat qo'shish">+</button>
            </div>
            
            <!-- Qavatlar ro'yxati -->
            <div v-if="expandedNodes.orgs[org.id]" class="floors-wrapper" style="padding-left: 1.15rem; margin-top: 0.25rem;">
              <div v-for="floor in org.floors" :key="floor.id" class="floor-node" style="margin-bottom: 0.25rem;">
                <div class="location-tree-item floor-item" :class="{ active: selectedLocation.type === 'FLOOR' && selectedLocation.org === org.name && selectedLocation.floor === floor.name }" @click="selectLoc('FLOOR', org.name, floor.name)">
                  <span class="tree-toggle-arrow" @click.stop="toggleFloorCollapse(floor.id)" style="margin-right: 4px; font-size: 0.6rem; color: var(--text-secondary); cursor: pointer;">
                    {{ expandedNodes.floors[floor.id] ? '▼' : '▶' }}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="tree-icon" style="color: var(--success);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  <span class="tree-text">{{ floor.name }}</span>
                  <button v-if="currentUserRole === 'admin'" @click.stop="openAddLocationModal('ROOM', org.name, floor.name)" class="add-sub-btn" title="Xona qo'shish">+</button>
                </div>
                
                <!-- Xonalar ro'yxati -->
                <div v-if="expandedNodes.floors[floor.id]" class="rooms-wrapper" style="padding-left: 1.15rem; margin-top: 0.2rem;">
                  <div v-for="room in floor.rooms" :key="room" class="location-tree-item room-item" :class="{ active: selectedLocation.type === 'ROOM' && selectedLocation.org === org.name && selectedLocation.floor === floor.name && selectedLocation.room === room }" @click="selectLoc('ROOM', org.name, floor.name, room)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" class="tree-icon" style="color: var(--warning);"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
                    <span class="tree-text">{{ room }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Foydalanuvchi menyusi -->
      <div class="sidebar-footer">
        <div v-if="currentUser" id="userProfileCard" class="user-profile-card" style="margin-bottom: 0.85rem;">
          <div class="user-avatar-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="user-avatar-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="user-profile-details">
            <span id="userEmailLabel" class="user-email-label" :title="currentUser.email">{{ currentUser.email }}</span>
            <span id="userRoleBadge" class="user-role-badge" :class="currentUserRole">{{ currentUserRole.toUpperCase() }}</span>
          </div>
          <button @click="handleLogout" id="logoutBtn" class="action-icon-small logout-btn" title="Tizimdan Chiqish">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>

        <button v-if="currentUserRole === 'admin' && isOnlineMode" @click="openAdminUsersModal" id="adminUsersManagementBtn" class="btn btn-secondary btn-icon sidebar-theme-btn" style="margin-bottom: 0.5rem; justify-content: flex-start; width: 100%;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span class="theme-btn-text">Xodimlar Boshqaruvi</span>
        </button>

        <button @click="toggleTheme" id="themeToggleBtn" class="btn btn-secondary btn-icon sidebar-theme-btn" style="width: 100%;">
          <svg class="theme-sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" :style="{ transform: theme === 'light' ? 'rotate(0deg)' : 'rotate(180deg)' }"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <span class="theme-btn-text">{{ theme === 'light' ? "Qorong'u Mavzu" : "Yorug' Mavzu" }}</span>
        </button>
      </div>
    </aside>

    <!-- O'NG PANEL: ASOSIY MAZMUN (MAIN WORKSPACE) -->
    <main class="main-workspace" id="mainWorkspace">
      
      <!-- Topbar Header -->
      <header class="workspace-header">
        <div class="header-breadcrumbs">
          <button v-if="isSidebarCollapsed" @click="toggleSidebar" class="add-btn-small" title="Chap panelni ochish" style="margin-right: 0.75rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          
          <span class="breadcrumb-item" @click="selectLoc('GLOBAL')">Barcha Aktivlar</span>
          
          <template v-if="selectedLocation.type !== 'GLOBAL'">
            <span class="breadcrumb-arrow">&rarr;</span>
            <span class="breadcrumb-item" @click="selectLoc('ORG', selectedLocation.org)">{{ selectedLocation.org }}</span>
          </template>

          <template v-if="selectedLocation.type === 'FLOOR' || selectedLocation.type === 'ROOM'">
            <span class="breadcrumb-arrow">&rarr;</span>
            <span class="breadcrumb-item" @click="selectLoc('FLOOR', selectedLocation.org, selectedLocation.floor)">{{ selectedLocation.floor }}</span>
          </template>

          <template v-if="selectedLocation.type === 'ROOM'">
            <span class="breadcrumb-arrow">&rarr;</span>
            <span class="breadcrumb-item active">{{ selectedLocation.room }}</span>
          </template>
        </div>
        
        <div class="topbar-actions">
          <!-- BULUT STATUSTI VA SOZLAMALARI -->
          <button v-if="currentUserRole === 'admin'" @click="isCloudSettingsOpen = true" class="btn btn-secondary btn-icon" title="Onlayn Bulut Sozlamalari (Firebase)">
            <span class="cloud-status-dot" :class="isOnlineMode ? 'online' : 'offline'"></span>
            <span>{{ isOnlineMode ? "Onlayn Sinxron" : "Oflayn Rejim" }}</span>
          </button>

          <button @click="exportExcel" class="btn btn-secondary btn-icon" title="Hozirgi ko'rinishni Excelga yuklab olish">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-svg" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Excelga Eksport
          </button>
          
          <button v-if="currentUserRole === 'admin'" @click="$refs.excelFileInput.click()" class="btn btn-secondary btn-icon" title="Zaxira Excel faylidan tiklash">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-svg" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Exceldan Import
          </button>
          <input type="file" ref="excelFileInput" @change="handleExcelImport" accept=".xlsx, .xls, .csv" style="display: none;">
        </div>
      </header>

      <!-- Dashboard statistikasi gridi -->
      <section class="workspace-dashboard">
        <div class="stats-grid">
          <div class="stat-card" id="statCardTotal">
            <div class="stat-icon-wrapper total-assets">
              <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            </div>
            <div class="stat-details">
              <h2 class="stat-value">{{ totalCount }}</h2>
              <p class="stat-label">Jami Aktivlar</p>
            </div>
          </div>
          
          <div class="stat-card" id="statCardValue">
            <div class="stat-icon-wrapper total-valuation">
              <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="stat-details">
              <h2 class="stat-value" style="font-size: 1.15rem;">{{ formattedTotalValue }}</h2>
              <p class="stat-label">Balans Qiymati</p>
            </div>
          </div>

          <div class="stat-card" id="statCardActive">
            <div class="stat-icon-wrapper active-assets">
              <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div class="stat-details">
              <h2 class="stat-value">{{ activeCount }}</h2>
              <p class="stat-label">Ishlatilmoqda</p>
            </div>
          </div>

          <div class="stat-card" id="statCardRepair">
            <div class="stat-icon-wrapper repair-assets">
              <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            </div>
            <div class="stat-details">
              <h2 class="stat-value">{{ repairCount }}</h2>
              <p class="stat-label">Ta'mirlashda</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Filtrlar va Qidiruv Panel -->
      <section class="workspace-controls">
        <div class="search-filter-row">
          <div class="search-box-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" v-model="searchQuery" placeholder="Jihoz nomi, inventar raqami, mas'ul..." aria-label="Qidiruv">
          </div>
          
          <div class="filter-wrapper">
            <select v-model="selectedCategory" aria-label="Kategoriya filtri">
              <option value="ALL">Barcha Kategoriyalar</option>
              <option value="Kompyuter va Texnika">Kompyuter va Texnika</option>
              <option value="Mebel va Jihozlar">Mebel va Jihozlar</option>
              <option value="Orgtexnika">Orgtexnika</option>
              <option value="Konditsioner va Maishiy">Konditsioner va Maishiy</option>
              <option value="Boshqa">Boshqa</option>
            </select>
          </div>

          <div class="filter-wrapper">
            <select v-model="selectedStatus" aria-label="Holat filtri">
              <option value="ALL">Barcha Holatlar</option>
              <option value="Ishlatilmoqda">Ishlatilmoqda</option>
              <option value="Zaxirada / Omborda">Zaxirada / Omborda</option>
              <option value="Ta'mirlashda">Ta'mirlashda</option>
              <option value="Hisobdan chiqarilgan">Hisobdan chiqarilgan</option>
            </select>
          </div>

          <button v-if="currentUserRole !== 'viewer'" @click="openAddAssetModal" class="btn btn-primary btn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-svg" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Jihoz Qo'shish
          </button>
        </div>
      </section>

      <!-- Excel Drag & Drop Zona (Faqat admin uchun) -->
      <div v-if="currentUserRole === 'admin'" class="excel-drop-zone" id="excelDropZone" @dragover.prevent @drop.prevent="handleDrop" @click="$refs.excelFileInput.click()">
        <svg class="drop-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <p class="drop-zone-text">Tiklash uchun <strong>Excel faylini sudrab tashlang</strong> yoki bosing.</p>
      </div>

      <!-- Aktivlar jadvali -->
      <div class="workspace-table-container">
        <table class="assets-table" id="assetsTable">
          <thead>
            <tr>
              <th @click="sortBy('id')" class="sortable" :class="{ sorted: currentSortColumn === 'id', desc: currentSortDirection === 'desc' }">Inventar №</th>
              <th @click="sortBy('name')" class="sortable" :class="{ sorted: currentSortColumn === 'name', desc: currentSortDirection === 'desc' }">Jihoz Nomi</th>
              <th @click="sortBy('category')" class="sortable" :class="{ sorted: currentSortColumn === 'category', desc: currentSortDirection === 'desc' }">Kategoriya</th>
              <th @click="sortBy('status')" class="sortable" :class="{ sorted: currentSortColumn === 'status', desc: currentSortDirection === 'desc' }">Holati</th>
              <th @click="sortBy('org')" class="sortable" :class="{ sorted: currentSortColumn === 'org', desc: currentSortDirection === 'desc' }">Joylashuvi (Ierarxiya)</th>
              <th @click="sortBy('owner')" class="sortable" :class="{ sorted: currentSortColumn === 'owner', desc: currentSortDirection === 'desc' }">Mas'ul xodim</th>
              <th @click="sortBy('price')" class="sortable" :class="{ sorted: currentSortColumn === 'price', desc: currentSortDirection === 'desc' }">Narxi (UZS)</th>
              <th @click="sortBy('date')" class="sortable" :class="{ sorted: currentSortColumn === 'date', desc: currentSortDirection === 'desc' }">Sotib olingan</th>
              <th class="actions-col">Amallar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in filteredAssets" :key="asset.id">
              <td style="font-weight: 600; color: var(--accent);">{{ asset.id }}</td>
              <td style="font-weight: 500;">{{ asset.name }}</td>
              <td><span class="category-pill">{{ asset.category }}</span></td>
              <td>
                <span class="status-pill" :class="asset.status === 'Ishlatilmoqda' ? 'active' : (asset.status === 'Ta\'mirlashda' ? 'repair' : 'reserve')">
                  {{ asset.status }}
                </span>
              </td>
              <td style="font-size: 0.78rem; color: var(--text-secondary);">
                🏢 {{ asset.org }} <br> 
                <span style="font-size: 0.72rem; opacity: 0.8;">📶 {{ asset.floor }} &rarr; 🚪 {{ asset.room }}</span>
              </td>
              <td>{{ asset.owner }}</td>
              <td style="font-family: monospace; font-weight: 600; text-align: right;">{{ new Intl.NumberFormat('uz-UZ').format(asset.price || 0) }} UZS</td>
              <td>{{ asset.date || '—' }}</td>
              <td class="actions-col">
                <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                  <!-- QR Stiker Chop Etish -->
                  <button @click="openQrModal(asset)" class="action-icon print-qr-btn" title="QR stiker chop etish">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                  </button>
                  
                  <template v-if="currentUserRole !== 'viewer'">
                    <!-- Tahrirlash -->
                    <button @click="openEditAssetModal(asset)" class="action-icon edit-asset-btn" title="Tahrirlash">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <!-- O'chirish -->
                    <button @click="deleteAsset(asset.id)" class="action-icon delete-btn" title="O'chirish">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="filteredAssets.length === 0" class="no-data-message">
          <svg class="no-data-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          <p>Ushbu joylashuvda hech qanday jihoz topilmadi. "+ Jihoz Qo'shish" tugmasini bosing.</p>
        </div>
      </div>

    </main>
  </div>

  <!-- MODAL: JIHOD QO'SHISH / TAHRIRLASH -->
  <div class="modal-overlay" :class="{ open: isAssetModalOpen }" role="dialog" aria-modal="true">
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">{{ assetForm.action === 'ADD' ? 'Yangi Aktiv Qo\'shish' : 'Jihozni Tahrirlash' }}</h3>
        <button @click="isAssetModalOpen = false" class="close-btn" aria-label="Yopish">&times;</button>
      </div>
      <form @submit.prevent="saveAsset" class="asset-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="formAssetId">Inventar Raqami (Majburiy) *</label>
            <input type="text" id="formAssetId" v-model="assetForm.id" placeholder="INV-26-0001" :disabled="assetForm.action === 'EDIT'" required>
          </div>

          <div class="form-group">
            <label for="formAssetName">Jihoz Nomi (Majburiy) *</label>
            <input type="text" id="formAssetName" v-model="assetForm.name" placeholder="HP LaserJet Printer..." required>
          </div>

          <div class="form-group">
            <label for="formAssetCategory">Kategoriya *</label>
            <select id="formAssetCategory" v-model="assetForm.category" required>
              <option value="Kompyuter va Texnika">Kompyuter va Texnika</option>
              <option value="Mebel va Jihozlar">Mebel va Jihozlar</option>
              <option value="Orgtexnika">Orgtexnika</option>
              <option value="Konditsioner va Maishiy">Konditsioner va Maishiy</option>
              <option value="Boshqa">Boshqa</option>
            </select>
          </div>

          <div class="form-group">
            <label for="formAssetStatus">Holati *</label>
            <select id="formAssetStatus" v-model="assetForm.status" required>
              <option value="Ishlatilmoqda">Ishlatilmoqda</option>
              <option value="Zaxirada / Omborda">Zaxirada / Omborda</option>
              <option value="Ta'mirlashda">Ta'mirlashda</option>
              <option value="Hisobdan chiqarilgan">Hisobdan chiqarilgan</option>
            </select>
          </div>

          <!-- IERARXIK JOYLAShUV TANLOVLARI (CASCADING DROPDOWNS) -->
          <div class="form-group">
            <label for="formAssetOrg">Tashkilot / Filial *</label>
            <select id="formAssetOrg" v-model="assetForm.org" required>
              <option v-for="org in locations" :key="org.name" :value="org.name">{{ org.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="formAssetFloor">Qavat *</label>
            <select id="formAssetFloor" v-model="assetForm.floor" required>
              <option v-for="floor in availableFloors" :key="floor.name" :value="floor.name">{{ floor.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="formAssetRoom">Xona *</label>
            <select id="formAssetRoom" v-model="assetForm.room" required>
              <option v-for="room in availableRooms" :key="room" :value="room">{{ room }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="formAssetOwner">Mas'ul Xodim</label>
            <input type="text" id="formAssetOwner" v-model="assetForm.owner" placeholder="Aliyev Ali">
          </div>

          <div class="form-group">
            <label for="formAssetPrice">Sotib Olingan Narxi (UZS)</label>
            <input type="number" id="formAssetPrice" v-model="assetForm.price" placeholder="5000000" min="0">
          </div>

          <div class="form-group">
            <label for="formAssetDate">Sotib Olingan Sana</label>
            <input type="date" id="formAssetDate" v-model="assetForm.date">
          </div>
        </div>

        <div class="form-group full-width" style="margin-top: 1rem;">
          <label for="formAssetNotes">Izoh va Tafsilotlar</label>
          <textarea id="formAssetNotes" v-model="assetForm.notes" placeholder="Jihoz holati yoki tafsilotlar..." rows="3"></textarea>
        </div>

        <div class="modal-footer">
          <button type="button" @click="isAssetModalOpen = false" class="btn btn-secondary">Bekor qilish</button>
          <button type="submit" class="btn btn-primary">Saqlash</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: YANGI HUDUD QO'SHISH (Tashkilot, Qavat, Xona) -->
  <div class="modal-overlay" :class="{ open: isLocationModalOpen }" role="dialog" aria-modal="true">
    <div class="modal-card" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">Yangi Joylashuv Qo'shish</h3>
        <button @click="isLocationModalOpen = false" class="close-btn">&times;</button>
      </div>
      <form @submit.prevent="saveLocation" class="location-form">
        <div class="modal-body">
          <div class="form-group" style="width: 100%;">
            <label for="locNameInput">{{ locationForm.type === 'ORG' ? 'Tashkilot (Filial) Nomi' : (locationForm.type === 'FLOOR' ? 'Qavat Nomi' : 'Xona Nomi') }} *</label>
            <input type="text" id="locNameInput" v-model="locationForm.name" :placeholder="locationForm.type === 'ORG' ? 'Bosh Ofis...' : (locationForm.type === 'FLOOR' ? '3-qavat...' : 'IT xonasi...')" required>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="isLocationModalOpen = false" class="btn btn-secondary">Bekor qilish</button>
          <button type="submit" class="btn btn-primary">Qo'shish</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: FIREBASE BULUT SOZLAMALARI -->
  <div class="modal-overlay" :class="{ open: isCloudSettingsOpen }" role="dialog" aria-modal="true">
    <div class="modal-card" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">☁️ Firebase Bulut Sozlamalari</h3>
        <button @click="isCloudSettingsOpen = false" class="close-btn">&times;</button>
      </div>
      <form @submit.prevent="saveCloudSettings" class="cloud-settings-form">
        <div class="modal-body" style="gap: 0.85rem;">
          <p class="print-instruction" style="margin-bottom: 0.25rem;">
            Ma'lumotlar bazasini real-time onlayn sinxronlash uchun Firebase Console loyihangizdan olingan web kalitlarni kiriting:
          </p>
          
          <div class="form-group" style="width: 100%;">
            <label>API Key *</label>
            <input type="text" v-model="cloudConfig.apiKey" placeholder="AIzaSyA1..." required>
          </div>
          
          <div class="form-group" style="width: 100%;">
            <label>Project ID *</label>
            <input type="text" v-model="cloudConfig.projectId" placeholder="my-inventory-app..." required>
          </div>

          <div class="form-group" style="width: 100%;">
            <label>App ID *</label>
            <input type="text" v-model="cloudConfig.appId" placeholder="1:123456:web:abcd..." required>
          </div>

          <div class="form-group" style="width: 100%;">
            <label>Auth Domain (Ixtiyoriy)</label>
            <input type="text" v-model="cloudConfig.authDomain" placeholder="my-inventory-app.firebaseapp.com">
          </div>
        </div>

        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" @click="disconnectCloud" class="btn btn-secondary" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">Bulutdan Uzish</button>
          <div style="display: flex; gap: 0.5rem; margin-left: auto;">
            <button type="button" @click="isCloudSettingsOpen = false" class="btn btn-secondary">Bekor qilish</button>
            <button type="submit" class="btn btn-primary">Saqlash va Ulanish</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: QR-Kod Sticker Preview & Print (40x30mm Xprinter) -->
  <div class="modal-overlay" :class="{ open: isQrPrintModalOpen }" role="dialog" aria-modal="true">
    <div class="modal-card print-preview-card">
      <div class="modal-header">
        <h3 class="modal-title">Xprinter 40x30mm Stiker Preview</h3>
        <button @click="isQrPrintModalOpen = false" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body qr-print-body" v-if="stickerAsset">
        <p class="print-instruction">Ushbu sticker Xprinter 40x30mm termal qog'oziga yuqori kontrastli qilib monoxrom formatda chiqariladi.</p>
        
        <div class="sticker-border-container">
          <div class="sticker-dimensions-ruler-w">40 mm</div>
          <div class="sticker-dimensions-ruler-h">30 mm</div>
          
          <!-- STIKER ELEMENTI (Monoxrom chop etish uchun tayyor) -->
          <div class="xprinter-sticker-element" id="xprinterStickerElement">
            <div class="sticker-qr-side">
              <canvas id="stickerQrCanvas" ref="stickerQrCanvas" width="100" height="100"></canvas>
            </div>
            
            <div class="sticker-info-side">
              <div class="sticker-header-org" id="stickerOrgName">{{ stickerAsset.org.toUpperCase() }}</div>
              <div class="sticker-inv-num" id="stickerInvNum">{{ stickerAsset.id }}</div>
              <div class="sticker-asset-name" id="stickerAssetName">{{ stickerAsset.name }}</div>
              <div class="sticker-owner" id="stickerOwner">M: {{ stickerAsset.owner }}</div>
              <div class="sticker-location" id="stickerLocation">Q: {{ stickerAsset.floor }} / X: {{ stickerAsset.room }}</div>
            </div>
          </div>
        </div>

        <div class="print-config-tip">
          <strong>💡 Xprinter Termal Sozlamalari:</strong>
          <ul>
            <li>Paper Size: <strong>40x30 mm</strong></li>
            <li>Margins: <strong>None (0)</strong></li>
            <li>Headers & Footers: <strong>O'chirilgan (Unchecked)</strong></li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" @click="isQrPrintModalOpen = false" class="btn btn-secondary">Yopish</button>
        <button type="button" @click="executePrint" class="btn btn-primary btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-svg" width="16" height="16"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Chop Etish
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL OYNA: AUTHENTICATION & LANDING SCREEN (AUTH OVERLAY) -->
  <div class="auth-overlay" :class="{ open: isAuthOverlayOpen }">
    <div class="landing-container">
      
      <!-- Chap Ustun: Landing Page (Platforma Haqida Ma'lumot va Skrinshotlar) -->
      <div class="landing-hero-section">
        <div class="landing-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="32" height="32" style="color: var(--accent);"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          <span class="auth-logo-text" style="font-size: 1.4rem;">Inventarizatsiya</span>
        </div>
        
        <h1 class="landing-title">Tashkilotingiz Aktivlarini Aqlli Boshqaring</h1>
        <p class="landing-subtitle">Mebel, texnika, kompyuterlar va har qanday moddiy boyliklarni QR-kod, ierarxik tizim va Firebase buluti orqali real vaqtda ro'yxatga oling hamda nazorat qiling.</p>
        
        <!-- Premium CSS Dashboard Showcase -->
        <div class="landing-mockup-wrapper">
          <div class="landing-dashboard-mockup">
            <!-- Mockup Sidebar -->
            <div class="mock-sidebar">
              <div class="mock-sidebar-header">
                <span class="mock-dot red"></span>
                <span class="mock-dot yellow"></span>
                <span class="mock-dot green"></span>
              </div>
              <div class="mock-sidebar-items">
                <div class="mock-sidebar-item active">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                </div>
                <div class="mock-sidebar-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2C6.5 2 2 4.5 2 7v10c0 2.5 4.5 5 10 5s10-2.5 10-5V7c0-2.5-4.5-5-10-5z"></path></svg>
                </div>
                <div class="mock-sidebar-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div class="mock-sidebar-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
                </div>
              </div>
            </div>
            
            <!-- Mockup Main Content -->
            <div class="mock-main">
              <!-- Mock Header -->
              <div class="mock-header">
                <div class="mock-search-bar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span>Qidirish...</span>
                </div>
                <div class="mock-user">
                  <div class="mock-avatar"></div>
                  <div class="mock-user-status"></div>
                </div>
              </div>
              
              <!-- Mock Stats Grid -->
              <div class="mock-stats-grid">
                <div class="mock-stat-card">
                  <div class="mock-stat-icon-wrapper blue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </div>
                  <div class="mock-stat-content">
                    <span class="mock-stat-num">1,482 ta</span>
                    <span class="mock-stat-label">Jami Aktivlar</span>
                  </div>
                </div>
                
                <div class="mock-stat-card">
                  <div class="mock-stat-icon-wrapper green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div class="mock-stat-content">
                    <span class="mock-stat-num">849.5M</span>
                    <span class="mock-stat-label">Balans Qiymati</span>
                  </div>
                </div>
                
                <div class="mock-stat-card">
                  <div class="mock-stat-icon-wrapper orange">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div class="mock-stat-content">
                    <span class="mock-stat-num">98.2%</span>
                    <span class="mock-stat-label">Ishlatilmoqda</span>
                  </div>
                </div>
              </div>
              
              <!-- Mock Content Body -->
              <div class="mock-content-body">
                <div class="mock-chart-container">
                  <div class="mock-chart-info">
                    <span class="mock-chart-title">Oxirgi inventarizatsiya holati</span>
                    <div class="mock-chart-indicators">
                      <span class="indicator"><span class="dot active"></span> Faol</span>
                      <span class="indicator"><span class="dot repair"></span> Ta'mir</span>
                    </div>
                  </div>
                  <div class="mock-table-rows">
                    <div class="mock-table-row">
                      <span class="mock-cell-icon">💻</span>
                      <span class="mock-cell-name">MacBook Pro 16" (M3 Max)</span>
                      <span class="mock-cell-badge active">Faol</span>
                      <span class="mock-cell-id">INV-0982</span>
                    </div>
                    <div class="mock-table-row">
                      <span class="mock-cell-icon">🖨️</span>
                      <span class="mock-cell-name">Epson L3250 Rangli Printer</span>
                      <span class="mock-cell-badge repair">Ta'mirda</span>
                      <span class="mock-cell-id">INV-0145</span>
                    </div>
                    <div class="mock-table-row">
                      <span class="mock-cell-icon">🪑</span>
                      <span class="mock-cell-name">Ergonomik Ofis Kreslosi</span>
                      <span class="mock-cell-badge active">Faol</span>
                      <span class="mock-cell-id">INV-0329</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Float Cards -->
            <div class="mock-floating-card top-right-float">
              <div class="float-icon">📊</div>
              <div class="float-text">
                <span class="title">Samaradorlik</span>
                <span class="value">+12.4% o'sish</span>
              </div>
            </div>
            
            <div class="mock-floating-card bottom-left-float">
              <div class="float-icon">🖨️</div>
              <div class="float-text">
                <span class="title">Chop etish</span>
                <span class="value">40x30mm tayyor</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tizim afzalliklari gridi -->
        <div class="landing-features-grid">
          <div class="landing-feature-card">
            <div class="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <path d="M12 2C6.5 2 2 4.5 2 7v10c0 2.5 4.5 5 10 5s10-2.5 10-5V7c0-2.5-4.5-5-10-5z"></path>
                <path d="M2 7c0 2.5 4.5 5 10 5s10-2.5 10-5"></path>
                <path d="M2 12c0 2.5 4.5 5 10 5s10-2.5 10-5"></path>
              </svg>
            </div>
            <div>
              <h4 class="landing-feature-title">Real-Time Firestore Buluti</h4>
              <p class="landing-feature-desc">Barcha xodimlar ekranlarida ma'lumotlar sahifani yangilamasdan 1 soniyada jonli yangilanadi.</p>
            </div>
          </div>
          
          <div class="landing-feature-card">
            <div class="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M9 11l2 2 4-4"></path>
              </svg>
            </div>
            <div>
              <h4 class="landing-feature-title">Oflayn Bardoshlilik (Cache)</h4>
              <p class="landing-feature-desc">Internet uzilganda ham ishlashda davom eting, aloqa tiklanishi bilan fonda avtomatik sinxronlashadi.</p>
            </div>
          </div>

          <div class="landing-feature-card">
            <div class="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <rect x="3" y="3" width="6" height="6" rx="1"></rect>
                <rect x="15" y="15" width="6" height="6" rx="1"></rect>
                <rect x="3" y="15" width="6" height="6" rx="1"></rect>
                <path d="M6 9v6M6 12h12v3"></path>
              </svg>
            </div>
            <div>
              <h4 class="landing-feature-title">Ierarxik Geografik Tuzilish</h4>
              <p class="landing-feature-desc">Tashkilot ➡️ Qavat ➡️ Xona bo'yicha cheksiz darajali geometrik joylashuv va jihozlar ierarxiyasi.</p>
            </div>
          </div>

          <div class="landing-feature-card">
            <div class="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div>
              <h4 class="landing-feature-title">Excel Zaxiralash (Backup)</h4>
              <p class="landing-feature-desc">Barcha jihozlarni bitta tugma bilan Excelga eksport qiling yoki Excel import orqali bazani noldan qayta tiklang.</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- O'ng Ustun: Kirish / Ro'yxatdan O'tish Formasi -->
      <div class="landing-auth-section">
        <div class="auth-card" style="box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); background-color: rgba(30, 41, 59, 0.4); backdrop-filter: blur(12px); width: 100%; max-width: 400px; padding: 2rem; border-radius: 16px;">
          <div class="auth-header">
            <div class="auth-logo" style="margin-bottom: 0.5rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="28" height="28" style="color: var(--accent);"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
              <span class="auth-logo-text">Kirish Tizimi</span>
            </div>
            <p class="auth-subtitle" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
              {{ authForm.mode === 'LOGIN' ? "Moddiy boyliklar va aktivlar hisobi tizimi" : "Yangi hisob yaratish (Auto-provisioning)" }}
            </p>
          </div>

          <form @submit.prevent="submitAuth" class="auth-form">
            <div class="form-group" style="width: 100%; margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.8rem; margin-bottom: 0.35rem;">E-mail (Elektron Pochta) *</label>
              <input type="email" v-model="authForm.email" placeholder="xodim@tashkilot.uz" style="width: 100%; padding: 0.55rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);" required>
            </div>

            <div class="form-group" style="width: 100%; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="font-size: 0.8rem;">Maxfiy Parol *</label>
                <button type="button" @click="isForgotPasswordModalOpen = true" class="auth-toggle-btn-link" style="font-size: 0.7rem; color: var(--accent); background: none; border: none; padding: 0; cursor: pointer;">Parolni unutdingizmi?</button>
              </div>
              <input type="password" v-model="authForm.password" placeholder="••••••••" minlength="6" style="width: 100%; padding: 0.55rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);" required>
            </div>

            <!-- Ro'yxatdan o'tish tasdiqlash -->
            <div v-if="authForm.mode === 'REGISTER'" class="form-group" style="width: 100%; margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.8rem; margin-bottom: 0.35rem;">Parolni Tasdiqlang *</label>
              <input type="password" v-model="authForm.confirmPassword" placeholder="••••••••" minlength="6" style="width: 100%; padding: 0.55rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);" required>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-size: 0.95rem; margin-top: 0.5rem; border-radius: 8px;">
              {{ authForm.mode === 'LOGIN' ? 'Tizimga Kirish' : 'Ro\'yxatdan O\'tish' }}
            </button>

            <div class="auth-toggle-link-wrapper" style="margin-top: 1rem; text-align: center; font-size: 0.8rem; color: var(--text-secondary);">
              <span>{{ authForm.mode === 'LOGIN' ? "Tizimda birinchi marta ishtirok etyapsizmi?" : "Profilingiz bormi?" }} </span>
              <button type="button" @click="authForm.mode = authForm.mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'" class="auth-toggle-btn-link" style="color: var(--accent); background: none; border: none; padding: 0; cursor: pointer; font-weight: 600;">
                {{ authForm.mode === 'LOGIN' ? 'Ro\'yxatdan O\'tish' : 'Tizimga Kirish' }}
              </button>
            </div>

            <div style="margin-top: 1.25rem; text-align: center; font-size: 0.7rem; color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; width: 100%;">
              Tizimga kirish orqali siz bizning 
              <button type="button" @click="openPrivacyModalWithTitle('Maxfiylik Siyosati')" class="auth-toggle-btn-link" style="font-size: 0.7rem; text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; color: var(--text-secondary);">Maxfiylik Siyosati</button> 
              va 
              <button type="button" @click="openPrivacyModalWithTitle('Foydalanish Shartlari')" class="auth-toggle-btn-link" style="font-size: 0.7rem; text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; color: var(--text-secondary);">Foydalanish Shartlari</button> 
              ga rozilik bildirasiz.
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL OYNA: PAROLNI TIKLASh (FORGOT PASSWORD) -->
  <div class="modal-overlay" :class="{ open: isForgotPasswordModalOpen }" role="dialog" aria-modal="true">
    <div class="modal-card" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">Parolni Tiklash</h3>
        <button type="button" class="close-btn" @click="isForgotPasswordModalOpen = false">&times;</button>
      </div>
      <form @submit.prevent="submitForgotPassword">
        <div class="modal-body" style="gap: 1rem;">
          <p class="input-helper" style="line-height: 1.4; text-transform: none; font-size: 0.75rem; color: var(--text-secondary);">Elektron pochtangizni kiriting. Biz sizga maxfiy parolni tiklash havolasini yuboramiz.</p>
          <div class="form-group" style="width: 100%;">
            <label>E-mail (Elektron Pochta) *</label>
            <input type="email" v-model="forgotEmail" placeholder="xodim@tashkilot.uz" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" @click="isForgotPasswordModalOpen = false" class="btn btn-secondary">Bekor Qilish</button>
          <button type="submit" class="btn btn-primary">Havola Yuborish</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL OYNA: MAXFIYLIK SIYOSATI VA SHARTNOMALAR -->
  <div class="modal-overlay" :class="{ open: isPrivacyModalOpen }" role="dialog" aria-modal="true">
    <div class="modal-card" style="max-width: 550px;">
      <div class="modal-header">
        <h3 class="modal-title">{{ privacyModalTitle }}</h3>
        <button type="button" class="close-btn" @click="isPrivacyModalOpen = false">&times;</button>
      </div>
      <div class="modal-body" style="max-height: 55vh; overflow-y: auto; line-height: 1.6; font-size: 0.8rem; gap: 1rem; color: var(--text-primary);">
        <h4 style="color: var(--accent); margin-top: 0.5rem; font-size: 0.85rem; font-weight: 600;">1. Ma'lumotlarni yig'ish va undan foydalanish</h4>
        <p>Tizim faqatgina moddiy aktivlarni hisobga olish, ularni inventarizatsiya qilish va QR stikerlarni chop etish maqsadida foydalanuvchilarning elektron pochta manzillarini hamda tizimdagi faolligini qayd etadi. Hech qanday shaxsiy ma'lumotlar tashqi uchinchi shaxslarga berilmaydi yoki sotilmaydi.</p>
        
        <h4 style="color: var(--accent); margin-top: 0.5rem; font-size: 0.85rem; font-weight: 600;">2. Baza va Parollar Xavfsizligi</h4>
        <p>Barcha maxfiy parollar Google Firebase Authentication xavfsizlik protokollari yordamida shifrlangan holatda saqlanadi. Ma'lumotlar bazasi Cloud Firestore xavfsizlik qoidalari bilan to'liq himoyalangan.</p>
        
        <h4 style="color: var(--accent); margin-top: 0.5rem; font-size: 0.85rem; font-weight: 600;">3. Foydalanish Shartlari</h4>
        <p>Ushbu platformadan faqat tashkilot rahbariyati tomonidan tasdiqlangan va ro'yxatdan o'tgan mas'ul xodimlar (Admin, Staff, Viewer rollari bilan) o'z xizmat vazifalarini bajarish maqsadida foydalanishlari shart. Tizim resurslaridan g'ayriqonuniy foydalanish yoki ma'lumotlarni qasddan buzish qat'iyan man etiladi.</p>
      </div>
      <div class="modal-footer">
        <button type="button" @click="isPrivacyModalOpen = false" class="btn btn-primary">Tushundim</button>
      </div>
    </div>
  </div>

  <!-- MODAL OYNA: XODIMLAR VA ROLLAR BOSHQARUVI (ADMIN USER MANAGEMENT) -->
  <div class="modal-overlay" :class="{ open: isAdminUsersModalOpen }" role="dialog" aria-modal="true">
    <div class="modal-card" style="max-width: 720px; width: 90%;">
      <div class="modal-header">
        <h3 class="modal-title">👥 Xodimlar va Rollar Boshqaruvi</h3>
        <button type="button" class="close-btn" @click="isAdminUsersModalOpen = false">&times;</button>
      </div>
      <div class="modal-body" style="padding: 1.25rem; max-height: 60vh; overflow-y: auto;">
        <p class="input-helper" style="margin-bottom: 0.75rem; text-transform: none; font-size: 0.75rem; color: var(--text-secondary);">
          Tizimda ro'yxatdan o'tgan xodimlarning rollarini belgilang. Ehtiyot bo'ling, rolni noto'g'ri o'zgartirish tizim xavfsizligiga ta'sir qilishi mumkin.
        </p>
        
        <div style="overflow-x: auto; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-input);">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; min-width: 500px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background-color: rgba(255,255,255,0.02);">
                <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary);">Xodim pochtasi</th>
                <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary); width: 130px;">Joriy Rol</th>
                <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary); width: 160px;">Rolni o'zgartirish</th>
                <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary); width: 80px; text-align: center;">Amal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in adminUsers" :key="user.id" style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 1rem; font-weight: 500;">
                  {{ user.email }}
                  <span v-if="currentUser && currentUser.uid === user.id" style="color: var(--accent); font-size: 0.7rem; font-weight: 600; margin-left: 4px;">(Siz)</span>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <span class="user-role-pill" :class="user.role">{{ user.role.toUpperCase() }}</span>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <select v-if="currentUser && currentUser.uid !== user.id" v-model="user.role" @change="changeUserRole(user.id, user.role)" class="admin-role-select" style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <span v-else style="font-size: 0.75rem; color: var(--text-secondary);">O'zgartirib bo'lmaydi</span>
                </td>
                <td style="padding: 0.75rem 1rem; text-align: center;">
                  <button v-if="currentUser && currentUser.uid !== user.id" @click="deleteUser(user.id, user.email)" class="user-delete-btn" style="background: none; border: none; color: var(--danger); cursor: pointer;" title="Xodimni o'chirish">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                  <span v-else style="color: var(--text-secondary); font-size: 0.75rem;">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" @click="isAdminUsersModalOpen = false" class="btn btn-secondary">Yopish</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* App.vue maxsus tahrirlari uchun scoped style (Asosiylari global style.css ichida yuklanmoqda) */
.user-role-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}
.user-role-pill.admin {
  background-color: rgba(79, 70, 229, 0.12);
  color: var(--accent);
}
.user-role-pill.staff {
  background-color: rgba(16, 185, 129, 0.12);
  color: var(--success);
}
.user-role-pill.viewer {
  background-color: rgba(148, 163, 184, 0.12);
  color: var(--text-secondary);
}

.add-sub-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.location-tree-item:hover .add-sub-btn {
  opacity: 1;
}

.add-sub-btn:hover {
  color: var(--accent);
}

.orgs-tree-wrapper {
  margin-top: 0.5rem;
}

.tree-toggle-arrow {
  display: inline-block;
  width: 14px;
  text-align: center;
}

/* Modal overlay animatsiyasi va boshqalar */
.modal-overlay {
  display: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.modal-overlay.open {
  display: flex !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.auth-overlay {
  display: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.auth-overlay.open {
  display: block !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Excel drag and drop hovers */
.excel-drop-zone.dragover {
  border-color: var(--accent);
  background-color: rgba(79, 70, 229, 0.05);
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sortable::after {
  content: ' ↕';
  font-size: 0.65rem;
  opacity: 0.4;
}

.sortable.sorted::after {
  content: ' ▲';
  opacity: 0.8;
  color: var(--accent);
}

.sortable.sorted.desc::after {
  content: ' ▼';
  opacity: 0.8;
  color: var(--accent);
}

/* CSS stiker maxsus chop etish override rules */
@media print {
  body * {
    visibility: hidden;
  }
  #qrPrintModal, #qrPrintModal * {
    visibility: visible;
  }
}
</style>
