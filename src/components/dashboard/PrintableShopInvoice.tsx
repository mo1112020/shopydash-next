import React from "react";
import { DetailedFinancialReport } from "@/services/analytics.service";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PrintableShopInvoiceProps {
  report: DetailedFinancialReport | null;
}

export const PrintableShopInvoice = ({ report }: PrintableShopInvoiceProps) => {
  if (!report) return null;

  const { summary, orders, payments, subscriptions } = report;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 10mm; }
          body, body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background-color: white !important;
          }
          [data-radix-portal] {
            display: none !important;
          }
        `}
      </style>
      <div 
        id="printable-invoice" 
        className="hidden print:block text-black bg-white"
        dir="rtl"
      >
        {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6 pt-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">كشف حساب متجر</h1>
          <p className="text-xl text-gray-800 font-semibold">{summary.shop_name}</p>
        </div>
        <div className="text-left">
          <h2 className="text-2xl font-bold text-gray-900">منصة إدارة الطلبات</h2>
          <p className="text-sm text-gray-600 mt-1">
            الفترة: {format(new Date(summary.period_start), 'd MMMM yyyy', { locale: ar })} 
            {' - '} 
            {format(new Date(summary.period_end), 'd MMMM yyyy', { locale: ar })}
          </p>
          <p className="text-sm text-gray-600 mt-1">تاريخ الإصدار: {format(new Date(), 'd MMMM yyyy h:mm a', { locale: ar })}</p>
        </div>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center">
           <p className="text-sm text-gray-700 mb-1 font-semibold">المبيعات (Gross)</p>
           <p className="text-xl font-bold text-gray-900">{formatPrice(summary.total_revenue)}</p>
        </div>
        <div className="border border-red-200 p-4 rounded-lg bg-red-50 text-center">
           <p className="text-sm text-red-700 mb-1 font-semibold">العمولة المستحقة</p>
           <p className="text-xl font-bold text-red-800">{formatPrice(summary.total_commission_owed)}</p>
        </div>
        <div className="border border-green-200 p-4 rounded-lg bg-green-50 text-center">
           <p className="text-sm text-green-700 mb-1 font-semibold">المدفوعات</p>
           <p className="text-xl font-bold text-green-800">{formatPrice(summary.total_paid)}</p>
        </div>
         <div className="border-2 border-gray-900 p-4 rounded-lg bg-gray-900 text-white text-center">
           <p className="text-sm text-gray-300 mb-1 font-semibold">الرصيد المستحق (Debt)</p>
           <p className="text-xl font-bold">{formatPrice(summary.net_debt)}</p>
        </div>
      </div>

      {/* Orders Table */}
      {orders && orders.length > 0 && (
        <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">تفاصيل الطلبات ({orders.length})</h3>
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-right">رقم الطلب</th>
                <th className="border border-gray-300 p-2 text-right">التاريخ</th>
                <th className="border border-gray-300 p-2 text-right">إجمالي الطلب</th>
                <th className="border border-gray-300 p-2 text-right">العمولة (%)</th>
                <th className="border border-gray-300 p-2 text-right">قيمة العمولة</th>
                <th className="border border-gray-300 p-2 text-right">صافي المتجر</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="border border-gray-300 p-2 font-mono text-xs">{order.order_number}</td>
                  <td className="border border-gray-300 p-2">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="border border-gray-300 p-2 font-semibold">{formatPrice(order.total)}</td>
                  <td className="border border-gray-300 p-2 text-gray-600">{order.commission_rate}%</td>
                  <td className="border border-gray-300 p-2 text-red-700 font-bold">{formatPrice(order.commission_fee)}</td>
                  <td className="border border-gray-300 p-2 text-green-700 font-bold">{formatPrice(order.net_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscriptions Table */}
      {subscriptions && subscriptions.length > 0 && (
        <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">الاشتراكات والرسوم الثابتة</h3>
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-right">النوع</th>
                <th className="border border-gray-300 p-2 text-right">الشهر/التاريخ</th>
                <th className="border border-gray-300 p-2 text-right">المبلغ</th>
                <th className="border border-gray-300 p-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="border border-gray-300 p-2">{sub.type === 'REGULAR' ? 'اشتراك شهري' : 'باقة مميزة'}</td>
                  <td className="border border-gray-300 p-2">{sub.billing_month || format(new Date(sub.paid_at), 'MMM yyyy')}</td>
                  <td className="border border-gray-300 p-2 text-red-700 font-bold">{formatPrice(sub.amount)}</td>
                  <td className="border border-gray-300 p-2">{sub.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments Table */}
      {payments && payments.length > 0 && (
        <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">سجل المدفوعات للمنصة</h3>
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-right">التاريخ</th>
                <th className="border border-gray-300 p-2 text-right">المبلغ</th>
                <th className="border border-gray-300 p-2 text-right">ملاحظات التحويل</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="border border-gray-300 p-2">{format(new Date(payment.paid_at), 'dd/MM/yyyy h:mm a')}</td>
                  <td className="border border-gray-300 p-2 text-green-700 font-bold">{formatPrice(payment.amount)}</td>
                  <td className="border border-gray-300 p-2 text-xs text-gray-500 max-w-[200px] truncate">{payment.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-gray-600 text-sm border-t border-gray-800 pt-6">
        <p className="font-bold">هذا كشف حساب إلكتروني معتمد من إدارة المنصة ولا يحتاج إلى توقيع</p>
      </div>
    </div>
    </>
  );
};
