// lib/i18n.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'fr' | 'ar';

const translations = {
  en: {
search: {
  "title": "Search",
  "subtitle": "Search in Local Marketplace",
  "placeholder": "Your search",
  "allCategories": "All Categories",
  "searchButton": "SEARCH",
  "recentSearches": "Recent Searches",
  "noRecentSearches": "No recent searches yet",
  "emptySearchTitle": "Empty Search",
  "emptySearchMessage": "Please enter a search term",
  "noResultsTitle": "No Results",
  "noResultsMessage": "No products found matching your search",
  "errorTitle": "Error",
  "errorMessage": "Failed to perform search: "
},
 
  "blockedUsers": {
    "title": "Blocked Users",
    "unblockButton": "Unblock",
    "unknownUser": "Unknown User",
    
    "errorTitle": "Error",
    "successTitle": "Success",
    "failedToLoad": "Failed to load blocked users list.",
    "loginRequired": "Please login to unblock users.",
    
    "unblockAlertTitle": "Unblock User",
    "unblockAlertMessage": "Are you sure you want to unblock this user? Their products may reappear in your feed.",
    "cancel": "Cancel",
    
    "unblockSuccess": "User unblocked successfully.",
    "unblockFailed": "Failed to unblock user.",
    
    "emptyMessage": "You haven't blocked any users yet.",
    "emptySubtext": "Users you block will not be able to see your products, and you will not see theirs."
  },
someonesProfile: {
    profile: "Profile",
    posts: "Posts",
    following: "Following",
    followers: "Followers",
    follow: "Follow",
    unfollow: "Unfollow",
    friends: "Friends",
    chat: "Chat",
    block: "Block",
    report: "Report",
    cancel: "Cancel",
    unblock: "Unblock",
    
    // Alerts
    loginRequired: "Login Required",
    loginRequiredMessage: "You must be logged in to follow users.",
    errorTitle: "Error",
    errorMessage: "Failed to load user profile.",
    profileNotFound: "Profile not found.",
    invalidUserId: "Invalid user ID provided.",
    
    // Block/Unblock
    blockUserTitle: "Block User",
    blockUserMessage: "Are you sure you want to block {{username}}? This will also remove all follow relationships.",
    blocked: "Blocked!",
    userBlocked: "{{username}} has been blocked.",
    failedToBlock: "Failed to block user. Please try again.",
    
    unblockUserTitle: "Unblock User",
    unblockUserMessage: "Are you sure you want to unblock {{username}}?",
    unblocked: "Unblocked!",
    userUnblocked: "{{username}} has been unblocked.",
    failedToUnblock: "Failed to unblock user. Please try again.",
    cannotUnblock: "Cannot unblock user without IDs.",
    mustBeLoggedIn: "You must be logged in to block a user.",
    
    // Report
    reportUserTitle: "Report User",
    reportUserMessage: "You are reporting {{username}} for inappropriate content or behavior.",
    
    // Blocked state
    youBlockedUser: "You have blocked this user.",
    cannotViewContent: "You cannot view this user's content while they are blocked.",
    
    // Empty states
    noItemsYet: "This user hasn't posted any items yet.",
    postedItems: "Posted Items",
    postedItemsCount: "Posted Items ({{count}})",
    
    // Chat errors
    cannotStartChat: "Cannot start conversation. Please log in.",
    chatErrorMessage: "Failed to start chat: {{error}}. Check console for details.",
    
    // Follow errors
    followError: "Failed to update follow status.",
    
    // Price formatting
    exchange: "Exchange",
    million: "million",
    da: "DA",
    daMonth: "DA/mo",
},

  productDetail: {
  // Loading & Errors
  loadingText: "Loading product details...",
  productNotFound: "Product not found.",
  errorLoading: "Failed to load product.",
  million: "million",       // <-- NEW KEY for million
    priceSuffixDA: "DA",
    
  // Header Actions
  loginRequired: "Login Required",
  loginRequiredMessage: "Please login to like products",
  
  // Product Info
  condition: "Condition",
  conditionNotSpecified: "Condition not specified",
  conditionNew: "New",
  conditionUsed: "Used",
  
  // Price & Exchange
  perMonth: "/month",
  exchange: "Exchange",
  
  // Badges
  shippingAvailable: "Shipping available",
  
  // Sections
  description: "Description",
  seeMore: "... See more",
  postedOn: "Posted on",
  postedBy: "Posted by",
  joined: "Joined",
  recently: "Recently",
  
  // Map
  mapCaption: "Map is approximate to keep seller's location private.",
  
  // Buttons
  call: "Call",
  chat: "Chat",
  delete: "Delete",
  editProduct: "Edit Product",
  
  // Delete Confirmation
  deleteTitle: "Delete Product",
  deleteMessage: "Are you sure you want to delete this product? This action cannot be undone.",
  cancel: "Cancel",
  deleteConfirm: "Delete",
  deleteSuccess: "Success",
  deleteSuccessMessage: "Product deleted successfully",
  deleteError: "Error",
  deleteErrorMessage: "Failed to delete product",
  ok: "OK",
  
  // Menu Options
  shareItem: "Share item",
  reportItem: "Report this item",
  copyLink: "Copy link",
  
  // Errors
  error: "Error",
  errorMessage: "Failed to fetch product details.",
  sellerNotAvailable: "Seller information is not available.",
  failedToUpdateLike: "Failed to update like status",
},
// ... (inside the en: { ... } block)
notificationsSettings: {
    title: "Notifications",
    social: "Social",
    newFollowersTitle: "New Followers",
    newFollowersDescription: "Get notified when someone follows you",
    likesTitle: "Likes",
    likesDescription: "Get notified when someone likes your product",
    commentsTitle: "Comments",
    commentsDescription: "Get notified when someone comments",
    mentionsTitle: "Mentions",
    mentionsDescription: "Get notified when someone mentions you",
    recommendations: "Recommendations",
    recommendedForYouTitle: "Recommended For You",
    recommendedForYouDescription: "Get personalized product recommendations",
    collectibleUpdatesTitle: "Collectible Updates",
    collectibleUpdatesDescription: "Updates on collectibles you're interested in",
    liveEvents: "Live Events",
    bookmarkedLiveEventsTitle: "Bookmarked Live Events",
    bookmarkedLiveEventsDescription: "Reminders for events you bookmarked",
    suggestedLiveEventsTitle: "Suggested Live Events",
    suggestedLiveEventsDescription: "Get notified about live events you might like",
    shopping: "Shopping",
    marketplaceTitle: "Marketplace",
    marketplaceDescription: "Updates about marketplace items",
    ordersTitle: "Orders",
    ordersDescription: "Updates about your orders and purchases",
},


// ... (rest of the en: block)
  addListing: {
      addListing: "Add Listing",
      photos: "Photos",
      addPhoto: "Add Photo",
      title: "Title",
      titlePlaceholder: "e.g., iPhone 15 Pro Max 256GB",
      description: "Description",
      descriptionPlaceholder: "Describe your item, its condition, and any details.",
      category: "Category",
      selectCategory: "Select Category",
      selectSubcategory: "Select Subcategory",
      selectSubSubcategory: "Select Sub-subcategory",
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
      selectDeliveryMethod: "Select Delivery Method",
      selectDeliveryPlaceholder: "Select delivery preference",
      inPersonMeeting: "In-person Meeting",
      delivery: "Delivery",
      both: "Both",
      close: "Close",
      publishListing: "Publish Listing",
      uploading: "Uploading",
      photo: "photo",
      photos: "photos",
      ok: "OK",
      
      // Alerts & Errors
      uploadInProgress: "Upload in Progress",
      uploadInProgressMessage: "Please wait for the upload to complete before going back.",
      discardChanges: "Discard Changes?",
      discardChangesMessage: "You have unsaved changes. Are you sure you want to go back?",
      cancel: "Cancel",
      discard: "Discard",
      continue: "Continue",
      error: "Error",
      success: "Success",
      
      // Validation Errors
      errorAtLeastOnePhoto: "Please add at least one photo.",
      errorEnterTitle: "Please enter a title.",
      errorAddDescription: "Please add a description.",
      errorEnterPrice: "Please enter a price.",
      errorSelectCategory: "Please select a category.",
      errorSelectDelivery: "Please select a delivery method.",
      fillAllFields: "Please fill in all required fields.",
      
      // Upload Errors
      permissionRequired: "Permission Required",
      permissionRequiredMessage: "We need access to your photos to upload an image.",
      imageTooLarge: "Image Too Large",
      imageTooLargeMessage: "The image is too large. Please choose a smaller image.",
      unableToSelectImage: "Unable to select image",
      uploadError: "Upload Error",
      failedToUploadImage: "Failed to upload image",
      imageUploadFailed: "Image Upload Failed",
      allImageUploadsFailed: "All image uploads failed.",
      
      // Loading & Success
      loadingCategories: "Loading categories...",
      pleaseLogin: "Please log in to create a listing",
      listingPublished: "Listing published successfully!",
      
      // Database Errors
      unableToLoadCategories: "Unable to load categories: ",
      unableToLoadSubcategories: "Unable to load subcategories",
      unableToLoadSubSubcategories: "Unable to load sub-subcategories",
      mustBeLoggedIn: "You must be logged in to create a listing.",
      userNotAuthenticated: "User not authenticated",
      errorOccurred: "An error occurred: ",
      unknownError: "Unknown error",
      unableToAddProduct: "Unable to add product",
      invalidCategory: "Invalid category or user reference.",
      noPermission: "You do not have permission to add products",
      productExists: "This product already exists"
    },
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
filterss: {
 "title": "Filters",
  "reset": "Reset",
  "all": "All",
  "bestMatch": "Best Match",
  "mostRecent": "Most Recent",
  "lowestPrice": "Lowest Price",
  "highestPrice": "Highest Price",
  "nearest": "Nearest",
  "allMethods": "All Methods",
  "pickup": "Pickup",
  "delivery": "Delivery",
  "shipping": "Shipping",
  "new": "New",
  "used": "Used",
  "allLocations": "All Locations",
  "da": "DA",
  "thousands": "Thousands",
  "millions": "Millions",
  "category": "Category",
  "sortBy": "Sort By",
  "location": "Location",
  "deliveryMethods": "Delivery Methods",
  "priceUnit": "Price Unit",
  "standardPricing": "Standard pricing",
  "priceRange": "Price Range",
  "min": "Min",
  "max": "Max",
  "itemCondition": "Item Condition",
  "seeResults": "See Results",
  "filteringResults": "Filtering results for"
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
"subcategories": {
    "Phones": "Phones",
    "PhoneCases": "Phone Cases",
    "ChargersAndCables": "Chargers & Cables",
    "HeadphonesAndEarphones": "Headphones & Earphones",
    "ScreenProtectors": "Screen Protectors",
    "PowerBanks": "Power Banks",
    "Laptops": "Laptops",
    "DesktopComputers": "Desktop Computers",
    "Tablets": "Tablets",
    "Monitors": "Monitors",
    "KeyboardsAndMice": "Keyboards & Mice",
    "PrintersAndScanners": "Printers & Scanners",
    "Cars": "Cars",
    "Motorcycles": "Motorcycles",
    "TrucksAndVans": "Trucks & Vans",
    "Bicycles": "Bicycles",
    "Apartments": "Apartments",
    "HousesAndVillas": "Houses & Villas",
    "CommercialProperties": "Commercial Properties",
    "Land": "Land",
    "LivingRoom": "Living Room",
    "Bedroom": "Bedroom",
    "OfficeFurniture": "Office Furniture",
    "DiningRoom": "Dining Room",
    "OutdoorFurniture": "Outdoor Furniture",
    "Refrigerators": "Refrigerators",
    "WashingMachine": "Washing Machine",
    "FullPack": "Full Pack"
  },
  "subSubcategories": {
    "DesktopComputer": "Desktop Computer",
    "CentralUnit": "Central Unit",
    "AllInOne": "All In One",
    "Switchs": "Switchs",
    "ModemsRouters": "Modems & Routers",
    "WifiAccessPoints": "Wifi Access Points",
    "EthernetCards": "Ethernet Cards",
    "WifiRepeater": "Wifi Repeater",
    "Other": "Other",
    "Villa": "Villa",
    "Offices": "Offices",
    "RetailShops": "Retail Shops",
    "Warehouses": "Warehouses",
    "Restaurants": "Restaurants",
    "Hotels": "Hotels",
    "Sofas": "Sofas",
    "CoffeeTables": "Coffee Tables",
    "TVStands": "TV Stands",
    "Bookshelves": "Bookshelves",
    "Armchairs": "Armchairs",
    "Beds": "Beds",
    "Mattresses": "Mattresses",
    "Wardrobes": "Wardrobes",
    "Nightstands": "Nightstands",
    "Dressers": "Dressers",
    "HardDisk": "Hard Disk",
    "Charger": "Charger",
    "JetSki": "Jet-ski",
    "RigidBoats": "Rigid Boats",
    "InflatableBoats": "Inflatable Boats",
    "Boats": "Boats",
    "MechanicalElectricalParts": "Mechanical and Electrical Parts",
    "CarBodyParts": "Car Body Parts",
    "AutoAccessories": "Auto Accessories",
    "CarSeats": "Car Seats",
    "OpticsLighting": "Optics and Lighting",
    "Sound": "Sound",
    "TiresRims": "Tires & Rims",
    "WindowsWindshield": "Windows & Windshield",
    "Pieces": "Pieces",
    "Accessories": "Accessories",
    "HelmetsProtection": "Helmets and Protection",
    "Engines": "Engines",
    "RAM": "RAM",
    "Motherboard": "Motherboard",
    "ScreenProtection": "Screen Protection",
    "ShockproofCases": "Shockproof & Cases",
    "Supports": "Supports",
    "SelfieSticks": "Selfie Sticks",
    "Stabilizers": "Stabilizers",
    "VR": "VR",
    "MemoryCards": "Memory Cards",
    "OthersAccessories": "Others Accessories",
    "Laptop": "Laptop",
    "Macbooks": "Macbooks",
    "LaserPrinters": "Laser Printers",
    "CartridgesToners": "Cartridges & Toners",
    "Multifunction": "Multifunction",
    "InkjetPrinters": "Inkjet Printers",
    "Photocopier": "Photocopier",
    "BarcodesLabelers": "Barcodes & Labelers",
    "PhotoPrintersBadges": "Photo Printers & Badges",
    "GraphicCard": "Graphic Card",
    "PowerSupplyCase": "Power Supply - Case",
    "Processor": "Processor",
    "Cooling": "Cooling",
    "ReaderWriter": "Reader - Writer",
    "InternalStorage": "Internal Storage",
    "Screens": "Screens",
    "KeyboardTouchpad": "Keyboard - Touchpad",
    "Batteries": "Batteries",
    "BaffleWebcam": "Baffle - Webcam",
    "DataShows": "Data Shows",
    "HardDrivers": "Hard Drivers",
    "FlashDisk": "Flash Disk",
    "MemoryCard": "Memory Card",
    "Rack": "Rack",
    "TopsTShirts": "Tops and T-Shirts",
    "Shirts": "Shirts",
    "Gilets": "Gilets",
    "JeansPants": "Jeans and Pants",
    "CoatsJackets": "Coats and Jackets",
    "Tracksuits": "Tracksuits",
    "SuitsBlazers": "Suits and Blazers",
    "ShortsPants": "Shorts and Pants"
  }
,

// ... (rest of the file)
    // Categories
    categories: {
  Food: "Food",
  AnimalShop:"Animals Shop",
HomeandFurniture:"Home & Furniture",
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
someonesProfile: {
    profile: "Profil",
    posts: "Publications",
    following: "Abonnements",
    followers: "Abonnés",
    follow: "Suivre",
    unfollow: "Ne plus suivre",
    friends: "Amis",
    chat: "Discuter",
    block: "Bloquer",
    report: "Signaler",
    cancel: "Annuler",
    unblock: "Débloquer",
    
    // Alerts
    loginRequired: "Connexion requise",
    loginRequiredMessage: "Vous devez être connecté pour suivre des utilisateurs.",
    errorTitle: "Erreur",
    errorMessage: "Échec du chargement du profil utilisateur.",
    profileNotFound: "Profil introuvable.",
    invalidUserId: "ID utilisateur non valide fourni.",
    
    // Block/Unblock
    blockUserTitle: "Bloquer l'utilisateur",
    blockUserMessage: "Êtes-vous sûr de vouloir bloquer {{username}} ? Cela supprimera également toutes les relations de suivi.",
    blocked: "Bloqué !",
    userBlocked: "{{username}} a été bloqué.",
    failedToBlock: "Échec du blocage de l'utilisateur. Veuillez réessayer.",
    
    unblockUserTitle: "Débloquer l'utilisateur",
    unblockUserMessage: "Êtes-vous sûr de vouloir débloquer {{username}} ?",
    unblocked: "Débloqué !",
    userUnblocked: "{{username}} a été débloqué.",
    failedToUnblock: "Échec du déblocage de l'utilisateur. Veuillez réessayer.",
    cannotUnblock: "Impossible de débloquer l'utilisateur sans ID.",
    mustBeLoggedIn: "Vous devez être connecté pour bloquer un utilisateur.",
    
    // Report
    reportUserTitle: "Signaler l'utilisateur",
    reportUserMessage: "Vous signalez {{username}} pour un contenu ou un comportement inapproprié.",
    
    // Blocked state
    youBlockedUser: "Vous avez bloqué cet utilisateur.",
    cannotViewContent: "Vous ne pouvez pas voir le contenu de cet utilisateur tant qu'il est bloqué.",
    
    // Empty states
    noItemsYet: "Cet utilisateur n'a encore publié aucun article.",
    postedItems: "Articles publiés",
    postedItemsCount: "Articles publiés ({{count}})",
    
    // Chat errors
    cannotStartChat: "Impossible de démarrer la conversation. Veuillez vous connecter.",
    chatErrorMessage: "Échec du démarrage du chat : {{error}}. Consultez la console pour plus de détails.",
    
    // Follow errors
    followError: "Échec de la mise à jour du statut de suivi.",
    
    // Price formatting
    exchange: "Échange",
    million: "million",
    da: "DA",
    daMonth: "DA/mois",
},

  // ... (inside the fr: { ... } block)
notificationsSettings: {
    title: "Notifications",
    social: "Social",
    newFollowersTitle: "Nouveaux Abonnés",
    newFollowersDescription: "Recevoir une notification quand quelqu'un vous suit",
    likesTitle: "J'aime",
    likesDescription: "Recevoir une notification quand quelqu'un aime votre produit",
    commentsTitle: "Commentaires",
    commentsDescription: "Recevoir une notification quand quelqu'un commente",
    mentionsTitle: "Mentions",
    mentionsDescription: "Recevoir une notification quand quelqu'un vous mentionne",
    recommendations: "Recommandations",
    recommendedForYouTitle: "Recommandé pour vous",
    recommendedForYouDescription: "Recevoir des recommandations de produits personnalisées",
    collectibleUpdatesTitle: "Mises à jour des Collectibles",
    collectibleUpdatesDescription: "Mises à jour sur les collectibles qui vous intéressent",
    liveEvents: "Événements en direct",
    bookmarkedLiveEventsTitle: "Événements en direct enregistrés",
    bookmarkedLiveEventsDescription: "Rappels pour les événements que vous avez enregistrés",
    suggestedLiveEventsTitle: "Événements en direct suggérés",
    suggestedLiveEventsDescription: "Recevoir une notification sur les événements en direct qui pourraient vous intéresser",
    shopping: "Achats",
    marketplaceTitle: "Place de Marché",
    marketplaceDescription: "Mises à jour concernant les articles de la place de marché",
    ordersTitle: "Commandes",
    ordersDescription: "Mises à jour sur vos commandes et achats",
},
// ... (rest of the fr: block)
  search: {
  "title": "Rechercher",
  "subtitle": "Rechercher dans le Marché Local",
  "placeholder": "Votre recherche",
  "allCategories": "Toutes les catégories",
  "searchButton": "RECHERCHER",
  "recentSearches": "Recherches récentes",
  "noRecentSearches": "Aucune recherche récente",
  "emptySearchTitle": "Recherche vide",
  "emptySearchMessage": "Veuillez entrer un terme de recherche",
  "noResultsTitle": "Aucun résultat",
  "noResultsMessage": "Aucun produit trouvé correspondant à votre recherche",
  "errorTitle": "Erreur",
  "errorMessage": "Échec de la recherche : "
},
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
language: "Langue",
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
filterss: {
  "title": "Filtres",
  "reset": "Réinitialiser",
  "all": "Tout",
  "bestMatch": "Meilleure correspondance",
  "mostRecent": "Plus récent",
  "lowestPrice": "Prix le plus bas",
  "highestPrice": "Prix le plus élevé",
  "nearest": "Le plus proche",
  "allMethods": "Toutes les méthodes",
  "pickup": "Retrait",
  "delivery": "Livraison",
  "shipping": "Expédition",
  "new": "Neuf",
  "used": "Utilisé",
  "allLocations": "Tous les emplacements",
  "da": "DA",
  "thousands": "Milliers",
  "millions": "Millions",
  "category": "Catégorie",
  "sortBy": "Trier par",
  "location": "Emplacement",
  "deliveryMethods": "Méthodes de livraison",
  "priceUnit": "Unité de prix",
  "standardPricing": "Prix standard",
  "priceRange": "Fourchette de prix",
  "min": "Min",
  "max": "Max",
  "itemCondition": "État de l'article",
  "seeResults": "Voir les résultats",
  "filteringResults": "Filtrage des résultats pour"
},
productDetail: {
  // Loading & Errors
  loadingText: "Chargement des détails du produit...",
  productNotFound: "Produit introuvable.",
  errorLoading: "Échec du chargement du produit.",
  million: "millions",
  priceSuffixDA: "DA",
  // Header Actions
  loginRequired: "Connexion requise",
  loginRequiredMessage: "Veuillez vous connecter pour aimer les produits",
  
  // Product Info
  condition: "État",
  conditionNotSpecified: "État non spécifié",
  conditionNew: "Neuf",
  conditionUsed: "Utilisé",
  
  // Price & Exchange
  perMonth: "/mois",
  exchange: "Échange",
  
  // Badges
  shippingAvailable: "Livraison disponible",
  
  // Sections
  description: "Description",
  seeMore: "... Voir plus",
  postedOn: "Publié le",
  postedBy: "Publié par",
  joined: "Inscrit",
  recently: "Récemment",
  
  // Map
  mapCaption: "La carte est approximative pour préserver la confidentialité du vendeur.",
  
  // Buttons
  call: "Appeler",
  chat: "Discuter",
  delete: "Supprimer",
  editProduct: "Modifier le produit",
  
  // Delete Confirmation
  deleteTitle: "Supprimer le produit",
  deleteMessage: "Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.",
  cancel: "Annuler",
  deleteConfirm: "Supprimer",
  deleteSuccess: "Succès",
  deleteSuccessMessage: "Produit supprimé avec succès",
  deleteError: "Erreur",
  deleteErrorMessage: "Échec de la suppression du produit",
  ok: "OK",
  
  // Menu Options
  shareItem: "Partager l'article",
  reportItem: "Signaler cet article",
  copyLink: "Copier le lien",
  
  // Errors
  error: "Erreur",
  errorMessage: "Échec de la récupération des détails du produit.",
  sellerNotAvailable: "Les informations du vendeur ne sont pas disponibles.",
  failedToUpdateLike: "Échec de la mise à jour du statut j'aime",
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

 "subcategories": {
    "Phones": "Téléphones",
    "PhoneCases": "Coques de Téléphone",
    "ChargersAndCables": "Chargeurs & Câbles",
    "HeadphonesAndEarphones": "Écouteurs & Casques",
    "ScreenProtectors": "Protecteurs d'Écran",
    "PowerBanks": "Batteries Externes",
    "Laptops": "Ordinateurs Portables",
    "DesktopComputers": "Ordinateurs de Bureau",
    "Tablets": "Tablettes",
    "Monitors": "Moniteurs",
    "KeyboardsAndMice": "Claviers & Souris",
    "PrintersAndScanners": "Imprimantes & Scanners",
    "Cars": "Voitures",
    "Motorcycles": "Motos",
    "TrucksAndVans": "Camions & Camionnettes",
    "Bicycles": "Vélos",
    "Apartments": "Appartements",
    "HousesAndVillas": "Maisons & Villas",
    "CommercialProperties": "Propriétés Commerciales",
    "Land": "Terrain",
    "LivingRoom": "Salon",
    "Bedroom": "Chambre",
    "OfficeFurniture": "Meubles de Bureau",
    "DiningRoom": "Salle à Manger",
    "OutdoorFurniture": "Meubles d'Extérieur",
    "Refrigerators": "Réfrigérateurs",
    "WashingMachine": "Machine à Laver",
    "FullPack": "Pack Complet"
  },
  "subSubcategories": {
    "DesktopComputer": "Ordinateur de Bureau",
    "CentralUnit": "Unité Centrale",
    "AllInOne": "Tout-en-Un",
    "Switchs": "Commutateurs",
    "ModemsRouters": "Modems & Routeurs",
    "WifiAccessPoints": "Points d'Accès Wifi",
    "EthernetCards": "Cartes Ethernet",
    "WifiRepeater": "Répéteur Wifi",
    "Other": "Autre",
    "Villa": "Villa",
    "Offices": "Bureaux",
    "RetailShops": "Magasins de Détail",
    "Warehouses": "Entrepôts",
    "Restaurants": "Restaurants",
    "Hotels": "Hôtels",
    "Sofas": "Canapés",
    "CoffeeTables": "Tables Basses",
    "TVStands": "Meubles TV",
    "Bookshelves": "Bibliothèques",
    "Armchairs": "Fauteuils",
    "Beds": "Lits",
    "Mattresses": "Matelas",
    "Wardrobes": "Armoires",
    "Nightstands": "Tables de Nuit",
    "Dressers": "Commodes",
    "HardDisk": "Disque Dur",
    "Charger": "Chargeur",
    "JetSki": "Jet-ski",
    "RigidBoats": "Bateaux Rigides",
    "InflatableBoats": "Bateaux Gonflables",
    "Boats": "Bateaux",
    "MechanicalElectricalParts": "Pièces Mécaniques et Électriques",
    "CarBodyParts": "Pièces de Carrosserie",
    "AutoAccessories": "Accessoires Auto",
    "CarSeats": "Sièges Auto",
    "OpticsLighting": "Optique et Éclairage",
    "Sound": "Son",
    "TiresRims": "Pneus & Jantes",
    "WindowsWindshield": "Vitres & Pare-brise",
    "Pieces": "Pièces",
    "Accessories": "Accessoires",
    "HelmetsProtection": "Casques et Protection",
    "Engines": "Moteurs",
    "RAM": "RAM",
    "Motherboard": "Carte Mère",
    "ScreenProtection": "Protection d'Écran",
    "ShockproofCases": "Coques Antichoc",
    "Supports": "Supports",
    "SelfieSticks": "Perches à Selfie",
    "Stabilizers": "Stabilisateurs",
    "VR": "VR",
    "MemoryCards": "Cartes Mémoire",
    "OthersAccessories": "Autres Accessoires",
    "Laptop": "Ordinateur Portable",
    "Macbooks": "Macbooks",
    "LaserPrinters": "Imprimantes Laser",
    "CartridgesToners": "Cartouches & Toners",
    "Multifunction": "Multifonction",
    "InkjetPrinters": "Imprimantes à Jet d'Encre",
    "Photocopier": "Photocopieur",
    "BarcodesLabelers": "Codes-barres & Étiqueteuses",
    "PhotoPrintersBadges": "Imprimantes Photo & Badges",
    "GraphicCard": "Carte Graphique",
    "PowerSupplyCase": "Alimentation - Boîtier",
    "Processor": "Processeur",
    "Cooling": "Refroidissement",
    "ReaderWriter": "Lecteur - Graveur",
    "InternalStorage": "Stockage Interne",
    "Screens": "Écrans",
    "KeyboardTouchpad": "Clavier - Pavé Tactile",
    "Batteries": "Batteries",
    "BaffleWebcam": "Écran - Webcam",
    "DataShows": "Projecteurs",
    "HardDrivers": "Disques Durs",
    "FlashDisk": "Clé USB",
    "MemoryCard": "Carte Mémoire",
    "Rack": "Rack",
    "TopsTShirts": "Hauts et T-Shirts",
    "Shirts": "Chemises",
    "Gilets": "Gilets",
    "JeansPants": "Jeans et Pantalons",
    "CoatsJackets": "Manteaux et Vestes",
    "Tracksuits": "Survêtements",
    "SuitsBlazers": "Costumes et Blazers",
    "ShortsPants": "Shorts et Pantalons"
  },
    addListing: {
      addListing: "Ajouter une annonce",
      photos: "Photos",
      addPhoto: "Ajouter une photo",
      title: "Titre",
      titlePlaceholder: "ex. iPhone 15 Pro Max 256Go",
      description: "Description",
      descriptionPlaceholder: "Décrivez votre article, son état et tout détail.",
      category: "Catégorie",
      selectCategory: "Sélectionner une catégorie",
      selectSubcategory: "Sélectionner une sous-catégorie",
      selectSubSubcategory: "Sélectionner une sous-sous-catégorie",
      selectCategoryPlaceholder: "Sélectionner une catégorie",
      dealType: "Type de transaction",
      alsoExchange: "Accepte aussi l'échange",
      price: "Prix",
      pricePlaceholder: "Entrez le prix (facultatif pour échange)",
      phoneNumber: "Numéro de téléphone",
      phoneNumberPlaceholder: "Votre numéro de contact (facultatif)",
      condition: "État",
      new: "Neuf",
      used: "Usagé",
      deliveryMethod: "Méthode de livraison",
      selectDeliveryMethod: "Sélectionner une méthode de livraison",
      selectDeliveryPlaceholder: "Sélectionnez la préférence de livraison",
      inPersonMeeting: "Rencontre en personne",
      delivery: "Livraison",
      both: "Les deux",
      close: "Fermer",
      publishListing: "Publier l'annonce",
      uploading: "Téléchargement",
      photo: "photo",
      photos: "photos",
      ok: "OK",
      
      uploadInProgress: "Téléchargement en cours",
      uploadInProgressMessage: "Veuillez attendre la fin du téléchargement avant de revenir.",
      discardChanges: "Abandonner les modifications ?",
      discardChangesMessage: "Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir revenir ?",
      cancel: "Annuler",
      discard: "Abandonner",
      continue: "Continuer",
      error: "Erreur",
      success: "Succès",
      
      errorAtLeastOnePhoto: "Veuillez ajouter au moins une photo.",
      errorEnterTitle: "Veuillez saisir un titre.",
      errorAddDescription: "Veuillez ajouter une description.",
      errorEnterPrice: "Veuillez saisir un prix.",
      errorSelectCategory: "Veuillez sélectionner une catégorie.",
      errorSelectDelivery: "Veuillez sélectionner une méthode de livraison.",
      fillAllFields: "Veuillez remplir tous les champs obligatoires.",
      
      permissionRequired: "Autorisation requise",
      permissionRequiredMessage: "Nous avons besoin d'accéder à vos photos pour télécharger une image.",
      imageTooLarge: "Image trop grande",
      imageTooLargeMessage: "L'image est trop grande. Veuillez choisir une image plus petite.",
      unableToSelectImage: "Impossible de sélectionner l'image",
      uploadError: "Erreur de téléchargement",
      failedToUploadImage: "Échec du téléchargement de l'image",
      imageUploadFailed: "Échec du téléchargement de l'image",
      allImageUploadsFailed: "Tous les téléchargements d'images ont échoué.",
      
      loadingCategories: "Chargement des catégories...",
      pleaseLogin: "Veuillez vous connecter pour créer une annonce",
      listingPublished: "Annonce publiée avec succès !",
      
      unableToLoadCategories: "Impossible de charger les catégories : ",
      unableToLoadSubcategories: "Impossible de charger les sous-catégories",
      unableToLoadSubSubcategories: "Impossible de charger les sous-sous-catégories",
      mustBeLoggedIn: "Vous devez être connecté pour créer une annonce.",
      userNotAuthenticated: "Utilisateur non authentifié",
      errorOccurred: "Une erreur s'est produite : ",
      unknownError: "Erreur inconnue",
      unableToAddProduct: "Impossible d'ajouter le produit",
      invalidCategory: "Catégorie ou référence utilisateur non valide.",
      noPermission: "Vous n'avez pas la permission d'ajouter des produits",
      productExists: "Ce produit existe déjà"
    },
    
   
  "blockedUsers": {
    "title": "Utilisateurs Bloqués",
    "unblockButton": "Débloquer",
    "unknownUser": "Utilisateur Inconnu",
    
    "errorTitle": "Erreur",
    "successTitle": "Succès",
    "failedToLoad": "Échec du chargement de la liste des utilisateurs bloqués.",
    "loginRequired": "Veuillez vous connecter pour débloquer des utilisateurs.",
    
    "unblockAlertTitle": "Débloquer l'utilisateur",
    "unblockAlertMessage": "Êtes-vous sûr de vouloir débloquer cet utilisateur ? Ses produits pourraient réapparaître dans votre fil d'actualité.",
    "cancel": "Annuler",
    
    "unblockSuccess": "Utilisateur débloqué avec succès.",
    "unblockFailed": "Échec du déblocage de l'utilisateur.",
    
    "emptyMessage": "Vous n'avez bloqué aucun utilisateur pour le moment.",
    "emptySubtext": "Les utilisateurs que vous bloquez ne pourront pas voir vos produits, et vous ne verrez pas les leurs."
  },

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
 language: "Langue",
  version: "Version",
  areYouSureLogout: "Êtes-vous sûr de vouloir vous déconnecter ?",
},

// Assuming these are at the root level:
cancel: "Annuler",
errorFailedLogout: "Erreur, échec de la déconnexion. Veuillez réessayer.",
    // Categories
    categories: {
  Food: "Alimentation",
    AnimalShop:"Boutique d'animaux",
  HomeandFurniture:"Maison et Meubles",

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
    
    // <<< ADDED KEYS
//  FOR TAB BAR >>>
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
language: "اللغة",
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

someonesProfile: {
    profile: "الملف الشخصي",
    posts: "المنشورات",
    following: "المتابَعون",
    followers: "المتابِعون",
    follow: "متابعة",
    unfollow: "إلغاء المتابعة",
    friends: "أصدقاء",
    chat: "محادثة",
    block: "حظر",
    report: "إبلاغ",
    cancel: "إلغاء",
    unblock: "إلغاء الحظر",
    
    // Alerts
    loginRequired: "تسجيل الدخول مطلوب",
    loginRequiredMessage: "يجب تسجيل الدخول لمتابعة المستخدمين.",
    errorTitle: "خطأ",
    errorMessage: "فشل تحميل ملف المستخدم.",
    profileNotFound: "لم يتم العثور على الملف الشخصي.",
    invalidUserId: "معرف مستخدم غير صالح.",
    
    // Block/Unblock
    blockUserTitle: "حظر المستخدم",
    blockUserMessage: "هل أنت متأكد من رغبتك في حظر {{username}}؟ سيؤدي هذا أيضًا إلى إزالة جميع علاقات المتابعة.",
    blocked: "تم الحظر!",
    userBlocked: "تم حظر {{username}}.",
    failedToBlock: "فشل حظر المستخدم. يرجى المحاولة مرة أخرى.",
    
    unblockUserTitle: "إلغاء حظر المستخدم",
    unblockUserMessage: "هل أنت متأكد من رغبتك في إلغاء حظر {{username}}؟",
    unblocked: "تم إلغاء الحظر!",
    userUnblocked: "تم إلغاء حظر {{username}}.",
    failedToUnblock: "فشل إلغاء حظر المستخدم. يرجى المحاولة مرة أخرى.",
    cannotUnblock: "لا يمكن إلغاء حظر المستخدم بدون معرفات.",
    mustBeLoggedIn: "يجب تسجيل الدخول لحظر مستخدم.",
    
    // Report
    reportUserTitle: "الإبلاغ عن المستخدم",
    reportUserMessage: "أنت تبلغ عن {{username}} بسبب محتوى أو سلوك غير لائق.",
    
    // Blocked state
    youBlockedUser: "لقد قمت بحظر هذا المستخدم.",
    cannotViewContent: "لا يمكنك عرض محتوى هذا المستخدم أثناء حظره.",
    
    // Empty states
    noItemsYet: "لم ينشر هذا المستخدم أي عناصر بعد.",
    postedItems: "العناصر المنشورة",
    postedItemsCount: "العناصر المنشورة ({{count}})",
    
    // Chat errors
    cannotStartChat: "لا يمكن بدء المحادثة. يرجى تسجيل الدخول.",
    chatErrorMessage: "فشل بدء الدردشة: {{error}}. تحقق من وحدة التحكم للحصول على التفاصيل.",
    
    // Follow errors
    followError: "فشل تحديث حالة المتابعة.",
    
    // Price formatting
    exchange: "مقايضة",
    million: "مليون",
    da: "دج",
    daMonth: "دج/شهر",
},
filterss: {
  title: "الفلاتر",
  "reset": "إعادة تعيين",
  "all": "الكل",
  "bestMatch": "أفضل تطابق",
  "mostRecent": "الأحدث",
  "lowestPrice": "أقل سعر",
  "highestPrice": "أعلى سعر",
  "nearest": "الأقرب",
  "allMethods": "جميع الطرق",
  "pickup": "الاستلام",
  "delivery": "التوصيل",
  "shipping": "الشحن",
  "new": "جديد",
  "used": "مستعمل",
  "allLocations": "جميع المواقع",
  "da": "دج",
  "thousands": "آلاف",
  "millions": "ملايين",
  "category": "الفئة",
  "sortBy": "ترتيب حسب",
  "location": "الموقع",
  "deliveryMethods": "طرق التوصيل",
  "priceUnit": "وحدة السعر",
  "standardPricing": "تسعير قياسي",
  "priceRange": "نطاق السعر",
  "min": "الحد الأدنى",
  "max": "الحد الأقصى",
  "itemCondition": "حالة العنصر",
  "seeResults": "عرض النتائج",
  "filteringResults": "تصفية النتائج لـ"
},


"subcategories": {
    "Phones": "الهواتف",
    "PhoneCases": "أغطية الهاتف",
    "ChargersAndCables": "الشواحن والكابلات",
    "HeadphonesAndEarphones": "سماعات الرأس والأذن",
    "ScreenProtectors": "واقيات الشاشة",
    "PowerBanks": "بطاريات خارجية",
    "Laptops": "الحواسيب المحمولة",
    "DesktopComputers": "أجهزة الكمبيوتر المكتبية",
    "Tablets": "الأجهزة اللوحية",
    "Monitors": "الشاشات",
    "KeyboardsAndMice": "لوحات المفاتيح والفئران",
    "PrintersAndScanners": "الطابعات والماسحات الضوئية",
    "Cars": "السيارات",
    "Motorcycles": "الدراجات النارية",
    "TrucksAndVans": "الشاحنات والشاحنات الصغيرة",
    "Bicycles": "الدراجات",
    "Apartments": "الشقق",
    "HousesAndVillas": "المنازل والفيلات",
    "CommercialProperties": "العقارات التجارية",
    "Land": "الأراضي",
    "LivingRoom": "غرفة المعيشة",
    "Bedroom": "غرفة النوم",
    "OfficeFurniture": "أثاث المكاتب",
    "DiningRoom": "غرفة الطعام",
    "OutdoorFurniture": "أثاث خارجي",
    "Refrigerators": "الثلاجات",
    "WashingMachine": "الغسالة",
    "FullPack": "حزمة كاملة"
  },
  "subSubcategories": {
    "DesktopComputer": "كمبيوتر مكتبي",
    "CentralUnit": "الوحدة المركزية",
    "AllInOne": "الكل في واحد",
    "Switchs": "المحولات",
    "ModemsRouters": "أجهزة المودم والموجهات",
    "WifiAccessPoints": "نقاط الوصول إلى الواي فاي",
    "EthernetCards": "بطاقات الإيثرنت",
    "WifiRepeater": "مكرر الواي فاي",
    "Other": "أخرى",
    "Villa": "فيلا",
    "Offices": "المكاتب",
    "RetailShops": "محلات البيع بالتجزئة",
    "Warehouses": "المستودعات",
    "Restaurants": "المطاعم",
    "Hotels": "الفنادق",
    "Sofas": "الأرائك",
    "CoffeeTables": "طاولات القهوة",
    "TVStands": "حوامل التلفزيون",
    "Bookshelves": "أرفف الكتب",
    "Armchairs": "الكراسي",
    "Beds": "الأسرّة",
    "Mattresses": "المراتب",
    "Wardrobes": "خزائن الملابس",
    "Nightstands": "طاولات السرير",
    "Dressers": "الخزائن",
    "HardDisk": "القرص الصلب",
    "Charger": "الشاحن",
    "JetSki": "جت سكي",
    "RigidBoats": "قوارب صلبة",
    "InflatableBoats": "قوارب قابلة للنفخ",
    "Boats": "القوارب",
    "MechanicalElectricalParts": "قطع ميكانيكية وكهربائية",
    "CarBodyParts": "قطع هيكل السيارة",
    "AutoAccessories": "إكسسوارات السيارات",
    "CarSeats": "مقاعد السيارة",
    "OpticsLighting": "البصريات والإضاءة",
    "Sound": "الصوت",
    "TiresRims": "الإطارات والجنوط",
    "WindowsWindshield": "النوافذ والزجاج الأمامي",
    "Pieces": "القطع",
    "Accessories": "الإكسسوارات",
    "HelmetsProtection": "الخوذات والحماية",
    "Engines": "المحركات",
    "RAM": "الذاكرة العشوائية",
    "Motherboard": "اللوحة الأم",
    "ScreenProtection": "حماية الشاشة",
    "ShockproofCases": "أغطية مقاومة للصدمات",
    "Supports": "الحوامل",
    "SelfieSticks": "عصا السيلفي",
    "Stabilizers": "المثبتات",
    "VR": "الواقع الافتراضي",
    "MemoryCards": "بطاقات الذاكرة",
    "OthersAccessories": "إكسسوارات أخرى",
    "Laptop": "حاسوب محمول",
    "Macbooks": "ماك بوك",
    "LaserPrinters": "طابعات ليزر",
    "CartridgesToners": "الخراطيش والأحبار",
    "Multifunction": "متعدد الوظائف",
    "InkjetPrinters": "طابعات نفث الحبر",
    "Photocopier": "آلة تصوير",
    "BarcodesLabelers": "الباركود والملصقات",
    "PhotoPrintersBadges": "طابعات صور وشارات",
    "GraphicCard": "بطاقة الرسومات",
    "PowerSupplyCase": "مزود الطاقة - العلبة",
    "Processor": "المعالج",
    "Cooling": "التبريد",
    "ReaderWriter": "القارئ - الكاتب",
    "InternalStorage": "التخزين الداخلي",
    "Screens": "الشاشات",
    "KeyboardTouchpad": "لوحة المفاتيح - لوحة اللمس",
    "Batteries": "البطاريات",
    "BaffleWebcam": "الحاجز - كاميرا الويب",
    "DataShows": "عروض البيانات",
    "HardDrivers": "محركات الأقراص الصلبة",
    "FlashDisk": "فلاش ديسك",
    "MemoryCard": "بطاقة الذاكرة",
    "Rack": "الرف",
    "TopsTShirts": "القمصان والتيشيرتات",
    "Shirts": "القمصان",
    "Gilets": "السترات",
    "JeansPants": "الجينز والبنطلونات",
    "CoatsJackets": "المعاطف والسترات",
    "Tracksuits": "البدلات الرياضية",
    "SuitsBlazers": "البدلات والسترات الرسمية",
    "ShortsPants": "الشورتات والبنطلونات"
  },
   addListing: {
      addListing: "إضافة إعلان",
      photos: "الصور",
      addPhoto: "إضافة صورة",
      title: "العنوان",
      titlePlaceholder: "مثال: iPhone 15 Pro Max 256GB",
      description: "الوصف",
      descriptionPlaceholder: "صف المنتج، حالته، وأي تفاصيل.",
      category: "الفئة",
      selectCategory: "اختر الفئة",
      selectSubcategory: "اختر الفئة الفرعية",
      selectSubSubcategory: "اختر الفئة الفرعية الفرعية",
      selectCategoryPlaceholder: "اختر فئة",
      dealType: "نوع الصفقة",
      alsoExchange: "أقبل أيضًا المقايضة",
      price: "السعر",
      pricePlaceholder: "أدخل السعر (اختياري للمقايضة)",
      phoneNumber: "رقم الهاتف",
      phoneNumberPlaceholder: "رقم الاتصال الخاص بك (اختياري)",
      condition: "الحالة",
      new: "جديد",
      used: "مستعمل",
      deliveryMethod: "طريقة التسليم",
      selectDeliveryMethod: "اختر طريقة التسليم",
      selectDeliveryPlaceholder: "اختر تفضيل التسليم",
      inPersonMeeting: "لقاء شخصي",
      delivery: "توصيل",
      both: "كلاهما",
      close: "إغلاق",
      publishListing: "نشر الإعلان",
      uploading: "جاري الرفع",
      photo: "صورة",
      photos: "صور",
      ok: "حسنًا",
      
      uploadInProgress: "جاري الرفع",
      uploadInProgressMessage: "يرجى الانتظار حتى يكتمل الرفع قبل العودة.",
      discardChanges: "تجاهل التغييرات؟",
      discardChangesMessage: "لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد العودة؟",
      cancel: "إلغاء",
      discard: "تجاهل",
      continue: "متابعة",
      error: "خطأ",
      success: "نجاح",
      
      errorAtLeastOnePhoto: "الرجاء إضافة صورة واحدة على الأقل.",
      errorEnterTitle: "الرجاء إدخال العنوان.",
      errorAddDescription: "الرجاء إضافة وصف.",
      errorEnterPrice: "الرجاء إدخال السعر.",
      errorSelectCategory: "الرجاء اختيار فئة.",
      errorSelectDelivery: "الرجاء اختيار طريقة التسليم.",
      fillAllFields: "الرجاء ملء جميع الحقول المطلوبة.",
      
      permissionRequired: "الإذن مطلوب",
      permissionRequiredMessage: "نحتاج إلى الوصول إلى صورك لرفع صورة.",
      imageTooLarge: "الصورة كبيرة جدًا",
      imageTooLargeMessage: "الصورة كبيرة جدًا. الرجاء اختيار صورة أصغر.",
      unableToSelectImage: "تعذر تحديد الصورة",
      uploadError: "خطأ في الرفع",
      failedToUploadImage: "فشل رفع الصورة",
      imageUploadFailed: "فشل رفع الصورة",
      allImageUploadsFailed: "فشلت جميع عمليات رفع الصور.",
      
      loadingCategories: "جاري تحميل الفئات...",
      pleaseLogin: "يرجى تسجيل الدخول لإنشاء إعلان",
      listingPublished: "تم نشر الإعلان بنجاح!",
      
      unableToLoadCategories: "تعذر تحميل الفئات: ",
      unableToLoadSubcategories: "تعذر تحميل الفئات الفرعية",
      unableToLoadSubSubcategories: "تعذر تحميل الفئات الفرعية الفرعية",
      mustBeLoggedIn: "يجب تسجيل الدخول لإنشاء إعلان.",
      userNotAuthenticated: "المستخدم غير مصادق عليه",
      errorOccurred: "حدث خطأ: ",
      unknownError: "خطأ غير معروف",
      unableToAddProduct: "تعذر إضافة المنتج",
      invalidCategory: "فئة أو مرجع مستخدم غير صالح.",
      noPermission: "ليس لديك إذن لإضافة منتجات",
      productExists: "هذا المنتج موجود بالفعل"
    },

    notificationsSettings: {
    title: "الإشعارات",
    social: "اجتماعي",
    newFollowersTitle: "متابعون جدد",
    newFollowersDescription: "احصل على إشعار عندما يتابعك شخص ما",
    likesTitle: "الإعجابات",
    likesDescription: "احصل على إشعار عندما يعجب شخص ما بمنتجك",
    commentsTitle: "التعليقات",
    commentsDescription: "احصل على إشعار عندما يعلق شخص ما",
    mentionsTitle: "الإشارات",
    mentionsDescription: "احصل على إشعار عندما يشير إليك شخص ما",
    recommendations: "التوصيات",
    recommendedForYouTitle: "موصى به لك",
    recommendedForYouDescription: "احصل على توصيات منتجات مخصصة",
    collectibleUpdatesTitle: "تحديثات المقتنيات",
    collectibleUpdatesDescription: "تحديثات حول المقتنيات التي تهتم بها",
    liveEvents: "الأحداث المباشرة",
    bookmarkedLiveEventsTitle: "الأحداث المباشرة المحفوظة",
    bookmarkedLiveEventsDescription: "تذكيرات للأحداث التي قمت بحفظها",
    suggestedLiveEventsTitle: "الأحداث المباشرة المقترحة",
    suggestedLiveEventsDescription: "احصل على إشعار حول الأحداث المباشرة التي قد تعجبك",
    shopping: "التسوق",
    marketplaceTitle: "السوق",
    marketplaceDescription: "تحديثات حول عناصر السوق",
    ordersTitle: "الطلبات",
    ordersDescription: "تحديثات حول طلباتك ومشترياتك",
},
    categories: {
  Food: "طعام",
  AnimalShop:"متجر الحيوانات",
  HomeandFurniture:"المنزل والأثاث",
  
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
    productDetail: {
  // Loading & Errors
  loadingText: "جارٍ تحميل تفاصيل المنتج...",
  productNotFound: "لم يتم العثور على المنتج.",
  errorLoading: "فشل تحميل المنتج.",
  million: "مليون",
    priceSuffixDA: "دج", // دينار جزائري (DA)
  // Header Actions
  loginRequired: "تسجيل الدخول مطلوب",
  loginRequiredMessage: "يرجى تسجيل الدخول للإعجاب بالمنتجات",
  
  // Product Info
  condition: "الحالة",
  conditionNotSpecified: "الحالة غير محددة",
  conditionNew: "جديد",
  conditionUsed: "مستعمل",
  
  // Price & Exchange
  perMonth: "/شهر",
  exchange: "مقايضة",
  
  // Badges
  shippingAvailable: "الشحن متوفر",
  
  // Sections
  description: "الوصف",
  seeMore: "... عرض المزيد",
  postedOn: "نُشر في",
  postedBy: "نُشر بواسطة",
  joined: "انضم",
  recently: "مؤخراً",
  
  // Map
  mapCaption: "الخريطة تقريبية للحفاظ على خصوصية موقع البائع.",
  
  // Buttons
  call: "اتصال",
  chat: "محادثة",
  delete: "حذف",
  editProduct: "تعديل المنتج",
  
  // Delete Confirmation
  deleteTitle: "حذف المنتج",
  deleteMessage: "هل أنت متأكد من رغبتك في حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.",
  cancel: "إلغاء",
  deleteConfirm: "حذف",
  deleteSuccess: "نجح",
  deleteSuccessMessage: "تم حذف المنتج بنجاح",
  deleteError: "خطأ",
  deleteErrorMessage: "فشل حذف المنتج",
  ok: "حسناً",
  
  // Menu Options
  shareItem: "مشاركة العنصر",
  reportItem: "الإبلاغ عن هذا العنصر",
  copyLink: "نسخ الرابط",
  
  // Errors
  error: "خطأ",
  errorMessage: "فشل في جلب تفاصيل المنتج.",
  sellerNotAvailable: "معلومات البائع غير متوفرة.",
  failedToUpdateLike: "فشل تحديث حالة الإعجاب",
},
search: {
  "title": "بحث",
  "subtitle": "البحث في السوق المحلي",
  "placeholder": "بحثك",
  "allCategories": "جميع الفئات",
  "searchButton": "بحث",
  "recentSearches": "عمليات البحث الأخيرة",
  "noRecentSearches": "لا توجد عمليات بحث حديثة",
  "emptySearchTitle": "بحث فارغ",
  "emptySearchMessage": "الرجاء إدخال مصطلح بحث",
  "noResultsTitle": "لا توجد نتائج",
  "noResultsMessage": "لم يتم العثور على منتجات تطابق بحثك",
  "errorTitle": "خطأ",
  "errorMessage": "فشل في تنفيذ البحث: "
},

  "blockedUsers": {
    "title": "المستخدمون المحظورون",
    "unblockButton": "إلغاء الحظر",
    "unknownUser": "مستخدم غير معروف",
    
    "errorTitle": "خطأ",
    "successTitle": "نجاح",
    "failedToLoad": "فشل في تحميل قائمة المستخدمين المحظورين.",
    "loginRequired": "يرجى تسجيل الدخول لإلغاء حظر المستخدمين.",
    
    "unblockAlertTitle": "إلغاء حظر المستخدم",
    "unblockAlertMessage": "هل أنت متأكد أنك تريد إلغاء حظر هذا المستخدم؟ قد تظهر منتجاته مرة أخرى في موجزك.",
    "cancel": "إلغاء",
    
    "unblockSuccess": "تم إلغاء حظر المستخدم بنجاح.",
    "unblockFailed": "فشل في إلغاء حظر المستخدم.",
    
    "emptyMessage": "لم تقم بحظر أي مستخدم حتى الآن.",
    "emptySubtext": "لن يتمكن المستخدمون الذين تحظرهم من رؤية منتجاتك، ولن تتمكن من رؤية منتجاتهم."
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