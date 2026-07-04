"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Download, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo { id: number; src: string; name: string; }

const SAMPLE: Photo[] = [
  { id: 1, src: "/wallpaper1.png", name: "Бобёр на закате" },
  { id: 2, src: "/wallpaper2.png", name: "Бобёр в ночи" },
];

export function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>(SAMPLE);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [idx, setIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(100);

  const upload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((p) => [...p, { id: nextId.current++, src: reader.result as string, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const remove = (id: number) => {
    setPhotos((p) => p.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const navigate = (dir: number) => {
    if (!selected) return;
    const i = photos.findIndex((p) => p.id === selected.id);
    const ni = (i + dir + photos.length) % photos.length;
    setSelected(photos[ni]);
    setIdx(ni);
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 dark:text-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
        <ImageIcon className="h-5 w-5 text-pink-500" />
        <span className="text-sm font-bold">Галерея</span>
        <span className="text-xs text-zinc-400">{photos.length} фото</span>
        <button onClick={() => fileRef.current?.click()} className="ml-auto flex items-center gap-1.5 rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-600">
          <Upload className="h-3.5 w-3.5" /> Загрузить
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>

      <div className="bober-scroll grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
            <button onClick={() => { setSelected(p); setIdx(i); }} className="block w-full">
              <img src={p.src} alt={p.name} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <p className="truncate text-[10px] text-white">{p.name}</p>
            </div>
            <button onClick={() => remove(p.id)} className="absolute right-1 top-1 hidden rounded-md bg-rose-500 p-1 text-white group-hover:block">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-400">
            <ImageIcon className="h-12 w-12" />
            <p className="mt-2 text-sm">Нет фото. Загрузите свои!</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setSelected(null)}>
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm font-medium">{selected.name} · {idx + 1}/{photos.length}</span>
            <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => navigate(-1)} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">‹</button>
            <img src={selected.src} alt={selected.name} className="mx-4 max-h-[70vh] max-w-[80vw] rounded-lg object-contain" />
            <button onClick={() => navigate(1)} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">›</button>
          </div>
          <div className="flex justify-center p-3">
            <a href={selected.src} download={selected.name} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20">
              <Download className="h-3.5 w-3.5" /> Скачать
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
