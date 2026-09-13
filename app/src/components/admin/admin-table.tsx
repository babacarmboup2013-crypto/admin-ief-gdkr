"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AdminColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function AdminTable<T>({
  title,
  subtitle,
  columns,
  rows,
  keyOf,
  loading,
  canAdd,
  canEdit,
  canDelete,
  onAdd,
  onEdit,
  onDelete,
  addLabel = "Ajouter",
  empty = "Aucune donnée pour le moment.",
}: {
  title: string;
  subtitle?: string;
  columns: AdminColumn<T>[];
  rows: T[];
  keyOf: (row: T) => string | number;
  loading?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  addLabel?: string;
  empty?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-serif text-[15.5px] text-navy">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] text-ink-soft">{subtitle}</p> : null}
        </div>
        {canAdd && onAdd ? (
          <Button onClick={onAdd}>
            <Plus /> {addLabel}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-[13px] text-ink-soft">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-ink-soft">{empty}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              {(canEdit || canDelete) && <TableHead className="w-[76px] text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={keyOf(row)}>
                {columns.map((c) => (
                  <TableCell key={c.header} className={c.className}>
                    {c.cell(row)}
                  </TableCell>
                ))}
                {(canEdit || canDelete) && (
                  <TableCell className="text-right">
                    <span className="inline-flex gap-1">
                      {canEdit && onEdit ? (
                        <Button variant="outline" size="icon-sm" aria-label="Modifier" onClick={() => onEdit(row)}>
                          <Pencil />
                        </Button>
                      ) : null}
                      {canDelete && onDelete ? (
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Supprimer"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}