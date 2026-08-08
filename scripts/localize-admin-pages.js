const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../../TheBigTask E-Commerce(Front-end)/src/app');

// 1. New dictionary keys to inject
const dictEn = {
  // admin-messages
  'admin.customer_inbox': 'Customer Inbox',
  'admin.customer_inbox_desc': 'Real-time support messages from customers.',
  'admin.th_customer': 'Customer',
  'admin.th_subject': 'Subject',
  'admin.th_message': 'Message',
  'admin.th_date': 'Date',
  'admin.th_actions': 'Actions',
  'admin.inbox_clear': 'Inbox is clear!',
  'admin.showing': 'Showing',
  'admin.of': 'of',
  'admin.entries': 'entries',
  'admin.prev': 'Prev',
  'admin.next': 'Next',
  // admin-coupons
  'admin.create_coupon': 'Create Coupon',
  'admin.promo_codes': 'Promotional Discount Codes',
  'admin.total_codes': 'Total:',
  'admin.codes': 'codes',
  'admin.loading_coupons': 'Loading coupon codes...',
  'admin.th_code': 'Code',
  'admin.th_discount': 'Discount',
  'admin.th_expires': 'Expires',
  'admin.th_status': 'Status',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.edit': 'Edit',
  'admin.delete': 'Delete',
  // admin-reviews
  'admin.queue_clean': 'Queue is clean',
  'admin.no_reviews': 'There are no customer reviews to moderate at this time.',
  'admin.loading_reviews': 'Loading reviews...',
  'admin.rating': 'Rating:',
  'admin.date': 'Date:',
  'admin.status': 'Status:',
  'admin.delete_review': 'Delete Review',
  // admin-orders
  'admin.all_client_orders': 'All Client Orders',
  'admin.filter_status': 'Filter Status:',
  'admin.all_statuses': 'All Statuses',
  'admin.loading_orders': 'Loading orders...',
  'admin.order_items': 'Order Items:',
  'admin.shipping_address': 'Shipping Address:',
  'admin.city': 'City:',
  'admin.street': 'Street:',
  'admin.building': 'Building:',
  'admin.floor': 'Floor:',
  'admin.payment_method': 'Payment Method:',
  'admin.update_status': 'Update Status',
  // order statuses
  'admin.status_pending': 'Pending',
  'admin.status_prepared': 'Prepared',
  'admin.status_shipped': 'Shipped',
  'admin.status_received': 'Received',
  'admin.status_rejected': 'Rejected',
  'admin.status_cancelled_user': 'Cancelled by user',
  'admin.status_cancelled_admin': 'Cancelled by admin'
};

const dictAr = {
  // admin-messages
  'admin.customer_inbox': 'صندوق رسائل العملاء',
  'admin.customer_inbox_desc': 'رسائل دعم العملاء الحية.',
  'admin.th_customer': 'العميل',
  'admin.th_subject': 'الموضوع',
  'admin.th_message': 'الرسالة',
  'admin.th_date': 'التاريخ',
  'admin.th_actions': 'إجراءات',
  'admin.inbox_clear': 'صندوق الوارد فارغ!',
  'admin.showing': 'عرض',
  'admin.of': 'من',
  'admin.entries': 'عناصر',
  'admin.prev': 'السابق',
  'admin.next': 'التالي',
  // admin-coupons
  'admin.create_coupon': 'إنشاء كوبون',
  'admin.promo_codes': 'أكواد الخصم الترويجية',
  'admin.total_codes': 'الإجمالي:',
  'admin.codes': 'أكواد',
  'admin.loading_coupons': 'جاري تحميل الكوبونات...',
  'admin.th_code': 'الكود',
  'admin.th_discount': 'الخصم',
  'admin.th_expires': 'تاريخ الانتهاء',
  'admin.th_status': 'الحالة',
  'admin.active': 'نشط',
  'admin.inactive': 'غير نشط',
  'admin.edit': 'تعديل',
  'admin.delete': 'حذف',
  // admin-reviews
  'admin.queue_clean': 'قائمة الانتظار فارغة',
  'admin.no_reviews': 'لا توجد تقييمات عملاء للإشراف عليها في الوقت الحالي.',
  'admin.loading_reviews': 'جاري تحميل التقييمات...',
  'admin.rating': 'التقييم:',
  'admin.date': 'التاريخ:',
  'admin.status': 'الحالة:',
  'admin.delete_review': 'حذف التقييم',
  // admin-orders
  'admin.all_client_orders': 'جميع طلبات العملاء',
  'admin.filter_status': 'تصفية الحالة:',
  'admin.all_statuses': 'جميع الحالات',
  'admin.loading_orders': 'جاري تحميل الطلبات...',
  'admin.order_items': 'عناصر الطلب:',
  'admin.shipping_address': 'عنوان الشحن:',
  'admin.city': 'المدينة:',
  'admin.street': 'الشارع:',
  'admin.building': 'المبنى:',
  'admin.floor': 'الطابق:',
  'admin.payment_method': 'طريقة الدفع:',
  'admin.update_status': 'تحديث الحالة',
  // order statuses
  'admin.status_pending': 'قيد الانتظار',
  'admin.status_prepared': 'تم التجهيز',
  'admin.status_shipped': 'تم الشحن',
  'admin.status_received': 'تم الاستلام',
  'admin.status_rejected': 'مرفوض',
  'admin.status_cancelled_user': 'ملغى من قبل المستخدم',
  'admin.status_cancelled_admin': 'ملغى من قبل الإدارة'
};

function formatDictForInsertion(dict) {
  let output = '';
  for (const [key, value] of Object.entries(dict)) {
    output += `      '${key}': '${value.replace(/'/g, "\\'")}',\n`;
  }
  return output;
}

// 2. Modifying language.service.ts
const langServicePath = path.join(FRONTEND_DIR, 'core/services/language.service.ts');
let langContent = fs.readFileSync(langServicePath, 'utf8');

if (!langContent.includes("'admin.customer_inbox'")) {
  const enInjection = formatDictForInsertion(dictEn);
  const arInjection = formatDictForInsertion(dictAr);

  // Insert before the end of the English block
  langContent = langContent.replace(/('action\.export_csv': 'Export CSV'\n\s*)(},)/, `$1,\n      // Automation injected Admin Keys\n${enInjection}$2`);
  
  // Insert before the end of the Arabic block
  langContent = langContent.replace(/('action\.export_csv': 'تصدير CSV'\n\s*)(}\n\s*};)/, `$1,\n      // Automation injected Admin Keys\n${arInjection}$2`);
  
  fs.writeFileSync(langServicePath, langContent);
  console.log('✅ Injected dictionary keys into language.service.ts');
} else {
  console.log('⚡ Dictionary keys already exist in language.service.ts');
}

// 3. Modifying Components
const modifications = [
  {
    file: 'dashboard/admin-messages/admin-messages.component.html',
    replacements: [
      { from: /Customer Inbox/g, to: "{{ 'admin.customer_inbox' | translate }}" },
      { from: /Real-time support messages from customers\./g, to: "{{ 'admin.customer_inbox_desc' | translate }}" },
      { from: /<th([^>]*)>Customer<\/th>/g, to: "<th$1>{{ 'admin.th_customer' | translate }}</th>" },
      { from: /<th([^>]*)>Subject<\/th>/g, to: "<th$1>{{ 'admin.th_subject' | translate }}</th>" },
      { from: /<th([^>]*)>Message<\/th>/g, to: "<th$1>{{ 'admin.th_message' | translate }}</th>" },
      { from: /<th([^>]*)>Date<\/th>/g, to: "<th$1>{{ 'admin.th_date' | translate }}</th>" },
      { from: /<th([^>]*)>Actions<\/th>/g, to: "<th$1>{{ 'admin.th_actions' | translate }}</th>" },
      { from: /Inbox is clear!/g, to: "{{ 'admin.inbox_clear' | translate }}" },
      { from: /Showing {{ \(currentPage - 1\) \* pageSize \+ 1 }} to {{ min\(currentPage \* pageSize, totalResults\) }} of {{ totalResults }} entries/g, 
        to: "{{ 'admin.showing' | translate }} {{ (currentPage - 1) * pageSize + 1 }} {{ 'admin.to' | translate }} {{ min(currentPage * pageSize, totalResults) }} {{ 'admin.of' | translate }} {{ totalResults }} {{ 'admin.entries' | translate }}" },
      { from: />\s*Prev\s*<\/button>/g, to: ">{{ 'admin.prev' | translate }}</button>" },
      { from: />\s*Next\s*<\/button>/g, to: ">{{ 'admin.next' | translate }}</button>" }
    ]
  },
  {
    file: 'dashboard/admin-coupons/admin-coupons.component.html',
    replacements: [
      { from: /<span>Create Coupon<\/span>/g, to: "<span>{{ 'admin.create_coupon' | translate }}</span>" },
      { from: />Promotional Discount Codes<\/h2>/g, to: ">{{ 'admin.promo_codes' | translate }}</h2>" },
      { from: /Total: {{ coupons\.length }} codes/g, to: "{{ 'admin.total_codes' | translate }} {{ coupons.length }} {{ 'admin.codes' | translate }}" },
      { from: /Loading coupon codes\.\.\./g, to: "{{ 'admin.loading_coupons' | translate }}" },
      { from: /<th([^>]*)>Code<\/th>/g, to: "<th$1>{{ 'admin.th_code' | translate }}</th>" },
      { from: /<th([^>]*)>Discount<\/th>/g, to: "<th$1>{{ 'admin.th_discount' | translate }}</th>" },
      { from: /<th([^>]*)>Expires<\/th>/g, to: "<th$1>{{ 'admin.th_expires' | translate }}</th>" },
      { from: /<th([^>]*)>Status<\/th>/g, to: "<th$1>{{ 'admin.th_status' | translate }}</th>" },
      { from: /Active/g, to: "{{ 'admin.active' | translate }}" },
      { from: /Inactive/g, to: "{{ 'admin.inactive' | translate }}" },
      { from: /title="Edit"/g, to: 'title="{{ \'admin.edit\' | translate }}"' },
      { from: /title="Delete"/g, to: 'title="{{ \'admin.delete\' | translate }}"' }
    ]
  },
  {
    file: 'dashboard/admin-reviews/admin-reviews.component.html',
    replacements: [
      { from: /Queue is clean/g, to: "{{ 'admin.queue_clean' | translate }}" },
      { from: /There are no customer reviews to moderate at this time\./g, to: "{{ 'admin.no_reviews' | translate }}" },
      { from: /Loading reviews\.\.\./g, to: "{{ 'admin.loading_reviews' | translate }}" },
      { from: /<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Rating:<\/span>/g, to: '<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ \'admin.rating\' | translate }}</span>' },
      { from: /<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Date:<\/span>/g, to: '<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ \'admin.date\' | translate }}</span>' },
      { from: /title="Delete Review"/g, to: 'title="{{ \'admin.delete_review\' | translate }}"' }
    ]
  },
  {
    file: 'dashboard/admin-orders/admin-orders.component.html',
    replacements: [
      { from: /All Client Orders \({{ filteredOrders\.length }}\)/g, to: "{{ 'admin.all_client_orders' | translate }} ({{ filteredOrders.length }})" },
      { from: /Filter Status:/g, to: "{{ 'admin.filter_status' | translate }}" },
      { from: />All Statuses<\/option>/g, to: ">{{ 'admin.all_statuses' | translate }}</option>" },
      { from: /Loading orders\.\.\./g, to: "{{ 'admin.loading_orders' | translate }}" },
      { from: /Order Items:/g, to: "{{ 'admin.order_items' | translate }}" },
      { from: /Shipping Address:/g, to: "{{ 'admin.shipping_address' | translate }}" },
      { from: /City:/g, to: "{{ 'admin.city' | translate }}" },
      { from: /Street:/g, to: "{{ 'admin.street' | translate }}" },
      { from: /Building:/g, to: "{{ 'admin.building' | translate }}" },
      { from: /Floor:/g, to: "{{ 'admin.floor' | translate }}" },
      { from: /Payment Method:/g, to: "{{ 'admin.payment_method' | translate }}" },
      { from: />Update Status<\/button>/g, to: ">{{ 'admin.update_status' | translate }}</button>" },
      { from: /\{\{\s*formatStatus\(s\)\s*\}\}/g, to: "{{ formatStatus(s) | translate }}" },
      { from: /\{\{\s*formatStatus\(order\.orderStatus\)\s*\}\}/g, to: "{{ formatStatus(order.orderStatus) | translate }}" }
    ]
  },
  {
    file: 'dashboard/admin-orders/admin-orders.component.ts',
    replacements: [
      { from: /'pending': 'Pending',/g, to: "'pending': 'admin.status_pending'," },
      { from: /'prepared': 'Prepared',/g, to: "'prepared': 'admin.status_prepared'," },
      { from: /'shipped': 'Shipped',/g, to: "'shipped': 'admin.status_shipped'," },
      { from: /'received': 'Received',/g, to: "'received': 'admin.status_received'," },
      { from: /'rejected': 'Rejected',/g, to: "'rejected': 'admin.status_rejected'," },
      { from: /'cancelledByUser': 'Cancelled by user',/g, to: "'cancelledByUser': 'admin.status_cancelled_user'," },
      { from: /'cancelledByAdmin': 'Cancelled by admin'/g, to: "'cancelledByAdmin': 'admin.status_cancelled_admin'" },
      { from: /formatStatus\(status: string\): string {\n    if \(\!status\) return '';\n    const map: Record<string, string> = {/g, to: "formatStatus(status: string): string {\n    if (!status) return '';\n    // Outputting translation keys which will be handled by the pipe\n    const map: Record<string, string> = {" }
    ]
  }
];

modifications.forEach(mod => {
  const targetFile = path.join(FRONTEND_DIR, mod.file);
  if (!fs.existsSync(targetFile)) {
    console.error(`❌ File not found: ${targetFile}`);
    return;
  }
  let content = fs.readFileSync(targetFile, 'utf8');
  let updated = false;

  mod.replacements.forEach(rep => {
    if (content.match(rep.from)) {
      content = content.replace(rep.from, rep.to);
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(targetFile, content);
    console.log(`✅ Modified: ${mod.file}`);
  } else {
    console.log(`⚡ No changes needed for: ${mod.file}`);
  }
});

console.log('🚀 Localization script completed successfully.');
