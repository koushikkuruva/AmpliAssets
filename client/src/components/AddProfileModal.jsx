import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Briefcase, PlusCircle } from 'lucide-react';

const COMMON_BROKERS = [
  'Zerodha',
  'Groww',
  'AngelOne',
  'Upstox',
  'ICICI Direct',
  'HDFC Sky',
  'Kotak Securities',
  'Dhan',
  'Motilal Oswal'
];

export default function AddProfileModal({ onClose }) {
  const { addProfile, setActivePortfolioId } = useAuth();
  const [profileName, setProfileName] = useState('');
  const [brokerName, setBrokerName] = useState('Zerodha');
  const [customBroker, setCustomBroker] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setError('Please provide a profile name (e.g. Mother\'s Account)');
      return;
    }

    const finalBroker = brokerName === 'Other' ? (customBroker.trim() || 'Other') : brokerName;

    setIsSubmitting(true);
    setError('');

    try {
      const created = await addProfile(profileName.trim(), finalBroker);
      setActivePortfolioId(created.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create family profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Briefcase size={20} className="text-amber" />
            <h2 className="modal-title">Add Family Demat Profile</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Profile / Demat Account Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Mother's Demat, HUF Account, Retirement"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                required
                autoFocus
                id="input-profile-name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Broker / Depository Participant</label>
              <select
                className="form-select"
                value={brokerName}
                onChange={e => setBrokerName(e.target.value)}
                id="select-broker-name"
              >
                {COMMON_BROKERS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value="Other">Other Broker</option>
              </select>
            </div>

            {brokerName === 'Other' && (
              <div className="form-group">
                <label className="form-label">Custom Broker Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter broker name"
                  value={customBroker}
                  onChange={e => setCustomBroker(e.target.value)}
                  id="input-custom-broker"
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting}
              id="btn-submit-add-profile"
            >
              <PlusCircle size={16} />
              <span>{isSubmitting ? 'Creating...' : 'Create Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
