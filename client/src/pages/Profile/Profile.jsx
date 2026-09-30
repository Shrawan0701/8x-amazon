import { Home, Mail, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StateMessage } from '../../components/common/StateMessage';
import { useApp } from '../../hooks/useApp';
import { accountService } from '../../services/accountService';

const emptyAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: true
};

function fromAddress(address) {
  return {
    fullName: address.full_name || '',
    phone: address.phone || '',
    line1: address.line1 || '',
    line2: address.line2 || '',
    city: address.city || '',
    state: address.state || '',
    postalCode: address.postal_code || '',
    country: address.country || 'India',
    isDefault: Boolean(address.is_default)
  };
}

export function ProfilePage() {
  const { user, setUser, notify } = useApp();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    accountService.profile().then(({ data }) => {
      setUser(data.user);
      setProfileName(data.user.name);
      setAddresses(data.addresses);
    }).catch(() => setError('Could not load your profile.')).finally(() => setLoading(false));
  }, [setUser]);

  function field(key, value) {
    setAddressForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await accountService.updateProfile({ name: profileName });
      setUser(data.user);
      notify('Profile updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Profile could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAddress(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const request = editingId
        ? accountService.updateAddress(editingId, addressForm)
        : accountService.addAddress(addressForm);
      const { data } = await request;
      setAddresses(data.addresses);
      setAddressForm(emptyAddress);
      setEditingId(null);
      notify(editingId ? 'Address updated' : 'Address added');
    } catch (err) {
      setError(err.response?.data?.message || 'Address could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id) {
    const { data } = await accountService.deleteAddress(id);
    setAddresses(data.addresses);
    notify('Address removed', 'info');
  }

  if (loading) return <StateMessage title="Loading profile..." />;

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>{profileName}</h1>
          <p>Manage your shopping profile, delivery addresses and account shortcuts.</p>
        </div>
        <div className="profile-stats">
          <span><Mail size={16} /> {user.email}</span>
          <span><ShieldCheck size={16} /> Secure checkout enabled</span>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="profile-grid">
        <section className="panel">
          <h2>Profile details</h2>
          <form onSubmit={saveProfile} className="stack-form">
            <label>Name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label>
            <label>Email<input value={user.email} disabled /></label>
            <button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
          </form>
          <div className="profile-links">
            <Link to="/orders"><Home size={17} /> View orders</Link>
            <Link to="/forgot-password"><ShieldCheck size={17} /> Reset password</Link>
          </div>
        </section>

        <section className="panel">
          <h2>{editingId ? 'Edit address' : 'Add address'}</h2>
          <form onSubmit={saveAddress} className="form-grid compact-form">
            {[
              ['fullName', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'],
              ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal code'], ['country', 'Country']
            ].map(([key, label]) => (
              <label key={key}>{label}<input value={addressForm[key]} onChange={(event) => field(key, event.target.value)} /></label>
            ))}
            <label className="check-row"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => field('isDefault', event.target.checked)} /> Default delivery address</label>
            <div className="form-actions">
              <button className="primary" disabled={saving}>{editingId ? 'Update address' : 'Add address'}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setAddressForm(emptyAddress); }}>Cancel</button>}
            </div>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="section-head compact">
          <div><p className="eyebrow">Delivery</p><h2>Saved addresses</h2></div>
        </div>
        {!addresses.length ? <StateMessage title="No saved addresses" text="Add a delivery address to speed up checkout." /> : (
          <div className="address-grid">
            {addresses.map((address) => (
              <article className="address-card" key={address.id}>
                <div>
                  <span className={address.is_default ? 'status-pill paid' : 'status-pill'}>{address.is_default ? 'Default' : 'Saved'}</span>
                  <h3><MapPin size={18} /> {address.full_name}</h3>
                  <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                  <p>{address.city}, {address.state} {address.postal_code}</p>
                  <p>{address.country} · {address.phone}</p>
                </div>
                <div className="address-actions">
                  <button className="secondary" onClick={() => { setEditingId(address.id); setAddressForm(fromAddress(address)); }}>Edit</button>
                  <button className="icon-link danger" onClick={() => removeAddress(address.id)} title="Delete address"><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
