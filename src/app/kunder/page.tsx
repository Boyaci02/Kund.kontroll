"use client"

import { useState, useMemo } from "react"
import { useDB } from "@/lib/store"
import { useRouter } from "next/navigation"
import { paketClass, statusClass, statusLabel } from "@/lib/helpers"
import type { Kund, Paket, Status } from "@/lib/types"
import { TEAM_FARGER, TEAM_MEDLEMMAR, PAKET_LISTA } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Pencil, Trash2, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Filter = "all" | "AKTIV" | "INAKTIV"
type SortBy = "name" | "pkg" | "nr" | "vg"

const NONE = "__none__"
const PKG_ORDER = ["Extra Stort Paket", "Stora Paketet", "Mellan Paketet", "Lilla Paketet", "Special Paket", ""]

const EMPTY_KUND: Omit<Kund, "id"> = {
  name: "",
  pkg: "",
  st: "AKTIV",
  vg: "",
  ed: "",
  cc: "Ingen",
  lr: "",
  nr: "",
  ns: "",
  cnt: "",
  ph: "",
  em: "",
  adr: "",
  notes: "",
}

function TeamAvatar({ name }: { name: string }) {
  if (!name || name === "Ingen") return null
  const color = TEAM_FARGER[name] ?? "#9CA3AF"
  return (
    <div
      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-card"
      style={{ background: color }}
      title={name}
    >
      {name[0]}
    </div>
  )
}

function TeamCluster({ vg, ed, cc }: { vg: string; ed: string; cc: string }) {
  const members = [...new Set([vg, ed, cc].filter((x) => x && x !== "Ingen"))]
  if (!members.length) return <span className="text-xs text-muted-foreground">-</span>
  return (
    <div className="flex -space-x-1">
      {members.map((m) => (
        <TeamAvatar key={m} name={m} />
      ))}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

export default function KunderPage() {
  const { db, addKund, updateKund, deleteKund } = useDB()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const [sortBy, setSortBy] = useState<SortBy>("name")
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<Kund, "id">>(EMPTY_KUND)

  const filtered = useMemo(() => {
    let list = db.clients
    if (filter !== "all") list = list.filter((c) => c.st === filter)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.cnt || "").toLowerCase().includes(s) ||
          (c.adr || "").toLowerCase().includes(s)
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "sv")
      if (sortBy === "pkg") return PKG_ORDER.indexOf(a.pkg) - PKG_ORDER.indexOf(b.pkg)
      if (sortBy === "nr") return (a.nr || "ö").localeCompare(b.nr || "ö", "sv")
      if (sortBy === "vg") return (a.vg || "ö").localeCompare(b.vg || "ö", "sv")
      return 0
    })
  }, [db.clients, filter, search, sortBy])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_KUND)
    setModalOpen(true)
  }

  function openEdit(id: number) {
    const c = db.clients.find((x) => x.id === id)
    if (!c) return
    setEditingId(id)
    setForm({ ...c })
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Ange ett kundnamn")
      return
    }
    if (editingId !== null) {
      updateKund({ ...form, id: editingId })
      toast.success("Kund uppdaterad")
    } else {
      addKund(form)
      toast.success("Kund tillagd")
    }
    setModalOpen(false)
  }

  function handleDelete(id: number) {
    deleteKund(id)
    setDeleteId(null)
    toast.success("Kund borttagen")
  }

  return (
    <div className="p-3 sm:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kunder</h1>
          <p className="text-sm text-muted-foreground mt-1">Hantera alla kundrelationer</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Ny kund
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 w-64 text-sm"
            placeholder="Sök kund..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["all", "AKTIV", "INAKTIV"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn("h-9 text-xs", filter === f && "bg-primary")}
            >
              {f === "all" ? "Alla" : f === "AKTIV" ? "Aktiva" : "Inaktiva"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Namn</SelectItem>
              <SelectItem value="pkg">Paket</SelectItem>
              <SelectItem value="nr">Nästa inspelning</SelectItem>
              <SelectItem value="vg">Videograf</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-2">{filtered.length} kunder</span>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Namn</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Paket</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Team</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Senaste</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nästa insp.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nästa SMS</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Kontakt</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                  Inga kunder matchade sökningen
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/kunder/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3">
                    {c.pkg ? (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", paketClass(c.pkg))}>
                        {c.pkg}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TeamCluster vg={c.vg} ed={c.ed} cc={c.cc} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.lr || "-"}</td>
                  <td className="px-4 py-3 text-xs">{c.nr || "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.ns || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium">{c.cnt || "-"}</div>
                    <div className="text-xs text-muted-foreground">{c.ph || ""}</div>
                    {c.em && <div className="text-xs text-muted-foreground">{c.em}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.st ? (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusClass(c.st))}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {statusLabel(c.st)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => openEdit(c.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card list — mobile */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Inga kunder matchade sökningen</p>
        ) : filtered.map(c => (
          <div
            key={c.id}
            onClick={() => router.push(`/kunder/${c.id}`)}
            className="rounded-xl border border-border bg-card p-3 space-y-2 cursor-pointer active:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-foreground">{c.name}</p>
                {c.cnt && <p className="text-xs text-muted-foreground">{c.cnt}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.st && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusClass(c.st))}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusLabel(c.st)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {c.pkg && (
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", paketClass(c.pkg))}>
                  {c.pkg}
                </span>
              )}
              <TeamCluster vg={c.vg} ed={c.ed} cc={c.cc} />
              {c.nr && <span className="text-xs text-muted-foreground">Nästa: {c.nr}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Redigera kund" : "Ny kund"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <FormField label="Restaurangnamn *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="T.ex. Drippn Burgers"
                />
              </FormField>
            </div>
            <FormField label="Paket">
              <Select value={form.pkg || NONE} onValueChange={(v) => setForm({ ...form, pkg: (v === NONE ? "" : v) as Paket })}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Inget paket</SelectItem>
                  {PAKET_LISTA.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.st} onValueChange={(v) => setForm({ ...form, st: v as Status })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AKTIV">Aktiv</SelectItem>
                  <SelectItem value="INAKTIV">Inaktiv</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Videograf">
              <Select value={form.vg || NONE} onValueChange={(v) => setForm({ ...form, vg: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {TEAM_MEDLEMMAR.filter(m => m !== "Ingen").map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Redigerare">
              <Select value={form.ed || NONE} onValueChange={(v) => setForm({ ...form, ed: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {TEAM_MEDLEMMAR.filter(m => m !== "Ingen").map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Content Creator">
              <Select value={form.cc} onValueChange={(v) => setForm({ ...form, cc: v })}>
                <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                <SelectContent>
                  {TEAM_MEDLEMMAR.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Senaste inspelning">
              <Input value={form.lr} onChange={(e) => setForm({ ...form, lr: e.target.value })} placeholder="T.ex. 26 jan" />
            </FormField>
            <FormField label="Nästa inspelning">
              <Input value={form.nr} onChange={(e) => setForm({ ...form, nr: e.target.value })} placeholder="T.ex. 10 mars" />
            </FormField>
            <FormField label="Nästa SMS">
              <Input value={form.ns} onChange={(e) => setForm({ ...form, ns: e.target.value })} placeholder="T.ex. Mars" />
            </FormField>
            <FormField label="Kontaktperson">
              <Input value={form.cnt} onChange={(e) => setForm({ ...form, cnt: e.target.value })} placeholder="Namn" />
            </FormField>
            <FormField label="Telefon">
              <Input value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} placeholder="073-XXX XX XX" />
            </FormField>
            <FormField label="E-post">
              <Input value={form.em} onChange={(e) => setForm({ ...form, em: e.target.value })} placeholder="namn@foretag.se" type="email" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Adress">
                <Input value={form.adr} onChange={(e) => setForm({ ...form, adr: e.target.value })} placeholder="Gatuadress, stad" />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Anteckningar">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Övrigt..."
                  rows={3}
                />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Avbryt</Button>
            <Button onClick={handleSave}>{editingId ? "Spara" : "Lägg till"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ta bort kund</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Är du säker? Denna åtgärd kan inte ångras.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Avbryt</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Ta bort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
