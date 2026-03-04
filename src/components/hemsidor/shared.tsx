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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {onSave && (
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
              Avbryt
            </button>
            <button onClick={onSave} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
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

const INPUT_CLS = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"

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
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">{label}{required && " *"}</label>
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
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">{label}{required && " *"}</label>
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {sub && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{sub}</p>}
      </div>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  )
}
