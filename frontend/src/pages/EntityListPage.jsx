import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// ─── Mock API helpers (replace with RTK Query endpoints) ─────────────────────
const MOCK_DELAY = 600;

const mockFetch = (params) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const total = 47;
      const { page = 1, pageSize = 10, search = '', sortField = 'createdAt', sortDir = 'desc', status = '', type = '' } = params;

      const allItems = Array.from({ length: total }, (_, i) => ({
        id: `item-${i + 1}`,
        referenceNumber: `REF-${String(i + 1).padStart(5, '0')}`,
        passengerName: i % 3 === 0 ? 'محمد العمري' : i % 3 === 1 ? 'Sarah Johnson' : 'Abdullah Al-Rashid',
        type: ['REBOOKING', 'BAGGAGE_CLAIM', 'UPGRADE', 'SEAT_SELECTION'][i % 4],
        status: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'UNDER_REVIEW'][i % 5],
        amount: parseFloat((Math.random() * 2000 + 50).toFixed(2)),
        createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - i * 43200000).toISOString(),
        flightNumber: `SV${String(100 + i).padStart(3, '0')}`,
        origin: ['RUH', 'JED', 'DMM', 'MED'][i % 4],
        destination: ['DXB', 'CAI', 'LHR', 'CDG'][i % 4],
      }));

      let filtered = allItems.filter((item) => {
        const matchSearch =
          !search ||
          item.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
          item.passengerName.toLowerCase().includes(search.toLowerCase()) ||
          item.flightNumber.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !status || item.status === status;
        const matchType = !type || item.type === type;
        return matchSearch && matchStatus && matchType;
      });

      filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      resolve({ items, total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) });
    }, MOCK_DELAY);
  });

const mockDelete = (id) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.1) resolve({ success: true });
      else reject(new Error('Delete failed'));
    }, 400);
  });

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: { en: 'Pending', ar: 'قيد الانتظار', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  CONFIRMED: { en: 'Confirmed', ar: 'مؤكد', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CANCELLED: { en: 'Cancelled', ar: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  COMPLETED: { en: 'Completed', ar: 'مكتمل', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  UNDER_REVIEW: { en: 'Under Review', ar: 'قيد المراجعة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
};

const TYPE_CONFIG = {
  REBOOKING: { en: 'Rebooking', ar: 'إعادة الحجز' },
  BAGGAGE_CLAIM: { en: 'Baggage Claim', ar: 'مطالبة أمتعة' },
  UPGRADE: { en: 'Upgrade', ar: 'ترقية' },
  SEAT_SELECTION: { en: 'Seat Selection', ar: 'اختيار مقعد' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status, lang }) => {
  const cfg = STATUS_CONFIG[status] || { en: status, ar: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {lang === 'ar' ? cfg.ar : cfg.en}
    </span>
  );
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
  return sortDir === 'asc' ? (
    <ChevronUpIcon className="w-4 h-4 text-[#006B3F]" />
  ) : (
    <ChevronDownIcon className="w-4 h-4 text-[#006B3F]" />
  );
};

const SkeletonRow = ({ cols }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </td>
    ))}
  </tr>
);

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
const EntityModal = ({ isOpen, onClose, editItem, lang, onSave }) => {
  const { t, i18n } = useTranslation();
  const isRTL = lang === 'ar';
  const [form, setForm] = useState({
    passengerName: '',
    flightNumber: '',
    origin: '',
    destination: '',
    type: 'REBOOKING',
    status: 'PENDING',
    amount: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (editItem) {
      setForm({
        passengerName: editItem.passengerName || '',
        flightNumber: editItem.flightNumber || '',
        origin: editItem.origin || '',
        destination: editItem.destination || '',
        type: editItem.type || 'REBOOKING',
        status: editItem.status || 'PENDING',
        amount: editItem.amount != null ? String(editItem.amount) : '',
      });
    } else {
      setForm({ passengerName: '', flightNumber: '', origin: '', destination: '', type: 'REBOOKING', status: 'PENDING', amount: '' });
    }
    setErrors({});
  }, [editItem, isOpen]);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.passengerName.trim()) errs.passengerName = isRTL ? 'اسم الراكب مطلوب' : 'Passenger name is required';
    if (!form.flightNumber.trim()) errs.flightNumber = isRTL ? 'رقم الرحلة مطلوب' : 'Flight number is required';
    if (!form.origin.trim()) errs.origin = isRTL ? 'مطار المغادرة مطلوب' : 'Origin airport is required';
    if (!form.destination.trim()) errs.destination = isRTL ? 'مطار الوصول مطلوب' : 'Destination airport is required';
    if (form.amount && isNaN(parseFloat(form.amount))) errs.amount = isRTL ? 'المبلغ يجب أن يكون رقماً' : 'Amount must be a number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      onSave({ ...editItem, ...form, amount: parseFloat(form.amount) || 0 });
      onClose();
      toast.success(isRTL ? (editItem ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح') : (editItem ? 'Updated successfully' : 'Created successfully'));
    } catch {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = (field) =>
    `w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#006B3F] transition-colors ${
      errors[field] ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600'
    }`;

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {editItem
              ? isRTL ? 'تعديل السجل' : 'Edit Record'
              : isRTL ? 'إنشاء سجل جديد' : 'Create New Record'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isRTL ? 'إغلاق' : 'Close'}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" noValidate>
          {/* Passenger Name */}
          <div>
            <label className={labelClass} htmlFor="passengerName">
              {isRTL ? 'اسم الراكب' : 'Passenger Name'} <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="passengerName"
              type="text"
              className={inputClass('passengerName')}
              value={form.passengerName}
              onChange={(e) => setForm((f) => ({ ...f, passengerName: e.target.value }))}
              placeholder={isRTL ? 'أدخل اسم الراكب' : 'Enter passenger name'}
              autoComplete="off"
            />
            {errors.passengerName && <p className="mt-1 text-xs text-red-500">{errors.passengerName}</p>}
          </div>

          {/* Flight Number */}
          <div>
            <label className={labelClass} htmlFor="flightNumber">
              {isRTL ? 'رقم الرحلة' : 'Flight Number'} <span className="text-red-500">*</span>
            </label>
            <input
              id="flightNumber"
              type="text"
              className={inputClass('flightNumber')}
              value={form.flightNumber}
              onChange={(e) => setForm((f) => ({ ...f, flightNumber: e.target.value.toUpperCase() }))}
              placeholder="SV001"
              autoComplete="off"
            />
            {errors.flightNumber && <p className="mt-1 text-xs text-red-500">{errors.flightNumber}</p>}
          </div>

          {/* Origin / Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="origin">
                {isRTL ? 'المغادرة' : 'Origin'} <span className="text-red-500">*</span>
              </label>
              <input
                id="origin"
                type="text"
                maxLength={3}
                className={inputClass('origin')}
                value={form.origin}
                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value.toUpperCase() }))}
                placeholder="RUH"
              />
              {errors.origin && <p className="mt-1 text-xs text-red-500">{errors.origin}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="destination">
                {isRTL ? 'الوصول' : 'Destination'} <span className="text-red-500">*</span>
              </label>
              <input
                id="destination"
                type="text"
                maxLength={3}
                className={inputClass('destination')}
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value.toUpperCase() }))}
                placeholder="DXB"
              />
              {errors.destination && <p className="mt-1 text-xs text-red-500">{errors.destination}</p>}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className={labelClass} htmlFor="type">
              {isRTL ? 'النوع' : 'Type'}
            </label>
            <select
              id="type"
              className={inputClass('type')}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelClass} htmlFor="status">
              {isRTL ? 'الحالة' : 'Status'}
            </label>
            <select
              id="status"
              className={inputClass('status')}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className={labelClass} htmlFor="amount">
              {isRTL ? 'المبلغ (ريال سعودي)' : 'Amount (SAR)'}
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass('amount')} ${isRTL ? 'pr-3 pl-12' : 'pl-3 pr-12'}`}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
              <span className={`absolute top-1/2 -translate-y-1/2 text-sm text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`}>
                {isRTL ? 'ر.س' : 'SAR'}
              </span>
            </div>
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* Actions */}
          <div className={`flex gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#006B3F] hover:bg-[#005530] disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:ring-offset-2"
            >
              {saving ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
              {saving
                ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...')
                : (isRTL ? 'حفظ' : 'Save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteModal = ({ isOpen, onClose, onConfirm, item, lang, deleting }) => {
  const isRTL = lang === 'ar';
  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 id="delete-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {isRTL ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRTL
                ? `هل أنت متأكد من حذف السجل ${item.referenceNumber}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete record ${item.referenceNumber}? This action cannot be undone.`}
            </p>
          </div>
          <div className={`flex gap-3 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {deleting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              {isRTL ? 'حذف' : 'Delete'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main EntityListPage ──────────────────────────────────────────────────────
const EntityListPage = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'en';
  const isRTL = lang === 'ar';

  // List state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters / search / sort / pagination
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Search debounce
  const searchDebounceRef = useRef(null);
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mockFetch({ page, pageSize, search, sortField, sortDir, status: statusFilter, type: typeFilter });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(isRTL ? 'فشل تحميل البيانات. يرجى المحاولة مرة أخرى.' : 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortField, sortDir, statusFilter, typeFilter, isRTL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Filter change
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await mockDelete(deleteItem.id);
      setDeleteItem(null);
      toast.success(isRTL ? 'تم الحذف بنجاح' : 'Record deleted successfully');
      fetchData();
    } catch {
      toast.error(isRTL ? 'فشل الحذف. يرجى المحاولة مرة أخرى.' : 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Save handler (create/edit)
  const handleSave = () => {
    fetchData();
  };

  // Format date
  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format amount
  const formatAmount = (amount) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Column definitions
  const columns = [
    { key: 'referenceNumber', labelEn: 'Reference', labelAr: 'المرجع', sortable: true, width: 'w-32' },
    { key: 'passengerName', labelEn: 'Passenger', labelAr: 'الراكب', sortable: true, width: 'w-40' },
    { key: 'flightNumber', labelEn: 'Flight', labelAr: 'الرحلة', sortable: true, width: 'w-24' },
    { key: 'type', labelEn: 'Type', labelAr: 'النوع', sortable: true, width: 'w-36' },
    { key: 'status', labelEn: 'Status', labelAr: 'الحالة', sortable: true, width: 'w-36' },
    { key: 'amount', labelEn: 'Amount (SAR)', labelAr: 'المبلغ (ر.س)', sortable: true, width: 'w-32' },
    { key: 'createdAt', labelEn: 'Created', labelAr: 'تاريخ الإنشاء', sortable: true, width: 'w-32' },
    { key: 'actions', labelEn: 'Actions', labelAr: 'الإجراءات', sortable: false, width: 'w-28' },
  ];

  // Pagination range
  const pageRange = () => {
    const range = [];
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    if (left > 1) { range.push(1); if (left > 2) range.push('...'); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages) { if (right < totalPages - 1) range.push('...'); range.push(totalPages); }
    return range;
  };

  const activeFilterCount = [statusFilter, typeFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'إدارة السجلات' : 'Records Management'}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isRTL
                  ? `إجمالي ${total.toLocaleString('ar-SA')} سجل`
                  : `${total.toLocaleString('en-US')} total records`}
              </p>
            </div>
            <button
              onClick={() => { setEditItem(null); setCreateModalOpen(true); }}
              className="inline-flex items-center gap-2 bg-[#006B3F] hover:bg-[#005530] text-white font-medium px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:ring-offset-2 shadow-sm"
            >
              <PlusIcon className="w-5 h-5" />
              {isRTL ? 'إنشاء سجل جديد' : 'Create New Record'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Search + Filter Bar */}
        <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={isRTL ? 'بحث بالمرجع أو اسم الراكب أو رقم الرحلة...' : 'Search by reference, passenger, or flight...'}
              className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F] transition-colors ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
              aria-label={isRTL ? 'بحث' : 'Search'}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:ring-offset-2 ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-[#006B3F] border-[#006B3F] text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            aria-expanded={filtersOpen}
          >
            <FunnelIcon className="w-4 h-4" />
            {isRTL ? 'تصفية' : 'Filters'}
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#006B3F] text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:ring-offset-2 disabled:opacity-50"
            aria-label={isRTL ? 'تحديث' : 'Refresh'}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {/* Filter Panel */}
        {filtersOpen && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${isRTL ? 'text-right' : ''}`}>
              {/* Status filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  {isRTL ? 'الحالة' : 'Status'}
                </label>
                <select
                  value={statusFilter}
                  onChange={handleFilterChange(setStatusFilter)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                >
                  <option value="">{isRTL ? 'الكل' : 'All Statuses'}</option>
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
                  ))}
                </select>
              </div>

              {/* Type filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  {isRTL ? 'النوع' : 'Type'}
                </label>
                <select
                  value={typeFilter}
                  onChange={handleFilterChange(setTypeFilter)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                >
                  <option value="">{isRTL ? 'الكل' : 'All Types'}</option>
                  {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={fetchData} className="ms-auto text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid" aria-label={isRTL ? 'قائمة السجلات' : 'Records list'}>
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''} ${col.width}`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      aria-sort={col.sortable && sortField === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      <span className={`inline-flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {isRTL ? col.labelAr : col.labelEn}
                        {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <SkeletonRow key={i} cols={columns.length} />
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                        <MagnifyingGlassIcon className="w-10 h-10" />
                        <p className="text-base font-medium">
                          {isRTL ? 'لا توجد سجلات مطابقة' : 'No records found'}
                        </p>
                        <p className="text-sm">
                          {isRTL ? 'جرّب تغيير معايير البحث أو الفلاتر' : 'Try adjusting your search or filter criteria'}
                        </p>
                        {(search || activeFilterCount > 0) && (
                          <button
                            onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter(''); setTypeFilter(''); setPage(1); }}
                            className="text-sm text-[#006B3F] hover:underline font-medium"
                          >
                            {isRTL ? 'مسح البحث والفلاتر' : 'Clear search and filters'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      {/* Reference */}
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="font-mono text-xs font-semibold text-[#006B3F] dark:text-emerald-400">
                          {item.referenceNumber}
                        </span>
                      </td>

                      {/* Passenger */}
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate block max-w-[160px]">
                          {item.passengerName}
                        </span>
                      </td>

                      {/* Flight */}
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{item.flightNumber}</span>
                          <span className="text-xs text-gray-400">{item.origin} → {item.destination}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {isRTL ? TYPE_CONFIG[item.type]?.ar : TYPE_CONFIG[item.type]?.