import { Language } from '../types';

export interface Translations {
  eventsTitle: string;
  adminSignIn: string;
  adminSignOut: string;
  addEvent: string;
  editEvent: string;
  deleteEvent: string;
  deleteConfirmTitle: string;
  deleteConfirmDesc: string;
  confirmDeleteBtn: string;
  cancelBtn: string;
  likes: string;
  views: string;
  openForAll: string;
  registrationRequired: string;
  paidEvent: string;
  freeEvent: string;
  requiresAdminCode: string;
  clickToViewMore: string;
  eventDetails: string;
  date: string;
  time: string;
  location: string;
  description: string;
  title: string;
  uploadImage: string;
  addImagePlaceholder: string;
  imageUrl: string;
  removeImage: string;
  eventType: string;
  paidSwitch: string;
  paidSwitchDesc: string;
  blueprintTitle: string;
  blueprintDesc: string;
  addBlueprint: string;
  hideBlueprint: string;
  saveEvent: string;
  updateEvent: string;
  registrationsList: string;
  noRegistrationsYet: string;
  adminReservationSection: string;
  adminReservationDesc: string;
  attendeeName: string;
  attendeePhone: string;
  numberOfPeople: string;
  generateCodeBtn: string;
  generatedCodeIs: string;
  codeInstructions: string;
  registerNow: string;
  selectASeatOrTable: string;
  chair: string;
  table: string;
  capacity: string;
  seatsLeft: string;
  tableFull: string;
  optimalFitBadge: string;
  oversizedWarning: string;
  enterEightDigitCode: string;
  codePlaceholder: string;
  verifyAndReserve: string;
  completeFreeRegistration: string;
  ticketTitle: string;
  screenshotPrompt: string;
  seatAssigned: string;
  partyCount: string;
  confirmationCode: string;
  closeBtn: string;
  successReservation: string;
  conflictError: string;
  invalidCodeError: string;
  codeAlreadyUsedError: string;
  adminUsername: string;
  adminPassword: string;
  loginBtn: string;
  adminLoginTitle: string;
  adminLoginError: string;
  canvasToolbarPerimeter: string;
  canvasPerimeterDrawInstruction: string;
  canvasPerimeterCloseBtn: string;
  canvasPerimeterUndoPoint: string;
  canvasPerimeterClear: string;
  canvasPerimeterEmptyNotice: string;
  canvasPerimeterPointsCount: string;
  canvasPerimeterPresetRect: string;
  canvasPerimeterPresetLShape: string;
  canvasPerimeterPresetNave: string;
  canvasToolbarChair: string;
  canvasToolbarRoundTable: string;
  canvasToolbarRectTable: string;
  canvasToolbarText: string;
  canvasToolbarClear: string;
  canvasLabelInput: string;
  canvasCapacityInput: string;
  canvasResizeSlider: string;
  canvasResetSize: string;
  canvasSize: string;
  canvasSizeStandard: string;
  canvasSizeWide: string;
  canvasSizeLarge: string;
  canvasSizeTall: string;
  canvasPerimeterFullCanvas: string;
  canvasPerimeterFreeCanvas: string;
  canvasMaximize: string;
  canvasMinimize: string;
  canvasBoundaryNote: string;
  canvasTipDesktop: string;
  noEventsFound: string;
  searchPlaceholder: string;
  allEvents: string;
  statusReserved: string;
  statusAvailable: string;
  yourReservation: string;
  orChooseSample: string;
  sampleImageRecital: string;
  sampleImageDinner: string;
  sampleImageRetreat: string;
  sampleImageFestival: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  locationPlaceholder: string;
  defaultLocation: string;
  eventTypeDesc: string;
  freeRegistrationDesc: string;
  namePlaceholder: string;
  adminNamePlaceholder: string;
  verifyCodeBtn: string;
  paidCodeHelpText: string;
  codeVerifiedFor: string;
  guestsCount: string;
  personUnit: string;
  seatsUnit: string;
  noPhoneProvided: string;
  seatLabelPrefix: string;
  paidBadge: string;
  freeBadge: string;
  issuedCodesTitle: string;
  codeClaimed: string;
  codeAvailable: string;
  copiedText: string;
  copyText: string;
  totalGuests: string;
  registrationFailedGeneric: string;
  eventNotFound: string;
  loadingMoreEvents: string;
  loadMoreEvents: string;
  remainingCount: string;
  defaultTablePrefix: string;
  defaultLabelName: string;
  optimalFitFitNote: string;
  openEventNotice: string;
  openEventFreeNoticeTitle: string;
  openEventFreeNoticeDesc: string;
  openEventAdminNote: string;
  uploadImageFile: string;
  dragAndDropImage: string;
  browseFiles: string;
  maxFileSizeNotice: string;
  fileSizeExceededError: string;
  invalidImageTypeError: string;
  uploadingImage: string;
  uploadedToSupabase: string;
  imageReady: string;
  changeImage: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    eventsTitle: 'المناسبات',
    adminSignIn: 'تسجيل دخول المشرف',
    adminSignOut: 'تسجيل خروج',
    addEvent: 'إضافة مناسبة جديدة',
    editEvent: 'تعديل المناسبة',
    deleteEvent: 'حذف المناسبة',
    deleteConfirmTitle: 'تأكيد حذف المناسبة',
    deleteConfirmDesc: 'هل أنت متأكد من رغبتك في حذف هذه المناسبة؟ سيتم إلغاء كافة الحجوزات المرتبطة بها نهائياً.',
    confirmDeleteBtn: 'نعم، حذف المناسبة',
    cancelBtn: 'إلغاء',
    likes: 'إعجاب',
    views: 'مشاهدة',
    openForAll: 'مفتوح للجميع',
    registrationRequired: 'يتطلب تسجيلاً مسبقاً',
    paidEvent: 'فعالية باشتراك / مدفوعة',
    freeEvent: 'فعالية مجانية',
    requiresAdminCode: 'يتطلب رمز دخول (8 أرقام) من المشرف',
    clickToViewMore: 'انقر للتفاصيل والتسجيل',
    eventDetails: 'تفاصيل المناسبة',
    date: 'التاريخ',
    time: 'الوقت',
    location: 'المكان',
    description: 'الوصف',
    title: 'عنوان المناسبة',
    uploadImage: 'صورة الفعالية',
    addImagePlaceholder: 'إضافة صورة للفعالية',
    imageUrl: 'رابط الصورة أو التحميل',
    removeImage: 'إزالة الصورة',
    eventType: 'نوع المناسبة',
    paidSwitch: 'مناسبة مدفوعة (تتطلب رمز حجز من الإدارة)',
    paidSwitchDesc: 'يقوم المشارك بالدفع للمشرف مسبقاً، ويقوم المشرف بتوليد رمز حجز مكوّن من 8 أرقام للمشارك.',
    blueprintTitle: 'مخطط المقاعد والطاولات (Blueprint)',
    blueprintDesc: 'رسم تفاعلي للمكان لاختيار الكراسي والطاولات مباشرة',
    addBlueprint: 'فتح أداة رسم المخطط التفاعلي',
    hideBlueprint: 'إخفاء المخطط',
    saveEvent: 'نشر المناسبة',
    updateEvent: 'حفظ التعديلات',
    registrationsList: 'سجل المسجلين والحجوزات',
    noRegistrationsYet: 'لا توجد حجوزات مسجلة بعد لهذه الفعالية.',
    adminReservationSection: 'لوحة المشرف: تسجيل مشارك وتوليد رمز الحجز (8 أرقام)',
    adminReservationDesc: 'عند استلام المبلغ من المشارك، أدخل اسمه وعدد المقاعد المطلوبة لتوليد رمز الحجز الخاص به.',
    attendeeName: 'اسم المشارك / العائلة',
    attendeePhone: 'رقم الهاتف',
    numberOfPeople: 'عدد الأفراد المطلوبة',
    generateCodeBtn: 'تسجيل وتوليد الرمز المكون من 8 أرقام',
    generatedCodeIs: 'تم توليد رمز الحجز بنجاح:',
    codeInstructions: 'أعطِ هذا الرمز للمشارك ليدخله عند حجز طاولته أو مقعده على المخطط.',
    registerNow: 'تسجيل الحجز',
    selectASeatOrTable: 'حدد مقعدك أو طاولتك على المخطط',
    chair: 'كرسي',
    table: 'طاولة',
    capacity: 'السعة',
    seatsLeft: 'مقاعد متبقية',
    tableFull: 'الطاولة ممتلئة بالكامل',
    optimalFitBadge: 'ملائم لعدد أفرادك تماماً',
    oversizedWarning: 'يرجى اختيار طاولة متبقية تناسب عدد أفرادك لمنع ترك مقاعد فارغة',
    enterEightDigitCode: 'أدخل رمز الحجز (8 أرقام) المستلم من المشرف',
    codePlaceholder: 'مثال: 84920173',
    verifyAndReserve: 'تأكيد الحجز وتثبيت المقعد',
    completeFreeRegistration: 'تأكيد التسجيل المجاني',
    ticketTitle: 'بطاقة الحجز الرسمية',
    screenshotPrompt: 'يرجى أخذ لقطة شاشة (Screenshot) لهذه البطاقة وإبرازها عند الحضور للكنيسة.',
    seatAssigned: 'المكان المحدد',
    partyCount: 'عدد الأفراد',
    confirmationCode: 'رمز التأكيد',
    closeBtn: 'إغلاق',
    successReservation: 'تم تأكيد حجزك بنجاح وننتظر حضورك المبارك!',
    conflictError: 'عذراً! تم حجز هذا المقعد أو الطاولة بواسطة شخص آخر للتو. يرجى اختيار مكان آخر.',
    invalidCodeError: 'الرمز المدخل غير صالح أو غير مخصص لهذه الفعالية. يرجى مراجعة المشرف.',
    codeAlreadyUsedError: 'تم استخدام رمز الحجز هذا مسبقاً ولا يمكن استخدامه مرة أخرى.',
    adminUsername: 'اسم المستخدم',
    adminPassword: 'كلمة مرور المشرف',
    loginBtn: 'تسجيل الدخول',
    adminLoginTitle: 'دخول لوحة إدارة مناسبات الكنيسة',
    adminLoginError: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    canvasToolbarPerimeter: 'محيط القاعة',
    canvasPerimeterDrawInstruction: 'انقر على أي جدار أو زر (+) لإضافة زاوية. اسحب النقاط لتعديل الشكل، أو انقر مرتين لحذف نقطة.',
    canvasPerimeterCloseBtn: 'إغلاق وحفظ المحيط',
    canvasPerimeterUndoPoint: 'تراجع عن نقطة',
    canvasPerimeterClear: 'مسح المحيط',
    canvasPerimeterEmptyNotice: 'لم يتم تحديد محيط للقاعة افتراضياً. انقر على "محيط القاعة" لرسم الجدران والحدود يدوياً.',
    canvasPerimeterPointsCount: 'النقاط:',
    canvasPerimeterPresetRect: 'مستطيل',
    canvasPerimeterPresetLShape: 'شكل L',
    canvasPerimeterPresetNave: 'قاعة ومذبح',
    canvasToolbarChair: '+ كرسي',
    canvasToolbarRoundTable: '+ طاولة دائرية',
    canvasToolbarRectTable: '+ طاولة مستطيلة',
    canvasToolbarText: '+ نص / تسمية',
    canvasToolbarClear: 'مسح الكل',
    canvasLabelInput: 'اسم / رقم العنصر',
    canvasCapacityInput: 'سعة الطاولة (أفراد)',
    canvasResizeSlider: 'تعديل الحجم:',
    canvasResetSize: 'الحجم الافتراضي',
    canvasSize: 'أبعاد المخطط:',
    canvasSizeStandard: 'قياسي (720 × 480)',
    canvasSizeWide: 'عريض (880 × 480)',
    canvasSizeLarge: 'كبير جداً (1000 × 580)',
    canvasSizeTall: 'عمودي (720 × 640)',
    canvasPerimeterFullCanvas: 'ملء كامل المخطط (100%)',
    canvasPerimeterFreeCanvas: 'بدون جدران (مخطط حر)',
    canvasMaximize: 'تكبير مساحة العمل',
    canvasMinimize: 'عرض عادي',
    canvasBoundaryNote: 'ملاحظة: يمكنك وضع المقاعد والطاولات في أي مكان على كامل المخطط. الصندوق الداخلي يمثل جدران القاعة فقط ويمكنك ملؤه أو إزالته بحرية.',
    canvasTipDesktop: 'نصيحة: يمكنك استخدام الفأرة على شاشات الكمبيوتر للرسم والتحريك بسهولة.',
    noEventsFound: 'لا توجد مناسبات حالية.',
    searchPlaceholder: 'بحث في المناسبات...',
    allEvents: 'جميع المناسبات',
    statusReserved: 'محجوز',
    statusAvailable: 'متاح',
    yourReservation: 'حجزك',
    orChooseSample: 'أو اختر نموذجاً:',
    sampleImageRecital: 'أمسية ترانيم / صلاة',
    sampleImageDinner: 'عشاء محبة / قاعة',
    sampleImageRetreat: 'خلوة روحية / دير',
    sampleImageFestival: 'بازار / مهرجان',
    titlePlaceholder: 'مثال: قداس ورسالة القيامة وعشاء المحبة السنوي',
    descriptionPlaceholder: 'اكتب نبذة كاملة عن المناسبة، البرنامج، وأوقات الحضور...',
    locationPlaceholder: 'قاعة الكنيسة / الصحن الرئيسي',
    defaultLocation: 'قاعة الكنيسة الرئيسية',
    eventTypeDesc: 'حدد ما إذا كان الحضور عاماً ومفتوحاً للجميع أو يتطلب تسجيلاً وحجز مقاعد.',
    freeRegistrationDesc: 'يرجى ملء بيانات الحجز لاختيار المقعد وتأكيد الحضور.',
    namePlaceholder: 'الاسم الثلاثي أو اسم العائلة',
    adminNamePlaceholder: 'اسم العائلة أو الحاجز المسدد للمبلغ',
    verifyCodeBtn: 'التحقق من الرمز',
    paidCodeHelpText: '* احصل على الرمز المكون من 8 أرقام من إدارة الكنيسة بعد سداد الاشتراك.',
    codeVerifiedFor: 'تم تفعيل الرمز بنجاح باسم: ',
    guestsCount: 'أفراد',
    personUnit: 'فرد',
    seatsUnit: 'مقاعد',
    noPhoneProvided: 'بدون هاتف',
    seatLabelPrefix: 'المقعد:',
    paidBadge: 'مدفوع',
    freeBadge: 'مجاني',
    issuedCodesTitle: 'رموز الحجز الصادرة لهذه المناسبة:',
    codeClaimed: 'تم الاستخدام',
    codeAvailable: 'متاح للاستخدام',
    copiedText: 'تم النسخ',
    copyText: 'نسخ الرمز',
    totalGuests: 'إجمالي الأفراد:',
    registrationFailedGeneric: 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.',
    eventNotFound: 'المناسبة غير موجودة',
    loadingMoreEvents: 'جاري تحميل المزيد من المناسبات...',
    loadMoreEvents: 'تحميل المزيد من المناسبات',
    remainingCount: 'متبقي',
    defaultTablePrefix: 'طاولة',
    defaultLabelName: 'مذبح / مدخل / منصة',
    optimalFitFitNote: '* سيتم تحديد وتفضيل الطاولات التي تتطابق مع عدد الأفراد المختار لمنع ترك مقاعد فارغة.',
    openEventNotice: 'هذه المناسبة مفتوحة ومجانية للجميع، والدخول حر بدون الحاجة لحجز مقاعد مسبقاً أو دفع أي رسوم. أهلاً وسهلاً بالجميع!',
    openEventFreeNoticeTitle: 'مناسبة مفتوحة ومجانية للجميع',
    openEventFreeNoticeDesc: 'الفعاليات المفتوحة للجميع تتميز بالدخول الحر ومجانية بالكامل. لا حاجة لمخطط المقاعد أو دفع رسوم أو رموز حجز.',
    openEventAdminNote: 'هذه الفعالية مفتوحة ومجانية بدخول حر. لا حاجة لتوليد رموز حجز أو تسجيل مقاعد للحضور.',
    uploadImageFile: 'رفع صورة الفعالية',
    dragAndDropImage: 'اسحب وأفلت صورة الفعالية هنا، أو',
    browseFiles: 'تصفح جهازك',
    maxFileSizeNotice: 'الحد الأقصى لحجم الصورة: 5 ميغابايت (JPG, PNG, WebP)',
    fileSizeExceededError: 'حجم الصورة يتجاوز الحد الأقصى المسموح به وهو 5 ميغابايت. يرجى اختيار صورة أصغر.',
    invalidImageTypeError: 'نوع الملف غير صالح. يرجى اختيار ملف صورة صالح.',
    uploadingImage: 'جاري رفع الصورة إلى حاوية Supabase...',
    uploadedToSupabase: 'تم الحفظ في حاوية Supabase (event-images)',
    imageReady: 'الصورة جاهزة',
    changeImage: 'تغيير الصورة'
  },
  en: {
    eventsTitle: 'Events',
    adminSignIn: 'Admin Sign In',
    adminSignOut: 'Sign Out',
    addEvent: 'Add New Event',
    editEvent: 'Edit Event',
    deleteEvent: 'Delete Event',
    deleteConfirmTitle: 'Confirm Event Deletion',
    deleteConfirmDesc: 'Are you sure you want to delete this event? All associated seating registrations and records will be permanently removed.',
    confirmDeleteBtn: 'Yes, Delete Event',
    cancelBtn: 'Cancel',
    likes: 'Likes',
    views: 'Views',
    openForAll: 'Open for All',
    registrationRequired: 'Registration Required',
    paidEvent: 'Paid / Ticketed Event',
    freeEvent: 'Free Event',
    requiresAdminCode: 'Requires 8-digit code from Admin',
    clickToViewMore: 'Click for details & registration',
    eventDetails: 'Event Details',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    description: 'Description',
    title: 'Event Title',
    uploadImage: 'Event Image',
    addImagePlaceholder: 'Add Image to Event',
    imageUrl: 'Image URL or Upload',
    removeImage: 'Remove Image',
    eventType: 'Event Type',
    paidSwitch: 'Paid Event (Requires 8-Digit Admin Code)',
    paidSwitchDesc: 'Members pay the church admin offline, and the admin generates an 8-digit code for them to hold their seats.',
    blueprintTitle: 'Seating Blueprint & Floor Plan',
    blueprintDesc: 'Interactive canvas floor plan where members choose their seats or tables',
    addBlueprint: 'Open Interactive Blueprint Editor',
    hideBlueprint: 'Hide Blueprint',
    saveEvent: 'Publish Event',
    updateEvent: 'Save Changes',
    registrationsList: 'Registrations & Attendees Log',
    noRegistrationsYet: 'No registrations logged for this event yet.',
    adminReservationSection: 'Admin Desk: Register Member & Generate 8-Digit Code',
    adminReservationDesc: 'After collecting payment from the attendee, enter their name and party count to generate their 8-digit reservation code.',
    attendeeName: 'Attendee / Family Name',
    attendeePhone: 'Phone Number',
    numberOfPeople: 'Number of People',
    generateCodeBtn: 'Register & Generate 8-Digit Code',
    generatedCodeIs: 'Generated 8-Digit Access Code:',
    codeInstructions: 'Share this 8-digit code with the attendee so they can input it to choose their table or seat.',
    registerNow: 'Register',
    selectASeatOrTable: 'Select a chair or table on the blueprint',
    chair: 'Chair',
    table: 'Table',
    capacity: 'Capacity',
    seatsLeft: 'Seats Left',
    tableFull: 'Table Full',
    optimalFitBadge: 'Perfect fit for your party',
    oversizedWarning: 'Please select a table that best fits your group to prevent empty seats',
    enterEightDigitCode: 'Enter the 8-digit code received from church admin',
    codePlaceholder: 'e.g. 84920173',
    verifyAndReserve: 'Confirm & Reserve Seat',
    completeFreeRegistration: 'Complete Free Registration',
    ticketTitle: 'Official Church Event Ticket',
    screenshotPrompt: 'Please take a screenshot of this ticket to present at church reception.',
    seatAssigned: 'Assigned Seat / Table',
    partyCount: 'Party Size',
    confirmationCode: 'Confirmation Code',
    closeBtn: 'Close',
    successReservation: 'Your reservation has been confirmed! We look forward to welcoming you.',
    conflictError: 'Notice: This seat was just reserved by someone else. Please select another seat.',
    invalidCodeError: 'Invalid 8-digit code or code not assigned to this event. Please verify with admin.',
    codeAlreadyUsedError: 'This 8-digit code has already been used to reserve seats.',
    adminUsername: 'Username',
    adminPassword: 'Admin Password',
    loginBtn: 'Sign In',
    adminLoginTitle: 'Church Events Admin Sign In',
    adminLoginError: 'Invalid username or password',
    canvasToolbarPerimeter: 'Hall Perimeter',
    canvasPerimeterDrawInstruction: 'Click any wall or (+) to add a corner point. Drag points to reshape, or double-click to delete.',
    canvasPerimeterCloseBtn: 'Close & Save Perimeter',
    canvasPerimeterUndoPoint: 'Undo Point',
    canvasPerimeterClear: 'Clear Perimeter',
    canvasPerimeterEmptyNotice: 'No perimeter is given by default. Click "Hall Perimeter" to trace your room boundary manually.',
    canvasPerimeterPointsCount: 'Points:',
    canvasPerimeterPresetRect: 'Rectangle',
    canvasPerimeterPresetLShape: 'L-Shape',
    canvasPerimeterPresetNave: 'Nave & Altar',
    canvasToolbarChair: '+ Chair',
    canvasToolbarRoundTable: '+ Round Table',
    canvasToolbarRectTable: '+ Rect Table',
    canvasToolbarText: '+ Text Label',
    canvasToolbarClear: 'Clear All',
    canvasLabelInput: 'Item Label / ID',
    canvasCapacityInput: 'Table Capacity (Persons)',
    canvasResizeSlider: 'Resize (Scale):',
    canvasResetSize: 'Default size',
    canvasSize: 'Canvas Size:',
    canvasSizeStandard: 'Standard (720 × 480)',
    canvasSizeWide: 'Wide (880 × 480)',
    canvasSizeLarge: 'Extra Large (1000 × 580)',
    canvasSizeTall: 'Tall (720 × 640)',
    canvasPerimeterFullCanvas: 'Fit Full Canvas (100%)',
    canvasPerimeterFreeCanvas: 'No Walls (Free Plan)',
    canvasMaximize: 'Expand Canvas',
    canvasMinimize: 'Normal View',
    canvasBoundaryNote: 'Note: You can place tables & chairs anywhere across the full canvas. The inner dashed box is the room wall perimeter, which can be expanded to the full canvas or removed.',
    canvasTipDesktop: 'Tip: Floor plan editing is optimized for desktop PC / tablet drawing.',
    noEventsFound: 'No events found.',
    searchPlaceholder: 'Search church events...',
    allEvents: 'All Events',
    statusReserved: 'Reserved',
    statusAvailable: 'Available',
    yourReservation: 'Your Booking',
    orChooseSample: 'Or choose a preset image:',
    sampleImageRecital: 'Choir / Prayer Recital',
    sampleImageDinner: 'Fellowship Dinner / Hall',
    sampleImageRetreat: 'Spiritual Retreat / Monastery',
    sampleImageFestival: 'Charity Bazaar / Festival',
    titlePlaceholder: 'e.g. Annual Parish Agape Dinner & Easter Liturgy',
    descriptionPlaceholder: 'Write full event details, program schedule, and attendance information...',
    locationPlaceholder: 'Main Church Hall / Sanctuary',
    defaultLocation: 'Main Church Hall',
    eventTypeDesc: 'Specify whether attendance is open to everyone or requires registration and seating.',
    freeRegistrationDesc: 'Please provide attendee details to select your seat and confirm attendance.',
    namePlaceholder: 'Full name or family name',
    adminNamePlaceholder: 'Attendee or family name who paid',
    verifyCodeBtn: 'Verify Code',
    paidCodeHelpText: '* Obtain your 8-digit access code from church admin after completing payment.',
    codeVerifiedFor: 'Code verified successfully for: ',
    guestsCount: 'guests',
    personUnit: 'person(s)',
    seatsUnit: 'seats',
    noPhoneProvided: 'No phone',
    seatLabelPrefix: 'Seat:',
    paidBadge: 'Paid',
    freeBadge: 'Free',
    issuedCodesTitle: 'Issued Access Codes for this Event:',
    codeClaimed: 'Used',
    codeAvailable: 'Available',
    copiedText: 'Copied',
    copyText: 'Copy Code',
    totalGuests: 'Total guests:',
    registrationFailedGeneric: 'An error occurred during registration. Please try again.',
    eventNotFound: 'Event not found',
    loadingMoreEvents: 'Loading more events...',
    loadMoreEvents: 'Load more events',
    remainingCount: 'remaining',
    defaultTablePrefix: 'Table',
    defaultLabelName: 'Altar / Stage / Entrance',
    optimalFitFitNote: '* Tables best matching your party size will be highlighted to ensure optimal seating.',
    openEventNotice: 'This is a free and open event with general walk-in admission. No seat reservations or payment codes are required — everyone is warmly welcome!',
    openEventFreeNoticeTitle: 'Free for All & Open Event',
    openEventFreeNoticeDesc: 'Open for all events feature open walk-in admission and are completely free of charge. No seating blueprint or payment codes are required.',
    openEventAdminNote: 'This event is open and free with walk-in entry. Generating reservation codes or assigning seats is not needed.',
    uploadImageFile: 'Event Image Upload',
    dragAndDropImage: 'Drag and drop your event image here, or',
    browseFiles: 'browse files',
    maxFileSizeNotice: 'Max file size: 5MB (JPG, PNG, WebP, GIF)',
    fileSizeExceededError: 'File size exceeds the 5MB limit. Please choose a smaller image.',
    invalidImageTypeError: 'Invalid file type. Please select an image file.',
    uploadingImage: 'Uploading image to Supabase storage bucket...',
    uploadedToSupabase: 'Stored in Supabase Bucket (event-images)',
    imageReady: 'Image Ready',
    changeImage: 'Change Image'
  },
  fr: {
    eventsTitle: 'Événements',
    adminSignIn: 'Connexion',
    adminSignOut: 'Déconnexion',
    addEvent: 'Ajouter',
    editEvent: 'Modifier',
    deleteEvent: 'Supprimer',
    deleteConfirmTitle: 'Confirmer la suppression',
    deleteConfirmDesc: 'Êtes-vous sûr de vouloir supprimer cet événement ? Toutes les réservations associées seront définitivement effacées.',
    confirmDeleteBtn: 'Oui, supprimer',
    cancelBtn: 'Annuler',
    likes: 'J’aime',
    views: 'Vues',
    openForAll: 'Entrée libre',
    registrationRequired: 'Sur inscription',
    paidEvent: 'Payant (Code)',
    freeEvent: 'Gratuit',
    requiresAdminCode: 'Code à 8 chiffres requis',
    clickToViewMore: 'Voir les détails',
    eventDetails: 'Détails de l’événement',
    date: 'Date',
    time: 'Heure',
    location: 'Lieu',
    description: 'Description',
    title: 'Titre',
    uploadImage: 'Image de l’événement',
    addImagePlaceholder: 'Ajouter une image',
    imageUrl: 'URL ou fichier',
    removeImage: 'Supprimer l’image',
    eventType: 'Type d’événement',
    paidSwitch: 'Événement payant (code à 8 chiffres requis)',
    paidSwitchDesc: 'Le participant règle en personne auprès de l’administrateur, qui lui génère un code à 8 chiffres pour réserver sa place.',
    blueprintTitle: 'Plan de salle interactif',
    blueprintDesc: 'Plan interactif pour sélectionner chaises et tables directement',
    addBlueprint: 'Ouvrir le plan de salle',
    hideBlueprint: 'Masquer le plan',
    saveEvent: 'Publier',
    updateEvent: 'Enregistrer',
    registrationsList: 'Participants et réservations',
    noRegistrationsYet: 'Aucune réservation enregistrée pour le moment.',
    adminReservationSection: 'Bureau Admin : Enregistrer et générer code (8 chiffres)',
    adminReservationDesc: 'Après réception du paiement, saisissez le nom et le nombre de personnes pour générer le code à 8 chiffres.',
    attendeeName: 'Nom du participant / Famille',
    attendeePhone: 'Numéro de téléphone',
    numberOfPeople: 'Nombre de personnes',
    generateCodeBtn: 'Générer le code (8 chiffres)',
    generatedCodeIs: 'Code d’accès à 8 chiffres :',
    codeInstructions: 'Transmettez ce code au participant pour qu’il sélectionne sa table ou son siège sur le plan.',
    registerNow: 'S’inscrire',
    selectASeatOrTable: 'Sélectionnez une chaise ou table sur le plan',
    chair: 'Chaise',
    table: 'Table',
    capacity: 'Capacité',
    seatsLeft: 'Places restantes',
    tableFull: 'Table complète',
    optimalFitBadge: 'Idéal pour votre groupe',
    oversizedWarning: 'Veuillez choisir une table adaptée à votre groupe pour éviter les places vides',
    enterEightDigitCode: 'Entrez le code à 8 chiffres fourni par l’administrateur',
    codePlaceholder: 'Exemple : 84920173',
    verifyAndReserve: 'Confirmer la réservation',
    completeFreeRegistration: 'Confirmer l’inscription',
    ticketTitle: 'Billet officiel de l’événement',
    screenshotPrompt: 'Veuillez faire une capture d’écran de ce billet à présenter à l’accueil.',
    seatAssigned: 'Place / Table attribuée',
    partyCount: 'Nombre de personnes',
    confirmationCode: 'Code de confirmation',
    closeBtn: 'Fermer',
    successReservation: 'Votre réservation est confirmée ! Au plaisir de vous accueillir.',
    conflictError: 'Attention : cette place vient d’être réservée. Veuillez en sélectionner une autre.',
    invalidCodeError: 'Code à 8 chiffres invalide ou non attribué à cet événement.',
    codeAlreadyUsedError: 'Ce code à 8 chiffres a déjà été utilisé pour une réservation.',
    adminUsername: "Nom d'utilisateur",
    adminPassword: 'Mot de passe administrateur',
    loginBtn: 'Connexion',
    adminLoginTitle: 'Connexion Administration',
    adminLoginError: "Nom d'utilisateur ou mot de passe incorrect",
    canvasToolbarPerimeter: 'Périmètre',
    canvasPerimeterDrawInstruction: 'Cliquez sur un mur ou (+) pour ajouter un angle. Glissez pour ajuster, ou double-cliquez pour supprimer.',
    canvasPerimeterCloseBtn: 'Fermer et enregistrer',
    canvasPerimeterUndoPoint: 'Annuler point',
    canvasPerimeterClear: 'Effacer le périmètre',
    canvasPerimeterEmptyNotice: 'Aucun périmètre défini par défaut. Cliquez sur "Périmètre" pour tracer les murs manuellement.',
    canvasPerimeterPointsCount: 'Points :',
    canvasPerimeterPresetRect: 'Rectangle',
    canvasPerimeterPresetLShape: 'Forme en L',
    canvasPerimeterPresetNave: 'Nef et chœur',
    canvasToolbarChair: '+ Chaise',
    canvasToolbarRoundTable: '+ Table ronde',
    canvasToolbarRectTable: '+ Table rect.',
    canvasToolbarText: '+ Texte',
    canvasToolbarClear: 'Effacer tout',
    canvasLabelInput: 'Identifiant / Nom',
    canvasCapacityInput: 'Capacité (personnes)',
    canvasResizeSlider: 'Redimensionner :',
    canvasResetSize: 'Taille par défaut',
    canvasSize: 'Dimensions du plan :',
    canvasSizeStandard: 'Standard (720 × 480)',
    canvasSizeWide: 'Large (880 × 480)',
    canvasSizeLarge: 'Très grand (1000 × 580)',
    canvasSizeTall: 'Haut (720 × 640)',
    canvasPerimeterFullCanvas: 'Plein plan (100%)',
    canvasPerimeterFreeCanvas: 'Sans murs (plan libre)',
    canvasMaximize: 'Agrandir le plan',
    canvasMinimize: 'Vue normale',
    canvasBoundaryNote: 'Remarque : Vous pouvez placer tables et chaises partout sur l’ensemble du plan. Le cadre intérieur représente les murs et peut être étendu à tout le plan ou retiré.',
    canvasTipDesktop: 'Conseil : La création du plan est optimisée pour grand écran ou tablette.',
    noEventsFound: 'Aucun événement trouvé.',
    searchPlaceholder: 'Rechercher un événement...',
    allEvents: 'Tous les événements',
    statusReserved: 'Réservé',
    statusAvailable: 'Disponible',
    yourReservation: 'Votre réservation',
    orChooseSample: 'Ou choisir un modèle :',
    sampleImageRecital: 'Récital de chorale / Prière',
    sampleImageDinner: 'Dîner de bienfaisance / Salle',
    sampleImageRetreat: 'Retraite spirituelle / Monastère',
    sampleImageFestival: 'Bazar caritatif / Festival',
    titlePlaceholder: 'Ex : Dîner paroissial annuel des agapes et liturgie',
    descriptionPlaceholder: 'Décrivez l’événement, le programme et les horaires d’accueil...',
    locationPlaceholder: 'Grande salle paroissiale / Nef',
    defaultLocation: 'Grande salle paroissiale',
    eventTypeDesc: 'Indiquez si l’événement est ouvert à tous ou nécessite une inscription avec places assises.',
    freeRegistrationDesc: 'Veuillez renseigner vos coordonnées pour choisir votre place et confirmer votre présence.',
    namePlaceholder: 'Nom complet ou nom de famille',
    adminNamePlaceholder: 'Nom de famille ou du participant ayant réglé',
    verifyCodeBtn: 'Vérifier le code',
    paidCodeHelpText: '* Obtenez votre code à 8 chiffres auprès de l’administrateur paroissial après règlement.',
    codeVerifiedFor: 'Code validé avec succès pour : ',
    guestsCount: 'pers.',
    personUnit: 'personne(s)',
    seatsUnit: 'places',
    noPhoneProvided: 'Sans téléphone',
    seatLabelPrefix: 'Siège :',
    paidBadge: 'Payé',
    freeBadge: 'Gratuit',
    issuedCodesTitle: 'Codes d’accès émis pour cet événement :',
    codeClaimed: 'Utilisé',
    codeAvailable: 'Disponible',
    copiedText: 'Copié',
    copyText: 'Copier',
    totalGuests: 'Total personnes :',
    registrationFailedGeneric: 'Une erreur est survenue lors de l’inscription. Veuillez réessayer.',
    eventNotFound: 'Événement introuvable',
    loadingMoreEvents: 'Chargement d’autres événements...',
    loadMoreEvents: 'Charger plus d’événements',
    remainingCount: 'restant(s)',
    defaultTablePrefix: 'Table',
    defaultLabelName: 'Autel / Scène / Entrée',
    optimalFitFitNote: '* Les tables adaptées au nombre de personnes seront mises en évidence pour optimiser le plan.',
    openEventNotice: 'Cet événement est gratuit et ouvert à tous en accès libre. Aucune réservation de place ni code de paiement n\'est requis. Bienvenue à tous !',
    openEventFreeNoticeTitle: 'Événement gratuit et ouvert à tous',
    openEventFreeNoticeDesc: 'Les événements en accès libre sont entièrement gratuits et sans réservation. Aucun plan de salle ni code de paiement n\'est requis.',
    openEventAdminNote: 'Cet événement est ouvert et gratuit en accès libre. La génération de codes et la réservation de places ne sont pas nécessaires.',
    uploadImageFile: 'Téléverser une image',
    dragAndDropImage: 'Glissez-déposez l’image de l’événement ici, ou',
    browseFiles: 'parcourez vos fichiers',
    maxFileSizeNotice: 'Taille maximale du fichier : 5 Mo (JPG, PNG, WebP, GIF)',
    fileSizeExceededError: 'La taille du fichier dépasse la limite de 5 Mo. Veuillez choisir une image plus petite.',
    invalidImageTypeError: 'Type de fichier non valide. Veuillez choisir un fichier image.',
    uploadingImage: 'Téléversement de l’image vers le panier Supabase...',
    uploadedToSupabase: 'Stocké dans le panier Supabase (event-images)',
    imageReady: 'Image prête',
    changeImage: 'Changer l’image'
  }
};
