import { useEffect, useState } from "react";
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, EmptyState, Badge, Avatar } from "../components/ui.jsx";
import { ROLE_LABELS } from "../lib/constants.js";

const ACTION_COLORS = {
  LOGIN: "bg-sky-100 text-sky-700", REGISTER: "bg-indigo-100 text-indigo-700",
  CREATE: "bg-brand-100 text-brand-700", UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700", UPLOAD: "bg-violet-100 text-violet-700",
  PROGRESS: "bg-emerald-100 text-emerald-700", STATUS: "bg-cyan-100 text-cyan-700",
  ENTREE: "bg-brand-100 text-brand-700", SORTIE: "bg-amber-100 text-amber-700",
  SIGN: "bg-teal-100 text-teal-700", PHOTO: "bg-pink-100 text-pink-700",
};

export default function Activity() {
  const [logs, setLogs] = useState(null);
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Liste des entités déjà rencontrées, conservée pour garder les filtres stables entre les pages.
  const [entities, setEntities] = useState([]);

  // Revenir à la première page quand on change de filtre.
  useEffect(() => { setPage(1); }, [entity]);

  useEffect(() => {
    setLogs(null);
    const params = { page };
    if (entity) params.entity = entity;
    api.get("/activity", { params })
      .then((r) => {
        setLogs(r.data.logs);
        setTotalPages(r.data.totalPages || 1);
        setTotal(r.data.total || 0);
        setEntities((prev) => [...new Set([...prev, ...r.data.logs.map((l) => l.entity).filter(Boolean)])]);
      })
      .catch(() => { setLogs([]); setTotalPages(1); setTotal(0); });
  }, [entity, page]);

  // Fenêtre de pages compacte : 1 … (page-1) page (page+1) … dernière
  const pageNumbers = (() => {
    const around = new Set([1, totalPages, page, page - 1, page + 1]);
    const items = [];
    let prev = 0;
    for (let n = 1; n <= totalPages; n++) {
      if (!around.has(n)) continue;
      if (prev && n - prev > 1) items.push(`gap-${n}`);
      items.push(n);
      prev = n;
    }
    return items;
  })();

  return (
    <div>
      <PageHeader title="Journal d'activité" subtitle="Traçabilité complète des actions (audit)" icon={ScrollText} />

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setEntity("")} className={`badge ${!entity ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}><Filter size={11} /> Tout</button>
        {entities.map((e) => (
          <button key={e} onClick={() => setEntity(e)} className={`badge ${entity === e ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}>{e}</button>
        ))}
      </div>

      {!logs ? <Spinner /> : logs.length === 0 ? (
        <Card><EmptyState icon={ScrollText} title="Aucune activité" /></Card>
      ) : (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-brand-50">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-4 p-4 hover:bg-white/40 transition">
                  <Avatar name={`${l.user?.firstName || "?"} ${l.user?.lastName || ""}`} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-900">
                      <span className="font-semibold">{l.user?.firstName} {l.user?.lastName}</span>
                      <span className="text-brand-700/60"> · {ROLE_LABELS[l.user?.role]}</span>
                    </p>
                    <p className="text-xs text-brand-700/60">{new Date(l.createdAt).toLocaleString("fr-FR")}{l.details ? ` · ${l.details}` : ""}{l.ip ? ` · ${l.ip}` : ""}</p>
                  </div>
                  <Badge className={ACTION_COLORS[l.action] || "bg-gray-100 text-gray-600"}>{l.action}</Badge>
                  {l.entity && <Badge className="bg-brand-50 text-brand-700">{l.entity}</Badge>}
                </div>
              ))}
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <p className="text-xs text-brand-700/60">Page {page} sur {totalPages} · {total} action{total > 1 ? "s" : ""}</p>
              <div className="flex items-center gap-1">
                <button
                  className="btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                ><ChevronLeft size={15} /> Préc.</button>
                {pageNumbers.map((n) =>
                  typeof n === "string" ? (
                    <span key={n} className="px-1 text-brand-700/40 text-sm">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`badge min-w-[30px] justify-center ${n === page ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}
                    >{n}</button>
                  )
                )}
                <button
                  className="btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >Suiv. <ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
