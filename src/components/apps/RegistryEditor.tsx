"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Search, Plus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type RegType = "string" | "number" | "bool";
interface RegValue {
  name: string;
  type: RegType;
  value: string;
}
interface RegKey {
  name: string;
  children?: RegKey[];
  values?: RegValue[];
}

const INITIAL: RegKey[] = [
  {
    name: "HKEY_BOBER_ROOT",
    children: [
      {
        name: "System",
        values: [
          { name: "Version", type: "string", value: "1.2 Плотина" },
          { name: "Build", type: "number", value: "20261" },
          { name: "BoberName", type: "string", value: "Грызун" },
          { name: "TailCalibrated", type: "bool", value: "true" },
        ],
        children: [
          {
            name: "Teeth",
            values: [
              { name: "Sharpness", type: "number", value: "9000" },
              { name: "Color", type: "string", value: "#fbbf24" },
            ],
          },
        ],
      },
      {
        name: "Software",
        children: [
          {
            name: "BoberStore",
            values: [
              { name: "InstallPath", type: "string", value: "C:\\BoberOS\\Store" },
              { name: "AutoUpdate", type: "bool", value: "true" },
              { name: "CacheSize", type: "number", value: "256" },
            ],
          },
          {
            name: "BoberTunes",
            values: [
              { name: "LastPlayed", type: "string", value: "Хвост качает" },
              { name: "Volume", type: "number", value: "75" },
            ],
          },
          {
            name: "CyberBober",
            values: [
              { name: "HighScore", type: "number", value: "0" },
              { name: "NeonLevel", type: "number", value: "11" },
            ],
          },
        ],
      },
      {
        name: "Hardware",
        values: [
          { name: "CPU", type: "string", value: "Бобёр-одиночка 1 ядро" },
          { name: "RAM", type: "string", value: "512 КБ веток" },
          { name: "DamIntegrity", type: "number", value: "98" },
        ],
        children: [
          {
            name: "Tail",
            values: [
              { name: "Length", type: "number", value: "30" },
              { name: "Flappiness", type: "number", value: "100" },
            ],
          },
        ],
      },
      {
        name: "CurrentUser",
        values: [
          { name: "Name", type: "string", value: "Бобёр" },
          { name: "Mood", type: "string", value: "Дружелюбный" },
          { name: "BranchesCollected", type: "number", value: "1337" },
        ],
      },
    ],
  },
];

function findKey(keys: RegKey[], path: string[]): RegKey | null {
  let nodes = keys;
  let current: RegKey | null = null;
  for (const name of path) {
    current = nodes.find((n) => n.name === name) || null;
    if (!current) return null;
    nodes = current.children || [];
  }
  return current;
}

export function RegistryEditor() {
  const [tree, setTree] = useState<RegKey[]>(INITIAL);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["HKEY_BOBER_ROOT", "HKEY_BOBER_ROOT/System"]));
  const [selectedPath, setSelectedPath] = useState<string[]>(["HKEY_BOBER_ROOT"]);
  const [editValue, setEditValue] = useState<{ name: string; value: string } | null>(null);
  const [search, setSearch] = useState("");

  const toggle = (path: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path); else n.add(path);
      return n;
    });
  };

  const selected = findKey(tree, selectedPath);

  const updateValue = (name: string, newValue: string) => {
    setTree((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as RegKey[];
      const key = findKey(clone, selectedPath);
      if (key && key.values) {
        const v = key.values.find((x) => x.name === name);
        if (v) v.value = newValue;
      }
      return clone;
    });
    setEditValue(null);
  };

  const renderTree = (keys: RegKey[], path: string[], depth: number): React.ReactNode => {
    return keys.map((k) => {
      const fullPath = [...path, k.name].join("/");
      const isOpen = expanded.has(fullPath);
      const isSelected = selectedPath.join("/") === [...path, k.name].join("/");
      const hasChildren = k.children && k.children.length > 0;
      return (
        <div key={fullPath}>
          <button
            onClick={() => { setSelectedPath([...path, k.name]); if (hasChildren) toggle(fullPath); }}
            className={cn(
              "flex w-full items-center gap-1 rounded py-1 pr-2 text-left text-xs",
              isSelected ? "bg-sky-100 text-sky-800" : "hover:bg-zinc-100 text-zinc-700"
            )}
            style={{ paddingLeft: depth * 14 + 4 }}
          >
            {hasChildren ? (
              isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
            ) : (
              <span className="w-3" />
            )}
            {isOpen ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
            <span className="truncate font-mono">{k.name}</span>
          </button>
          {isOpen && hasChildren && renderTree(k.children!, [...path, k.name], depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* menu bar */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] text-zinc-600">
        <span className="font-semibold">Реестр</span>
        <span className="mx-1 text-zinc-300">|</span>
        <button className="rounded px-2 py-0.5 hover:bg-zinc-200">Файл</button>
        <button className="rounded px-2 py-0.5 hover:bg-zinc-200">Правка</button>
        <button className="rounded px-2 py-0.5 hover:bg-zinc-200">Вид</button>
        <button className="rounded px-2 py-0.5 hover:bg-zinc-200">Избранное</button>
        <button className="rounded px-2 py-0.5 hover:bg-zinc-200">Справка</button>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по реестру..."
          className="flex-1 bg-transparent text-xs outline-none"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* tree pane */}
        <div className="bober-scroll w-1/2 overflow-y-auto border-r border-zinc-200 p-1">
          {renderTree(tree, [], 0)}
        </div>

        {/* values pane */}
        <div className="bober-scroll flex-1 overflow-y-auto">
          <div className="sticky top-0 grid grid-cols-[1fr_100px_1fr] border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-semibold text-zinc-500">
            <span>Параметр</span>
            <span>Тип</span>
            <span>Значение</span>
          </div>
          {selected?.values && selected.values.length > 0 ? (
            selected.values
              .filter((v) => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.value.toLowerCase().includes(search.toLowerCase()))
              .map((v) => (
                <div
                  key={v.name}
                  onDoubleClick={() => setEditValue({ name: v.name, value: v.value })}
                  className="grid grid-cols-[1fr_100px_1fr] cursor-pointer border-b border-zinc-100 px-3 py-1.5 text-xs hover:bg-sky-50"
                >
                  <span className="font-mono text-zinc-800">{v.name}</span>
                  <span className="text-zinc-500">{v.type === "string" ? "REG_SZ" : v.type === "number" ? "REG_DWORD" : "REG_BOOL"}</span>
                  {editValue?.name === v.name ? (
                    <input
                      autoFocus
                      value={editValue.value}
                      onChange={(e) => setEditValue({ ...editValue, value: e.target.value })}
                      onBlur={() => updateValue(v.name, editValue.value)}
                      onKeyDown={(e) => e.key === "Enter" && updateValue(v.name, editValue.value)}
                      className="rounded border border-sky-400 px-1 font-mono text-xs outline-none"
                    />
                  ) : (
                    <span className="font-mono text-zinc-700">{v.value}</span>
                  )}
                </div>
              ))
          ) : (
            <div className="px-3 py-8 text-center text-xs text-zinc-400">
              В этом разделе нет параметров
            </div>
          )}
        </div>
      </div>

      {/* status bar */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-500">
        <span className="font-mono">{selectedPath.join("\\")}</span>
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Не удаляйте системные ключи!
        </span>
      </div>
    </div>
  );
}
