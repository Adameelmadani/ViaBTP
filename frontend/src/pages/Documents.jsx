import { useEffect, useState } from "react";
import { FolderOpen, Plus, Upload, FileText, Download, PenLine, Trash2, Search } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, EmptyState, Badge } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { DOC_CATEGORIES, MAX_DOC_MB, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Documents() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canAdd = projectCan(project, "documents", "CONTRIBUTE");
  const canManage = projectCan(project, "documents", "MANAGE");
  const [docs, setDocs] = useState(null);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // valeur debouncée
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = () => {
    const params = { projectId };
    if (category) params.category = category;
    if (query) params.q = query;
    api.get("/documents", { params }).then((r) => setDocs(r.data)).catch(() => setDocs([]));
  };
  useEffect(() => { if (projectId) load(); }, [projectId, category, query]);

  const sign = async (d) => { await api.patch(`/documents/${d.id}/sign`); load(); toast("Document signé électroniquement"); };
  const remove = async (d) => { if (!(await confirm("Supprimer ce document ?"))) return; await api.delete(`/documents/${d.id}`); load(); toast("Document supprimé"); };

  return (
    <div>
      <PageHeader
        title="Gestion documentaire" subtitle="Plans, PV, rapports, contrats versionnés" icon={FolderOpen}
        actions={<div className="flex gap-2 flex-wrap">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canAdd && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Ajouter</button>}
        </div>}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select max-w-[200px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {!docs ? <Spinner /> : docs.length === 0 ? (
        <Card><EmptyState icon={FolderOpen} title="Aucun document" /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-brand-100/60">
            {docs.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 p-4 hover:bg-white/40 transition">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand-50 text-brand-600 shrink-0"><FileText size={20} /></div>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-semibold text-brand-900 truncate">{d.name}</p>
                  <p className="text-xs text-brand-700/60 truncate">{d.uploadedBy?.firstName} {d.uploadedBy?.lastName} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-brand-50 text-brand-700">{DOC_CATEGORIES[d.category]}</Badge>
                  <Badge className="bg-sky-50 text-sky-700">v{d.version}</Badge>
                  {d.signed && <Badge className="bg-emerald-100 text-emerald-700"><PenLine size={11} /> Signé</Badge>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a href={d.url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Download size={14} /></a>
                  {!d.signed && canManage && <button className="btn-soft btn-sm" onClick={() => sign(d)}><PenLine size={14} /></button>}
                  {canManage && <button className="btn-danger btn-sm" onClick={() => remove(d)}><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <DocModal open={open} onClose={() => setOpen(false)} projectId={projectId} onSaved={() => { setOpen(false); load(); toast("Document ajouté"); }} />
    </div>
  );
}

function DocModal({ open, onClose, projectId, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "PLAN" });
  const [file, setFile] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_DOC_MB * 1024 * 1024) {
      toast(`Fichier trop volumineux (max ${MAX_DOC_MB} Mo)`, "error");
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      const name = form.name || file?.name;
      Object.entries({ ...form, name, projectId }).forEach(([k, v]) => v != null && fd.append(k, v));
      if (file) fd.append("file", file);
      else if (!form.url) fd.append("url", "/uploads/demo-document.pdf");
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ category: "PLAN" }); setFile(null); onSaved();
    } catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un document">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Fichier">
          <label className="flex items-center gap-2 input cursor-pointer">
            <Upload size={16} className="text-brand-400" />
            <span className="text-sm text-brand-700/70 truncate">{file ? file.name : "Choisir un fichier..."}</span>
            <input type="file" className="hidden" onChange={pickFile} />
          </label>
          <p className="text-[11px] text-brand-700/50 mt-1">Taille maximale : {MAX_DOC_MB} Mo.</p>
        </Field>
        <Field label="Nom du document"><Input value={form.name || ""} onChange={set("name")} placeholder="Optionnel (repris du fichier)" /></Field>
        <Field label="Catégorie">
          <Select value={form.category} onChange={set("category")}>
            {enumToOptions(DOC_CATEGORIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-brand-700/50">Une nouvelle version est créée automatiquement si un document du même nom existe déjà.</p>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Ajouter</button></div>
      </form>
    </Modal>
  );
}
