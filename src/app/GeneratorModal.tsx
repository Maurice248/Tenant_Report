"use client";

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Wand2, Music, Mic2, Monitor, MessageSquare, Tag } from 'lucide-react';
import { Spinner } from './components';

interface GeneratorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: typeof initialFormData) => void;
  loading: boolean;
}

const initialFormData = {
  category: "hair_transplant",
  description: "",
  videoStyle: "Highly Realistic 4k, real life",
  language: "English",
  voice: "KLoLpdGWK7agg0O2TJYg",
  backgroundSong: "Inspirational - Sunrise Bloom"
};

export default function GeneratorModal({ isOpen, onOpenChange, onSubmit, loading }: GeneratorModalProps) {
  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sd-modal-overlay" />
        <Dialog.Content className="sd-modal-content">
          <div className="sd-modal-header">
            <div className="sd-modal-title-row">
              <div className="sd-modal-icon-bg">
                <Wand2 size={20} color="#0284c7" />
              </div>
              <div>
                <Dialog.Title className="sd-modal-title">Video AI Generation</Dialog.Title>
                <Dialog.Description className="sd-modal-desc">
                  Configure your story and style preferences.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="sd-modal-close-btn" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="sd-modal-form">
            <div className="sd-form-grid">
              
              {/* Category */}
              <div className="sd-form-field">
                <label className="sd-form-label"><Tag size={13} /> Category</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange}
                  className="sd-form-select"
                >
                  <option value="hair_transplant">Hair Transplant</option>
                  <option value="dental_treatment">Dental Treatment</option>
                  <option value="liposuction">Liposuction - Fat Removal</option>
                  <option value="nose_job">Nose Job - Rhinoplasty</option>
                </select>
              </div>

              {/* Video Style */}
              <div className="sd-form-field">
                <label className="sd-form-label"><Monitor size={13} /> Video Style</label>
                <select 
                  name="videoStyle" 
                  value={formData.videoStyle} 
                  onChange={handleChange}
                  className="sd-form-select"
                >
                  <option value="Highly Realistic 4k, real life">Highly Realistic 4k, real life</option>
                  <option value="Cinematic Drone - Smooth">Cinematic Drone - Smooth</option>
                  <option value="Studio Professional - Clean">Studio Professional - Clean</option>
                </select>
              </div>

              {/* Language */}
              <div className="sd-form-field">
                <label className="sd-form-label">Language</label>
                <select 
                  name="language" 
                  value={formData.language} 
                  onChange={handleChange}
                  className="sd-form-select"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
              </div>

              {/* Voice */}
              <div className="sd-form-field">
                <label className="sd-form-label"><Mic2 size={13} /> Voice</label>
                <select 
                  name="voice" 
                  value={formData.voice} 
                  onChange={handleChange}
                  className="sd-form-select"
                >
                  <option value="wrxvN1LZJIfL3HHvffqe">Bella - Lady</option>
                  <option value="odyUrTN5HMVKujvVAgWW">Emily - Lady</option>
                  <option value="aD6riP1btT197c6dACmy">Rachel - Lady</option>
                  <option value="eqz5FuihuZwmJPuvZ65E">Jess</option>
                  <option value="KLoLpdGWK7agg0O2TJYg">Charlie - Men</option>
                  <option value="KClAuq9Hs0wFY7oJmaGN">Maayan-Lady</option>
                </select>
              </div>

              {/* Background Song */}
              <div className="sd-form-field sd-full-width">
                <label className="sd-form-label"><Music size={13} /> Background Song</label>
                <select 
                  name="backgroundSong" 
                  value={formData.backgroundSong} 
                  onChange={handleChange}
                  className="sd-form-select"
                >
                  <option value="Inspirational - Sunrise Bloom">Inspirational - Sunrise Bloom</option>
                  <option value="Upbeat - Corporate Drive">Upbeat - Corporate Drive</option>
                  <option value="Lo-fi - Midnight Study">Lo-fi - Midnight Study</option>
                  <option value="Cinematic - Epic Journey">Cinematic - Epic Journey</option>
                  <option value="Ambient - Calm Waters">Ambient - Calm Waters</option>
                </select>
              </div>

              {/* Story Description */}
              <div className="sd-form-field sd-full-width">
                <label className="sd-form-label"><MessageSquare size={13} /> Story Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange}
                  placeholder="Tell your patient story or describe the blog post content..."
                  className="sd-form-textarea"
                  required
                />
              </div>

            </div>

            <div className="sd-modal-footer">
              <Dialog.Close asChild>
                <button type="button" className="sd-modal-btn-cancel">Cancel</button>
              </Dialog.Close>
              <button 
                type="submit" 
                className="sd-modal-btn-submit"
                disabled={loading}
              >
                {loading ? <><Spinner size={14} color="white" /> Generating...</> : "Generate Video"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
