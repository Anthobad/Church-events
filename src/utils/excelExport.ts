import * as XLSX from 'xlsx';
import { ChurchEvent, Registration, AdminReservationCode, Language, SeatingElement } from '../types';
import { getTicketDisplayCode } from '../services/storage';

function formatElementType(type: SeatingElement['type'], lang: Language): string {
  switch (type) {
    case 'table_round':
      return lang === 'ar' ? 'طاولة دائرية' : lang === 'fr' ? 'Table ronde' : 'Round Table';
    case 'table_rect':
      return lang === 'ar' ? 'طاولة مستطيلة' : lang === 'fr' ? 'Table rectangulaire' : 'Rectangular Table';
    case 'chair':
      return lang === 'ar' ? 'كرسي فردي' : lang === 'fr' ? 'Chaise' : 'Single Chair';
    case 'label':
      return lang === 'ar' ? 'ملصق / مساحة' : lang === 'fr' ? 'Zone / Texte' : 'Area / Label';
    default:
      return type;
  }
}

function formatCheckInStatus(reg: Registration, lang: Language): string {
  const partySize = reg.partySize || 1;
  const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? partySize : 0);

  if (admitted >= partySize) {
    return lang === 'ar'
      ? `اكتمل الدخول (${admitted}/${partySize})`
      : lang === 'fr'
      ? `Entrée complète (${admitted}/${partySize})`
      : `Fully Admitted (${admitted}/${partySize})`;
  }

  if (admitted > 0) {
    const remaining = partySize - admitted;
    return lang === 'ar'
      ? `دخول جزئي (${admitted}/${partySize} - متبقي ${remaining})`
      : lang === 'fr'
      ? `Entrée partielle (${admitted}/${partySize} - reste ${remaining})`
      : `Partial Entry (${admitted}/${partySize} - ${remaining} remaining)`;
  }

  return lang === 'ar' ? 'لم يدخل بعد / معلّق' : lang === 'fr' ? 'En attente / Non entré' : 'Pending / Not Entered';
}

function findAdminCodeForRegistration(
  reg: Registration,
  adminCodes: AdminReservationCode[],
  eventId: string
): string {
  if (reg.codeUsed) {
    // If it's stored with prefix like ADMIN_RESERVED__4829, strip prefix
    return reg.codeUsed.replace(/^ADMIN_RESERVED__/, '');
  }

  const match = adminCodes.find(
    (c) =>
      c.eventId === eventId &&
      ((c.userName && reg.userName && c.userName.toLowerCase() === reg.userName.toLowerCase()) ||
        (reg.elementId && c.elementId === reg.elementId))
  );

  return match ? match.code : '—';
}

export function exportEventSeatingToExcel(
  event: ChurchEvent,
  registrations: Registration[],
  adminCodes: AdminReservationCode[] = [],
  language: Language = 'en'
): boolean {
  try {
    const wb = XLSX.utils.book_new();

    const elements = event.blueprint?.elements || [];
    const elementsNonLabels = elements.filter((el) => el.type !== 'label');

    // -------------------------------------------------------------------------
    // SHEET 1: TABLES & ATTENDEES (Hierarchical breakdown of each table)
    // -------------------------------------------------------------------------
    const sheet1Rows: (string | number)[][] = [
      // Event Metadata Banner
      [language === 'ar' ? 'تقرير مقاعد وطاولات الفعالية' : 'Event Seating & Table Attendance Report', ''],
      [language === 'ar' ? 'اسم الفعالية' : 'Event Title', event.title],
      [language === 'ar' ? 'التاريخ والوقت' : 'Date & Time', `${event.date} - ${event.time}`],
      [language === 'ar' ? 'المكان' : 'Location', event.location],
      [
        language === 'ar' ? 'تاريخ ووقت التصدير' : 'Export Timestamp',
        new Date().toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
      ],
      [] // Blank separator
    ];

    // Headers for Sheet 1
    const headers1 = language === 'ar'
      ? [
          'اسم الطاولة / المقعد',
          'نوع الطاولة',
          'سعة الطاولة',
          'المشغول من السعة',
          'المقاعد الشاغرة',
          'حالة الطاولة',
          'اسم المشارك / العائلة',
          'رقم الهاتف',
          'عدد الأفراد',
          'رمز التذكرة',
          'رمز الحجز الإداري',
          'حالة الدخول',
          'عدد الحاضرين',
          'المتبقي للدخول',
          'وقت الدخول',
          'بواسطة المشرف',
          'حالة السداد',
          'تاريخ الحجز',
          'معرّف الحجز'
        ]
      : language === 'fr'
      ? [
          'Table / Siège',
          'Type de table',
          'Capacité',
          'Occupation',
          'Places libres',
          'Statut de la table',
          'Nom du participant',
          'Téléphone',
          'Nombre de personnes',
          'Code billet',
          'Code réservation admin',
          'Statut d’entrée',
          'Admis',
          'Restants',
          'Heure d’entrée',
          'Vérifié par',
          'Paiement',
          'Date d’inscription',
          'ID Inscription'
        ]
      : [
          'Table / Seat',
          'Table Type',
          'Capacity',
          'Occupancy',
          'Available Seats',
          'Table Status',
          'Attendee Name',
          'Phone Number',
          'Party Size',
          'Ticket Code',
          'Admin Code',
          'Check-In Status',
          'Admitted Count',
          'Remaining Guests',
          'Check-In Time',
          'Admitted By',
          'Payment Status',
          'Registered At',
          'Registration ID'
        ];

    sheet1Rows.push(headers1);

    // Populate tables in order
    elementsNonLabels.forEach((elem) => {
      const tableRegs = registrations.filter((r) => r.elementId === elem.id);
      const isReservedByAdmin = tableRegs.some((r) => r.isReservedByAdmin);
      const totalOccupied = tableRegs.reduce((sum, r) => sum + r.partySize, 0);
      const remainingSeats = Math.max(0, elem.capacity - totalOccupied);

      let tableStatusText = '';
      if (isReservedByAdmin) {
        tableStatusText = language === 'ar' ? 'محجوزة للإدارة' : language === 'fr' ? 'Réservée admin' : 'Admin Reserved';
      } else if (remainingSeats <= 0) {
        tableStatusText = language === 'ar' ? 'مكتملة بالكامل' : language === 'fr' ? 'Complète' : 'Full';
      } else if (totalOccupied > 0) {
        tableStatusText = language === 'ar'
          ? `مشغولة جزئياً (${totalOccupied}/${elem.capacity})`
          : language === 'fr'
          ? `Partiellement occupée (${totalOccupied}/${elem.capacity})`
          : `Partially Occupied (${totalOccupied}/${elem.capacity})`;
      } else {
        tableStatusText = language === 'ar' ? 'شاغرة ومتاحة' : language === 'fr' ? 'Libre / Disponible' : 'Available / Empty';
      }

      const tableTypeStr = formatElementType(elem.type, language);
      const occupancyStr = `${totalOccupied} / ${elem.capacity}`;

      if (tableRegs.length === 0) {
        // Empty table row
        sheet1Rows.push([
          elem.label,
          tableTypeStr,
          elem.capacity,
          occupancyStr,
          remainingSeats,
          tableStatusText,
          language === 'ar' ? '(طاولة شاغرة - لا يوجد مسجلين)' : '(Empty - No registered guests)',
          '—',
          0,
          '—',
          '—',
          '—',
          0,
          0,
          '—',
          '—',
          '—',
          '—',
          '—'
        ]);
      } else {
        tableRegs.forEach((reg) => {
          const ticketCode = getTicketDisplayCode(reg);
          const adminCode = findAdminCodeForRegistration(reg, adminCodes, event.id);
          const checkInStatus = formatCheckInStatus(reg, language);
          const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
          const remaining = Math.max(0, reg.partySize - admitted);
          const checkInTime = reg.checkedInAt
            ? new Date(reg.checkedInAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
            : '—';
          const regDate = reg.registeredAt
            ? new Date(reg.registeredAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
            : '—';

          sheet1Rows.push([
            elem.label,
            tableTypeStr,
            elem.capacity,
            occupancyStr,
            remainingSeats,
            tableStatusText,
            reg.userName || (language === 'ar' ? 'بدون اسم' : 'Unnamed Guest'),
            reg.userPhone || '—',
            reg.partySize,
            ticketCode,
            adminCode,
            checkInStatus,
            admitted,
            remaining,
            checkInTime,
            reg.checkedInBy || '—',
            reg.isPaid
              ? (language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid')
              : (language === 'ar' ? 'مجاني' : language === 'fr' ? 'Gratuit' : 'Free'),
            regDate,
            reg.id
          ]);
        });
      }
    });

    // Unassigned attendees (if any)
    const unassignedRegs = registrations.filter(
      (r) => !r.elementId || !elements.some((el) => el.id === r.elementId)
    );
    if (unassignedRegs.length > 0) {
      unassignedRegs.forEach((reg) => {
        const ticketCode = getTicketDisplayCode(reg);
        const adminCode = findAdminCodeForRegistration(reg, adminCodes, event.id);
        const checkInStatus = formatCheckInStatus(reg, language);
        const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
        const remaining = Math.max(0, reg.partySize - admitted);
        const checkInTime = reg.checkedInAt
          ? new Date(reg.checkedInAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
          : '—';
        const regDate = reg.registeredAt
          ? new Date(reg.registeredAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
          : '—';

        sheet1Rows.push([
          language === 'ar' ? 'غير محدد لطاولة / دخول عام' : 'Unassigned / General Admission',
          'General',
          '—',
          '—',
          '—',
          language === 'ar' ? 'دخول عام' : 'General',
          reg.userName,
          reg.userPhone || '—',
          reg.partySize,
          ticketCode,
          adminCode,
          checkInStatus,
          admitted,
          remaining,
          checkInTime,
          reg.checkedInBy || '—',
          reg.isPaid
            ? (language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid')
            : (language === 'ar' ? 'مجاني' : language === 'fr' ? 'Gratuit' : 'Free'),
          regDate,
          reg.id
        ]);
      });
    }

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);

    // Set Column Widths for Sheet 1
    ws1['!cols'] = [
      { wch: 18 }, // Table/Seat
      { wch: 16 }, // Table Type
      { wch: 10 }, // Capacity
      { wch: 14 }, // Occupancy
      { wch: 15 }, // Available Seats
      { wch: 22 }, // Table Status
      { wch: 26 }, // Attendee Name
      { wch: 18 }, // Phone
      { wch: 12 }, // Party Size
      { wch: 14 }, // Ticket Code
      { wch: 16 }, // Admin Code
      { wch: 24 }, // Check-In Status
      { wch: 14 }, // Admitted Count
      { wch: 16 }, // Remaining Guests
      { wch: 22 }, // Check-In Time
      { wch: 18 }, // Admitted By
      { wch: 14 }, // Payment Status
      { wch: 22 }, // Registered At
      { wch: 24 }  // Registration ID
    ];

    const sheet1Title = language === 'ar' ? 'تفاصيل الطاولات والمشاركين' : language === 'fr' ? 'Détails des Tables' : 'Tables & Attendees';
    XLSX.utils.book_append_sheet(wb, ws1, sheet1Title);

    // -------------------------------------------------------------------------
    // SHEET 2: ALL ATTENDEES ROSTER (Flat searchable attendee list)
    // -------------------------------------------------------------------------
    const headers2 = language === 'ar'
      ? [
          '#',
          'اسم المشارك / العائلة',
          'رقم الهاتف',
          'عدد الأفراد',
          'الطاولة / المقعد',
          'نوع الطاولة',
          'رمز التذكرة',
          'رمز الحجز الإداري',
          'حالة الدخول',
          'الحاضرين',
          'المتبقي',
          'وقت الدخول',
          'المشرف المحقق',
          'حالة السداد',
          'تاريخ الحجز',
          'معرّف الحجز'
        ]
      : language === 'fr'
      ? [
          '#',
          'Nom du participant',
          'Téléphone',
          'Personnes',
          'Table / Siège',
          'Type de table',
          'Code billet',
          'Code admin',
          'Statut d’entrée',
          'Admis',
          'Restants',
          'Heure d’entrée',
          'Vérifié par',
          'Paiement',
          'Date d’inscription',
          'ID Inscription'
        ]
      : [
          '#',
          'Attendee Name',
          'Phone Number',
          'Party Size',
          'Assigned Table / Seat',
          'Table Type',
          'Ticket Code',
          'Admin Code',
          'Check-In Status',
          'Admitted',
          'Remaining',
          'Check-In Time',
          'Checked In By',
          'Payment Status',
          'Registered At',
          'Registration ID'
        ];

    const sheet2Rows: (string | number)[][] = [headers2];

    registrations.forEach((reg, idx) => {
      const elem = elements.find((el) => el.id === reg.elementId);
      const tableLabel = elem ? elem.label : (reg.elementLabel || (language === 'ar' ? 'غير محدد' : 'Unassigned'));
      const tableTypeStr = elem ? formatElementType(elem.type, language) : 'General';
      const ticketCode = getTicketDisplayCode(reg);
      const adminCode = findAdminCodeForRegistration(reg, adminCodes, event.id);
      const checkInStatus = formatCheckInStatus(reg, language);
      const admitted = reg.admittedCount !== undefined ? reg.admittedCount : (reg.checkedIn ? reg.partySize : 0);
      const remaining = Math.max(0, reg.partySize - admitted);
      const checkInTime = reg.checkedInAt
        ? new Date(reg.checkedInAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
        : '—';
      const regDate = reg.registeredAt
        ? new Date(reg.registeredAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')
        : '—';

      sheet2Rows.push([
        idx + 1,
        reg.userName,
        reg.userPhone || '—',
        reg.partySize,
        tableLabel,
        tableTypeStr,
        ticketCode,
        adminCode,
        checkInStatus,
        admitted,
        remaining,
        checkInTime,
        reg.checkedInBy || '—',
        reg.isPaid
          ? (language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid')
          : (language === 'ar' ? 'مجاني' : language === 'fr' ? 'Gratuit' : 'Free'),
        regDate,
        reg.id
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2['!cols'] = [
      { wch: 6 },  // #
      { wch: 26 }, // Name
      { wch: 18 }, // Phone
      { wch: 12 }, // Party Size
      { wch: 22 }, // Table/Seat
      { wch: 16 }, // Table Type
      { wch: 14 }, // Ticket Code
      { wch: 16 }, // Admin Code
      { wch: 24 }, // Check-In Status
      { wch: 12 }, // Admitted
      { wch: 12 }, // Remaining
      { wch: 22 }, // Check-In Time
      { wch: 18 }, // Checked In By
      { wch: 14 }, // Payment
      { wch: 22 }, // Registered At
      { wch: 24 }  // Registration ID
    ];

    const sheet2Title = language === 'ar' ? 'كشف الحضور الكامل' : language === 'fr' ? 'Liste complète des invités' : 'All Attendees Master List';
    XLSX.utils.book_append_sheet(wb, ws2, sheet2Title);

    // -------------------------------------------------------------------------
    // SHEET 3: TABLES SUMMARY (Venue Tables Overview)
    // -------------------------------------------------------------------------
    const headers3 = language === 'ar'
      ? [
          'اسم الطاولة / المقعد',
          'نوع الطاولة',
          'السعة الكلية',
          'المقاعد المحجوزة',
          'المقاعد المتبقية',
          'نسبة الإشغال',
          'حالة الطاولة',
          'عدد الحجوزات',
          'أسماء المشاركين المسجلين في الطاولة'
        ]
      : language === 'fr'
      ? [
          'Table / Siège',
          'Type',
          'Capacité totale',
          'Places occupées',
          'Places libres',
          'Taux d’occupation',
          'Statut',
          'Groupes',
          'Noms des personnes inscrites'
        ]
      : [
          'Table / Seat',
          'Type',
          'Total Capacity',
          'Occupied Seats',
          'Available Seats',
          'Occupancy Rate',
          'Table Status',
          'Registered Parties',
          'Guest Names Registered at Table'
        ];

    const sheet3Rows: (string | number)[][] = [headers3];

    elementsNonLabels.forEach((elem) => {
      const tableRegs = registrations.filter((r) => r.elementId === elem.id);
      const isReservedByAdmin = tableRegs.some((r) => r.isReservedByAdmin);
      const totalOccupied = tableRegs.reduce((sum, r) => sum + r.partySize, 0);
      const remainingSeats = Math.max(0, elem.capacity - totalOccupied);
      const occupancyRate = elem.capacity > 0 ? `${Math.round((totalOccupied / elem.capacity) * 100)}%` : '0%';

      let tableStatusText = '';
      if (isReservedByAdmin) {
        tableStatusText = language === 'ar' ? 'محجوزة للإدارة' : 'Admin Reserved';
      } else if (remainingSeats <= 0) {
        tableStatusText = language === 'ar' ? 'مكتملة بالكامل' : 'Full';
      } else if (totalOccupied > 0) {
        tableStatusText = language === 'ar' ? 'مشغولة جزئياً' : 'Partially Occupied';
      } else {
        tableStatusText = language === 'ar' ? 'شاغرة ومتاحة' : 'Available / Empty';
      }

      const guestNamesSummary = tableRegs.length > 0
        ? tableRegs.map((r) => `${r.userName} (${r.partySize})`).join(', ')
        : '—';

      sheet3Rows.push([
        elem.label,
        formatElementType(elem.type, language),
        elem.capacity,
        totalOccupied,
        remainingSeats,
        occupancyRate,
        tableStatusText,
        tableRegs.length,
        guestNamesSummary
      ]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    ws3['!cols'] = [
      { wch: 20 }, // Table
      { wch: 18 }, // Type
      { wch: 14 }, // Capacity
      { wch: 15 }, // Occupied
      { wch: 15 }, // Available
      { wch: 16 }, // Rate
      { wch: 20 }, // Status
      { wch: 18 }, // Parties
      { wch: 45 }  // Names
    ];

    const sheet3Title = language === 'ar' ? 'ملخص إشغال الطاولات' : language === 'fr' ? 'Synthèse des tables' : 'Tables Summary';
    XLSX.utils.book_append_sheet(wb, ws3, sheet3Title);

    // -------------------------------------------------------------------------
    // Trigger Browser Download
    // -------------------------------------------------------------------------
    const cleanTitle = (event.title || 'Event')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .trim();
    const fileName = `${cleanTitle}_Tables_Seating_${new Date().toISOString().slice(0, 10)}.xlsx`;

    try {
      XLSX.writeFile(wb, fileName);
    } catch {
      // Safe fallback for blob download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return true;
  } catch (error) {
    console.error('Error exporting seating to Excel:', error);
    return false;
  }
}
