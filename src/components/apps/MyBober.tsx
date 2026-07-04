"use client";

import { useState } from "react";
import {
  HardDrive,
  Folder,
  File as FileIcon,
  ChevronRight,
  Home,
  Trash2,
  AlertTriangle,
  Database,
} from "lucide-react";
import { useOS } from "@/lib/os-store";
import { cn } from "@/lib/utils";

interface FsNode {
  name: string;
  type: "folder" | "file";
  size?: string;
  children?: FsNode[];
  danger?: boolean;
}

const FS: FsNode[] = [
  {
    name: "C:",
    type: "folder",
    children: [
      {
        name: "BoberOS",
        type: "folder",
        danger: true,
        children: [
          { name: "kernel.bober", type: "file", size: "4 КБ" },
          { name: "system.sys", type: "file", size: "128 КБ" },
          { name: "desktop.cfg", type: "file", size: "2 КБ" },
          { name: "registry.dat", type: "file", size: "64 КБ" },
          { name: "beaver.dll", type: "file", size: "8 КБ" },
        ],
      },
      {
        name: "Users",
        type: "folder",
        children: [
          {
            name: "Бобёр",
            type: "folder",
            children: [
              {
                name: "Документы",
                type: "folder",
                children: [
                  { name: "заметки.txt", type: "file", size: "1 КБ" },
                  { name: "пароли_от_плотины.txt", type: "file", size: "512 Б" },
                  { name: "список_веток.doc", type: "file", size: "24 КБ" },
                ],
              },
              {
                name: "Загрузки",
                type: "folder",
                children: [{ name: "bobercoin_setup.exe", type: "file", size: "12 МБ" }],
              },
              { name: "Избранное", type: "folder", children: [] },
            ],
          },
        ],
      },
      {
        name: "Windows",
        type: "folder",
        children: [
          {
            name: "System32",
            type: "folder",
            children: [
              { name: "kernel32.dll", type: "file", size: "1.2 МБ" },
              { name: "beaver.sys", type: "file", size: "340 КБ" },
            ],
          },
          { name: "Boot", type: "folder", children: [{ name: "boot.bober", type: "file", size: "8 МБ" }] },
        ],
      },
    ],
  },
  {
    name: "D:",
    type: "folder",
    children: [
      {
        name: "Игры",
        type: "folder",
        children: [
          { name: "save_flappy.dat", type: "file", size: "4 КБ" },
          { name: "cyberbober_save.dat", type: "file", size: "16 КБ" },
        ],
      },
      {
        name: "Музыка",
        type: "folder",
        children: [
          { name: "хвост_качает.mp3", type: "file", size: "5 МБ" },
          { name: "песня_о_плотине.mp3", type: "file", size: "7 МБ" },
        ],
      },
      {
        name: "Фото",
        type: "folder",
        children: [
          { name: "плотина_01.jpg", type: "file", size: "2 МБ" },
          { name: "бобёр_на_отдыхе.jpg", type: "file", size: "3 МБ" },
        ],
      },
    ],
  },
];

export function MyBober() {
  const [path, setPath] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const triggerBSOD = useOS((s) => s.triggerBSOD);

  const getNode = (p: string[]): FsNode | null => {
    let nodes: FsNode[] = FS;
    let current: FsNode | null = null;
    for (const name of p) {
      current = nodes.find((n) => n.name === name) || null;
      if (!current) return null;
      nodes = current.children || [];
    }
    return current;
  };

  const current = path.length === 0 ? null : getNode(path);
  const items = path.length === 0 ? FS : current?.children || [];

  const isRoot = path.length === 0;

  const handleDelete = () => {
    setConfirmDelete(false);
    triggerBSOD();
  };

  return (
    <div className="flex h-full bg-white">
      {/* sidebar */}
      <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-zinc-50 p-2 sm:flex">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Этот бобёр
        </p>
        <SideButton icon={<Home className="h-4 w-4" />} label="Рабочий стол" active={isRoot} onClick={() => setPath([])} />
        <SideButton icon={<HardDrive className="h-4 w-4" />} label="Диск C:" onClick={() => setPath(["C:"])} />
        <SideButton icon={<Database className="h-4 w-4" />} label="Диск D:" onClick={() => setPath(["D:"])} />
        <div className="mt-auto rounded-lg bg-amber-50 p-2 text-[10px] text-amber-700">
          Занято: 12 из 60 ГБ<br />Свободно: 48 ГБ
        </div>
      </div>

      {/* main */}
      <div className="flex flex-1 flex-col">
        {/* breadcrumb / toolbar */}
        <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-3 py-2">
          <button
            onClick={() => setPath([])}
            className="grid h-7 w-7 place-items-center rounded text-zinc-500 hover:bg-zinc-100"
            title="Домой"
          >
            <Home className="h-4 w-4" />
          </button>
          {path.map((p, i) => (
            <div key={i} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                {p}
              </button>
            </div>
          ))}
          <span className="ml-auto text-[11px] text-zinc-400">
            {items.length} объектов
          </span>
        </div>

        {/* items */}
        <div className="flex-1 overflow-y-auto p-3">
          {isRoot ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FS.map((drive) => (
                <button
                  key={drive.name}
                  onDoubleClick={() => setPath([drive.name])}
                  onClick={() => setPath([drive.name])}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-amber-300 hover:bg-amber-50"
                >
                  <HardDrive className="h-10 w-10 text-sky-500" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-700">
                      {drive.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {drive.name === "C:" ? "Локальный диск" : "Плотина"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={cn(
                        "h-full",
                        drive.name === "C:" ? "w-1/5 bg-sky-500" : "w-1/3 bg-emerald-500"
                      )}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-5">
              {items.map((item) => (
                <div
                  key={item.name}
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-lg p-3 text-center transition-colors",
                    item.danger
                      ? "bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100"
                      : "hover:bg-zinc-100"
                  )}
                >
                  {item.type === "folder" ? (
                    <button
                      onDoubleClick={() => setPath([...path, item.name])}
                      onClick={() => setPath([...path, item.name])}
                      className="flex w-full flex-col items-center gap-1.5"
                    >
                      <Folder
                        className={cn(
                          "h-10 w-10",
                          item.danger ? "text-rose-500" : "text-amber-500"
                        )}
                      />
                      <span className="line-clamp-2 text-[11px] font-medium text-zinc-700">
                        {item.name}
                      </span>
                    </button>
                  ) : (
                    <>
                      <FileIcon className="h-10 w-10 text-zinc-400" />
                      <span className="line-clamp-2 text-[11px] text-zinc-600">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">{item.size}</span>
                    </>
                  )}

                  {item.danger && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(true);
                      }}
                      className="absolute right-1 top-1 rounded-md bg-rose-500 p-1 text-white shadow-sm hover:bg-rose-600"
                      title="Удалить (ОПАСНО!)"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-zinc-400">
                  Эта папка пуста
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* delete confirmation */}
      {confirmDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-100">
                <AlertTriangle className="h-7 w-7 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-800">Удалить папку BoberOS?</h3>
                <p className="text-xs text-zinc-500">
                  Это системная папка. Без неё BoberOS перестанет работать!
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить навсегда
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SideButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium",
        active ? "bg-amber-100 text-amber-800" : "text-zinc-600 hover:bg-zinc-200/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
