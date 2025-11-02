// lib/i18n.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'fr' | 'ar';

const translations = {
  en: {
    // <<< ADDED KEYS FOR LANGUAGE SCREEN >>>
    language: "Language",
    selectLanguage: "Select Language",
    profile: {
      title: "My Profile",
      myListings: "My Listings",
      favorites: "Favorites",
      settings: "Settings",
      logout: "Logout",
      deleteAccount: "Delete Account",
      editProfile: "Edit Profile",
      notifications: "Notifications",
    },
settingsScreen: {
        general: "General",
        notifications: "Notifications",
        language: "Language",
        blockedUsers: "Blocked Users",
        connect: "Connect",
        followFacebook: "Follow Facebook",
        followTwitter: "Follow Twitter",
        followTiktok: "Follow Tiktok",
        followInstagram: "Follow Instagram",
        contact: "Contact",
        rateUs: "Rate Us",
        help: "Help",
        version: "Version",
        areYouSureLogout: "Are you sure you want to logout?",
    },
    // <<< ADDED KEYS FOR TAB BAR >>>
    tabs: {
      home: "Home",
      map: "Map",
      add: "Add",
      messages: "Messages",
      profile: "Profile",
    },
    // in lib/i18n.ts, inside the en: { ... } block
filters: {
  title: "Filters",
  reset: "Reset",
  sortBy: "Sort By",
  location: "Location",
  deliveryMethods: "Delivery Methods",
  priceRange: "Price Range",
  min: "Min",
  max: "Max",
  thousandHint: "1 = 1,000 DA",
  millionHint: "1 = 1,000,000 DA",
  itemCondition: "Item Condition",
  condition: {
    all: "All",
    new: "New",
    used: "Used",
  },
  seeResults: "See Results",
},

// ... other keys
notificationsScreen: {
  title: "Notifications",
  markAllRead: "Mark all read",
  noNotifications: "No notifications yet",
  emptySubtext: "When someone likes your products or follows you, you'll see it here",
  justNow: "just now",
  minutesAgo: "{{count}}m ago",
  hoursAgo: "{{count}}h ago",
  daysAgo: "{{count}}d ago",
  weeksAgo: "{{count}}w ago",
  likedProduct: "liked your product \"{{product}}\" ❤️",
  likedGeneric: "liked your product ❤️",
  startedFollowing: "started following you 👤",
  commented: "commented on your post 💬",
  mentioned: "mentioned you in a post 📣",
},

// French
notificationsScreen: {
  title: "Notifications",
  markAllRead: "Tout marquer comme lu",
  noNotifications: "Aucune notification pour le moment",
  emptySubtext: "Quand quelqu’un aime vos produits ou vous suit, cela apparaîtra ici",
  justNow: "à l’instant",
  minutesAgo: "il y a {{count}} min",
  hoursAgo: "il y a {{count}} h",
  daysAgo: "il y a {{count}} j",
  weeksAgo: "il y a {{count}} sem",
  likedProduct: "a aimé votre produit « {{product}} » ❤️",
  likedGeneric: "a aimé votre produit ❤️",
  startedFollowing: "a commencé à vous suivre 👤",
  commented: "a commenté votre publication 💬",
  mentioned: "vous a mentionné dans une publication 📣",
},

// <<< ADDED KEYS FOR PROFILE CONTENT >>>
profileContent: {
  posts: "Posts",
  following: "Following",
  followers: "Followers",
  liked: "Liked",
  noUserData: "No user data found",
  goToLogin: "Go to Login",
  emptyPostMsg: "You haven't posted anything yet.",
  addToCollection: "Add to your collection",
  emptyLikedMsg: "You haven't liked any products yet.",
  startBrowsing: "Start browsing",
},
// ... (rest of the file)
    // Categories
    categories: {
  Food: "Food",
  ComputersAccessories: "Computers & Accessories",
  RealEstate: "Real Estate",
  ElectronicsHomeAppliance: "Electronics & Home Appliance",
  MaterialsEquipment: "Materials & Equipment",
  RepairParts: "Repair Parts",
  CarsVehicles: "Cars and Vehicles",
  Sports: "Sports",
  PhonesAccessories: "Phones & Accessories",
  Travel: "Travel",
  ComputersLaptops: "Computers & Laptops",
  HobbiesEntertainment: "Hobbies and Entertainment",
  BabyEssentials: "Baby Essentials",
  ClothingFashion: "Clothing & Fashion",
  HealthBeauty: "Health & Beauty",
  HomemadeHandcrafted: "Homemade & Handcrafted",


    addListing: {
      addListing: "Add Listing",
      photos: "Photos",
      addPhoto: "Add Photo",
      title: "Title",
      titlePlaceholder: "e.g., iPhone 15 Pro Max 256GB",
      description: "Description",
      descriptionPlaceholder: "Describe your item, its condition, and any details.",
      category: "Category",
      selectCategoryPlaceholder: "Select a Category",
      dealType: "Deal Type",
      alsoExchange: "Also accept Exchange",
      price: "Price",
      pricePlaceholder: "Enter price (optional for exchange)",
      phoneNumber: "Phone Number",
      phoneNumberPlaceholder: "Your contact number (optional)",
      condition: "Condition",
      new: "New",
      used: "Used",
      deliveryMethod: "Delivery Method",
      selectDeliveryPlaceholder: "Select delivery preference",
      publishListing: "Publish Listing",
      uploading: "Uploading",
      photo: "photo",
      photos: "photos",},
      // Subcategories - Electronics
      Phones: "Phones",
      PhoneCases: "Phone Cases",
      ChargersAndCables: "Chargers & Cables",
      HeadphonesAndEarphones: "Headphones & Earphones",
      ScreenProtectors: "Screen Protectors",
      PowerBanks: "Power Banks",
      Laptops: "Laptops",
      DesktopComputers: "Desktop Computers",
      Tablets: "Tablets",
      Monitors: "Monitors",
      KeyboardsAndMice: "Keyboards & Mice",
      PrintersAndScanners: "Printers & Scanners",
      
      // Subcategories - Vehicles
      Cars: "Cars",
      Motorcycles: "Motorcycles",
      TrucksAndVans: "Trucks & Vans",
      Bicycles: "Bicycles",
      
      // Subcategories - Real Estate
      Apartments: "Apartments",
      HousesAndVillas: "Houses & Villas",
      CommercialProperties: "Commercial Properties",
      Land: "Land",
      
      // Subcategories - Furniture
      LivingRoom: "Living Room",
      Bedroom: "Bedroom",
      OfficeFurniture: "Office Furniture",
      DiningRoom: "Dining Room",
      OutdoorFurniture: "Outdoor Furniture",
      
      // Subcategories - Home Appliances
      Refrigerators: "Refrigerators",
      WashingMachine: "Washing Machine",
      FullPack: "Full Pack",
    },
    
    // Filter tabs
    filters: {
      All: "All",
      Sell: "Sell",
      Rent: "Rent",
      Exchange: "Exchange",
    },
    
    // Product related
    product: {
      exchangeTag: "Exchange",
      priceSuffixDA: "DA",
      priceSuffixDAMonth: "DA/month",
      noImage: "No Image",
    },
    
    // Home screen
    home: {
      loading: "Loading...",
      permissionDenied: "Permission Denied",
      unknownLocation: "Unknown Location",
      searchPlaceholder: "Search products...",
      categoriesTitle: "Categories",
      noCategories: "No categories available",
      noProductsSearch: "No products found for your search",
      noProductsFilter: "No products in this category",
      loadMore: "Load More",
      noMoreText: "You've reached the end!",
      pullToRefresh: "Pull to refresh...",
      loginRequiredTitle: "Login Required",
      loginRequiredMessage: "Please log in to like products",
      error: "Error",
      failedToUpdateLike: "Failed to update like",
      failedToLoadProducts: "Failed to load products: ",
      failedToLoadData: "Failed to load data: ",
    },
  },
  
  fr: {
    // <<< ADDED KEYS FOR LANGUAGE SCREEN >>>
    language: "Langue",
    selectLanguage: "Sélectionner la langue",
tabs: {
      home: "Accueil",
      map: "Carte",
      add: "Ajouter",
      messages: "Messages",
      profile: "Profil",
    },
// inside fr: { ... }
searchScreen: {
  title: "Recherche",
  searchLabel: "Rechercher dans le marché local",
  placeholder: "Votre recherche",
  allCategories: "Toutes les catégories",
  searchButton: "RECHERCHER",
  recentLabel: "Recherches récentes",
  alertEmptyTitle: "Recherche vide",
  alertEmptyMessage: "Veuillez entrer un terme de recherche",
  alertNoResultsTitle: "Aucun résultat",
  alertNoResultsMessage: "Aucun produit trouvé correspondant à votre recherche",
  alertErrorPrefix: "Échec de la recherche : ",
},
// Ensure this root key exists:
error: "Erreur",
// in lib/i18n.ts, inside the fr: { ... } block

// ... other keys
notificationsScreen: {
  title: "Notifications",
  markAllRead: "Tout marquer comme lu",
  noNotifications: "Aucune notification pour le moment",
  emptySubtext: "Quand quelqu’un aime vos produits ou vous suit, cela apparaîtra ici",
  justNow: "à l’instant",
  minutesAgo: "il y a {{count}} min",
  hoursAgo: "il y a {{count}} h",
  daysAgo: "il y a {{count}} j",
  weeksAgo: "il y a {{count}} sem",
  likedProduct: "a aimé votre produit « {{product}} » ❤️",
  likedGeneric: "a aimé votre produit ❤️",
  startedFollowing: "a commencé à vous suivre 👤",
  commented: "a commenté votre publication 💬",
  mentioned: "vous a mentionné dans une publication 📣",
},
// <<< ADDED KEYS FOR PROFILE CONTENT >>>
profileContent: {
  posts: "Annonces",
  following: "Abonnements",
  followers: "Abonnés",
  liked: "Aimés",
  noUserData: "Aucune donnée utilisateur trouvée",
  goToLogin: "Aller à la Connexion",
  emptyPostMsg: "Vous n'avez pas encore publié d'annonces.",
  addToCollection: "Ajouter à votre collection",
  emptyLikedMsg: "Vous n'avez encore aimé aucun produit.",
  startBrowsing: "Commencer à naviguer",
},
// ... (rest of the file)
profile: {
      title: "Mon Profil",
      myListings: "Mes Annonces",
      favorites: "Favoris",
      settings: "Paramètres",
      logout: "Se Déconnecter",
      deleteAccount: "Supprimer le Compte",
      editProfile: "Modifier le Profil",
      notifications: "Notifications",
    },
    addListing: {
      addListing: "Ajouter une Annonce",
      photos: "Photos",
      addPhoto: "Ajouter Photo",
      title: "Titre",
      titlePlaceholder: "ex: iPhone 15 Pro Max 256GB",
      description: "Description",
      descriptionPlaceholder: "Décrivez votre article, son état et tout détail.",
      category: "Catégorie",
      selectCategoryPlaceholder: "Sélectionner une Catégorie",
      dealType: "Type d'Affaire",
      alsoExchange: "Accepter également l'Échange",
      price: "Prix",
      pricePlaceholder: "Entrez le prix (optionnel pour échange)",
      phoneNumber: "Numéro de Téléphone",
      phoneNumberPlaceholder: "Votre numéro de contact (optionnel)",
      condition: "État",
      new: "Neuf",
      used: "Utilisé",
      deliveryMethod: "Méthode de Livraison",
      selectDeliveryPlaceholder: "Sélectionner la préférence de livraison",
      publishListing: "Publier l'Annonce",
      uploading: "Téléchargement",
      photo: "photo",
      photos: "photos",},
    // <<< ADDED KEYS FOR TAB BAR >>>
    
    // inside fr: { ... }
settingsScreen: {
  general: "Général",
  notifications: "Notifications",
  blockedUsers: "Utilisateurs Bloqués",
  connect: "Se Connecter",
  followFacebook: "Suivre sur Facebook",
  followTwitter: "Suivre sur Twitter",
  followTiktok: "Suivre sur TikTok",
  followInstagram: "Suivre sur Instagram",
  contact: "Contact",
  rateUs: "Nous Noter",
  help: "Aide",
  version: "Version",
  areYouSureLogout: "Êtes-vous sûr de vouloir vous déconnecter ?",
},
filters: {
  title: "Filtres",
  reset: "Réinitialiser",
  sortBy: "Trier par",
  location: "Emplacement",
  deliveryMethods: "Méthodes de livraison",
  priceRange: "Fourchette de prix",
  min: "Min",
  max: "Max",
  thousandHint: "1 = 1 000 DA",
  millionHint: "1 = 1 000 000 DA",
  itemCondition: "État de l'article",
  condition: {
    all: "Tous",
    new: "Neuf",
    used: "D'occasion",
  },
  seeResults: "Voir les résultats",
},

// Assuming these are at the root level:
cancel: "Annuler",
errorFailedLogout: "Erreur, échec de la déconnexion. Veuillez réessayer.",
    // Categories
    categories: {
  Food: "Alimentation",
  ComputersAccessories: "Ordinateurs et Accessoires",
  RealEstate: "Immobilier",
  ElectronicsHomeAppliance: "Électronique et Électroménager",
  MaterialsEquipment: "Matériaux et Équipements",
  RepairParts: "Pièces de Réparation",
  CarsVehicles: "Voitures et Véhicules",
  Sports: "Sports",
  PhonesAccessories: "Téléphones et Accessoires",
  Travel: "Voyage",
  ComputersLaptops: "Ordinateurs et PC portables",
  HobbiesEntertainment: "Loisirs et Divertissement",
  BabyEssentials: "Articles pour Bébé",
  ClothingFashion: "Vêtements et Mode",
  HealthBeauty: "Santé et Beauté",
  HomemadeHandcrafted: "Fait Maison et Artisanat",


      
      // Subcategories - Electronics
      Phones: "Téléphones",
      PhoneCases: "Coques de téléphone",
      ChargersAndCables: "Chargeurs & Câbles",
      HeadphonesAndEarphones: "Écouteurs & Casques",
      ScreenProtectors: "Protecteurs d'écran",
      PowerBanks: "Batteries externes",
      Laptops: "Ordinateurs portables",
      DesktopComputers: "Ordinateurs de bureau",
      Tablets: "Tablettes",
      Monitors: "Moniteurs",
      KeyboardsAndMice: "Claviers & Souris",
      PrintersAndScanners: "Imprimantes & Scanners",
      
      // Subcategories - Vehicles
      Cars: "Voitures",
      Motorcycles: "Motos",
      TrucksAndVans: "Camions & Fourgons",
      Bicycles: "Vélos",
      
      // Subcategories - Real Estate
      Apartments: "Appartements",
      HousesAndVillas: "Maisons & Villas",
      CommercialProperties: "Propriétés commerciales",
      Land: "Terrain",
      
      // Subcategories - Furniture
      LivingRoom: "Salon",
      Bedroom: "Chambre",
      OfficeFurniture: "Mobilier de bureau",
      DiningRoom: "Salle à manger",
      OutdoorFurniture: "Mobilier d'extérieur",
      
      // Subcategories - Home Appliances
      Refrigerators: "Réfrigérateurs",
      WashingMachine: "Machine à laver",
      FullPack: "Pack complet",
    },
    
    // Filter tabs
    filters: {
      All: "Tout",
      Sell: "Vendre",
      Rent: "Louer",
      Exchange: "Échanger",
    },
    
    // Product related
    product: {
      exchangeTag: "Échange",
      priceSuffixDA: "DA",
      priceSuffixDAMonth: "DA/mois",
      noImage: "Pas d'image",
    },
    
    // Home screen
    home: {
      loading: "Chargement...",
      permissionDenied: "Permission refusée",
      unknownLocation: "Emplacement inconnu",
      searchPlaceholder: "Rechercher des produits...",
      categoriesTitle: "Catégories",
      noCategories: "Aucune catégorie disponible",
      noProductsSearch: "Aucun produit trouvé pour votre recherche",
      noProductsFilter: "Aucun produit dans cette catégorie",
      loadMore: "Charger plus",
      noMoreText: "Vous avez atteint la fin!",
      pullToRefresh: "Tirez pour actualiser...",
      loginRequiredTitle: "Connexion requise",
      loginRequiredMessage: "Veuillez vous connecter pour aimer les produits",
      error: "Erreur",
      failedToUpdateLike: "Échec de la mise à jour du like",
      failedToLoadProducts: "Échec du chargement des produits: ",
      failedToLoadData: "Échec du chargement des données: ",
    },
  },
  
  ar: {
    // <<< ADDED KEYS FOR LANGUAGE SCREEN >>>
    language: "اللغة",
    selectLanguage: "اختر اللغة",
    
    // <<< ADDED KEYS FOR TAB BAR >>>
    tabs: {
      home: "الرئيسية",
      map: "الخريطة",
      add: "إضافة",
      messages: "الرسائل",
      profile: "الملف الشخصي",
    },
    // in lib/i18n.ts, inside the ar: { ... } block

// ... other keys
// inside ar: { ... }
settingsScreen: {
  general: "عام",
  notifications: "الإشعارات",
  blockedUsers: "المستخدمون المحظورون",
  connect: "تواصل معنا",
  followFacebook: "تابعنا على فيسبوك",
  followTwitter: "تابعنا على تويتر",
  followTiktok: "تابعنا على تيك توك",
  followInstagram: "تابعنا على إنستغرام",
  contact: "اتصال",
  rateUs: "قيّم التطبيق",
  help: "مساعدة",
  version: "الإصدار",
  areYouSureLogout: "هل أنت متأكد من أنك تريد تسجيل الخروج؟",
},
// inside ar: { ... }
searchScreen: {
  title: "بحث",
  searchLabel: "ابحث في السوق المحلي",
  placeholder: "ما تبحث عنه",
  allCategories: "جميع الفئات",
  searchButton: "بـحـث",
  recentLabel: "عمليات البحث الأخيرة",
  alertEmptyTitle: "بحث فارغ",
  alertEmptyMessage: "الرجاء إدخال كلمة للبحث",
  alertNoResultsTitle: "لا توجد نتائج",
  alertNoResultsMessage: "لم يتم العثور على منتجات مطابقة لبحثك",
  alertErrorPrefix: "فشل في إجراء البحث: ",
},
// Ensure this root key exists:
error: "خطأ",
// Assuming these are at the root level:
cancel: "إلغاء",
errorFailedLogout: "حدث خطأ، فشل تسجيل الخروج. يرجى المحاولة مرة أخرى.",
// <<< ADDED KEYS FOR PROFILE CONTENT >>>
profileContent: {
  posts: "الإعلانات",
  following: "متابعون",
  followers: "متابعون له",
  liked: "المفضلة",
  noUserData: "لم يتم العثور على بيانات المستخدم",
  goToLogin: "الذهاب إلى تسجيل الدخول",
  emptyPostMsg: "لم تقم بنشر أي شيء بعد.",
  addToCollection: "أضف إلى مجموعتك",
  emptyLikedMsg: "لم تُعجب بأي منتجات بعد.",
  startBrowsing: "ابدأ التصفح",
},
notificationsScreen: {
  title: "الإشعارات",
  markAllRead: "تمييز الكل كمقروء",
  noNotifications: "لا توجد إشعارات بعد",
  emptySubtext: "عندما يعجب شخص ما بمنتجاتك أو يتابعك، ستظهر هنا",
  justNow: "الآن",
  minutesAgo: "منذ {{count}} د",
  hoursAgo: "منذ {{count}} س",
  daysAgo: "منذ {{count}} يوم",
  weeksAgo: "منذ {{count}} أسبوع",
  likedProduct: "أعجب بمنتجك \"{{product}}\" ❤️",
  likedGeneric: "أعجب بمنتجك ❤️",
  startedFollowing: "بدأ بمتابعتك 👤",
  commented: "علق على منشورك 💬",
  mentioned: "ذكرَك في منشور 📣",
},
filters: {
  title: "الفلاتر",
  reset: "إعادة التعيين",
  sortBy: "ترتيب حسب",
  location: "الموقع",
  deliveryMethods: "طرق التوصيل",
  priceRange: "نطاق السعر",
  min: "الأدنى",
  max: "الأعلى",
  thousandHint: "1 = 1,000 دج",
  millionHint: "1 = 1,000,000 دج",
  itemCondition: "حالة المنتج",
  condition: {
    all: "الكل",
    new: "جديد",
    used: "مستعمل",
  },
  seeResults: "عرض النتائج",
},

// ... (rest of the file)
    // 👇👇👇 ADD NEW KEYS FOR PROFILE SCREEN HERE 👇👇👇
    profile: {
      title: "ملفي الشخصي", // Example: Title of the screen
      myListings: "إعلاناتي", // Example: A button/section for user's listings
      favorites: "المفضلة", // Example: A section for favorites
      settings: "الإعدادات", // Example: Settings option
      logout: "تسجيل الخروج", // Example: Logout button text
      deleteAccount: "حذف الحساب", // Example: Delete Account button
      editProfile: "تعديل الملف الشخصي", // Example: Edit Profile button
      notifications: "الإشعارات", // Example: Notification setting
    },
   addListing: {
      addListing: "إضافة إعلان",
      photos: "الصور",
      addPhoto: "إضافة صورة",
      title: "العنوان",
      titlePlaceholder: "مثال: ايفون 15 برو ماكس 256 جيجا",
      description: "الوصف",
      descriptionPlaceholder: "صف السلعة، حالتها، وأي تفاصيل أخرى.",
      category: "الفئة",
      selectCategoryPlaceholder: "اختر فئة",
      dealType: "نوع الصفقة",
      alsoExchange: "أقبل التبادل أيضاً",
      price: "السعر",
      pricePlaceholder: "أدخل السعر (اختياري للتبادل)",
      phoneNumber: "رقم الهاتف",
      phoneNumberPlaceholder: "رقم الاتصال الخاص بك (اختياري)",
      condition: "الحالة",
      new: "جديد",
      used: "مستعمل",
      deliveryMethod: "طريقة التسليم",
      selectDeliveryPlaceholder: "اختر طريقة التسليم المفضلة",
      publishListing: "نشر الإعلان",
      uploading: "جاري التحميل",
      photo: "صورة",
      photos: "صور", },
    // Categories
    categories: {
  Food: "طعام",
  ComputersAccessories: "حواسيب وإكسسوارات",
  RealEstate: "عقارات",
  ElectronicsHomeAppliance: "إلكترونيات وأجهزة منزلية",
  MaterialsEquipment: "مواد ومعدات",
  RepairParts: "قطع غيار",
  CarsVehicles: "سيارات ومركبات",
  Sports: "رياضة",
  PhonesAccessories: "هواتف وإكسسوارات",
  Travel: "سفر",
  ComputersLaptops: "حواسيب ومحمولات",
  HobbiesEntertainment: "هوايات وترفيه",
  BabyEssentials: "مستلزمات الأطفال",
  ClothingFashion: "ملابس وأزياء",
  HealthBeauty: "صحة وجمال",
  HomemadeHandcrafted: "مصنوع يدويًا ومنزليًا",

      
      // Subcategories - Electronics
      Phones: "هواتف",
      PhoneCases: "أغطية هواتف",
      ChargersAndCables: "شواحن وكابلات",
      HeadphonesAndEarphones: "سماعات رأس وأذن",
      ScreenProtectors: "واقيات شاشة",
      PowerBanks: "بطاريات خارجية",
      Laptops: "حواسيب محمولة",
      DesktopComputers: "حواسيب مكتبية",
      Tablets: "أجهزة لوحية",
      Monitors: "شاشات",
      KeyboardsAndMice: "لوحات مفاتيح وفأرات",
      PrintersAndScanners: "طابعات وماسحات ضوئية",
      
      // Subcategories - Vehicles
      Cars: "سيارات",
      Motorcycles: "دراجات نارية",
      TrucksAndVans: "شاحنات وعربات",
      Bicycles: "دراجات هوائية",
      
      // Subcategories - Real Estate
      Apartments: "شقق",
      HousesAndVillas: "منازل وفيلات",
      CommercialProperties: "عقارات تجارية",
      Land: "أراضي",
      
      // Subcategories - Furniture
      LivingRoom: "غرفة المعيشة",
      Bedroom: "غرفة النوم",
      OfficeFurniture: "أثاث مكتبي",
      DiningRoom: "غرفة الطعام",
      OutdoorFurniture: "أثاث خارجي",
      
      // Subcategories - Home Appliances
      Refrigerators: "ثلاجات",
      WashingMachine: "غسالات",
      FullPack: "حزمة كاملة",
    },
    
    // Filter tabs
    filters: {
      All: "الكل",
      Sell: "بيع",
      Rent: "إيجار",
      Exchange: "مبادلة",
    },
    
    // Product related
    product: {
      exchangeTag: "مبادلة",
      priceSuffixDA: "دج",
      priceSuffixDAMonth: "دج/شهر",
      noImage: "لا توجد صورة",
    },
    
    // Home screen
    home: {
      loading: "جاري التحميل...",
      permissionDenied: "تم رفض الإذن",
      unknownLocation: "موقع غير معروف",
      searchPlaceholder: "البحث عن منتجات...",
      categoriesTitle: "الفئات",
      noCategories: "لا توجد فئات متاحة",
      noProductsSearch: "لم يتم العثور على منتجات لبحثك",
      noProductsFilter: "لا توجد منتجات في هذه الفئة",
      loadMore: "تحميل المزيد",
      noMoreText: "لقد وصلت إلى النهاية!",
      pullToRefresh: "اسحب للتحديث...",
      loginRequiredTitle: "تسجيل الدخول مطلوب",
      loginRequiredMessage: "يرجى تسجيل الدخول للإعجاب بالمنتجات",
      error: "خطأ",
      failedToUpdateLike: "فشل تحديث الإعجاب",
      failedToLoadProducts: "فشل تحميل المنتجات: ",
      failedToLoadData: "فشل تحميل البيانات: ",
    },
  },
};

// Current language state
let currentLanguage: Language = 'en';

// i18n object
const i18n = {
  t: (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  },
  
  changeLanguage: async (lang: Language) => {
    currentLanguage = lang;
    await AsyncStorage.setItem('appLanguage', lang);
  },
  
  getLanguage: () => currentLanguage,
};

// Function to change language (renamed to setLocale, fixing the original error)
export const setLocale = async (languageCode: Language) => {
  await i18n.changeLanguage(languageCode);
};

// Function to get current language
export const getCurrentLanguage = async (): Promise<Language> => {
  const savedLanguage = await AsyncStorage.getItem('appLanguage');
  return (savedLanguage as Language) || 'en';
};

// Function to initialize language on app start (renamed to loadLocale)
export const loadLocale = async () => {
  const savedLanguage = await getCurrentLanguage();
  currentLanguage = savedLanguage;
};

// Helper function to translate filter tabs
export const translateFilter = (filter: string): string => {
  return i18n.t(`filters.${filter}`);
};

export default i18n;