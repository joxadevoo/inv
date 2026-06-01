/**
 * ==========================================================================
 * MODDIY BOYLIKLAR INVENTARIZATSIYASI - FIREBASE ONLAYN INTERGRATSIYASI (APP.JS)
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  
  // TIZIM HOLATI (STATE)
  let assets = [];
  let locations = [];
  
  // Chap panel akkordeon (ochilib-yopilish) holatlari
  let expandedNodes = {
    orgs: {},
    floors: {}
  };
  
  // Bulutli ma'lumotlar bazasi (Firebase Firestore ob'ekti)
  let db = null;
  let isOnlineMode = false;
  let unsubscribeAssets = null; // Snapshot listenerni to'xtatish uchun
  
  // Foydalanuvchi va uning roli (Auth state)
  let currentUser = null;
  let currentUserRole = "viewer"; // Standart: faqat ko'rish huquqi

  // Hozirda tanlangan hudud (Boshlang'ich qiymat: Global)
  let selectedLocation = {
    type: "GLOBAL",
    org: "",
    floor: "",
    room: ""
  };

  let currentSortColumn = "id";
  let currentSortDirection = "asc";

  // DOM ELEMENTLARI
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const locationSidebar = document.getElementById("locationSidebar");
  const collapseSidebarBtn = document.getElementById("collapseSidebarBtn");
  const expandSidebarBtn = document.getElementById("expandSidebarBtn");
  const assetsTableBody = document.getElementById("assetsTableBody");
  const noDataMessage = document.getElementById("noDataMessage");
  const orgsTreeWrapper = document.getElementById("orgsTreeWrapper");
  const globalLocationItem = document.getElementById("globalLocationItem");
  
  // Breadcrumbs (Navigatsiya zanjiri)
  const bcOrg = document.getElementById("bcOrg");
  const bcArrow1 = document.getElementById("bcArrow1");
  const bcFloor = document.getElementById("bcFloor");
  const bcArrow2 = document.getElementById("bcArrow2");
  const bcRoom = document.getElementById("bcRoom");

  // Dashboard elementlari
  const totalAssetsCount = document.getElementById("totalAssetsCount");
  const totalAssetsValue = document.getElementById("totalAssetsValue");
  const activeAssetsCount = document.getElementById("activeAssetsCount");
  const repairAssetsCount = document.getElementById("repairAssetsCount");

  // Qidiruv va Filtrlar
  const assetSearchInput = document.getElementById("assetSearchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");

  // Modallar (Aktivlar uchun)
  const assetModal = document.getElementById("assetModal");
  const addAssetBtn = document.getElementById("addAssetBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const assetForm = document.getElementById("assetForm");

  // Dynamic dropdown selects
  const formAssetOrg = document.getElementById("formAssetOrg");
  const formAssetFloor = document.getElementById("formAssetFloor");
  const formAssetRoom = document.getElementById("formAssetRoom");

  // Modallar (Joylashuv / Hudud qo'shish uchun)
  const locationModal = document.getElementById("locationModal");
  const locationForm = document.getElementById("locationForm");
  const addOrgBtn = document.getElementById("addOrgBtn");
  const closeLocModalBtn = document.getElementById("closeLocModalBtn");
  const cancelLocModalBtn = document.getElementById("cancelLocModalBtn");
  const locFormType = document.getElementById("locFormType");
  const locParentOrg = document.getElementById("locParentOrg");
  const locParentFloor = document.getElementById("locParentFloor");
  const locNameInput = document.getElementById("locNameInput");
  const locInputLabel = document.getElementById("locInputLabel");
  const locationModalTitle = document.getElementById("locationModalTitle");

  // QR-kod modali elementlari
  const qrPrintModal = document.getElementById("qrPrintModal");
  const closeQrModalBtn = document.getElementById("closeQrModalBtn");
  const closeQrModalBtn2 = document.getElementById("closeQrModalBtn2");
  const executePrintStickerBtn = document.getElementById("executePrintStickerBtn");
  const stickerOrgName = document.getElementById("stickerOrgName");
  const stickerInvNum = document.getElementById("stickerInvNum");
  const stickerAssetName = document.getElementById("stickerAssetName");
  const stickerOwner = document.getElementById("stickerOwner");
  const stickerLocation = document.getElementById("stickerLocation");

  // Excel elementlari
  const exportExcelBtn = document.getElementById("exportExcelBtn");
  const triggerImportExcelBtn = document.getElementById("triggerImportExcelBtn");
  const importExcelInput = document.getElementById("importExcelInput");
  const excelDropZone = document.getElementById("excelDropZone");

  // FIREBASE BULUT ELEMENTLARI (NEW)
  const cloudSettingsBtn = document.getElementById("cloudSettingsBtn");
  const cloudStatusDot = document.getElementById("cloudStatusDot");
  const cloudStatusText = document.getElementById("cloudStatusText");
  const cloudSettingsModal = document.getElementById("cloudSettingsModal");
  const cloudSettingsForm = document.getElementById("cloudSettingsForm");
  const closeCloudModalBtn = document.getElementById("closeCloudModalBtn");
  const cancelCloudModalBtn = document.getElementById("cancelCloudModalBtn");
  const disconnectCloudBtn = document.getElementById("disconnectCloudBtn");
  
  // FIREBASE AUTH ELEMENTLARI (NEW)
  const authOverlay = document.getElementById("authOverlay");
  const authForm = document.getElementById("authForm");
  const authMode = document.getElementById("authMode");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authConfirmPasswordGroup = document.getElementById("authConfirmPasswordGroup");
  const authConfirmPassword = document.getElementById("authConfirmPassword");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const authSubtitle = document.getElementById("authSubtitle");
  const authToggleQuestionText = document.getElementById("authToggleQuestionText");
  const authToggleModeBtn = document.getElementById("authToggleModeBtn");
  
  const userProfileCard = document.getElementById("userProfileCard");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const userRoleBadge = document.getElementById("userRoleBadge");
  const logoutBtn = document.getElementById("logoutBtn");
  
  const cloudApiKey = document.getElementById("cloudApiKey");
  const cloudProjectId = document.getElementById("cloudProjectId");
  const cloudAppId = document.getElementById("cloudAppId");
  const cloudAuthDomain = document.getElementById("cloudAuthDomain");

  // FIREBASE PRODUCTION ELEMENTS (FORGOT PASSWORD, COMPLIANCE, USER MANAGEMENT)
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const closeForgotPasswordModalBtn = document.getElementById("closeForgotPasswordModalBtn");
  const cancelForgotPasswordBtn = document.getElementById("cancelForgotPasswordBtn");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const forgotEmail = document.getElementById("forgotEmail");
  const submitForgotPasswordBtn = document.getElementById("submitForgotPasswordBtn");

  const viewPrivacyLinkBtn = document.getElementById("viewPrivacyLinkBtn");
  const viewTermsLinkBtn = document.getElementById("viewTermsLinkBtn");
  const privacyModal = document.getElementById("privacyModal");
  const closePrivacyModalBtn = document.getElementById("closePrivacyModalBtn");
  const agreePrivacyBtn = document.getElementById("agreePrivacyBtn");
  const privacyModalTitle = document.getElementById("privacyModalTitle");
  const privacyModalBody = document.getElementById("privacyModalBody");

  const adminUsersManagementBtn = document.getElementById("adminUsersManagementBtn");
  const adminUsersModal = document.getElementById("adminUsersModal");
  const closeAdminUsersModalBtn = document.getElementById("closeAdminUsersModalBtn");
  const closeAdminUsersFooterBtn = document.getElementById("closeAdminUsersFooterBtn");
  const adminUsersTableBody = document.getElementById("adminUsersTableBody");



  /* ==========================================================================
     1. MAVZU (THEME) BOSHQARUVI
     ========================================================================== */
  const initTheme = () => {
    const savedTheme = localStorage.getItem("inv_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeButtonUI(savedTheme);
  };

  const updateThemeButtonUI = (theme) => {
    const btnText = themeToggleBtn.querySelector(".theme-btn-text");
    const sunIcon = themeToggleBtn.querySelector(".theme-sun-icon");
    if (theme === "light") {
      btnText.textContent = "Qorong'u Mavzu";
      sunIcon.style.transform = "rotate(0deg)";
    } else {
      btnText.textContent = "Yorug' Mavzu";
      sunIcon.style.transform = "rotate(180deg)";
    }
  };

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("inv_theme", newTheme);
    updateThemeButtonUI(newTheme);
  });

  // Chap panelni yopish/ochish boshqaruvi (Persisted in LocalStorage)
  if (collapseSidebarBtn && expandSidebarBtn && locationSidebar) {
    const isSidebarCollapsed = localStorage.getItem("inv_sidebar_collapsed") === "true";
    if (isSidebarCollapsed) {
      locationSidebar.classList.add("collapsed");
      expandSidebarBtn.style.display = "inline-flex";
    }

    collapseSidebarBtn.addEventListener("click", () => {
      locationSidebar.classList.add("collapsed");
      expandSidebarBtn.style.display = "inline-flex";
      localStorage.setItem("inv_sidebar_collapsed", "true");
    });

    expandSidebarBtn.addEventListener("click", () => {
      locationSidebar.classList.remove("collapsed");
      expandSidebarBtn.style.display = "none";
      localStorage.setItem("inv_sidebar_collapsed", "false");
    });
  }


  /* ==========================================================================
     2. DYNAMIC FIREBASE GOOGLE FIRESTORE INTEGRATSIYASI (BULUT ULANIShI)
     ========================================================================== */
  const initFirebaseConnection = () => {
    // LOYIHAGA BIRIKTIRILGAN STANDART DEFAULT KALITLAR (Siz taqdim etgan Firebase Config)
    const DEFAULT_FIREBASE_CONFIG = {
      apiKey: "AIzaSyAGWchAmnKk_-m0EPCJJWVI_ciFtkMyCjg",
      authDomain: "inven-8588f.firebaseapp.com",
      projectId: "inven-8588f",
      storageBucket: "inven-8588f.firebasestorage.app",
      messagingSenderId: "186511543097",
      appId: "1:186511543097:web:27cce312bacb03fd7576e8"
    };

    let savedConfig = localStorage.getItem("inv_firebase_config");
    
    // Agar foydalanuvchi keshida kalitlar hali yo'q bo'lsa, ularni standart qilib o'rnatamiz
    if (!savedConfig) {
      savedConfig = JSON.stringify(DEFAULT_FIREBASE_CONFIG);
      localStorage.setItem("inv_firebase_config", savedConfig);
    }
    
    if (savedConfig) {
      if (typeof firebase === 'undefined') {
        console.warn("Firebase SDK yuklanmagan (oflayn rejim yoki tarmoq xatosi). Standart LocalStorage rejimi faollashtirildi.");
        switchToLocalMode();
        return;
      }
      try {
        const config = JSON.parse(savedConfig);
        
        // 1. Firebase SDK ni ishga tushiramiz
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        
        db = firebase.firestore();
        isOnlineMode = true;
        
        // 2. Oflayn chidamlilikni (Offline Persistence) yoqamiz
        db.enablePersistence({ synchronizeTabs: true })
          .then(() => {
            console.log("Firebase Oflayn kesh rejasi muvaffaqiyatli faollashtirildi.");
          })
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              console.warn("Ko'p sahifalik oyna ochiq, kesh faqat bitta sahifada ishlaydi.");
            } else if (err.code === 'unimplemented') {
              console.error("Ushbu brauzer Firestore oflayn keshini qo'llab-quvvatlamaydi.");
            }
          });

        // 3. UI Status chirog'ini onlayn qilamiz (Breath Pulse yashil)
        cloudStatusDot.className = "cloud-status-dot online";
        cloudStatusText.textContent = "Onlayn Sinxron";
        disconnectCloudBtn.style.display = "block"; // Uzish tugmasini ko'rsatamiz

        // Formaga mavjud qiymatlarni kiritib qo'yamiz tahrirlash oson bo'lishi uchun
        cloudApiKey.value = config.apiKey || "";
        cloudProjectId.value = config.projectId || "";
        cloudAppId.value = config.appId || "";
        cloudAuthDomain.value = config.authDomain || "";

      } catch (err) {
        console.error("Firebase ulanish xatoligi:", err);
        switchToLocalMode();
      }
    } else {
      switchToLocalMode();
    }
  };

  const switchToLocalMode = () => {
    db = null;
    isOnlineMode = false;
    cloudStatusDot.className = "cloud-status-dot offline";
    cloudStatusText.textContent = "Oflayn Rejim";
    disconnectCloudBtn.style.display = "none";
  };

  // Bulut sozlamalari modalini ochish va yopish
  cloudSettingsBtn.addEventListener("click", () => openModal(cloudSettingsModal));
  closeCloudModalBtn.addEventListener("click", () => closeModal(cloudSettingsModal));
  cancelCloudModalBtn.addEventListener("click", () => closeModal(cloudSettingsModal));

  // Firebase konfiguratsiyasini saqlash
  cloudSettingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const config = {
      apiKey: cloudApiKey.value.trim(),
      projectId: cloudProjectId.value.trim(),
      appId: cloudAppId.value.trim(),
      authDomain: cloudAuthDomain.value.trim()
    };

    localStorage.setItem("inv_firebase_config", JSON.stringify(config));
    alert("Ulanish sozlamalari muvaffaqiyatli saqlandi! Yangi onlayn tizimni yuklash uchun dastur qayta yuklanadi.");
    window.location.reload(); // Tizimni qayta ishga tushiramiz toza Firebase bilan
  });

  // Bulutdan uzish (Disconnect)
  disconnectCloudBtn.addEventListener("click", () => {
    const proceed = confirm("Haqiqatan ham bulutli ma'lumotlar bazasidan uzilmoqchisiz?\nTizim standart oflayn LocalStorage rejimiga qaytadi.");
    if (proceed) {
      localStorage.removeItem("inv_firebase_config");
      alert("Tizim bulutdan uzildi! Dastur shaxsiy oflayn rejimga qaytadi.");
      window.location.reload();
    }
  });


  /* ==========================================================================
     2.1 FIREBASE AUTHENTICATION & ROLE-BASED ACCESS CONTROL (NEW)
     ========================================================================== */
  
  // Kirish va Ro'yxatdan o'tish rejimini almashtirish
  authToggleModeBtn.addEventListener("click", () => {
    const currentMode = authMode.value;
    if (currentMode === "LOGIN") {
      authMode.value = "REGISTER";
      authSubtitle.textContent = "Yangi hisob yaratish (Auto-provisioning)";
      authSubmitBtn.textContent = "Ro'yxatdan O'tish";
      authConfirmPasswordGroup.style.display = "block";
      authConfirmPassword.setAttribute("required", "required");
      authToggleQuestionText.textContent = "Profilingiz bormi?";
      authToggleModeBtn.textContent = "Tizimga Kirish";
    } else {
      authMode.value = "LOGIN";
      authSubtitle.textContent = "Moddiy boyliklar va aktivlar hisobi tizimi";
      authSubmitBtn.textContent = "Tizimga Kirish";
      authConfirmPasswordGroup.style.display = "none";
      authConfirmPassword.removeAttribute("required");
      authToggleQuestionText.textContent = "Tizimda birinchi marta ishtirok etyapsizmi?";
      authToggleModeBtn.textContent = "Ro'yxatdan O'tish";
    }
  });

  // Tizimdan chiqish tugmasi
  logoutBtn.addEventListener("click", () => {
    if (isOnlineMode && typeof firebase !== 'undefined') {
      firebase.auth().signOut()
        .then(() => {
          alert("Tizimdan muvaffaqiyatli chiqdingiz!");
        })
        .catch(err => {
          console.error("Auth chiqish xatosi:", err);
        });
    }
  });

  // Auth formasi topshirilganda
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isOnlineMode) {
      alert("Hozirda oflayn rejimda ishlayapsiz. Autentifikatsiya faqat onlayn Firebase rejimida faol bo'ladi!");
      return;
    }

    const email = authEmail.value.trim();
    const password = authPassword.value;
    const mode = authMode.value;

    if (mode === "LOGIN") {
      // Tizimga kirish
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = "Kirilmoqda...";
      
      firebase.auth().signInWithEmailAndPassword(email, password)
        .catch(err => {
          alert("Xatolik: E-mail yoki parol xato! Tafsilotlar: " + err.message);
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = "Tizimga Kirish";
        });
    } else {
      // Ro'yxatdan o'tish
      const confirmPass = authConfirmPassword.value;
      if (password !== confirmPass) {
        alert("Xatolik: Parollar mos kelmadi!");
        return;
      }

      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = "Ro'yxatdan o'tish kutilmoqda...";

      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          
          // Auto-provisioning: users kolleksiyasini tekshiramiz. Agar birinchi foydalanuvchi bo'lsa - admin, aks holda - staff bo'ladi.
          db.collection("users").get()
            .then(snapshot => {
              let role = "staff"; // Standart
              if (snapshot.empty) {
                role = "admin"; // Birinchi foydalanuvchi Admin bo'ladi!
              }
              
              // Foydalanuvchi profilini Firestore'ga yozamiz
              return db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                alert(`Tizimda muvaffaqiyatli ro'yxatdan o'tdingiz!\nSizning rolingiz: ${role.toUpperCase()}`);
              });
            })
            .catch(err => {
              console.error("Firestore user profile error:", err);
              // Agar users kolleksiyasini o'qish ruxsat berilmagan bo'lsa ham foydalanuvchini standard yozamiz
              return db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                role: "staff"
              });
            });
        })
        .catch(err => {
          alert("Ro'yxatdan o'tishda xatolik: " + err.message);
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = "Ro'yxatdan O'tish";
        });
    }
  });

  // Tizim Autentifikatsiya holatini jonli tinglaymiz (onAuthStateChanged)
  const setupAuthListener = () => {
    if (isOnlineMode && typeof firebase !== 'undefined') {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          currentUser = user;
          authOverlay.classList.remove("open"); // Login oynasini berkitamiz

          // Foydalanuvchining roliga qarab tizimdagi ruxsatlarni boshqaramiz
          db.collection("users").doc(user.uid).get()
            .then((doc) => {
              if (doc.exists) {
                currentUserRole = doc.data().role || "viewer";
              } else {
                // Agar profil bo'lmasa (masalan testda), yaratib viewer qilamiz
                currentUserRole = "viewer";
                db.collection("users").doc(user.uid).set({
                  uid: user.uid,
                  email: user.email,
                  role: "viewer"
                });
              }
              applyRolePermissions();
            })
            .catch((err) => {
              console.error("Rollar aniqlanmadi (viewer deb olinadi):", err);
              currentUserRole = "viewer";
              applyRolePermissions();
            });

          // Profil UI ni to'ldiramiz
          userEmailLabel.textContent = user.email;
          userProfileCard.style.display = "flex";
        } else {
          currentUser = null;
          currentUserRole = "viewer";
          authOverlay.classList.add("open"); // Login oynasini ko'rsatamiz
          userProfileCard.style.display = "none";
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = authMode.value === "LOGIN" ? "Tizimga Kirish" : "Ro'yxatdan O'tish";
          
          applyRolePermissions();
        }
      });
    } else {
      // Oflayn LocalStorage rejimida login oynasini berkitib qo'yamiz (barcha cheksiz ruxsatlar bilan)
      authOverlay.classList.remove("open");
      userProfileCard.style.display = "none";
      currentUserRole = "admin"; // LocalStorage rejimida to'liq admin
      applyRolePermissions();
    }
  };

  // Rolga asosan interfeys elementlarini (tugmalarni) bloklash yoki ochish
  const applyRolePermissions = () => {
    const isAdmin = (currentUserRole === "admin");
    const isStaff = (currentUserRole === "admin" || currentUserRole === "staff");

    // 1. Yangi jihoz qo'shish tugmasi (#addAssetBtn) - Staff va Admin uchun ruxsat
    if (addAssetBtn) {
      addAssetBtn.style.display = isStaff ? "inline-flex" : "none";
    }

    // 2. Joylashuv qo'shish tugmasi (#addOrgBtn) - Faqat Admin uchun
    if (addOrgBtn) {
      addOrgBtn.style.display = isAdmin ? "inline-flex" : "none";
    }

    // 3. Bulut sozlamalari tugmasi (#cloudSettingsBtn) - Faqat Admin uchun
    if (cloudSettingsBtn) {
      cloudSettingsBtn.style.display = isAdmin ? "inline-flex" : "none";
    }

    // 4. Exceldan Import qilish (#triggerImportExcelBtn va excelDropZone) - Faqat Admin uchun
    if (triggerImportExcelBtn) {
      triggerImportExcelBtn.style.display = isAdmin ? "inline-flex" : "none";
    }
    if (excelDropZone) {
      excelDropZone.style.display = isAdmin ? "flex" : "none";
    }

    // 5. Admin Xodimlar Boshqaruvi tugmasi - Faqat Admin uchun
    if (adminUsersManagementBtn) {
      adminUsersManagementBtn.style.display = isAdmin ? "inline-flex" : "none";
    }

    // Rolga mos matn indikatori
    userRoleBadge.textContent = currentUserRole === "admin" ? "Admin" : (currentUserRole === "staff" ? "Staff" : "Viewer");
    userRoleBadge.className = "user-role-badge " + currentUserRole;
    
    // Qizil/Yashil rang berish
    if (currentUserRole === "admin") {
      userRoleBadge.style.color = "var(--accent)";
    } else if (currentUserRole === "staff") {
      userRoleBadge.style.color = "var(--success)";
    } else {
      userRoleBadge.style.color = "var(--text-secondary)";
    }

    // Jadvaldagi amallar tugmalarini (Tahrirlash / O'chirish) yangilaymiz
    renderLocationTree();
    filterAssets();
  };

  /* ==========================================================================
     2.2 MAXFIYLIK, PAROL TIKLASH VA XODIMLAR RO'YXATI BOSHQARUVI (NEW)
     ========================================================================== */
  
  // 1. Parolni tiklash modal oynasini boshqarish
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
      forgotEmail.value = authEmail.value; // pre-fill email if entered
      forgotPasswordModal.classList.add("open");
    });
  }
  if (closeForgotPasswordModalBtn) {
    closeForgotPasswordModalBtn.addEventListener("click", () => {
      forgotPasswordModal.classList.remove("open");
    });
  }
  if (cancelForgotPasswordBtn) {
    cancelForgotPasswordBtn.addEventListener("click", () => {
      forgotPasswordModal.classList.remove("open");
    });
  }
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = forgotEmail.value.trim();
      if (!email) return;

      submitForgotPasswordBtn.disabled = true;
      submitForgotPasswordBtn.textContent = "Yuborilmoqda...";

      firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
          alert("Parolni tiklash havolasi elektron pochtangizga muvaffaqiyatli yuborildi!\nIltimos, pochtangizni tekshiring.");
          forgotPasswordModal.classList.remove("open");
        })
        .catch(err => {
          alert("Parolni tiklashda xatolik yuz berdi: " + err.message);
        })
        .finally(() => {
          submitForgotPasswordBtn.disabled = false;
          submitForgotPasswordBtn.textContent = "Havola Yuborish";
        });
    });
  }

  // 2. Maxfiylik siyosati va Foydalanish shartlari modalini boshqarish
  const openPrivacyModal = (title) => {
    privacyModalTitle.textContent = title;
    privacyModal.classList.add("open");
  };

  if (viewPrivacyLinkBtn) {
    viewPrivacyLinkBtn.addEventListener("click", () => {
      openPrivacyModal("Maxfiylik Siyosati");
    });
  }
  if (viewTermsLinkBtn) {
    viewTermsLinkBtn.addEventListener("click", () => {
      openPrivacyModal("Foydalanish Shartlari");
    });
  }
  if (closePrivacyModalBtn) {
    closePrivacyModalBtn.addEventListener("click", () => {
      privacyModal.classList.remove("open");
    });
  }
  if (agreePrivacyBtn) {
    agreePrivacyBtn.addEventListener("click", () => {
      privacyModal.classList.remove("open");
    });
  }

  // 3. Admin: Foydalanuvchilar (Xodimlar) va Rollar ro'yxatini yuklash/boshqarish
  let usersUnsubscribe = null;

  if (adminUsersManagementBtn) {
    adminUsersManagementBtn.addEventListener("click", () => {
      if (!isOnlineMode || typeof firebase === 'undefined' || !db) {
        alert("Foydalanuvchilar boshqaruvi faqat onlayn Firebase rejimida faol bo'ladi!");
        return;
      }

      adminUsersModal.classList.add("open");
      
      // Boshlang'ich yuklash xabari
      adminUsersTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            Xodimlar ro'yxati yuklanmoqda...
          </td>
        </tr>
      `;

      // Agar oldingi obuna bo'lsa, o'chiramiz
      if (usersUnsubscribe) usersUnsubscribe();

      // Foydalanuvchilar ro'yxatini jonli yuklaymiz
      usersUnsubscribe = db.collection("users").orderBy("email").onSnapshot((snapshot) => {
        adminUsersTableBody.innerHTML = "";
        
        if (snapshot.empty) {
          adminUsersTableBody.innerHTML = `
            <tr>
              <td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                Tizimda ro'yxatdan o'tgan xodimlar topilmadi.
              </td>
            </tr>
          `;
          return;
        }

        snapshot.forEach((doc) => {
          const userData = doc.data();
          const userId = doc.id;
          const userEmail = userData.email || "Noma'lum";
          const userRole = userData.role || "viewer";
          
          const isMe = (currentUser && currentUser.uid === userId);

          // Rolni tahrirlash dropdowni (O'zining rolini o'zgartira olmaydi)
          let selectHtml = "";
          if (isMe) {
            selectHtml = `<span style="font-size: 0.75rem; color: var(--text-secondary);">O'z rolingizni o'zgartira olmaysiz</span>`;
          } else {
            selectHtml = `
              <select class="admin-role-select" data-user-id="${userId}">
                <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="staff" ${userRole === 'staff' ? 'selected' : ''}>Staff</option>
                <option value="viewer" ${userRole === 'viewer' ? 'selected' : ''}>Viewer</option>
              </select>
            `;
          }

          // Xodimni o'chirish tugmasi (O'zini o'chira olmaydi)
          let deleteBtnHtml = "";
          if (isMe) {
            deleteBtnHtml = `<span style="color: var(--text-secondary); font-size: 0.75rem;">—</span>`;
          } else {
            deleteBtnHtml = `
              <button class="user-delete-btn" data-user-id="${userId}" data-email="${userEmail}" title="Xodimni o'chirish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            `;
          }

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td style="font-weight: 500;">
              ${escapeHtml(userEmail)} ${isMe ? '<span style="color: var(--accent); font-size: 0.7rem; font-weight: 600; margin-left: 4px;">(Siz)</span>' : ''}
            </td>
            <td>
              <span class="user-role-pill ${userRole}">${userRole.toUpperCase()}</span>
            </td>
            <td>
              ${selectHtml}
            </td>
            <td style="text-align: center;">
              ${deleteBtnHtml}
            </td>
          `;

          adminUsersTableBody.appendChild(tr);
        });

        // Dropdown o'zgarganda rolni yangilash
        adminUsersTableBody.querySelectorAll(".admin-role-select").forEach((select) => {
          select.addEventListener("change", (e) => {
            const targetUserId = e.target.getAttribute("data-user-id");
            const newRole = e.target.value;

            db.collection("users").doc(targetUserId).update({
              role: newRole
            }).then(() => {
              console.log(`Xodim ${targetUserId} rolig ${newRole} ga o'zgartirildi`);
            }).catch((err) => {
              alert("Rolni o'zgartirishda xatolik yuz berdi: " + err.message);
            });
          });
        });

        // O'chirish tugmasi bosilganda
        adminUsersTableBody.querySelectorAll(".user-delete-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const btnEl = e.currentTarget;
            const targetUserId = btnEl.getAttribute("data-user-id");
            const targetEmail = btnEl.getAttribute("data-email");

            const confirmDelete = confirm(`Haqiqatan ham "${targetEmail}" xodimi profilini o'chirmoqchisiz?\nUshbu xodim qaytib tizimga kira olmaydi.`);
            if (confirmDelete) {
              db.collection("users").doc(targetUserId).delete()
                .then(() => {
                  console.log(`Xodim ${targetEmail} muvaffaqiyatli o'chirildi`);
                })
                .catch((err) => {
                  alert("Xodimni o'chirishda xatolik yuz berdi: " + err.message);
                });
            }
          });
        });

      }, (err) => {
        console.error("Xodimlar ro'yxatini yuklashda xatolik:", err);
        adminUsersTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
              Xatolik: Xodimlar ro'yxatini yuklash taqiqlandi!
            </td>
          </tr>
        `;
      });
    });
  }

  if (closeAdminUsersModalBtn) {
    closeAdminUsersModalBtn.addEventListener("click", () => {
      adminUsersModal.classList.remove("open");
      if (usersUnsubscribe) {
        usersUnsubscribe();
        usersUnsubscribe = null;
      }
    });
  }

  if (closeAdminUsersFooterBtn) {
    closeAdminUsersFooterBtn.addEventListener("click", () => {
      adminUsersModal.classList.remove("open");
      if (usersUnsubscribe) {
        usersUnsubscribe();
        usersUnsubscribe = null;
      }
    });
  }


  /* ==========================================================================
     3. MA'LUMOTLARNI YUKLASH (ONLAYN JONLI TINGLOVChILAR VA LOCALSTORAGE)
     ========================================================================== */
  const loadDatabase = () => {
    if (isOnlineMode && db) {
      // ONLAYN REJIM:
      
      // 1. Hududlar ierarxiyasini Firestore'dan yuklaymiz
      db.collection("locations").doc("tree").get()
        .then((doc) => {
          if (doc.exists) {
            locations = doc.data().data || [];
          } else {
            // Agar Firestore-da hali yo'q bo'lsa, LocalStorage yoki data.js dagi namunani onlayn yuklaymiz
            locations = getFallbackLocations();
            db.collection("locations").doc("tree").set({ data: locations });
          }
          
          // Agar onlayn bazadagi hududlar bo'sh bo'lsa, namunaviy ma'lumotlarni yuklaymiz
          if (!locations || locations.length === 0) {
            locations = [...INITIAL_LOCATIONS];
            db.collection("locations").doc("tree").set({ data: locations });
          }
          renderLocationTree();
        })
        .catch(err => {
          console.error("Firestore-dan joylashuvlarni yuklashda xatolik:", err);
          locations = getFallbackLocations();
          if (!locations || locations.length === 0) {
            locations = [...INITIAL_LOCATIONS];
          }
          renderLocationTree();
        });

      // 2. Jihozlarni real-time (Real vaqtda eshitish) rejimida tinglaymiz (onSnapshot)
      unsubscribeAssets = db.collection("assets").onSnapshot((snapshot) => {
        const fetched = [];
        snapshot.forEach(doc => {
          fetched.push(doc.data());
        });
        
        assets = fetched;
        
        // Ekranni va dashboard ko'rsatkichlarini real vaqtda yangilaymiz
        updateDashboard();
        filterAssets();
      }, (err) => {
        console.error("Firestore real-time snapshot xatosi:", err);
        // Oflayn keshlangan ma'lumotlar bilan ishlash
      });

    } else {
      // OFLAYN SHAXSIY REJIM (LocalStorage):
      locations = getFallbackLocations();
      
      // Agar oflayn keshda hududlar bo'sh bo'lsa, namunaviy ma'lumotlar yuklanadi va saqlanadi
      if (!locations || locations.length === 0) {
        locations = [...INITIAL_LOCATIONS];
        saveLocationsToLocal();
      }

      const localAssets = localStorage.getItem("inv_assets");
      if (localAssets) {
        try {
          assets = JSON.parse(localAssets);
        } catch (e) {
          assets = [...INITIAL_ASSETS];
          saveAssetsToLocal();
        }
      } else {
        assets = [...INITIAL_ASSETS];
        saveAssetsToLocal();
      }

      renderLocationTree();
      updateDashboard();
      filterAssets();
    }
  };

  // Joylashuv zaxirasini olish (Robust self-healing fallback)
  const getFallbackLocations = () => {
    const localLocations = localStorage.getItem("inv_locations");
    if (localLocations) {
      try {
        const parsed = JSON.parse(localLocations);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch(e) {}
    }
    return [...INITIAL_LOCATIONS];
  };

  const saveAssetsToLocal = () => {
    if (!isOnlineMode) {
      localStorage.setItem("inv_assets", JSON.stringify(assets));
    }
  };

  const saveLocationsToLocal = () => {
    if (isOnlineMode && db) {
      db.collection("locations").doc("tree").set({ data: locations })
        .catch(err => console.error("Firestore-ga hududlarni yozishda xatolik:", err));
    } else {
      localStorage.setItem("inv_locations", JSON.stringify(locations));
    }
  };


  /* ==========================================================================
     4. BREADCRUMBS VA DASHBOARD STATISTIKASI
     ========================================================================== */
  const updateBreadcrumbs = () => {
    if (selectedLocation.type === "GLOBAL") {
      bcOrg.textContent = "Barcha Aktivlar";
      bcArrow1.style.display = "none";
      bcFloor.style.display = "none";
      bcArrow2.style.display = "none";
      bcRoom.style.display = "none";
    } else if (selectedLocation.type === "ORG") {
      bcOrg.textContent = selectedLocation.org;
      bcArrow1.style.display = "none";
      bcFloor.style.display = "none";
      bcArrow2.style.display = "none";
      bcRoom.style.display = "none";
    } else if (selectedLocation.type === "FLOOR") {
      bcOrg.textContent = selectedLocation.org;
      bcArrow1.style.display = "inline";
      bcFloor.textContent = selectedLocation.floor;
      bcFloor.style.display = "inline";
      bcArrow2.style.display = "none";
      bcRoom.style.display = "none";
    } else if (selectedLocation.type === "ROOM") {
      bcOrg.textContent = selectedLocation.org;
      bcArrow1.style.display = "inline";
      bcFloor.textContent = selectedLocation.floor;
      bcFloor.style.display = "inline";
      bcArrow2.style.display = "inline";
      bcRoom.textContent = selectedLocation.room;
      bcRoom.style.display = "inline";
    }
  };

  const updateDashboard = () => {
    const currentList = getAssetsByLocation(selectedLocation);

    totalAssetsCount.textContent = currentList.length;

    const totalValuation = currentList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    totalAssetsValue.textContent = formatMoney(totalValuation);

    const activeCount = currentList.filter(item => item.status === "Ishlatilmoqda").length;
    activeAssetsCount.textContent = activeCount;

    const repairCount = currentList.filter(item => item.status === "Ta'mirlashda").length;
    repairAssetsCount.textContent = repairCount;
  };

  const getAssetsByLocation = (loc = selectedLocation) => {
    if (loc.type === "GLOBAL") return assets;
    if (loc.type === "ORG") return assets.filter(a => a.org === loc.org);
    if (loc.type === "FLOOR") return assets.filter(a => a.org === loc.org && a.floor === loc.floor);
    if (loc.type === "ROOM") return assets.filter(a => a.org === loc.org && a.floor === loc.floor && a.room === loc.room);
    return assets;
  };


  /* ==========================================================================
     5. SIDEBAR HUDUDLAR DARAXTINI CHIZISH VA BOSHQARISH
     ========================================================================== */
  const renderLocationTree = () => {
    orgsTreeWrapper.innerHTML = "";
    const isAdmin = (currentUserRole === "admin");

    locations.forEach(org => {
      // 1. Tashkilot
      const orgNode = document.createElement("div");
      orgNode.className = "org-node";
      
      // Accordion holati
      if (expandedNodes.orgs[org.name]) {
        orgNode.classList.add("expanded-node");
      }
      
      const isOrgActive = (selectedLocation.type === "ORG" && selectedLocation.org === org.name);
      
      let orgActions = "";
      if (isAdmin) {
        orgActions = `
          <div class="node-actions">
            <button class="action-icon-small add-floor-btn" data-org="${escapeHtml(org.name)}" title="Qavat qo'shish">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button class="action-icon-small delete-node-btn" data-type="ORG" data-org="${escapeHtml(org.name)}" title="Tashkilotni o'chirish">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        `;
      }

      orgNode.innerHTML = `
        <div class="location-tree-item org-item-row ${isOrgActive ? 'active' : ''}" data-org="${escapeHtml(org.name)}">
          <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          <svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 21H2V3h20z"></path><path d="M7 21h10V10H7z"></path></svg>
          <span class="tree-text" title="${escapeHtml(org.name)}">${escapeHtml(org.name)}</span>
          ${orgActions}
        </div>
      `;

      const orgItem = orgNode.querySelector(".org-item-row");
      orgItem.addEventListener("click", (e) => {
        if (e.target.closest(".node-actions")) return;
        
        // Akkordeon ochish/yopish holatini yangilash
        const isExpanded = orgNode.classList.toggle("expanded-node");
        expandedNodes.orgs[org.name] = isExpanded;
        
        setActiveLocation({ type: "ORG", org: org.name });
      });

      // 2. Qavatlar
      org.floors.forEach(floor => {
        const floorNode = document.createElement("div");
        floorNode.className = "floor-node";
        
        // Accordion holati
        const floorKey = org.name + "::" + floor.name;
        if (expandedNodes.floors[floorKey]) {
          floorNode.classList.add("expanded-node");
        }
        
        const isFloorActive = (selectedLocation.type === "FLOOR" && selectedLocation.org === org.name && selectedLocation.floor === floor.name);
        
        let floorActions = "";
        if (isAdmin) {
          floorActions = `
            <div class="node-actions">
              <button class="action-icon-small add-room-btn" data-org="${escapeHtml(org.name)}" data-floor="${escapeHtml(floor.name)}" title="Xona qo'shish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <button class="action-icon-small delete-node-btn" data-type="FLOOR" data-org="${escapeHtml(org.name)}" data-floor="${escapeHtml(floor.name)}" title="Qavatni o'chirish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          `;
        }

        floorNode.innerHTML = `
          <div class="location-tree-item floor-item-row ${isFloorActive ? 'active' : ''}" data-org="${escapeHtml(org.name)}" data-floor="${escapeHtml(floor.name)}">
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            <svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line></svg>
            <span class="tree-text" title="${escapeHtml(floor.name)}">${escapeHtml(floor.name)}</span>
            ${floorActions}
          </div>
        `;

        const floorItem = floorNode.querySelector(".floor-item-row");
        floorItem.addEventListener("click", (e) => {
          if (e.target.closest(".node-actions")) return;
          
          // Akkordeon ochish/yopish holatini yangilash
          const isExpanded = floorNode.classList.toggle("expanded-node");
          expandedNodes.floors[floorKey] = isExpanded;
          
          setActiveLocation({ type: "FLOOR", org: org.name, floor: floor.name });
        });

        // 3. Xonalar
        floor.rooms.forEach(room => {
          const roomNode = document.createElement("div");
          roomNode.className = "room-node";
          
          const isRoomActive = (selectedLocation.type === "ROOM" && selectedLocation.org === org.name && selectedLocation.floor === floor.name && selectedLocation.room === room);
          
          let roomActions = "";
          if (isAdmin) {
            roomActions = `
              <div class="node-actions">
                <button class="action-icon-small delete-node-btn" data-type="ROOM" data-org="${escapeHtml(org.name)}" data-floor="${escapeHtml(floor.name)}" data-room="${escapeHtml(room)}" title="Xonani o'chirish">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            `;
          }

          roomNode.innerHTML = `
            <div class="location-tree-item room-item-row ${isRoomActive ? 'active' : ''}" data-org="${escapeHtml(org.name)}" data-floor="${escapeHtml(floor.name)}" data-room="${escapeHtml(room)}">
              <svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span class="tree-text" title="${escapeHtml(room)}">${escapeHtml(room)}</span>
              ${roomActions}
            </div>
          `;

          const roomItem = roomNode.querySelector(".room-item-row");
          roomItem.addEventListener("click", (e) => {
            if (e.target.closest(".node-actions")) return;
            setActiveLocation({ type: "ROOM", org: org.name, floor: floor.name, room: room });
          });

          floorNode.appendChild(roomNode);
        });

        orgNode.appendChild(floorNode);
      });

      orgsTreeWrapper.appendChild(orgNode);
    });

    attachTreeActionListeners();
  };

  const setActiveLocation = (loc) => {
    selectedLocation = loc;
    
    document.querySelectorAll(".location-tree-item").forEach(item => item.classList.remove("active"));
    
    if (loc.type === "GLOBAL") {
      globalLocationItem.classList.add("active");
    } else if (loc.type === "ORG") {
      const match = document.querySelector(`.org-item-row[data-org="${CSS.escape(loc.org)}"]`);
      if (match) match.classList.add("active");
    } else if (loc.type === "FLOOR") {
      const match = document.querySelector(`.floor-item-row[data-org="${CSS.escape(loc.org)}"][data-floor="${CSS.escape(loc.floor)}"]`);
      if (match) match.classList.add("active");
    } else if (loc.type === "ROOM") {
      const match = document.querySelector(`.room-item-row[data-org="${CSS.escape(loc.org)}"][data-floor="${CSS.escape(loc.floor)}"][data-room="${CSS.escape(loc.room)}"]`);
      if (match) match.classList.add("active");
    }

    updateBreadcrumbs();
    updateDashboard();
    filterAssets();
  };

  globalLocationItem.addEventListener("click", () => {
    setActiveLocation({ type: "GLOBAL", org: "", floor: "", room: "" });
  });


  /* ==========================================================================
     6. SIDEBAR: HUDUDLARNI TIZIMDA QO'SHISH VA O'CHIRISH
     ========================================================================== */
  const attachTreeActionListeners = () => {
    
    // Qavat qo'shish
    document.querySelectorAll(".add-floor-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const orgName = btn.dataset.org;
        locationModalTitle.textContent = `"${orgName}" uchun Qavat Qo'shish`;
        locFormType.value = "FLOOR";
        locParentOrg.value = orgName;
        locInputLabel.textContent = "Qavat Nomi *";
        locNameInput.placeholder = "Masalan: 1-qavat...";
        locNameInput.value = "";
        openModal(locationModal);
      });
    });

    // Xona qo'shish
    document.querySelectorAll(".add-room-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const orgName = btn.dataset.org;
        const floorName = btn.dataset.floor;
        locationModalTitle.textContent = `"${orgName} ➡️ ${floorName}" uchun Xona Qo'shish`;
        locFormType.value = "ROOM";
        locParentOrg.value = orgName;
        locParentFloor.value = floorName;
        locInputLabel.textContent = "Xona Nomi *";
        locNameInput.placeholder = "Masalan: 302-Dasturchilar Xonasi...";
        locNameInput.value = "";
        openModal(locationModal);
      });
    });

    // Hududni o'chirish (Cascade)
    document.querySelectorAll(".delete-node-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        const orgName = btn.dataset.org;
        const floorName = btn.dataset.floor;
        const roomName = btn.dataset.room;

        let confirmMsg = "";
        if (type === "ORG") {
          confirmMsg = `Haqiqatan ham "${orgName}" tashkilotini o'chirmoqchisiz?\nTashkilot o'chirilganda uning ichidagi barcha qavatlar, xonalar va ularga tegishli jihozlar ham onlayn bazadan butunlay o'chib ketadi!`;
        } else if (type === "FLOOR") {
          confirmMsg = `Haqiqatan ham "${orgName} ➡️ ${floorName}" qavatini o'chirmoqchisiz?\nQavat o'chirilganda uning ichidagi barcha xonalar va ulardagi jihozlar ham onlayn bazadan butunlay o'chib ketadi!`;
        } else if (type === "ROOM") {
          confirmMsg = `Haqiqatan ham "${orgName} ➡️ ${floorName} ➡️ ${roomName}" xonasini o'chirmoqchisiz?\nXona o'chirilganda undagi barcha jihozlar ham onlayn bazadan butunlay o'chib ketadi!`;
        }

        const proceed = confirm(confirmMsg);
        if (!proceed) return;

        // Olayn kolleksiyalarni tozalash mantiqi
        if (type === "ORG") {
          locations = locations.filter(o => o.name !== orgName);
          deleteAssetsFromDatabase(a => a.org === orgName);
        } else if (type === "FLOOR") {
          const org = locations.find(o => o.name === orgName);
          if (org) org.floors = org.floors.filter(f => f.name !== floorName);
          deleteAssetsFromDatabase(a => a.org === orgName && a.floor === floorName);
        } else if (type === "ROOM") {
          const org = locations.find(o => o.name === orgName);
          if (org) {
            const floor = org.floors.find(f => f.name === floorName);
            if (floor) floor.rooms = floor.rooms.filter(r => r !== roomName);
          }
          deleteAssetsFromDatabase(a => a.org === orgName && a.floor === floorName && a.room === roomName);
        }

        saveLocationsToLocal(); // Onlayn yoki Oflayn saqlaydi
        renderLocationTree();

        let resetRequired = false;
        if (selectedLocation.type === "ORG" && selectedLocation.org === orgName) resetRequired = true;
        else if (selectedLocation.type === "FLOOR" && selectedLocation.org === orgName && selectedLocation.floor === floorName) resetRequired = true;
        else if (selectedLocation.type === "ROOM" && selectedLocation.org === orgName && selectedLocation.floor === floorName && selectedLocation.room === roomName) resetRequired = true;

        if (resetRequired) {
          setActiveLocation({ type: "GLOBAL", org: "", floor: "", room: "" });
        } else {
          // Mahalliy o'zgartirish LocalStorage rejimida zudlik bilan aks etishi uchun
          if (!isOnlineMode) {
            updateDashboard();
            filterAssets();
          }
        }
      });
    });
  };

  // Ulanish rejimiga ko'ra onlayn/oflayn o'chirishni ta'minlovchi yordamchi funksiya
  const deleteAssetsFromDatabase = (filterFn) => {
    const toDelete = assets.filter(filterFn);
    
    if (isOnlineMode && db) {
      toDelete.forEach(asset => {
        db.collection("assets").doc(asset.id).delete()
          .catch(err => console.error("Firestore-dan o'chirishda xato:", err));
      });
    } else {
      assets = assets.filter(a => !filterFn(a));
      saveAssetsToLocal();
    }
  };

  addOrgBtn.addEventListener("click", () => {
    locationModalTitle.textContent = "Yangi Tashkilot (Filial) Qo'shish";
    locFormType.value = "ORG";
    locInputLabel.textContent = "Tashkilot / Filial Nomi *";
    locNameInput.placeholder = "Masalan: Bosh Ofis...";
    locNameInput.value = "";
    openModal(locationModal);
  });

  closeLocModalBtn.addEventListener("click", () => closeModal(locationModal));
  cancelLocModalBtn.addEventListener("click", () => closeModal(locationModal));

  locationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = locFormType.value;
    const name = locNameInput.value.trim();
    const pOrg = locParentOrg.value;
    const pFloor = locParentFloor.value;

    if (!name) return;

    if (type === "ORG") {
      const exists = locations.some(o => o.name.toLowerCase() === name.toLowerCase());
      if (exists) { return alert("Xato: Ushbu tashkilot mavjud!"); }
      locations.push({ name, floors: [] });
      expandedNodes.orgs[name] = true;
    } else if (type === "FLOOR") {
      const org = locations.find(o => o.name === pOrg);
      if (org) {
        const exists = org.floors.some(f => f.name.toLowerCase() === name.toLowerCase());
        if (exists) { return alert("Xato: Ushbu qavat mavjud!"); }
        org.floors.push({ name, rooms: [] });
        expandedNodes.orgs[pOrg] = true;
        expandedNodes.floors[pOrg + "::" + name] = true;
      }
    } else if (type === "ROOM") {
      const org = locations.find(o => o.name === pOrg);
      if (org) {
        const floor = org.floors.find(f => f.name === pFloor);
        if (floor) {
          const exists = floor.rooms.some(r => r.toLowerCase() === name.toLowerCase());
          if (exists) { return alert("Xato: Ushbu xona mavjud!"); }
          floor.rooms.push(name);
          expandedNodes.orgs[pOrg] = true;
          expandedNodes.floors[pOrg + "::" + pFloor] = true;
        }
      }
    }

    saveLocationsToLocal();
    renderLocationTree();
    closeModal(locationModal);
  });


  /* ==========================================================================
     7. ZANJIRLI CASCADING SELECT DROPDOWNS FORM
     ========================================================================== */
  const populateOrgSelect = () => {
    formAssetOrg.innerHTML = "";
    if (locations.length === 0) {
      formAssetOrg.innerHTML = `<option value="">-- Dastlab Joylashuv yarating --</option>`;
      formAssetFloor.innerHTML = `<option value="">-- Yo'q --</option>`;
      formAssetRoom.innerHTML = `<option value="">-- Yo'q --</option>`;
      return;
    }

    locations.forEach(org => {
      const opt = document.createElement("option");
      opt.value = org.name;
      opt.textContent = org.name;
      formAssetOrg.appendChild(opt);
    });

    populateFloorSelect();
  };

  const populateFloorSelect = () => {
    formAssetFloor.innerHTML = "";
    const selectedOrgName = formAssetOrg.value;
    const org = locations.find(o => o.name === selectedOrgName);

    if (!org || org.floors.length === 0) {
      formAssetFloor.innerHTML = `<option value="">-- Qavat kiritilmagan --</option>`;
      formAssetRoom.innerHTML = `<option value="">-- Xona kiritilmagan --</option>`;
      return;
    }

    org.floors.forEach(floor => {
      const opt = document.createElement("option");
      opt.value = floor.name;
      opt.textContent = floor.name;
      formAssetFloor.appendChild(opt);
    });

    populateRoomSelect();
  };

  const populateRoomSelect = () => {
    formAssetRoom.innerHTML = "";
    const selectedOrgName = formAssetOrg.value;
    const selectedFloorName = formAssetFloor.value;

    const org = locations.find(o => o.name === selectedOrgName);
    if (!org) return;
    
    const floor = org.floors.find(f => f.name === selectedFloorName);
    if (!floor || floor.rooms.length === 0) {
      formAssetRoom.innerHTML = `<option value="">-- Xona kiritilmagan --</option>`;
      return;
    }

    floor.rooms.forEach(room => {
      const opt = document.createElement("option");
      opt.value = room;
      opt.textContent = room;
      formAssetRoom.appendChild(opt);
    });
  };

  formAssetOrg.addEventListener("change", populateFloorSelect);
  formAssetFloor.addEventListener("change", populateRoomSelect);


  /* ==========================================================================
     8. CRUD AMALLARI JADVALI MANTIQLARI
     ========================================================================== */
  const renderAssetsTable = (listToRender = getAssetsByLocation()) => {
    assetsTableBody.innerHTML = "";

    if (listToRender.length === 0) {
      noDataMessage.style.display = "flex";
      return;
    } else {
      noDataMessage.style.display = "none";
    }

    listToRender.forEach(asset => {
      const tr = document.createElement("tr");
      tr.id = `row-${asset.id}`;
      
      let statusClass = "zaxirada";
      if (asset.status === "Ishlatilmoqda") statusClass = "ishlatilmoqda";
      else if (asset.status === "Ta'mirlashda") statusClass = "tamirlashda";
      else if (asset.status === "Hisobdan chiqarilgan") statusClass = "hisobdan-chiqarilgan";

      const hierarchyPath = `
        <div style="font-weight: 500; font-size: 0.85rem;">${escapeHtml(asset.org)}</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 0.125rem;">
          ${escapeHtml(asset.floor)} ➡️ ${escapeHtml(asset.room)}
        </div>
      `;

      tr.innerHTML = `
        <td style="font-weight: 600; letter-spacing: -0.01em;">${escapeHtml(asset.id)}</td>
        <td style="font-weight: 500; white-space: normal; word-break: break-word;">${escapeHtml(asset.name)}</td>
        <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(asset.category)}</span></td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(asset.status)}</span></td>
        <td>${hierarchyPath}</td>
        <td style="font-weight: 500;">${escapeHtml(asset.owner || "—")}</td>
        <td style="font-weight: 600;">${formatMoney(asset.price)}</td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(asset.date || "—")}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-accent-outline print-qr-btn" data-id="${asset.id}" title="QR stiker chop etish">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 3px;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Stiker
            </button>
            ${(currentUserRole === "admin" || currentUserRole === "staff") ? `
              <button class="btn btn-secondary edit-asset-btn" data-id="${asset.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: var(--radius-sm);" title="Jihozni tahrirlash">
                Tahrirlash
              </button>
            ` : ""}
            ${(currentUserRole === "admin") ? `
              <button class="btn btn-danger-outline delete-asset-btn" data-id="${asset.id}" title="Jihozni o'chirish">
                O'chirish
              </button>
            ` : ""}
          </div>
        </td>
      `;
      assetsTableBody.appendChild(tr);
    });

    attachRowEventListeners();
  };

  const filterAssets = () => {
    const query = assetSearchInput.value.toLowerCase().trim();
    const cat = categoryFilter.value;
    const stat = statusFilter.value;

    let list = getAssetsByLocation(selectedLocation);

    const filtered = list.filter(asset => {
      const matchQuery = 
        asset.id.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        (asset.owner && asset.owner.toLowerCase().includes(query)) ||
        (asset.notes && asset.notes.toLowerCase().includes(query));

      const matchCat = (cat === "ALL") || (asset.category === cat);
      const matchStat = (stat === "ALL") || (asset.status === stat);

      return matchQuery && matchCat && matchStat;
    });

    sortAssetsList(filtered, currentSortColumn, currentSortDirection);
    renderAssetsTable(filtered);
  };

  const sortAssetsList = (list, column, direction) => {
    list.sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (column === "price") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Filtrlar ulanishi
  assetSearchInput.addEventListener("input", filterAssets);
  categoryFilter.addEventListener("change", filterAssets);
  statusFilter.addEventListener("change", filterAssets);

  document.querySelectorAll(".assets-table th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const column = th.dataset.sort;
      
      if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
      } else {
        currentSortColumn = column;
        currentSortDirection = "asc";
      }

      document.querySelectorAll(".assets-table th").forEach(h => h.classList.remove("sorted-asc", "sorted-desc"));
      th.classList.add(currentSortDirection === "asc" ? "sorted-asc" : "sorted-desc");

      filterAssets();
    });
  });

  const openModal = (modal) => { modal.classList.add("open"); };
  const closeModal = (modal) => { modal.classList.remove("open"); };

  closeModalBtn.addEventListener("click", () => closeModal(assetModal));
  cancelModalBtn.addEventListener("click", () => closeModal(assetModal));

  addAssetBtn.addEventListener("click", () => {
    if (locations.length === 0) {
      alert("Xato: Jihoz qo'shishdan oldin chap sidebarda Tashkilot -> Qavat -> Xona qo'shing!");
      return;
    }

    document.getElementById("modalTitle").textContent = "Yangi Aktiv Qo'shish";
    document.getElementById("assetFormAction").value = "ADD";
    document.getElementById("formAssetId").readOnly = false;
    
    assetForm.reset();
    document.getElementById("formAssetId").value = generateNextInventoryId();
    document.getElementById("formAssetDate").value = new Date().toISOString().split("T")[0];

    populateOrgSelect();

    // Sidebarda tanlangan hududni pre-select qilish
    if (selectedLocation.type === "ORG") {
      formAssetOrg.value = selectedLocation.org;
      populateFloorSelect();
    } else if (selectedLocation.type === "FLOOR") {
      formAssetOrg.value = selectedLocation.org;
      populateFloorSelect();
      formAssetFloor.value = selectedLocation.floor;
      populateRoomSelect();
    } else if (selectedLocation.type === "ROOM") {
      formAssetOrg.value = selectedLocation.org;
      populateFloorSelect();
      formAssetFloor.value = selectedLocation.floor;
      populateRoomSelect();
      formAssetRoom.value = selectedLocation.room;
    }

    openModal(assetModal);
  });

  const generateNextInventoryId = () => {
    if (assets.length === 0) return "INV-26-0001";
    let maxNum = 0;
    assets.forEach(a => {
      const match = a.id.match(/INV-26-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `INV-26-${(maxNum + 1).toString().padStart(4, "0")}`;
  };

  const attachRowEventListeners = () => {
    
    // Tahrirlash
    document.querySelectorAll(".edit-asset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const asset = assets.find(a => a.id === id);
        if (!asset) return;

        document.getElementById("modalTitle").textContent = "Jihozni Tahrirlash";
        document.getElementById("assetFormAction").value = "EDIT";
        document.getElementById("originalAssetId").value = asset.id;
        
        document.getElementById("formAssetId").value = asset.id;
        document.getElementById("formAssetId").readOnly = true;
        document.getElementById("formAssetName").value = asset.name;
        document.getElementById("formAssetCategory").value = asset.category;
        document.getElementById("formAssetStatus").value = asset.status;
        
        populateOrgSelect();
        formAssetOrg.value = asset.org;
        populateFloorSelect();
        formAssetFloor.value = asset.floor;
        populateRoomSelect();
        formAssetRoom.value = asset.room;

        document.getElementById("formAssetOwner").value = asset.owner || "";
        document.getElementById("formAssetPrice").value = asset.price || "";
        document.getElementById("formAssetDate").value = asset.date || "";
        document.getElementById("formAssetNotes").value = asset.notes || "";

        openModal(assetModal);
      });
    });

    // O'chirish
    document.querySelectorAll(".delete-asset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const asset = assets.find(a => a.id === id);
        if (!asset) return;

        const confirmDelete = confirm(`Haqiqatan ham "${asset.name}" (${asset.id}) jihozini o'chirmoqchisiz?`);
        if (confirmDelete) {
          if (isOnlineMode && db) {
            db.collection("assets").doc(id).delete()
              .catch(err => console.error("Firestore o'chirish xatosi:", err));
          } else {
            assets = assets.filter(a => a.id !== id);
            saveAssetsToLocal();
            updateDashboard();
            filterAssets();
          }
        }
      });
    });

    // QR-Stiker
    document.querySelectorAll(".print-qr-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const asset = assets.find(a => a.id === id);
        if (!asset) return;
        openStickerModal(asset);
      });
    });
  };

  // Jihoz formasini saqlash
  assetForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const action = document.getElementById("assetFormAction").value;
    const originalId = document.getElementById("originalAssetId").value;

    const id = document.getElementById("formAssetId").value.trim();
    const name = document.getElementById("formAssetName").value.trim();
    const category = document.getElementById("formAssetCategory").value;
    const status = document.getElementById("formAssetStatus").value;
    const org = formAssetOrg.value;
    const floor = formAssetFloor.value;
    const room = formAssetRoom.value;
    const owner = document.getElementById("formAssetOwner").value.trim();
    const price = Number(document.getElementById("formAssetPrice").value) || 0;
    const date = document.getElementById("formAssetDate").value;
    const notes = document.getElementById("formAssetNotes").value.trim();

    if (!org || !floor || !room) {
      return alert("Xato: Iltimos, jihoz hududini to'liq tanlang!");
    }

    const timestampValue = (isOnlineMode && typeof firebase !== 'undefined' && firebase.firestore)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString();

    const assetObject = { id: (action === "ADD" ? id : originalId), name, category, status, org, floor, room, owner, price, date, notes, timestamp: timestampValue };

    if (isOnlineMode && db) {
      // ONLAYN: Firestore-ga yozamiz (onSnapshot avtomatik jadvalni render qiladi)
      if (action === "ADD") {
        const exists = assets.some(a => a.id.toLowerCase() === id.toLowerCase());
        if (exists) { return alert(`Xato: "${id}" inventar kodi band!`); }
      }
      
      db.collection("assets").doc(assetObject.id).set(assetObject)
        .then(() => closeModal(assetModal))
        .catch(err => alert("Bulutga yozishda xatolik yuz berdi: " + err.message));
    } else {
      // OFLAYN: LocalStorage-ga yozamiz
      if (action === "ADD") {
        const exists = assets.some(a => a.id.toLowerCase() === id.toLowerCase());
        if (exists) { return alert(`Xato: "${id}" inventar kodi band!`); }
        assets.push(assetObject);
      } else {
        const index = assets.findIndex(a => a.id === originalId);
        if (index !== -1) assets[index] = assetObject;
      }

      saveAssetsToLocal();
      updateDashboard();
      closeModal(assetModal);
      filterAssets();
    }
  });


  /* ==========================================================================
     9. QR STIKER (XPRINTER 40x30mm)
     ========================================================================== */
  const openStickerModal = (asset) => {
    stickerOrgName.textContent = asset.org.toUpperCase();
    stickerInvNum.textContent = asset.id;
    stickerAssetName.textContent = asset.name;
    stickerOwner.textContent = `Mas'ul: ${asset.owner || "—"}`;
    
    const flShort = asset.floor.replace(/[^0-9]/g, "");
    const rmShort = asset.room.split(" ")[0];
    stickerLocation.textContent = `Q: ${flShort || asset.floor} / X: ${rmShort}`;

    const qrCanvas = document.getElementById("stickerQrCanvas");
    const qrRawData = `AKTIV: ${asset.id}\nNOMI: ${asset.name}\nHUDUD: ${asset.org} -> ${asset.floor} -> ${asset.room}\nMAS'UL: ${asset.owner || "Yo'q"}\nHOLAT: ${asset.status}`;

    try {
      new QRious({
        element: qrCanvas,
        value: qrRawData,
        size: 140,
        background: "#ffffff",
        foreground: "#000000",
        level: "M"
      });
    } catch (err) {
      console.error(err);
    }

    openModal(qrPrintModal);
  };

  closeQrModalBtn.addEventListener("click", () => closeModal(qrPrintModal));
  closeQrModalBtn2.addEventListener("click", () => closeModal(qrPrintModal));
  executePrintStickerBtn.addEventListener("click", () => window.print());


  /* ==========================================================================
     10. EXCEL EKSPORT MANTIQLARI (EXPORT)
     ========================================================================== */
  exportExcelBtn.addEventListener("click", () => {
    const listToExport = getAssetsByLocation(selectedLocation);

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
  });


  /* ==========================================================================
     11. AQLLI EXCEL IMPORT MANTIQLARI (ONLAYN SINXRONLASh BILAN)
     ========================================================================== */
  triggerImportExcelBtn.addEventListener("click", () => importExcelInput.click());
  importExcelInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleExcelImportFile(file);
  });

  excelDropZone.addEventListener("click", () => importExcelInput.click());
  excelDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    excelDropZone.classList.add("dragover");
  });
  excelDropZone.addEventListener("dragleave", () => excelDropZone.classList.remove("dragover"));
  excelDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    excelDropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleExcelImportFile(file);
  });

  // Exceldan tiklash
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

        // AQLLI IERARXIK HUDUDLARNI QAYTA QURISH
        const importedAssets = [];
        const importedLocations = [];

        rawRows.forEach(row => {
          const id = row["Inventar Raqami"] || row["Inventar No"] || row["Inventar №"] || row["ID"];
          const name = row["Jihoz Nomi"] || row["Nomi"] || row["Name"];
          
          if (!id || !name) return;

          const orgName = (row["Tashkilot / Filial"] || row["Tashkilot"] || row["Filial"] || "Bosh Ofis").toString().trim();
          const floorName = (row["Qavat"] || row["Qavat Nomi"] || "1-qavat").toString().trim();
          const roomName = (row["Joylashgan Xonasi"] || row["Xona"] || row["Xona Nomi"] || "Umumiy xona").toString().trim();

          // Hudud xaritasini yig'ish
          let org = importedLocations.find(o => o.name.toLowerCase() === orgName.toLowerCase());
          if (!org) {
            org = { name: orgName, floors: [] };
            importedLocations.push(org);
          }

          let floor = org.floors.find(f => f.name.toLowerCase() === floorName.toLowerCase());
          if (!floor) {
            floor = { name: floorName, rooms: [] };
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
            notes: notes.toString().trim(),
            timestamp: (isOnlineMode && typeof firebase !== 'undefined' && firebase.firestore)
              ? firebase.firestore.FieldValue.serverTimestamp()
              : new Date().toISOString()
          });
        });

        // 3. Bazalarga yozish
        locations = importedLocations;
        saveLocationsToLocal(); // Onlayn bo'lsa Firestore'ga, oflayn bo'lsa LocalStorage'ga yozadi

        if (isOnlineMode && db) {
          // ONLAYNDA SINXRON TIKLASH:
          
          // Dastlab onlayn Firestore bazadagi joriy assets ro'yxatini tozalaymiz (agar barcha o'rniga yozmoqchi bo'lsak)
          // Buning uchun mavjud barcha assetlarni parallel o'chiramiz
          const currentDeletePromises = assets.map(a => db.collection("assets").doc(a.id).delete());
          
          Promise.all(currentDeletePromises)
            .then(() => {
              // Yangilarini parallel yozamiz
              const writePromises = importedAssets.map(a => db.collection("assets").doc(a.id).set(a));
              return Promise.all(writePromises);
            })
            .then(() => {
              alert(`Muvaffaqiyatli bulutga tiklandi!\nJami ${importedAssets.length} ta jihoz va hududlar Firestore-ga yuklandi.`);
            })
            .catch(err => {
              console.error("Firestore-ga tiklashda xatolik:", err);
              alert("Xatolik: Bulutli ma'lumotlar bazasini yangilashda xato yuz berdi: " + err.message);
            });

        } else {
          // OFLAYN TIKLASH:
          assets = importedAssets;
          saveAssetsToLocal();
          
          renderLocationTree();
          setActiveLocation({ type: "GLOBAL", org: "", floor: "", room: "" });
          alert(`Muvaffaqiyatli tiklandi!\nJami ${importedAssets.length} ta jihoz oflayn keshga yuklandi.`);
        }

        importExcelInput.value = "";

      } catch (err) {
        console.error("Excel importda xato:", err);
        alert("Xatolik: Excel fayl o'qilmadi!");
      }
    };
    reader.readAsArrayBuffer(file);
  };


  /* ==========================================================================
     12. DASTURNI ISHGA TUSHIRISH (INITIALIZATION APP)
     ========================================================================== */
  const initApp = () => {
    // Agar keshda eski mock ma'lumotlar signature (INV-26-0001) bo'lsa, ularni butunlay tozalaymiz
    const localAssets = localStorage.getItem("inv_assets");
    if (localAssets && localAssets.includes("INV-26-0001")) {
      localStorage.removeItem("inv_assets");
      localStorage.removeItem("inv_locations");
      localStorage.removeItem("inv_firebase_config"); // to reset and load the embedded new config!
    }
    
    initTheme();
    initFirebaseConnection(); // 1-o'rinda Firebase bog'laymiz
    loadDatabase();           // 2-o'rinda onlayn yoki oflayn bazani yuklaymiz
    setupAuthListener();      // 3-o'rinda tizimda login holatini va ruxsatlarini tinglaymiz
  };

  const escapeHtml = (str) => {
    if (!str) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  initApp();
});
