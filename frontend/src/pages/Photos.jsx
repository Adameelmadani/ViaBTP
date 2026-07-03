import { useEffect, useState } from "react";
import { Camera, Plus, MapPin, Calendar, X, Upload } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, EmptyState, Badge } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { resizeImage, MAX_UPLOAD_MB } from "../lib/image.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Photos() {
  const { toast } = useToast();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canAdd = projectCan(project, "photos", "CONTRIBUTE");
  const [photos, setPhotos] = useState(null);
  const [zone, setZone] = useState("");
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = () => {
    const params = { projectId };
    if (zone) params.zone = zone;
    api.get("/photos", { params }).then((r) => setPhotos(r.data)).catch(() => setPhotos([]));
  };
  useEffect(() => { if (projectId) load(); }, [projectId, zone]);

  const zones = [...new Set((photos || []).map((p) => p.zone).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Photos & géolocalisation" subtitle="Suivi photographique horodaté et géolocalisé" icon={Camera}
        actions={<div className="flex gap-2 flex-wrap">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canAdd && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Ajouter</button>}
        </div>}
      />

      {zones.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setZone("")} className={`badge ${!zone ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}>Toutes</button>
          {zones.map((z) => (
            <button key={z} onClick={() => setZone(z)} className={`badge ${zone === z ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}>{z}</button>
          ))}
        </div>
      )}

      {!photos ? <Spinner /> : photos.length === 0 ? (
        <Card><EmptyState icon={Camera} title="Aucune photo" subtitle="Ajoutez des photos de chantier géolocalisées." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((ph) => (
            <Card key={ph.id} hover className="p-0 overflow-hidden cursor-pointer" onClick={() => setLightbox(ph)}>
              <div className="aspect-[4/3] overflow-hidden">
                <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover hover:scale-105 transition duration-500" loading="lazy" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-brand-900 truncate">{ph.caption || "Sans légende"}</p>
                <div className="flex items-center justify-between mt-1.5">
                  {ph.zone && <Badge className="bg-brand-50 text-brand-700"><MapPin size={11} /> {ph.zone}</Badge>}
                  <span className="flex items-center gap-1 text-[11px] text-brand-700/50"><Calendar size={11} /> {new Date(ph.takenAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PhotoModal open={open} onClose={() => setOpen(false)} projectId={projectId} onSaved={() => { setOpen(false); load(); toast("Photo ajoutée"); }} />

      {lightbox && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-brand-900/60 backdrop-blur-md animate-fade-in" onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-5 text-white/80 hover:text-white"><X size={28} /></button>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt={lightbox.caption}
              className="block w-auto max-w-full max-h-[80vh] mx-auto rounded-2xl shadow-glass"
            />
            <div className="glass-strong mt-3 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-brand-900">{lightbox.caption}</p>
                <p className="text-xs text-brand-700/60">{lightbox.zone} · {lightbox.uploadedBy?.firstName} {lightbox.uploadedBy?.lastName}</p>
              </div>
              {lightbox.latitude && <Badge className="bg-brand-50 text-brand-700"><MapPin size={12} /> {lightbox.latitude.toFixed(4)}, {lightbox.longitude.toFixed(4)}</Badge>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoModal({ open, onClose, projectId, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [busy, setBusy] = useState(false);

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(`Image trop volumineuse (max ${MAX_UPLOAD_MB} Mo)`, "error");
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries({ ...form, projectId }).forEach(([k, v]) => v != null && fd.append(k, v));
      if (file) fd.append("file", await resizeImage(file));
      await api.post("/photos", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({}); setFile(null); onSaved();
    } catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une photo">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Fichier image">
          <label className="flex items-center gap-2 input cursor-pointer">
            <Upload size={16} className="text-brand-400" />
            <span className="text-sm text-brand-700/70 truncate">{file ? file.name : "Choisir une image..."}</span>
            <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
          </label>
          <p className="text-[11px] text-brand-700/50 mt-1">Max {MAX_UPLOAD_MB} Mo · l'image est automatiquement redimensionnée et compressée.</p>
        </Field>
        <p className="text-center text-xs text-brand-700/40"> ou </p>
        <Field label="URL d'image"><Input value={form.url || ""} onChange={set("url")} placeholder="https://..." /></Field>
        <Field label="Légende"><Input value={form.caption || ""} onChange={set("caption")} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Zone"><Input value={form.zone || ""} onChange={set("zone")} placeholder="Bloc A" /></Field>
          <Field label="Latitude"><Input type="number" step="any" value={form.latitude || ""} onChange={set("latitude")} /></Field>
          <Field label="Longitude"><Input type="number" step="any" value={form.longitude || ""} onChange={set("longitude")} /></Field>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={busy}><Plus size={16} /> {busy ? "Envoi..." : "Ajouter"}</button></div>
      </form>
    </Modal>
  );
}
