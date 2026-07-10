'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping';

interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  minimum_purchase: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponFormState {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  minimum_purchase: string;
  maximum_discount: string;
  usage_limit: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const emptyForm: CouponFormState = {
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  minimum_purchase: '',
  maximum_discount: '',
  usage_limit: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

const typeLabels: Record<CouponType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_shipping: 'Free Shipping',
};

function couponStatus(c: CouponRow): 'Active' | 'Scheduled' | 'Expired' | 'Disabled' | 'Used Up' {
  if (!c.is_active) return 'Disabled';
  const now = new Date();
  if (c.start_date && new Date(c.start_date) > now) return 'Scheduled';
  if (c.end_date && new Date(c.end_date) < now) return 'Expired';
  if (c.usage_limit && c.usage_count >= c.usage_limit) return 'Used Up';
  return 'Active';
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortBy, setSortBy] = useState('date');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coupons:', error);
        setToast({ type: 'error', message: 'Failed to load coupons: ' + error.message });
      } else {
        setCoupons((data || []) as CouponRow[]);
      }
    } catch (err: any) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load coupons' });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (c: CouponRow) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: String(c.value ?? ''),
      minimum_purchase: c.minimum_purchase ? String(c.minimum_purchase) : '',
      maximum_discount: c.maximum_discount ? String(c.maximum_discount) : '',
      usage_limit: c.usage_limit ? String(c.usage_limit) : '',
      start_date: toDateInputValue(c.start_date),
      end_date: toDateInputValue(c.end_date),
      is_active: c.is_active,
    });
    setFormError(null);
    setShowModal(true);
  };

  const validateForm = (): string | null => {
    const code = form.code.trim().toUpperCase();
    if (!code) return 'Coupon code is required';
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return 'Code must be 3-32 characters (letters, numbers, - or _)';
    if (form.type !== 'free_shipping') {
      const value = parseFloat(form.value);
      if (!Number.isFinite(value) || value <= 0) return 'Discount value must be greater than 0';
      if (form.type === 'percentage' && value > 100) return 'Percentage cannot exceed 100';
    }
    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      return 'End date must be after start date';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      type: form.type,
      value: form.type === 'free_shipping' ? 0 : parseFloat(form.value),
      minimum_purchase: form.minimum_purchase ? parseFloat(form.minimum_purchase) : 0,
      maximum_discount:
        form.type === 'percentage' && form.maximum_discount
          ? parseFloat(form.maximum_discount)
          : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
      start_date: form.start_date ? new Date(form.start_date + 'T00:00:00').toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date + 'T23:59:59').toISOString() : null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editingId);
        if (error) throw error;
        setToast({ type: 'success', message: `Coupon ${payload.code} updated` });
      } else {
        const { error } = await supabase.from('coupons').insert([payload]);
        if (error) {
          if (error.code === '23505') throw new Error(`Code "${payload.code}" already exists`);
          throw error;
        }
        setToast({ type: 'success', message: `Coupon ${payload.code} created` });
      }
      setShowModal(false);
      await fetchCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CouponRow) => {
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', c.id);
    if (error) {
      setToast({ type: 'error', message: 'Delete failed: ' + error.message });
    } else {
      setToast({ type: 'success', message: `Coupon ${c.code} deleted` });
      setCoupons(prev => prev.filter(x => x.id !== c.id));
    }
  };

  const handleToggleActive = async (c: CouponRow) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !c.is_active, updated_at: new Date().toISOString() })
      .eq('id', c.id);
    if (error) {
      setToast({ type: 'error', message: 'Update failed: ' + error.message });
    } else {
      setCoupons(prev => prev.map(x => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
      setToast({ type: 'success', message: `Coupon ${c.code} ${c.is_active ? 'disabled' : 'enabled'}` });
    }
  };

  const handleCopy = async (c: CouponRow) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard unavailable (non-HTTPS); ignore
    }
  };

  const statusColors: Record<string, string> = {
    'Active': 'bg-green-100 text-green-700',
    'Scheduled': 'bg-blue-100 text-blue-700',
    'Expired': 'bg-gray-100 text-gray-700',
    'Disabled': 'bg-red-100 text-red-700',
    'Used Up': 'bg-amber-100 text-amber-700',
  };

  const filtered = coupons.filter(c => {
    if (statusFilter === 'All Status') return true;
    return couponStatus(c) === statusFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'usage') return b.usage_count - a.usage_count;
    if (sortBy === 'value') return b.value - a.value;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeCoupons = coupons.filter(c => couponStatus(c) === 'Active');
  const totalUses = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-5 py-3 rounded-lg shadow-lg text-sm font-semibold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coupons & Promotions</h1>
          <p className="text-gray-600 mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line mr-2"></i>
          Create Coupon
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Coupons</p>
          <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-700">{activeCoupons.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Uses</p>
          <p className="text-2xl font-bold text-gray-900">{totalUses}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Disabled / Expired</p>
          <p className="text-2xl font-bold text-gray-500">{coupons.length - activeCoupons.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">All Coupons</h2>
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Scheduled</option>
                <option>Expired</option>
                <option>Disabled</option>
                <option>Used Up</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="date">Sort by Date</option>
                <option value="usage">Sort by Usage</option>
                <option value="value">Sort by Value</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Code</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Value</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Min Purchase</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Usage</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Valid Period</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading coupons...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">
                  {coupons.length === 0 ? 'No coupons yet. Click "Create Coupon" to add your first one.' : 'No coupons match this filter.'}
                </td></tr>
              ) : (
                sorted.map((coupon) => {
                  const status = couponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded">{coupon.code}</span>
                          <button
                            onClick={() => handleCopy(coupon)}
                            title="Copy code"
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <i className={copiedId === coupon.id ? 'ri-check-line text-green-600' : 'ri-file-copy-line'}></i>
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">{coupon.description}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{typeLabels[coupon.type]}</td>
                      <td className="py-4 px-4 font-semibold text-gray-900 whitespace-nowrap">
                        {coupon.type === 'percentage'
                          ? `${coupon.value}%${coupon.maximum_discount ? ` (max GH₵${coupon.maximum_discount})` : ''}`
                          : coupon.type === 'fixed_amount'
                            ? `GH₵ ${Number(coupon.value).toFixed(2)}`
                            : 'Free Shipping'}
                      </td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">
                        {coupon.minimum_purchase > 0 ? `GH₵ ${Number(coupon.minimum_purchase).toFixed(2)}` : 'No minimum'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 font-semibold">{coupon.usage_count || 0}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-gray-600">{coupon.usage_limit || '∞'}</span>
                        </div>
                        {coupon.usage_limit && (
                          <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${Math.min(((coupon.usage_count || 0) / coupon.usage_limit) * 100, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-700 whitespace-nowrap">
                          {coupon.start_date ? new Date(coupon.start_date).toLocaleDateString() : 'Anytime'}
                        </p>
                        <p className="text-sm text-gray-500 whitespace-nowrap">
                          {coupon.end_date ? `→ ${new Date(coupon.end_date).toLocaleDateString()}` : 'No expiry'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status] || 'bg-gray-100'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            title={coupon.is_active ? 'Disable' : 'Enable'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${coupon.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            <i className={coupon.is_active ? 'ri-toggle-fill text-xl' : 'ri-toggle-line text-xl'}></i>
                          </button>
                          <button
                            onClick={() => openEdit(coupon)}
                            title="Edit"
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <i className="ri-edit-line text-lg"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            title="Delete"
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Coupon Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                  maxLength={32}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 10% off for new customers"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (GH₵)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                {form.type !== 'free_shipping' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {form.type === 'percentage' ? 'Percentage *' : 'Amount (GH₵) *'}
                    </label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      placeholder={form.type === 'percentage' ? '10' : '20.00'}
                      min="0"
                      max={form.type === 'percentage' ? 100 : undefined}
                      step={form.type === 'percentage' ? 1 : 0.01}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Purchase (GH₵)</label>
                  <input
                    type="number"
                    value={form.minimum_purchase}
                    onChange={(e) => setForm({ ...form, minimum_purchase: e.target.value })}
                    placeholder="0 = no minimum"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {form.type === 'percentage' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Discount (GH₵)</label>
                    <input
                      type="number"
                      value={form.maximum_discount}
                      onChange={(e) => setForm({ ...form, maximum_discount: e.target.value })}
                      placeholder="No cap"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Limit</label>
                    <input
                      type="number"
                      value={form.usage_limit}
                      onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                      placeholder="Unlimited"
                      min="1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {form.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Limit</label>
                  <input
                    type="number"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-700 rounded"
                />
                <span className="font-semibold text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-3 rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-70"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
