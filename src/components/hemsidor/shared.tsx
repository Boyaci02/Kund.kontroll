"use client"

import { X, AlertTriangle } from "lucide-react"

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  onSave?: () => void
  saveLabel?: string
  children: React.ReactNode
}

export function HModal({ title, onClose, onSave, saveLabel = "Spara", children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {onSave && (
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-xl text-sm hover:bg-muted/60 transition-colors">
              Avbryt
            </button>
            <button onClick={onSave} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              {saveLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
  confirmLabel?: string
}

export function HConfirmDialog({ title, message, onConfirm, onClose, confirmLabel = "Radera" }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-xl text-sm hover:bg-muted/60 transition-colors">
            Avbryt
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Form Inputs ──────────────────────────────────────────────────────────────

const INPUT_CLS = "w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-card text-foreground"

interface FormFieldProps {
  label: string
  value: string | number
  onChange: (v: string) => void
  multiline?: boolean
  type?: string
  placeholder?: string
  required?: boolean
}

export function HFormField({ label, value, onChange, multiline, type, placeholder, required }: FormFieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{label}{required && " *"}</label>
      {multiline
        ? <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={3} className={INPUT_CLS} placeholder={placeholder} />
        : <input type={type || "text"} value={value ?? ""} onChange={e => onChange(e.target.value)} className={INPUT_CLS} placeholder={placeholder} />
      }
    </div>
  )
}

interface FormSelectProps {
  label: string
  value: string | number
  onChange: (v: string) => void
  options: (string | { value: string | number; label: string })[]
  required?: boolean
}

export function HFormSelect({ label, value, onChange, options, required }: FormSelectProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{label}{required && " *"}</label>
      <select value={value ?? ""} onChange={e => onChange(e.target.value)} className={INPUT_CLS}>
        <option value="">Välj...</option>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  sub?: React.ReactNode
  children?: React.ReactNode
}

export function HPageHeader({ title, sub, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {sub && <p className="text-muted-foreground text-sm mt-1">{sub}</p>}
      </div>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  )
}
