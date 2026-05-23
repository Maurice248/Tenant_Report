"use client";

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, MessageSquare } from 'lucide-react';

interface RetryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (prompt: string) => void;
  loading: boolean;
}

export default function RetryModal({ isOpen, onOpenChange, onSubmit, loading }: RetryModalProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(prompt);
    setPrompt("");
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sd-modal-overlay" />
        <Dialog.Content className="sd-modal-content" style={{ maxWidth: 440 }}>
          <div className="sd-modal-header">
            <div className="sd-modal-title-row">
              <div className="sd-modal-icon-bg" style={{ background: '#fff7ed' }}>
                <RefreshCw size={20} color="#ea580c" />
              </div>
              <div>
                <Dialog.Title className="sd-modal-title">Retry Generation</Dialog.Title>
                <Dialog.Description className="sd-modal-desc">
                  Provide feedback or a new prompt for the AI.
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
            <div className="sd-form-field sd-full-width">
              <label className="sd-form-label"><MessageSquare size={13} /> Retry Prompt</label>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Make it more professional, or add more details about the implants..."
                className="sd-form-textarea"
                required
              />
            </div>

            <div className="sd-modal-footer">
              <Dialog.Close asChild>
                <button type="button" className="sd-modal-btn-cancel">Cancel</button>
              </Dialog.Close>
              <button 
                type="submit" 
                className="sd-modal-btn-submit"
                style={{ background: '#ea580c' }}
                disabled={loading}
              >
                {loading ? "Processing..." : "Submit Retry"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
