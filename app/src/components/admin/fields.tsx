"use client";

import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-ink-soft">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring";

export function TextInput({
  error,
  className,
  ...props
}: React.ComponentProps<"input"> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        inputCls,
        error && "border-red ring-1 ring-red/30",
        className
      )}
    />
  );
}

export function TextArea({
  error,
  className,
  ...props
}: React.ComponentProps<"textarea"> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      className={cn(
        inputCls,
        "min-h-[88px] resize-y",
        error && "border-red ring-1 ring-red/30",
        className
      )}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(inputCls, "cursor-pointer", className)}
    >
      {children}
    </select>
  );
}

export function DateInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="date"
      {...props}
      className={cn(inputCls, "cursor-pointer", className)}
    />
  );
}

export function DateTimeInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="datetime-local"
      {...props}
      className={cn(inputCls, "cursor-pointer", className)}
    />
  );
}

export function FileInput({
  error,
  className,
  ...props
}: React.ComponentProps<"input"> & { error?: boolean }) {
  return (
    <input
      type="file"
      {...props}
      className={cn(
        inputCls,
        "cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-sidebar-primary/15 file:px-3 file:py-1 file:text-[12px] file:font-medium file:text-primary",
        error && "border-red ring-1 ring-red/30",
        className
      )}
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-red-soft bg-red-soft/60 px-3 py-2 text-[12.5px] leading-relaxed text-red">
      {message}
    </p>
  );
}