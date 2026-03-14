"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Star, Flag, Mail, RefreshCw, MessageSquare, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Kund, GmbReview, GmbReviewStatus } from "@/lib/types"

interface GmbProfileProps {
  clients: Kund[]
  gmbReviews: GmbReview[]
  updateGmbReviews: (reviews: GmbReview[]) => void
}

type FilterType = "all" | "new" | "flagged" | "forwarded" | "replied"

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: GmbReviewStatus }) {
  const map: Record<GmbReviewStatus, { label: string; className: string }> = {
    new:        { label: "Ny",             className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30" },
    replied:    { label: "Besvarad",       className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30" },
    flagged:    { label: "Flaggad",        className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30" },
    forwarded:  { label: "Vidarebefordrad",className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/30" },
  }
  const { label, className } = map[status]
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  )
}

export default function GmbProfile({ clients, gmbReviews, updateGmbReviews }: GmbProfileProps) {
  const [selectedKundId, setSelectedKundId] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(false)

  // Reply modal
  const [replyReview, setReplyReview] = useState<GmbReview | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)

  // Forward modal
  const [forwardReview, setForwardReview] = useState<GmbReview | null>(null)

  const activeClients = useMemo(
    () => clients.filter((c) => c.st === "AKTIV").sort((a, b) => a.name.localeCompare(b.name, "sv")),
    [clients]
  )

  const selectedKund = activeClients.find((c) => c.id === selectedKundId) ?? null

  const reviewsForSelected = useMemo(
    () => gmbReviews.filter((r) => r.kundId === selectedKundId),
    [gmbReviews, selectedKundId]
  )

  const filteredReviews = useMemo(() => {
    if (filter === "all") return reviewsForSelected
    return reviewsForSelected.filter((r) => r.status === filter)
  }, [reviewsForSelected, filter])

  // Badges for client list
  function newCountFor(kundId: number) {
    return gmbReviews.filter((r) => r.kundId === kundId && r.status === "new").length
  }
  function avgRatingFor(kundId: number) {
    const rs = gmbReviews.filter((r) => r.kundId === kundId)
    if (!rs.length) return null
    return rs.reduce((s, r) => s + r.rating, 0) / rs.length
  }

  // Fetch reviews from Google API and merge with local metadata
  async function fetchReviews() {
    if (!selectedKund?.gmbLocationId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/gmb/reviews?locationId=${encodeURIComponent(selectedKund.gmbLocationId)}`)
      const data = await res.json() as {
        reviews?: Array<{ reviewId: string; reviewer: string; rating: 1|2|3|4|5; comment: string; createTime: string }>
        error?: string
      }
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Kunde inte hämta recensioner")
        return
      }
      const incoming = data.reviews ?? []
      // Merge: keep local metadata, add new reviews
      const existingMap = new Map(gmbReviews.map((r) => [r.reviewId, r]))
      const merged: GmbReview[] = incoming.map((r) => {
        const existing = existingMap.get(r.reviewId)
        if (existing) return { ...existing, reviewer: r.reviewer, rating: r.rating, comment: r.comment }
        return {
          reviewId: r.reviewId,
          kundId: selectedKund.id,
          locationId: selectedKund.gmbLocationId!,
          reviewer: r.reviewer,
          rating: r.rating,
          comment: r.comment,
          createTime: r.createTime,
          status: "new" as GmbReviewStatus,
        }
      })
      // Keep reviews for other clients intact
      const others = gmbReviews.filter((r) => r.kundId !== selectedKund.id)
      updateGmbReviews([...others, ...merged])
      toast.success(`${merged.length} recensioner hämtade`)
    } catch {
      toast.error("Nätverksfel vid hämtning av recensioner")
    } finally {
      setLoading(false)
    }
  }

  function updateReview(reviewId: string, patch: Partial<GmbReview>) {
    updateGmbReviews(gmbReviews.map((r) => r.reviewId === reviewId ? { ...r, ...patch } : r))
  }

  function toggleFlag(review: GmbReview) {
    if (review.status === "flagged") {
      updateReview(review.reviewId, { status: "new", flaggedAt: undefined })
      toast("Flagga borttagen")
    } else {
      updateReview(review.reviewId, { status: "flagged", flaggedAt: new Date().toISOString() })
      toast("Recension flaggad")
    }
  }

  async function submitReply() {
    if (!replyReview || !replyText.trim() || !selectedKund?.gmbLocationId) return
    setReplying(true)
    try {
      const res = await fetch("/api/gmb/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedKund.gmbLocationId,
          reviewId: replyReview.reviewId,
          replyText: replyText.trim(),
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Kunde inte skicka svar")
        return
      }
      updateReview(replyReview.reviewId, {
        status: "replied",
        replyText: replyText.trim(),
        repliedAt: new Date().toISOString(),
      })
      toast.success("Svar skickat!")
      setReplyReview(null)
      setReplyText("")
    } catch {
      toast.error("Nätverksfel")
    } finally {
      setReplying(false)
    }
  }

  function buildForwardEmail(review: GmbReview, kund: Kund): string {
    const stars = "⭐".repeat(review.rating)
    const date = new Date(review.createTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
    return `Hej ${kund.cnt || kund.name},

Vi har uppmärksammat en recension på er Google-profil som vi vill informera er om.

Recension av: ${review.reviewer}
Betyg: ${stars} (${review.rating}/5)
Datum: ${date}

"${review.comment}"

Vi rekommenderar att ni hanterar denna recension direkt via er Google Business Profile, alternativt kontakta oss om ni vill ha hjälp med ett svar.

Med vänliga hälsningar,
Syns Nu Media`
  }

  async function copyForwardEmail() {
    if (!forwardReview || !selectedKund) return
    const text = buildForwardEmail(forwardReview, selectedKund)
    await navigator.clipboard.writeText(text)
    toast.success("E-post kopierat!")
    updateReview(forwardReview.reviewId, {
      status: "forwarded",
      forwardedAt: new Date().toISOString(),
    })
    setForwardReview(null)
  }

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: "all",       label: "Alla" },
    { id: "new",       label: "Nya" },
    { id: "flagged",   label: "Flaggade" },
    { id: "forwarded", label: "Vidarebefordrade" },
    { id: "replied",   label: "Besvarade" },
  ]

  return (
    <div className="flex gap-6 h-[calc(100vh-16rem)] min-h-[500px]">

      {/* ── Vänster: kundlista ─────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
          Aktiva kunder
        </p>
        {activeClients.map((c) => {
          const avg = avgRatingFor(c.id)
          const newCount = newCountFor(c.id)
          const hasGmb = !!c.gmbLocationId
          const isSelected = c.id === selectedKundId
          return (
            <button
              key={c.id}
              onClick={() => { setSelectedKundId(c.id); setFilter("all") }}
              disabled={!hasGmb}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition-all flex items-center justify-between gap-2 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : hasGmb
                  ? "hover:bg-muted/50 text-foreground"
                  : "opacity-40 cursor-not-allowed text-muted-foreground"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{c.name}</p>
                {hasGmb && avg !== null ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className={`h-3 w-3 ${isSelected ? "text-primary-foreground/70 fill-primary-foreground/70" : "text-amber-400 fill-amber-400"}`} />
                    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {avg.toFixed(1)}
                    </span>
                  </div>
                ) : !hasGmb ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Ingen GMB kopplad</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {newCount > 0 && (
                  <span className={`text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center ${
                    isSelected ? "bg-white/30 text-white" : "bg-primary/10 text-primary"
                  }`}>
                    {newCount}
                  </span>
                )}
                <ChevronRight className={`h-3 w-3 ${isSelected ? "text-primary-foreground/50" : "text-muted-foreground/30"}`} />
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Höger: recensioner ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selectedKund ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Välj en kund för att se recensioner</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{selectedKund.name}</h2>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{selectedKund.gmbLocationId}</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchReviews} disabled={loading} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Hämtar..." : "Hämta recensioner"}
              </Button>
            </div>

            {/* Filter */}
            <div className="flex gap-1 mb-4 flex-wrap">
              {FILTERS.map((f) => {
                const count = f.id === "all" ? reviewsForSelected.length : reviewsForSelected.filter((r) => r.status === f.id).length
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      filter === f.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                    {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Review list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredReviews.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-muted-foreground">
                    {reviewsForSelected.length === 0
                      ? "Inga recensioner — klicka Hämta recensioner"
                      : "Inga recensioner matchar filtret"}
                  </p>
                </div>
              ) : (
                filteredReviews
                  .slice()
                  .sort((a, b) => b.createTime.localeCompare(a.createTime))
                  .map((review) => (
                    <div
                      key={review.reviewId}
                      className="rounded-xl border border-border bg-card p-4 space-y-2"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{review.reviewer}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(review.createTime).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StarRating rating={review.rating} />
                          <StatusBadge status={review.status} />
                        </div>
                      </div>

                      {/* Comment */}
                      {review.comment && (
                        <p className="text-xs text-foreground/80 leading-relaxed">{review.comment}</p>
                      )}

                      {/* Existing reply */}
                      {review.replyText && (
                        <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Ert svar</p>
                          <p className="text-xs text-foreground/70 leading-relaxed">{review.replyText}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1.5"
                          onClick={() => { setReplyReview(review); setReplyText(review.replyText ?? "") }}
                        >
                          <MessageSquare className="h-3 w-3" />
                          {review.replyText ? "Redigera svar" : "Svara"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-[11px] gap-1.5 ${review.status === "flagged" ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20" : ""}`}
                          onClick={() => toggleFlag(review)}
                        >
                          <Flag className="h-3 w-3" />
                          {review.status === "flagged" ? "Avflagga" : "Flagga"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1.5"
                          onClick={() => setForwardReview(review)}
                        >
                          <Mail className="h-3 w-3" />
                          Vidarebefordra
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Svara-modal ─────────────────────────────────────────────── */}
      <Dialog open={!!replyReview} onOpenChange={(o) => { if (!o) { setReplyReview(null); setReplyText("") } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Svara på recension</DialogTitle>
          </DialogHeader>
          {replyReview && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={replyReview.rating} />
                  <span className="text-xs font-medium text-foreground">{replyReview.reviewer}</span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">{replyReview.comment}</p>
              </div>
              <Textarea
                placeholder="Skriv ert svar här..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                className="text-sm"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyReview(null); setReplyText("") }}>
              Avbryt
            </Button>
            <Button onClick={submitReply} disabled={replying || !replyText.trim()}>
              {replying ? "Skickar..." : "Skicka svar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Vidarebefordra-modal ─────────────────────────────────────── */}
      <Dialog open={!!forwardReview} onOpenChange={(o) => { if (!o) setForwardReview(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vidarebefordra till kund</DialogTitle>
          </DialogHeader>
          {forwardReview && selectedKund && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Till:</span>
                <span className="font-medium">{selectedKund.em || "(ingen e-post registrerad)"}</span>
              </div>
              <pre className="text-xs bg-muted/40 rounded-lg border border-border p-3 whitespace-pre-wrap leading-relaxed font-sans overflow-y-auto max-h-64">
                {buildForwardEmail(forwardReview, selectedKund)}
              </pre>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setForwardReview(null)}>
              Stäng
            </Button>
            {forwardReview && selectedKund?.em && (
              <Button variant="outline" asChild>
                <a
                  href={`mailto:${selectedKund.em}?subject=Recension på er Google-profil&body=${encodeURIComponent(buildForwardEmail(forwardReview, selectedKund))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Öppna i e-postklient
                </a>
              </Button>
            )}
            <Button onClick={copyForwardEmail}>
              Kopiera e-post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
